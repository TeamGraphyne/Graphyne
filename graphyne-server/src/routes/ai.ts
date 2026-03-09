import { FastifyInstance } from 'fastify';
import { spawn } from 'child_process';
import path from 'path';

interface GenerateBody {
    prompt: string;
}

// Path to the graphyne-ai directory (sibling of graphyne-server)
const AI_DIR = path.resolve(__dirname, '../../graphyne-ai');
const PIPELINE_SCRIPT = path.join(AI_DIR, 'pipeline.py');

/**
 * Spawns the Python pipeline as a child process and returns the
 * validated graphic design JSON. The client loads this as a draft —
 * no file is written to disk until the user saves from the editor.
 */
async function runPipeline(prompt: string): Promise<object> {
    return new Promise((resolve, reject) => {
        // Use 'python3' on Linux/macOS, 'python' on Windows
        const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

        const child = spawn(pythonBin, [
            '-c',
            // Inline script: import generate_only and print result as JSON
            `
import sys, json
sys.path.insert(0, ${JSON.stringify(AI_DIR)})
from pipeline import generate_only
result = generate_only(sys.argv[1])
print(json.dumps(result))
            `.trim(),
            prompt,
        ], {
            cwd: AI_DIR,
            // Pass through the current environment so OPENAI_API_KEY is available
            env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

        child.on('close', (code) => {
            // Log stderr regardless — contains pipeline progress and warnings
            if (stderr) console.log('🤖 Pipeline:', stderr.trim());

            if (code !== 0) {
                return reject(new Error(`Pipeline exited with code ${code}:\n${stderr}`));
            }

            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch {
                reject(new Error(`Pipeline returned invalid JSON:\n${stdout}`));
            }
        });

        child.on('error', (err) => {
            reject(new Error(
                `Failed to spawn Python process: ${err.message}\n` +
                `Make sure Python 3 is installed and 'python3' is in PATH.\n` +
                `AI directory: ${AI_DIR}`
            ));
        });
    });
}

export const aiRoutes = async (fastify: FastifyInstance) => {

    /**
     * POST /api/ai/generate
     * Body: { prompt: string }
     * Returns: { name, config, elements } — the validated graphic design
     *
     * The client dispatches loadGraphic() with this payload to populate
     * the editor canvas as a draft, without saving to disk.
     */
    fastify.post<{ Body: GenerateBody }>('/api/ai/generate', async (request, reply) => {
        const { prompt } = request.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return reply.code(400).send({ error: 'prompt is required' });
        }

        if (prompt.trim().length > 500) {
            return reply.code(400).send({ error: 'prompt must be under 500 characters' });
        }

        console.log(`🤖 AI Generate request: "${prompt.trim()}"`);

        try {
            const design = await runPipeline(prompt.trim());
            return reply.code(200).send(design);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('❌ AI pipeline error:', message);

            // Surface a clean error to the client
            return reply.code(500).send({
                error: 'AI generation failed',
                detail: message,
            });
        }
    });
};
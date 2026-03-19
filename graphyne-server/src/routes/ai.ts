import { FastifyInstance } from "fastify";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

interface GenerateBody {
  prompt: string;
  currentDesign?: any;
}

// Path to the graphyne-ai directory (sibling of graphyne-server)
const AI_DIR = path.resolve(__dirname, "../../../graphyne-ai");

// FIXED: Use the venv Python executable directly.
// This avoids PATH lookup issues on Windows ('python' / 'py' not found)
// AND guarantees we use the venv where agno, pydantic, etc. are installed.
function getPythonBin(): string {
  const winVenv  = path.join(AI_DIR, ".venv", "Scripts", "python.exe");
  const unixVenv = path.join(AI_DIR, ".venv", "bin", "python3");

  if (process.platform === "win32") {
    if (fs.existsSync(winVenv)) return winVenv;
    // Fallback: py launcher (requires Python installed from python.org)
    return "py";
  }

  if (fs.existsSync(unixVenv)) return unixVenv;
  return "python3";
}

/**
 * Spawns the Python pipeline as a child process and returns the
 * validated graphic design JSON. The client loads this as a draft —
 * no file is written to disk until the user saves from the editor.
 */
async function runPipeline(prompt: string, currentDesign?: any): Promise<object> {
  return new Promise((resolve, reject) => {
    const pythonBin = getPythonBin();

    const args = [
      "-c",
      // Inline script: import generate_only and print result as JSON
      `
import sys, json
sys.path.insert(0, ${JSON.stringify(AI_DIR)})
from pipeline import generate_only
result = generate_only(sys.argv[1], 3, sys.argv[2] if len(sys.argv) > 2 else None)
print(json.dumps(result))
      `.trim(),
      prompt,
    ];
    if (currentDesign) {
      args.push(JSON.stringify(currentDesign));
    }

    const child = spawn(
      pythonBin,
      args,
      {
        cwd: AI_DIR,
        // Pass through the current environment so OPENAI_API_KEY is available
        env: { ...process.env },
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      // Log stderr regardless — contains pipeline progress and warnings
      if (stderr) console.log("🤖 Pipeline:", stderr.trim());

      if (code !== 0) {
        return reject(
          new Error(`Pipeline exited with code ${code}:\n${stderr}`),
        );
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        reject(new Error(`Pipeline returned invalid JSON:\n${stdout}`));
      }
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Failed to spawn Python process: ${err.message}\n` +
            `Tried binary: '${pythonBin}'\n` +
            `Ensure a .venv exists in graphyne-ai/ with dependencies installed:\n` +
            `  cd graphyne-ai && py -m venv .venv && .venv\\Scripts\\activate && pip install -r requirements.txt\n` +
            `AI directory: ${AI_DIR}`,
        ),
      );
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
  fastify.post<{ Body: GenerateBody }>(
    "/api/ai/generate",
    async (request, reply) => {
      const { prompt, currentDesign } = request.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return reply.code(400).send({ error: "prompt is required" });
      }

      if (prompt.trim().length > 500) {
        return reply
          .code(400)
          .send({ error: "prompt must be under 500 characters" });
      }

      console.log(`🤖 AI Generate request: "${prompt.trim()}"`);

      try {
        const design = await runPipeline(prompt.trim(), currentDesign);
        return reply.code(200).send(design);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("❌ AI pipeline error:", message);
        console.log(AI_DIR);

        // Surface a clean error to the client
        return reply.code(500).send({
          error: "AI generation failed",
          detail: message,
        });
      }
    },
  );
};
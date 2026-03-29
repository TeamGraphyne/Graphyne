import { FastifyInstance } from "fastify";
import { generateOnly } from "../services/aiPipeline";
import { requireRole } from "../server";

// MODIFIED: Removed Python child-process spawn. The pipeline now runs as native
// TypeScript via aiPipeline.ts, which works inside the packaged Tauri binary.

interface GenerateBody {
  prompt: string;
  apiKey: string;         // NEW: Gemini API key supplied per-request from the client
  currentDesign?: object;
}

export const aiRoutes = async (fastify: FastifyInstance) => {

  fastify.addHook('preHandler', requireRole(['admin', 'editor', 'playout']));
  

  /**
   * POST /api/ai/generate
   * Body: { prompt: string, apiKey: string, currentDesign?: object }
   * Returns: { name, config, elements } — the validated graphic design
   *
   * The client dispatches loadGraphic() with this payload to populate
   * the editor canvas as a draft, without saving to disk.
   */
  fastify.post<{ Body: GenerateBody }>(
    "/api/ai/generate",
    async (request, reply) => {
      const { prompt, apiKey, currentDesign } = request.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return reply.code(400).send({ error: "prompt is required" });
      }

      if (prompt.trim().length > 500) {
        return reply.code(400).send({ error: "prompt must be under 500 characters" });
      }

      // NEW: Validate API key is present
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
        return reply.code(400).send({ error: "apiKey is required" });
      }

      console.log(`🤖 AI Generate request: "${prompt.trim()}"`);

      try {
        const currentDesignJson = currentDesign
          ? JSON.stringify(currentDesign)
          : undefined;

        const design = await generateOnly(
          prompt.trim(),
          apiKey.trim(),
          3,
          currentDesignJson,
        );
        return reply.code(200).send(design);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("❌ AI pipeline error:", message);

        // Surface a clean error to the client
        return reply.code(500).send({
          error: "AI generation failed",
          detail: message,
        });
      }
    },
  );
};
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { RESERVED_KEYS } from "../types/hotkey";
import { generateOnly } from "../services/aiPipeline";

// Inline the reserved list on the server too so the API enforces it
const RESERVED = [
  "delete", "backspace", "escape",
  "ctrl+z", "ctrl+shift+z",
  "ctrl+=", "ctrl++", "ctrl+-", "ctrl+0",
  "ctrl+a", "ctrl+d",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  "shift+arrowup", "shift+arrowdown", "shift+arrowleft", "shift+arrowright",
];

const isReserved = (keys: string) => RESERVED.includes(keys.toLowerCase().trim());

export async function hotkeyRoutes(fastify: FastifyInstance) {

  // READ
  fastify.get("/api/hotkeys", async (_req, reply) => {
    const hotkeys = await prisma.hotkey.findMany({ orderBy: { createdAt: "asc" } });
    return reply.send(hotkeys);
  });

  // CREATE
  fastify.post("/api/hotkeys", async (req, reply) => {
    const { action, keys } = req.body as { action: string; keys: string };
    if (!action || !keys) return reply.code(400).send({ error: "action and keys are required" });
    if (isReserved(keys)) return reply.code(400).send({ error: "Key combination is reserved" });

    const existing = await prisma.hotkey.findFirst({ where: { keys: { equals: keys, mode: "insensitive" } } });
    if (existing) return reply.code(400).send({ error: "Key combination already assigned" });

    const hotkey = await prisma.hotkey.create({ data: { action, keys, isCustom: true } });
    return reply.code(201).send(hotkey);
  });

  // UPDATE
  fastify.patch("/api/hotkeys/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { keys } = req.body as { keys: string };
    if (isReserved(keys)) return reply.code(400).send({ error: "Key combination is reserved" });

    const existing = await prisma.hotkey.findFirst({
      where: { keys: { equals: keys, mode: "insensitive" }, NOT: { id } }
    });
    if (existing) return reply.code(400).send({ error: "Key combination already assigned" });

    const hotkey = await prisma.hotkey.update({ where: { id }, data: { keys, isCustom: true } });
    return reply.send(hotkey);
  });

  // DELETE — resets to default (removes custom entry)
  fastify.delete("/api/hotkeys/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.hotkey.delete({ where: { id } });
    return reply.code(204).send();
  });
}
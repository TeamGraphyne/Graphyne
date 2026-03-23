import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

const RESERVED = [
  "delete",
  "backspace",
  "escape",
  "ctrl+z",
  "ctrl+shift+z",
  "ctrl+=",
  "ctrl++",
  "ctrl+-",
  "ctrl+0",
  "ctrl+a",
  "ctrl+d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "shift+arrowup",
  "shift+arrowdown",
  "shift+arrowleft",
  "shift+arrowright",
];

const normalise = (keys: string) => keys.toLowerCase().trim();
const isReserved = (keys: string) => RESERVED.includes(normalise(keys));

export async function hotkeyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/hotkeys", async (_req, reply) => {
    const hotkeys = await prisma.hotkey.findMany({
      orderBy: { createdAt: "asc" },
    });
    return reply.send(hotkeys);
  });

  fastify.post("/api/hotkeys", async (req, reply) => {
    const { action, keys } = req.body as {
      action: string;
      keys: string;
    };

    if (!action || !keys)
      return reply.code(400).send({ error: "action and keys are required" });

    const normalisedKeys = normalise(keys);

    if (isReserved(normalisedKeys))
      return reply.code(400).send({ error: "Key combination is reserved" });

    const existing = await prisma.hotkey.findFirst({
      where: {
        keys: { equals: normalisedKeys, mode: "insensitive" },
      },
    });

    if (existing)
      return reply
        .code(400)
        .send({ error: "Key combination already assigned" });

    const hotkey = await prisma.hotkey.create({
      data: { action, keys: normalisedKeys, isCustom: true },
    });

    return reply.code(201).send(hotkey);
  });

  fastify.patch("/api/hotkeys/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { keys } = req.body as { keys: string };

    if (!keys)
      return reply.code(400).send({ error: "keys are required" });

    const normalisedKeys = normalise(keys);

    if (isReserved(normalisedKeys))
      return reply.code(400).send({ error: "Key combination is reserved" });

    const existing = await prisma.hotkey.findFirst({
      where: {
        keys: { equals: normalisedKeys, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (existing)
      return reply
        .code(400)
        .send({ error: "Key combination already assigned" });

    const hotkey = await prisma.hotkey.update({
      where: { id },
      data: { keys: normalisedKeys, isCustom: true },
    });

    return reply.send(hotkey);
  });

  fastify.delete("/api/hotkeys/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.hotkey.delete({ where: { id } });
    return reply.code(204).send();
  });
}
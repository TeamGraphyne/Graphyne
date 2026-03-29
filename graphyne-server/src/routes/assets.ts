import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { requireRole } from "../server";

const UPLOAD_DIR = path.resolve("data/uploads");

const tagsToString = (tags: string[]): string => tags.join(",");
const tagsToArray  = (tags: string):   string[] => tags ? tags.split(",").filter(Boolean) : [];

function serialize(asset: any) {
  return { ...asset, tags: tagsToArray(asset.tags) };
}

function inferType(mime: string): "image" | "video" | "font" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "font";
}

export async function assetRoutes(fastify: FastifyInstance) {

    fastify.addHook('preHandler', requireRole(['admin', 'editor']));

  // Setup — runs inside the async function where fastify is defined
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // READ
  fastify.get("/api/assets", async (_req, reply) => {
    const assets = await prisma.asset.findMany({ orderBy: { uploadedAt: "desc" } });
    return reply.send(assets.map(serialize));
  });

  // CREATE
  fastify.post("/api/assets", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "No file provided" });

    const fileName = `${Date.now()}-${data.filename}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await pipeline(data.file, createWriteStream(filePath));

    const stat = await fs.stat(filePath);
    const asset = await prisma.asset.create({
      data: {
        name: data.filename,
        type: inferType(data.mimetype),
        mimeType: data.mimetype,
        filePath: fileName,
        fileSize: stat.size,
        tags: "",
      },
    });

    return reply.code(201).send(serialize(asset));
  });

  // UPDATE metadata
  fastify.patch("/api/assets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { name?: string; altText?: string; tags?: string[] };

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(body.name    !== undefined && { name: body.name }),
        ...(body.altText !== undefined && { altText: body.altText }),
        ...(body.tags    !== undefined && { tags: tagsToString(body.tags) }),
      },
    });

    return reply.send(serialize(asset));
  });

  // REPLACE file
  fastify.put("/api/assets/:id/replace", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.asset.findUniqueOrThrow({ where: { id } });

    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "No file provided" });

    await fs.unlink(path.join(UPLOAD_DIR, existing.filePath)).catch(() => {});

    const fileName = `${Date.now()}-${data.filename}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    await pipeline(data.file, createWriteStream(filePath));
    const stat = await fs.stat(filePath);

    const asset = await prisma.asset.update({
      where: { id },
      data: { filePath: fileName, fileSize: stat.size, mimeType: data.mimetype },
    });

    return reply.send(serialize(asset));
  });

  // DELETE
  fastify.delete("/api/assets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.asset.findUniqueOrThrow({ where: { id } });

    await fs.unlink(path.join(UPLOAD_DIR, asset.filePath)).catch(() => {});
    await prisma.asset.delete({ where: { id } });

    return reply.code(204).send();
  });
}
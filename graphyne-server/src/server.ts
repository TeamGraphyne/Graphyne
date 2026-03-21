import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs-extra';
import { projectRoutes } from './routes/projects';
import { graphicRoutes } from './routes/graphics';
import { datasourceRoutes } from './routes/datasources';
import { DataPollerService } from './services/dataPoller';
import { aiRoutes } from './routes/ai';
import { assetRoutes } from "./routes/assets"; 

// ── Detect pkg binary ──────────────────────────────────────────────────────────
const isPkg = Object.prototype.hasOwnProperty.call(process, 'pkg');

// ── DATA_DIR ───────────────────────────────────────────────────────────────────
const DATA_DIR =
  process.env.GRAPHYNE_DATA_DIR ??
  (isPkg
    ? path.join(path.dirname(process.execPath), 'data')
    : path.join(__dirname, '../data'));

// ── DATABASE_URL ───────────────────────────────────────────────────────────────
// Set before any route import triggers Prisma's schema-parse.
// Forward-slashes required by Prisma even on Windows.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${DATA_DIR.replace(/\\/g, '/')}/graphyne.db`;
}

// ── CLIENT_DIR ─────────────────────────────────────────────────────────────────
function resolveClientDir(): string {
  if (process.env.GRAPHYNE_CLIENT_DIR) {
    return process.env.GRAPHYNE_CLIENT_DIR;
  }
  if (isPkg) {
    const siblingClient = path.join(path.dirname(process.execPath), 'client');
    if (fs.existsSync(path.join(siblingClient, 'index.html'))) {
      return siblingClient;
    }
    const parentClient = path.join(path.dirname(process.execPath), '..', 'client');
    if (fs.existsSync(path.join(parentClient, 'index.html'))) {
      return parentClient;
    }
    return siblingClient;
  }
  return path.join(__dirname, '../../graphyne-client/dist');
}

const CLIENT_DIR = resolveClientDir();

// ── Setup runtime directories ──────────────────────────────────────────────────
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const GRAPHICS_DIR = path.join(DATA_DIR, 'graphics');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(GRAPHICS_DIR);

// ── Migration runner ───────────────────────────────────────────────────────────
// Uses migrations-bundle.ts (generated at build time by scripts/bundle-migrations.js)
// so we never have to find .sql files inside the pkg snapshot at runtime.
async function runMigrations() {
  const { prisma } = await import('./lib/prisma');

  // Import the pre-bundled SQL. This is a plain JS module — no filesystem
  // path resolution, works identically inside and outside a pkg binary.
  let MIGRATIONS: { name: string; sql: string }[];
  try {
    const bundle = await import('./migrations-bundle');
    MIGRATIONS = bundle.MIGRATIONS;
  } catch (e) {
    console.error('❌ Could not load migrations-bundle. Did you run `node scripts/bundle-migrations.js`?', e);
    throw e;
  }

  console.log(`📦 Migrations bundle loaded — ${MIGRATIONS.length} migration(s) available.`);

  // Ensure the tracking table exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  TEXT     NOT NULL PRIMARY KEY,
      "checksum"            TEXT     NOT NULL,
      "finished_at"         DATETIME,
      "migration_name"      TEXT     NOT NULL UNIQUE,
      "logs"                TEXT,
      "rolled_back_at"      DATETIME,
      "started_at"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER  NOT NULL DEFAULT 0
    )
  `);

  // Fetch already-applied migrations
  const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const applied = new Set(rows.map((r) => r.migration_name));
  console.log(`   Already applied: ${applied.size === 0 ? '(none)' : [...applied].join(', ')}`);

  for (const { name, sql } of MIGRATIONS) {
    if (applied.has(name)) {
      console.log(`   ⏭  ${name} (already applied)`);
      continue;
    }

    console.log(`   🔄 Applying: ${name}`);

    // Split on semicolons. Only skip truly empty chunks — do NOT filter
    // lines starting with '--' because Prisma puts a comment before every
    // statement (e.g. '-- CreateTable\nCREATE TABLE ...') and filtering on
    // startsWith('--') would silently drop those entire CREATE TABLE blocks.
    // SQLite handles -- comments inside a statement just fine.
    const statements = sql
      .split(/;[ \t]*(?:\r?\n|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err: any) {
        // "already exists" errors are safe to ignore (idempotent re-runs)
        if (
          err?.message?.includes('already exists') ||
          err?.code === 'SQLITE_ERROR' && err?.message?.includes('duplicate')
        ) {
          console.warn(`   ⚠️  Skipping statement (already exists): ${stmt.slice(0, 60)}...`);
        } else {
          console.error(`   ❌ Statement failed: ${stmt.slice(0, 120)}`);
          throw err;
        }
      }
    }

    // Record as applied
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, applied_steps_count)
      VALUES
        (lower(hex(randomblob(16))), '', datetime('now'), '${name}', 1)
    `);
    console.log(`   ✅ Applied: ${name}`);
  }

  await prisma.$disconnect();
}

// ── Fastify ────────────────────────────────────────────────────────────────────
const app = Fastify({ logger: true });

// ── Plugins ────────────────────────────────────────────────────────────────────
app.register(cors, { origin: '*' });
app.register(multipart);

app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
});

app.register(fastifyStatic, {
  root: GRAPHICS_DIR,
  prefix: '/graphics/',
  decorateReply: false,
});

app.register(fastifyStatic, {
  root: CLIENT_DIR,
  prefix: '/',
  decorateReply: false,
  wildcard: false,
});

// ── Socket.io ──────────────────────────────────────────────────────────────────
const io = new Server(app.server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Data Poller ────────────────────────────────────────────────────────────────
const dataPoller = new DataPollerService(io);

// ── API Routes ─────────────────────────────────────────────────────────────────
app.register(projectRoutes);
app.register(graphicRoutes(DATA_DIR));
app.register(datasourceRoutes(dataPoller));
app.register(aiRoutes);
app.register(assetRoutes); ///////////////////////////////////////////////////////////////////

// ── SPA catch-all ─────────────────────────────────────────────────────────────
app.setNotFoundHandler(async (request, reply) => {
  const rawUrl = request.url.split('?')[0];

  if (
    rawUrl.startsWith('/api/') ||
    rawUrl.startsWith('/graphics/') ||
    rawUrl.startsWith('/uploads/') ||
    rawUrl.startsWith('/socket.io/')
  ) {
    return reply.code(404).send({ error: 'Not found' });
  }

  if (path.extname(rawUrl)) {
    return reply.code(404).send({ error: 'Not found' });
  }

  try {
    const indexPath = path.join(CLIENT_DIR, 'index.html');
    const html = await fs.readFile(indexPath, 'utf-8');
    reply.header('content-type', 'text/html; charset=utf-8').send(html);
  } catch {
    reply.code(503).send(
      `CLIENT_DIR (${CLIENT_DIR}) has no index.html. ` +
      `Copy graphyne-client/dist/* into src-tauri/client/ and rebuild.`
    );
  }
});

// ── Socket.io event handlers ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
  });

  socket.on('command:take', (data) => {
    socket.broadcast.emit('render:take', data);
  });

  socket.on('command:clear', () => {
    socket.broadcast.emit('render:clear');
  });

  socket.on('data:start-polling', async (payload: { sourceId: string }) => {
    try {
      const { prisma } = await import('./lib/prisma');
      const source = await prisma.dataSource.findUnique({ where: { id: payload.sourceId } });
      if (source) {
        const config = JSON.parse(source.config);
        dataPoller.start({
          id: source.id, name: source.name,
          type: source.type as 'rest-api' | 'json-file' | 'csv-file',
          url: config.url, filePath: config.filePath,
          headers: config.headers, rootPath: config.rootPath,
          pollingInterval: source.pollingInterval,
        });
      }
    } catch (err) { console.error('Failed to start polling:', err); }
  });

  socket.on('data:stop-polling', (payload: { sourceId: string }) => {
    dataPoller.stop(payload.sourceId);
  });

  socket.on('data:csv-row', (payload: { sourceId: string; rowIndex: number }) => {
    dataPoller.setCsvRow(payload.sourceId, payload.rowIndex);
  });

  socket.on('data:fetch-once', async (payload: { sourceId: string }) => {
    try {
      const { prisma } = await import('./lib/prisma');
      const source = await prisma.dataSource.findUnique({ where: { id: payload.sourceId } });
      if (source) {
        const config = JSON.parse(source.config);
        const result = await dataPoller.fetchOnce({
          id: source.id, name: source.name,
          type: source.type as 'rest-api' | 'json-file' | 'csv-file',
          url: config.url, filePath: config.filePath,
          headers: config.headers, rootPath: config.rootPath,
          pollingInterval: 0,
        });
        io.emit('data:update', { sourceId: source.id, data: result.flat });
      }
    } catch (err) { console.error('Manual fetch failed:', err); }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const clientIndexExists = fs.existsSync(path.join(CLIENT_DIR, 'index.html'));
    console.log('───────────────────────────────────────────');
    console.log('Graphyne Server — startup');
    console.log('  isPkg:        ', isPkg);
    console.log('  DATA_DIR:     ', DATA_DIR);
    console.log('  CLIENT_DIR:   ', CLIENT_DIR);
    console.log('  index.html:   ', clientIndexExists ? '✅ found' : '❌ MISSING');
    console.log('  DATABASE_URL: ', process.env.DATABASE_URL);
    console.log('───────────────────────────────────────────');

    console.log('🔄 Running migrations...');
    await runMigrations();
    console.log('✅ Database ready.');

    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 Graphyne running at http://localhost:3001');
  } catch (err) {
    console.error('💥 Server failed to start:', err);
    app.log.error(err);
    process.exit(1);
  }
};

start();
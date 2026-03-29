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
import { hotkeyRoutes } from  './routes/hotkeys';

// ── Auth & Security Imports ────────────────────────────────────────────────────
import { auth } from './lib/auth';
import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';

// ── Detect pkg binary ──────────────────────────────────────────────────────────
const isPkg = Object.prototype.hasOwnProperty.call(process, 'pkg');

// ── DATA_DIR ───────────────────────────────────────────────────────────────────
const DATA_DIR =
  process.env.GRAPHYNE_DATA_DIR ??
  (isPkg
    ? path.join(path.dirname(process.execPath), 'data')
    : path.join(__dirname, '../data'));

// ── DATABASE_URL ───────────────────────────────────────────────────────────────
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
    if (fs.existsSync(path.join(siblingClient, 'index.html'))) return siblingClient;
    const parentClient = path.join(path.dirname(process.execPath), '..', 'client');
    if (fs.existsSync(path.join(parentClient, 'index.html'))) return parentClient;
    return siblingClient;
  }
  return path.join(__dirname, '../../graphyne-client/dist');
}

const CLIENT_DIR = resolveClientDir();
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const GRAPHICS_DIR = path.join(DATA_DIR, 'graphics');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(GRAPHICS_DIR);

// ── Migration runner ───────────────────────────────────────────────────────────
async function runMigrations() {
  const { prisma } = await import('./lib/prisma');
  let MIGRATIONS: { name: string; sql: string }[];
  try {
    const bundle = await import('./migrations-bundle');
    MIGRATIONS = bundle.MIGRATIONS;
  } catch (e) {
    console.error('❌ Could not load migrations-bundle. Did you run `node scripts/bundle-migrations.js`?', e);
    throw e;
  }

  console.log(`📦 Migrations bundle loaded — ${MIGRATIONS.length} migration(s) available.`);

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

  const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const applied = new Set(rows.map((r) => r.migration_name));

  for (const { name, sql } of MIGRATIONS) {
    if (applied.has(name)) continue;
    console.log(`   🔄 Applying: ${name}`);

    const statements = sql.split(/;[ \t]*(?:\r?\n|$)/).map((s) => s.trim()).filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err: any) {
        if (err?.message?.includes('already exists') || err?.code === 'SQLITE_ERROR' && err?.message?.includes('duplicate')) {
          console.warn(`   ⚠️  Skipping statement (already exists): ${stmt.slice(0, 60)}...`);
        } else {
          console.error(`   ❌ Statement failed: ${stmt.slice(0, 120)}`);
          throw err;
        }
      }
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
      VALUES (lower(hex(randomblob(16))), '', datetime('now'), '${name}', 1)
    `);
    console.log(`   ✅ Applied: ${name}`);
  }
  await prisma.$disconnect();
}

// ── Fastify Setup ──────────────────────────────────────────────────────────────
const app = Fastify({ logger: true });

app.register(hotkeyRoutes);
app.register(cors, { origin: '*' });
app.register(multipart);

app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/' });
app.register(fastifyStatic, { root: GRAPHICS_DIR, prefix: '/graphics/', decorateReply: false });
app.register(fastifyStatic, { root: CLIENT_DIR, prefix: '/', decorateReply: false, wildcard: false });

// ── Auth Middleware & Routes ───────────────────────────────────────────────────

// 1. Map Fastify Requests to Better Auth
app.all("/api/auth/*", async (request, reply) => {
  const url = `http://${request.headers.host}${request.url}`;
  const webReq = new Request(url, {
    method: request.method,
    headers: request.headers as HeadersInit,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : JSON.stringify(request.body),
  });

  const response = await auth.handler(webReq);
  
  reply.status(response.status);
  response.headers.forEach((value, key) => { reply.header(key, value); });
  
  if (response.body) {
    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  return reply.send();
});

// 2. Exportable Role Checker for other files
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await auth.api.getSession({ headers: request.headers as HeadersInit });

    if (!session || !session.user) {
      return reply.code(401).send({ error: "Unauthorized. Please log in." });
    }

    const userRole = (session.user as any).role || 'editor'; 

    if (!allowedRoles.includes(userRole)) {
      return reply.code(403).send({ error: "Forbidden: Your role cannot perform this action." });
    }
    
    (request as any).user = session.user;
  };
}

// 3. System Activation Route
function getMachineId() {
  return crypto.createHash('sha256').update(process.platform + process.arch).digest('hex');
}

app.post('/api/system/activate', async (request, reply) => {
  const { licenseKey, adminEmail, adminPassword, adminName } = request.body as any;
  const { prisma } = await import('./lib/prisma');

  // Verify with remote server (replace with your actual validation logic/URL)
  try {
    const remoteCheck = await fetch('https://api.yourdomain.com/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: licenseKey, hardwareId: getMachineId() })
    });
    if (!remoteCheck.ok) return reply.code(403).send({ error: "Invalid or expired License" });
  } catch (error) {
    // For local dev, you might want to bypass this catch block temporarily
    console.warn("Could not reach license server.");
  }

  // Save license locally
  await prisma.license.create({
    data: { licenseKey, deviceId: getMachineId(), isValid: true }
  });

  // Create Master Admin
  const adminUser = await auth.api.signUpEmail({
    body: { email: adminEmail, password: adminPassword, name: adminName },
    asResponse: false
  });

  // Assign Admin Role
  await prisma.user.update({
    where: { id: adminUser.user.id },
    data: { role: "admin" }
  });

  return { success: true, message: "System activated and Admin created." };
});

// ── Socket.io ──────────────────────────────────────────────────────────────────
const io = new Server(app.server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const dataPoller = new DataPollerService(io);

// Authenticate Socket Connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error: No token provided"));

  const { prisma } = await import('./lib/prisma');
  
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return next(new Error("Authentication error: Invalid or expired session"));
  }

  socket.data.user = session.user;
  next();
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id} | User: ${socket.data.user.name} | Role: ${socket.data.user.role}`);

  socket.on('join-session', (sessionId) => { socket.join(sessionId); });

  socket.on('command:take', (data) => {
    // RBAC: Only Admin or Playout can trigger graphics
    if (["admin", "playout"].includes(socket.data.user.role)) {
      socket.broadcast.emit('render:take', data);
    } else {
      socket.emit('error', { message: "Your role is not permitted to trigger graphics." });
    }
  });

  socket.on('command:clear', () => {
    if (["admin", "playout"].includes(socket.data.user.role)) {
      socket.broadcast.emit('render:clear');
    }
  });

  socket.on('data:start-polling', async (payload: { sourceId: string }) => {
    try {
      const { prisma } = await import('./lib/prisma');
      const source = await prisma.dataSource.findUnique({ where: { id: payload.sourceId } });
      if (source) {
        const config = JSON.parse(source.config);
        dataPoller.start({
          id: source.id, name: source.name, type: source.type as any,
          url: config.url, filePath: config.filePath, headers: config.headers, 
          rootPath: config.rootPath, pollingInterval: source.pollingInterval,
        });
      }
    } catch (err) { console.error('Failed to start polling:', err); }
  });

  socket.on('data:stop-polling', (payload: { sourceId: string }) => { dataPoller.stop(payload.sourceId); });
  socket.on('data:csv-row', (payload: { sourceId: string; rowIndex: number }) => { dataPoller.setCsvRow(payload.sourceId, payload.rowIndex); });

  socket.on('data:fetch-once', async (payload: { sourceId: string }) => {
    try {
      const { prisma } = await import('./lib/prisma');
      const source = await prisma.dataSource.findUnique({ where: { id: payload.sourceId } });
      if (source) {
        const config = JSON.parse(source.config);
        const result = await dataPoller.fetchOnce({
          id: source.id, name: source.name, type: source.type as any,
          url: config.url, filePath: config.filePath, headers: config.headers, 
          rootPath: config.rootPath, pollingInterval: 0,
        });
        io.emit('data:update', { sourceId: source.id, data: result.flat });
      }
    } catch (err) { console.error('Manual fetch failed:', err); }
  });

  socket.on('disconnect', () => { console.log('Client disconnected:', socket.id); });
});

// ── API Routes (Apply Middleware Here) ─────────────────────────────────────────
// For fine-grained control, we pass the middleware into specific route registrations.
app.register(projectRoutes); 
app.register(graphicRoutes(DATA_DIR));
app.register(datasourceRoutes(dataPoller));
app.register(aiRoutes);
app.register(assetRoutes); 

// ── SPA catch-all ─────────────────────────────────────────────────────────────
app.setNotFoundHandler(async (request, reply) => {
  const rawUrl = request.url.split('?')[0];

  if (rawUrl.startsWith('/api/') || rawUrl.startsWith('/graphics/') || rawUrl.startsWith('/uploads/') || rawUrl.startsWith('/socket.io/')) {
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
    reply.code(503).send(`CLIENT_DIR (${CLIENT_DIR}) has no index.html.`);
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const clientIndexExists = fs.existsSync(path.join(CLIENT_DIR, 'index.html'));
    console.log('───────────────────────────────────────────');
    console.log('Graphyne Server — startup');
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
import { build } from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Generate Prisma client
console.log('⚙️  Generating Prisma client (binary engine)...');
execSync('npx prisma generate', {
  cwd: __dirname,
  env: {
    ...process.env,
    PRISMA_CLI_QUERY_ENGINE_TYPE: 'binary',
    PRISMA_CLIENT_ENGINE_TYPE:    'binary',
  },
  stdio: 'inherit',
});

// 2. esbuild
console.log('⚙️  Bundling server with esbuild...');
await build({
  entryPoints: ['src/server.ts'],
  bundle:      true,
  platform:    'node',
  target:      'node20',
  format:      'cjs',
  outfile:     'dist-bundle/index.js',
  external: [
    '.prisma/client/libquery_engine-*',
    '@prisma/engines/libquery_engine-*',
    '@prisma/engines/schema-engine-*',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

// 3. Copy prisma schema
fs.mkdirSync('dist-bundle/prisma', { recursive: true });
fs.copyFileSync(
  path.join(__dirname, 'prisma/schema.prisma'),
  path.join(__dirname, 'dist-bundle/prisma/schema.prisma')
);

// NEW: Copy built React client into dist-bundle/public so pkg snapshots it.
// The client must be built and staged at graphyne-server/public/ before
// running this script (CI does: npm run build in graphyne-client, then
// copies dist/* to graphyne-server/public/).
const publicSrc  = path.join(__dirname, 'public');
const publicDest = path.join(__dirname, 'dist-bundle/public');

if (fs.existsSync(publicSrc)) {
  console.log('⚙️  Copying client assets into dist-bundle/public...');
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log('✅ Client assets copied.');
} else {
  console.warn(
    '⚠️  graphyne-server/public/ not found — skipping client copy.\n' +
    '   Build the client first: cd graphyne-client && npm run build\n' +
    '   Then: cp -r graphyne-client/dist/* graphyne-server/public/'
  );
}

console.log('✅ Bundle ready in dist-bundle/');
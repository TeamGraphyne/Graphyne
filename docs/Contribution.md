# Graphyne Contributor Reference

Welcome to the Graphyne development team. This document is the single source of truth for our development workflow, coding standards, architecture rules, and collaboration practices. Read it fully before writing your first line of code.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Repository Structure](#repository-structure)
3. [Architecture Rules](#architecture-rules)
4. [Branching Strategy](#branching-strategy)
5. [Commit Message Format](#commit-message-format)
6. [Pull Request Workflow](#pull-request-workflow)
7. [Code Standards](#code-standards)
8. [Socket Event Contract](#socket-event-contract)
9. [Daily Workflow](#daily-workflow)
10. [Module Ownership](#module-ownership)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Node.js** v20+ ([nodejs.org](https://nodejs.org))
- **Git**
- **Google Chrome** (primary development and output rendering browser)

> No Docker required. The database is SQLite — it's a file that lives in `graphyne-server/data/`.

### First Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/TeamGraphyne/Graphyne.git
cd Graphyne

# 2. Install server dependencies
cd graphyne-server
npm install

# 3. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# 4. Install client dependencies
cd ../graphyne-client
npm install

# 5. Start the backend server (terminal 1)
cd ../graphyne-server
npm run dev

# 6. Start the frontend dev server (terminal 2)
cd ../graphyne-client
npm run dev
```

The client runs at **http://localhost:5173** and proxies API calls to the server at **http://localhost:3001**.

### Key URLs (Development)

| URL | Purpose |
|-----|---------|
| `http://localhost:5173/editor` | WYSIWYG Graphics Editor |
| `http://localhost:5173/playout` | Playout Controller |
| `http://localhost:5173/output` | Broadcast Output (captured by OBS/vMix) |
| `http://localhost:3001/api/...` | REST API |
| `http://localhost:3001/graphics/` | Served HTML graphic files |
| `http://localhost:3001/uploads/` | Served uploaded images |

### Useful Commands

**Server (`graphyne-server/`):**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server (`node dist/server.js`) |
| `npx prisma studio` | Open Prisma DB browser |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma generate` | Regenerate Prisma client after schema changes |

**Client (`graphyne-client/`):**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build for production to `dist/` |
| `npm run lint` | Run ESLint |

---

## Repository Structure

```
Graphyne/
├── graphyne-client/              # React 19 frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── pages/                # Route-level page components
│   │   │   ├── EditorPage.tsx    # /editor — WYSIWYG canvas editor
│   │   │   ├── PlayoutPage.tsx   # /playout — playout controller
│   │   │   └── OutputPage.tsx    # /output — broadcast output (OBS source)
│   │   ├── components/           # Reusable UI components
│   │   ├── store/                # Redux Toolkit + redux-undo state
│   │   │   ├── store.ts          # Store configuration
│   │   │   ├── canvasSlice.ts    # Canvas elements state (wrapped with undoable())
│   │   │   ├── dataSlice.ts      # Data sources state
│   │   │   ├── viewSlice.ts      # View-only state (zoom, etc.)
│   │   │   ├── undoConfig.ts     # Undo filter and groupBy configuration
│   │   │   └── hooks.ts          # useAppSelector / useAppDispatch
│   │   ├── types/                # TypeScript type definitions
│   │   │   └── canvas.ts         # CanvasElement, CanvasConfig, AnimationConfig, etc.
│   │   ├── services/             # Client-side services
│   │   │   └── socketService.ts  # Socket.io singleton wrapper
│   │   ├── utils/                # Helper functions
│   │   │   ├── exporter.ts       # Compiles Redux state → standalone .html file
│   │   │   ├── importer.ts       # Parses .html file → rehydrates Redux state
│   │   │   └── dataResolver.ts   # Resolves data bindings → pushes to iframe
│   │   ├── App.tsx               # Router setup (BrowserRouter)
│   │   └── main.tsx              # React entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── graphyne-server/              # Node.js + Fastify backend
│   ├── src/
│   │   ├── server.ts             # Fastify app, Socket.io, static file serving
│   │   ├── routes/               # API route handlers
│   │   │   ├── graphics.ts       # /api/graphics — save, load, list graphics
│   │   │   ├── projects.ts       # /api/projects — project/playlist management
│   │   │   └── datasources.ts    # /api/datasources — data source CRUD
│   │   ├── services/
│   │   │   └── dataPoller.ts     # Polling service — fetches data, emits data:update
│   │   ├── lib/
│   │   │   └── prisma.ts         # Prisma client singleton
│   │   └── types/                # Shared server-side TypeScript types
│   │       ├── canvas.ts
│   │       └── project.ts
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (SQLite)
│   ├── data/                     # Runtime data (git-ignored)
│   │   ├── graphics/             # Compiled .html graphic files
│   │   └── uploads/              # Uploaded image files
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                         # Project documentation
│   └── Contribution.md           # This file
├── docker-compose.yml            # Legacy — kept for reference only, not used
└── .github/                      # GitHub Actions workflows
```

---

## Architecture Rules

These are **non-negotiable**. All PRs that violate these will be blocked.

### 1. The Factory Pattern
The system has four distinct roles. Never mix them:

| Role | What it is | Where |
|------|-----------|-------|
| **Editor (Factory)** | React app that manipulates Redux state | `graphyne-client/` |
| **Asset (Product)** | A standalone `.html` file on disk | `graphyne-server/data/graphics/` |
| **Playout (Consumer)** | Dashboard loading graphics into `<iframe>` | `/playout` page |
| **Output (Broadcast)** | Dedicated page listened to by OBS/vMix | `/output` page |

### 2. Redux Undo — Always Use `state.canvas.present`
The canvas slice is wrapped with `redux-undo`. **Never** access `state.canvas.elements` directly.

```typescript
// ✅ Correct
const elements = useAppSelector((state) => state.canvas.present.elements);

// ❌ Wrong — will be undefined
const elements = useAppSelector((state) => state.canvas.elements);
```

### 3. Socket.io — Never Access the Raw Socket
Always use the `socketService` singleton. Never import or access the raw socket instance directly.

```typescript
// ✅ Correct
import { socketService } from '../services/socketService';
socketService.emit('command:take', { url });
socketService.on('render:take', handler);

// ❌ Wrong
import { io } from 'socket.io-client';
const socket = io(...); // Do not do this
socket.emit(...);       // Do not do this
```

### 4. The GFX Prefix Rule (Exporter)
UUIDs can start with numbers, which makes invalid CSS selectors. In `exporter.ts`, all element IDs **must** be prefixed with `gfx-`:

```typescript
// ✅ Correct
`<div id="gfx-${el.id}">`
`gsap.to("#gfx-" + el.id, ...)`

// ❌ Wrong
`<div id="${el.id}">`
```

### 5. Image Handling
- Images in Redux state are stored as `blob:` URLs
- The exporter **must** convert `blob:` URLs to Base64 before writing to the `.html` file
- Image elements **must** always have `fill: 'transparent'` to satisfy the `CanvasElement` type
- Use the `CanvasImage` wrapper component in the Artboard — never use raw `Konva.Image`

### 6. Iframe Communication
To control a graphic loaded inside an `<iframe>`, use `postMessage` — never try to call functions directly:

```typescript
// Play in animation
iframe.contentWindow?.postMessage('play', '*');

// Play out animation
iframe.contentWindow?.postMessage('out', '*');

// Push data binding update
iframe.contentWindow?.postMessage({ type: 'data-update', sourceId, data }, '*');
```

### 7. Route Paths
These are fixed. Do not change them without a team discussion:

| Path | Purpose |
|------|---------|
| `/editor` | WYSIWYG Graphics Editor |
| `/playout` | Playout Controller |
| `/output` | Broadcast Output (OBS Browser Source) |

---

## Branching Strategy

We use a `main` / `dev` two-branch model with short-lived feature branches.

```
main  (stable, represents last shipped version)
  │
  └── dev  (integration branch — all PRs target this)
        │
        ├── feature/canvas-fit-anudhi
        ├── feature/snap-to-grid-nikini
        ├── fix/text-styling-bold-nikini
        └── chore/update-ci-cd-dilhara
```

### Branch Naming Convention

All branches must follow this pattern: `<type>/<short-description>-<your-name>`

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<description>-<name>` | `feature/layer-drag-drop-parami` |
| Bug Fix | `fix/<description>-<name>` | `fix/canvas-resize-issue-sharon` |
| Chore | `chore/<description>-<name>` | `chore/update-dependencies-dilhara` |
| Documentation | `docs/<description>-<name>` | `docs/api-reference-nikini` |
| Refactor | `refactor/<description>-<name>` | `refactor/redux-store-anudhi` |

### Branch Rules

- ✅ Always branch from `dev`
- ✅ Keep branch names lowercase with hyphens
- ✅ Always include your name suffix
- ❌ Never commit directly to `main` or `dev`
- ❌ Never merge `main` into a feature branch — merge `dev` instead

### Common Branch Commands

```bash
# Create and switch to a new feature branch
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name-yourname

# Keep your branch updated with dev
git fetch origin
git merge origin/dev

# Push your branch
git push origin feature/your-feature-name-yourname
```

---

## Commit Message Format

We follow the **Conventional Commits** specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(editor): add shape rotation handles` |
| `fix` | Bug fix | `fix(canvas): resolve layer z-index bug` |
| `docs` | Documentation only | `docs(contributing): update setup instructions` |
| `style` | Formatting, no logic change | `style(components): fix indentation` |
| `refactor` | Code restructure, no new feature/fix | `refactor(store): simplify canvas reducer` |
| `chore` | Maintenance tasks | `chore(deps): update React to 19.2` |
| `perf` | Performance improvement | `perf(canvas): optimise Konva render loop` |
| `ci` | CI/CD changes | `ci(actions): add build caching` |

### Scopes

| Scope | What it covers |
|-------|---------------|
| `editor` | EditorPage, canvas tools, toolbar |
| `canvas` | Konva Artboard, element rendering |
| `layers` | Layer panel, z-index management |
| `animations` | GSAP animation config, in/out panels |
| `exporter` | `exporter.ts` — compiles state to HTML |
| `importer` | `importer.ts` — parses HTML back to state |
| `playout` | PlayoutPage, playlist, take/clear |
| `output` | OutputPage, broadcast rendering |
| `data` | Data sources, polling, CSV/JSON/REST |
| `sockets` | Socket.io events, socketService |
| `api` | Fastify routes, REST endpoints |
| `db` | Prisma schema, migrations |
| `store` | Redux slices, undo config |
| `types` | TypeScript type definitions |
| `ui` | Shared UI components |
| `config` | Vite, TSConfig, ESLint config |
| `deps` | Dependency updates |

### Examples

```bash
# Feature
git commit -m "feat(exporter): add Base64 conversion for blob image URLs"

# Bug fix with explanation
git commit -m "fix(canvas): correct transform handle position on rotated elements

Handles were offset when rotation exceeded 90 degrees due to
missing matrix inversion in the hit detection calculation."

# With issue reference
git commit -m "fix(playout): prevent double-take on rapid button clicks

Fixes #42"
```

### Commit Best Practices

- ✅ Use present tense ("add feature" not "added feature")
- ✅ Use imperative mood ("fix bug" not "fixes bug")
- ✅ Keep the subject line under 72 characters
- ✅ Reference GitHub issues when applicable (`Fixes #42`)
- ✅ Make atomic commits — one logical change per commit
- ❌ Do not end the subject line with a period
- ❌ Do not push raw `wip:` commits to a PR for review

---

## Pull Request Workflow

### Step 1: Prepare Your Branch

```bash
# Make sure you're up to date
git fetch origin
git merge origin/dev

# Run checks locally before pushing
cd graphyne-client && npm run lint
cd ../graphyne-server && npm run build  # catches TypeScript errors

# Push
git push origin feature/your-feature-name-yourname
```

### Step 2: Open the PR

- Go to GitHub → Pull Requests → New Pull Request
- **Base branch:** `dev`
- **Compare branch:** your feature branch
- Fill out the PR template fully

### PR Template

```markdown
## Description
<!-- What does this PR do? Why is it needed? -->

## Related Issue
Closes #[issue number]

## Type of Change
- [ ] Feature (new functionality)
- [ ] Bug fix
- [ ] Refactor (no functional change)
- [ ] Documentation
- [ ] Chore (deps, config, CI)

## Module Affected
- [ ] Editor / Canvas
- [ ] Animations / Exporter
- [ ] Playout Controller
- [ ] Output Page
- [ ] Data Sources / Polling
- [ ] Backend API
- [ ] Database / Prisma
- [ ] Socket.io / Real-time

## Architecture Rules Checklist
- [ ] All canvas selectors use `state.canvas.present`
- [ ] Socket events go through `socketService`, not raw socket
- [ ] Exported HTML IDs are prefixed with `gfx-`
- [ ] Image elements have `fill: 'transparent'`
- [ ] No `any` types introduced
- [ ] No inline `style={}` objects (unless dynamic values)

## General Checklist
- [ ] Self-reviewed my own code
- [ ] Added comments where the logic is non-obvious
- [ ] TypeScript compiles with no new errors
- [ ] No new ESLint warnings
- [ ] Updated docs if behaviour changed

## Screenshots / Demo
<!-- For UI changes: before/after screenshots or a short screen recording -->
```

### Review Process

#### As a PR Author
- Self-review before requesting review — read your own diff
- Keep PRs focused — one feature or fix per PR
- Respond to review comments within 24 hours
- Do not force-push after review has started (use new commits)

#### As a Reviewer

Use these comment prefixes so authors know what's required:

| Prefix | Meaning | Author action |
|--------|---------|---------------|
| `blocking:` | Must be fixed before merge | Required fix |
| `suggestion:` | Good improvement, not required | Optional |
| `question:` | Need clarification | Response needed |
| `nit:` | Minor style/preference | Optional |
| `praise:` | Something done well | None 😊 |

**Reviewer checklist:**
- [ ] Logic is correct and solves the stated problem
- [ ] Architecture rules (Section 3) are respected
- [ ] TypeScript types are properly defined — no `any`
- [ ] Edge cases are handled (null checks, empty arrays, etc.)
- [ ] Socket events follow the established naming convention
- [ ] No unrelated code has been changed

### Merging

- Requires **1 approval** minimum
- All CI checks must pass
- Use **Normal Merge**
- Delete the branch after merging

---

## Code Standards

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React page components | PascalCase | `EditorPage.tsx` |
| React sub-components | PascalCase | `LayerPanel.tsx` |
| Custom hooks | camelCase with `use` prefix | `useCanvas.ts` |
| Utilities / helpers | camelCase | `exporter.ts` |
| Redux slices | camelCase + `Slice` | `canvasSlice.ts` |
| Type definition files | camelCase | `canvas.ts` |
| Services | camelCase + `Service` | `socketService.ts` |

### Component Structure

```tsx
// 1. Imports — grouped and ordered
import { useState, useEffect, useRef } from 'react';          // React
import { useAppSelector, useAppDispatch } from '../store/hooks'; // Store
import { socketService } from '../services/socketService';    // Services
import { LayerItem } from './LayerItem';                       // Components
import type { CanvasElement } from '../types/canvas';          // Types

// 2. Named export — functional component
export function LayerPanel() {
  // 2a. Redux hooks first
  const dispatch = useAppDispatch();
  const elements = useAppSelector((state) => state.canvas.present.elements); // ← present!

  // 2b. Local state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 2c. Refs
  const panelRef = useRef<HTMLDivElement>(null);

  // 2d. Effects
  useEffect(() => {
    // cleanup returned if needed
  }, []);

  // 2e. Handlers — named with "handle" prefix
  const handleToggle = () => setIsCollapsed((prev) => !prev);

  // 3. Return JSX — Tailwind only, no inline style objects
  return (
    <div ref={panelRef} className="flex flex-col bg-gray-900 border-r border-gray-700">
      {/* ... */}
    </div>
  );
}
```

### TypeScript Guidelines

```typescript
// ✅ DO: Explicit types on all function parameters and returns
function compileElement(el: CanvasElement): string {
  return `<div id="gfx-${el.id}">...</div>`;
}

// ✅ DO: Use interfaces for object shapes
interface SaveGraphicPayload {
  name: string;
  html: string;
  json: string;
  projectId?: string;
}

// ✅ DO: Use type for unions
type DataSourceType = 'rest-api' | 'json-file' | 'csv-file';

// ❌ NEVER use `any`
function process(data: any) {} // Blocked in PR review

// ✅ Use `unknown` and narrow it
function process(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // narrow further
  }
}

// ❌ Avoid non-null assertion without a comment explaining why it's safe
const el = document.getElementById('root')!;

// ✅ Handle null explicitly or assert with a comment
const el = document.getElementById('root');
if (!el) throw new Error('Root element not found');
```

### Styling Rules

- **Tailwind CSS only** for all layout and static styles
- **No inline `style={}`** objects — exception: values that are genuinely dynamic at runtime (e.g. canvas transform `scale()`, element `x`/`y` positions)
- **No CSS modules** — we use Tailwind exclusively

```tsx
// ✅ Correct — Tailwind
<div className="absolute flex items-center bg-gray-800 rounded-lg p-2">

// ✅ Correct — dynamic value that must be inline
<div style={{ transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)` }}>

// ❌ Wrong — static style as inline object
<div style={{ display: 'flex', backgroundColor: '#1f2937' }}>
```

### Console Logging Convention

Use emoji prefixes so logs are easy to filter in the browser console and terminal:

| Emoji | Use for |
|-------|---------|
| `📡` | Data polling events |
| `🚀` | Take / playout commands |
| `🛑` | Stop / clear commands |
| `📺` | Output page rendering events |
| `⚡` | Socket relay / emit events |
| `📄` | CSV / file operations |
| `💾` | Save / file write operations |
| `🔌` | Socket connection / disconnection |

### Code Change Comment Prefixes

When modifying existing code, prefix your comments so reviewers can find changes quickly:

```typescript
// NEW: Added image Base64 conversion step
// MODIFIED: Now uses socketService instead of direct socket
// FIXED: Prevented double-emit on rapid clicks
```

---

## Socket Event Contract

This is the authoritative list of Socket.io events. **Do not add events without updating this table.**

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `command:take` | `{ url: string, elements?: CanvasElement[] }` | Request to play a graphic on the output |
| `command:clear` | _(none)_ | Request to clear the program output |
| `data:csv-row` | `{ sourceId: string, rowIndex: number }` | Select a specific CSV row as the active data |
| `data:start-polling` | `{ sourceId: string }` | Start polling a data source |
| `data:stop-polling` | `{ sourceId: string }` | Stop polling a data source |
| `join-session` | `sessionId: string` | Join a socket room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `render:take` | `{ url: string, elements?: CanvasElement[] }` | Instruction to load a graphic URL in the output |
| `render:clear` | _(none)_ | Instruction to play the out animation and clear |
| `data:update` | `{ sourceId: string, data: Record<string, unknown> }` | New data from a polled source, broadcast to all clients |

### Event Naming Rules

- Format: `namespace:action` (colon-separated)
- Client-initiated commands: `command:*`
- Server-to-output render instructions: `render:*`
- Data events: `data:*`

---

## Daily Workflow

### Development Flow

```
1. PICK TASK
   └─→ Select from ClickUp sprint board
   └─→ Move to "In Progress"

2. CREATE BRANCH
   └─→ git checkout dev && git pull origin dev
   └─→ git checkout -b feature/task-name-yourname

3. DEVELOP
   └─→ Write code following the architecture rules
   └─→ Commit frequently with conventional commit messages
   └─→ Start both servers and test in Chrome

4. LOCAL CHECKS
   └─→ npm run lint  (in graphyne-client/)
   └─→ npm run build (in graphyne-server/) — catches TS errors

5. PUSH & CREATE PR
   └─→ git push origin feature/task-name-yourname
   └─→ Open PR against dev
   └─→ Fill out PR template completely
   └─→ Assign a reviewer

6. ADDRESS FEEDBACK
   └─→ Push fix commits (do not force-push after review starts)
   └─→ Resolve conversations you've addressed
   └─→ Re-request review

7. MERGE
   └─→ Merge when approved
   └─→ Delete branch
   └─→ Move ClickUp task to "Done"
```

### Standup Format

Post in your team channel:

```
📅 [Name] — [Date]
✅ Done:    [what you completed]
🔄 Today:  [what you're working on]
🚧 Blocked: [anything blocking you, or "None"]
```

---

## Module Ownership

| Module | Primary Owner | Backup |
|--------|--------------|--------|
| Editor Core & Canvas Architecture | Dilhara | Anudhi |
| Editor UI (Panels, Toolbar, Properties) | Parami | Nikini |
| Animations & Exporter / Importer | Sharon | Anudhi |
| Data Sources & Polling | Nikini | Sharon |
| Backend API & Database (Prisma) | Dilhara | Parami |
| Playout Controller & Output Page | Anudhi | Dilhara |
| Socket.io & Real-time Events | Dilhara | Parami |
| CI/CD & DevOps | Dilhara | Nikini |

**As a module owner:** Review all PRs touching your module. Make architecture decisions. Keep your module's types documented.

**As a backup:** Stay familiar enough to review when the owner is unavailable.

---

## Troubleshooting

### Server won't start — port already in use

```bash
# macOS / Linux — find and kill what's using port 3001
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Prisma errors after pulling

```bash
cd graphyne-server

# Regenerate the Prisma client after schema changes
npx prisma generate

# Apply any new migrations
npx prisma migrate dev
```

### TypeScript errors after pulling

```bash
# In graphyne-server — catches compiled errors
npm run build

# In graphyne-client — Vite will show errors in the browser, or:
npx tsc --noEmit
```

### `state.canvas.elements` is undefined

You're accessing canvas state without `.present`. The canvas slice is wrapped with `redux-undo`. Fix:

```typescript
// ❌ Wrong
state.canvas.elements

// ✅ Correct
state.canvas.present.elements
```

### Socket events not being received

1. Check the browser console — is the socket connected? Look for `🔌` logs
2. Check the server terminal — is the event being received?
3. Confirm you're using `socketService.emit()` / `socketService.on()`, not a raw socket
4. Confirm the event name matches **exactly** as listed in the [Socket Event Contract](#socket-event-contract)

### Git merge conflicts

```bash
# Update your branch with the latest dev
git fetch origin
git merge origin/dev

# Resolve conflicts in your editor, then:
git add .
git commit -m "chore: resolve merge conflicts with dev"
```

### Canvas elements look different between Editor and Output

The Editor uses Konva (canvas API). The Output renders the exported HTML which uses DOM + CSS + GSAP. If something looks different, check:

1. The exporter's CSS generation for that element type
2. Whether a `blob:` URL image was properly converted to Base64 in the exporter
3. Whether the `gfx-` prefix is being applied to the element ID in both the DOM and GSAP selectors

---

## Quick Reference

### Git Cheat Sheet

```bash
# Start work
git checkout dev && git pull origin dev
git checkout -b feature/name-yourname

# Save progress
git add .
git commit -m "feat(scope): description"

# Stay up to date
git fetch origin && git merge origin/dev

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Push
git push origin feature/name-yourname
```

### Commit Type Quick Reference

```
feat(scope):     new feature
fix(scope):      bug fix
refactor(scope): restructure, no behaviour change
docs(scope):     documentation only
chore(scope):    maintenance, deps, config
perf(scope):     performance improvement
ci(scope):       CI/CD pipeline changes
```

### Architecture Quick Rules

```
✅ state.canvas.present.elements    (not state.canvas.elements)
✅ socketService.emit(...)           (not socket.emit(...))
✅ id="gfx-${el.id}"               (not id="${el.id}")
✅ fill: 'transparent'              (on image CanvasElements)
✅ <CanvasImage>                    (not raw <Image> from react-konva)
✅ postMessage('play', '*')         (to control iframes)
✅ Tailwind classes                 (not inline style objects)
✅ Named exports                    (not default exports for components)
```

---

*Last updated: March 2026*
*Maintained by: Graphyne Development Team*
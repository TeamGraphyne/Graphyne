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

The client runs at **[http://localhost:5173](http://localhost:5173)** and proxies API calls to **[http://localhost:3001](http://localhost:3001)**.

### Key URLs (Development)

|URL|Purpose|
|---|---|
|`http://localhost:5173/editor`|WYSIWYG Graphics Editor|
|`http://localhost:5173/playout`|Playout Controller|
|`http://localhost:5173/output`|Broadcast Output|
|`http://localhost:3001/api/...`|REST API|
|`http://localhost:3001/graphics/`|Served HTML graphic files|
|`http://localhost:3001/uploads/`|Served uploaded images|

### Useful Commands

**Server (`graphyne-server/`):**

|Command|Description|
|---|---|
|`npm run dev`|Start server with hot reload|
|`npm run build`|Compile TypeScript to `dist/`|
|`npm start`|Run compiled server|
|`npx prisma studio`|Open Prisma DB browser|
|`npx prisma migrate dev`|Run pending migrations|
|`npx prisma generate`|Regenerate Prisma client|

**Client (`graphyne-client/`):**

|Command|Description|
|---|---|
|`npm run dev`|Start Vite dev server|
|`npm run build`|Build for production|
|`npm run lint`|Run ESLint|

---

## Repository Structure

```
Graphyne/
├── graphyne-client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EditorPage.tsx
│   │   │   ├── PlayoutPage.tsx
│   │   │   └── OutputPage.tsx
│   │   ├── components/
│   │   ├── store/
│   │   ├── types/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── graphyne-server/
│   ├── src/
│   ├── prisma/
│   ├── data/
│   ├── tsconfig.json
│   └── package.json
├── docs/
├── docker-compose.yml
└── .github/
```

---

## Architecture Rules

These are **non-negotiable**. All PRs that violate these will be blocked.

### 1. The Factory Pattern

|Role|What it is|Where|
|---|---|---|
|Editor|React app manipulating Redux state|`graphyne-client/`|
|Asset|Standalone `.html` file|`data/graphics/`|
|Playout|Loads graphics into `<iframe>`|`/playout`|
|Output|OBS/vMix broadcast page|`/output`|

### 2. Redux Undo — Always Use `state.canvas.present`

```ts
// ✅ Correct
state.canvas.present.elements

// ❌ Wrong
state.canvas.elements
```

### 3. Socket.io — Never Access Raw Socket

```ts
// ✅ Correct
socketService.emit('command:take', { url });

// ❌ Wrong
const socket = io(...);
```

### 4. GFX Prefix Rule

```ts
// ✅
id="gfx-${el.id}"

// ❌
id="${el.id}"
```

### 5. Image Handling

- Store images as `blob:` URLs
    
- Convert `blob:` → Base64 in exporter
    
- Image elements must have `fill: 'transparent'`
    
- Always use `<CanvasImage>`
    

### 6. Iframe Communication

```ts
iframe.contentWindow?.postMessage('play', '*');
iframe.contentWindow?.postMessage('out', '*');
iframe.contentWindow?.postMessage({ type: 'data-update', sourceId, data }, '*');
```

### 7. Route Paths

|Path|Purpose|
|---|---|
|`/editor`|Editor|
|`/playout`|Playout|
|`/output`|Broadcast Output|

---

## Branching Strategy

We use `main` / `dev` with short-lived feature branches.

**Pattern:** `<type>/<description>-<name>`

Examples:

- `feature/snap-to-grid-nikini`
    
- `fix/canvas-resize-issue-sharon`
    
- `docs/api-reference-nikini`
    

Rules:

- Branch from `dev`
    
- No direct commits to `main` or `dev`
    
- Merge `dev` into feature branches (not `main`)
    

---

## Commit Message Format

```
<type>(<scope>): <description>
```

Example:

```bash
feat(exporter): add Base64 conversion for blob image URLs
fix(canvas): correct transform handle position
docs(contributing): update setup instructions
```

Guidelines:

- Imperative mood
    
- Under 72 characters
    
- No trailing period
    
- Atomic commits
    

---

## Pull Request Workflow

1. Update branch from `dev`
    
2. Run lint and build checks
    
3. Push branch
    
4. Open PR → Base: `dev`
    
5. Fill PR template fully
    
6. Address feedback
    
7. Merge after approval (no squash)
    

Minimum **1 approval** required.

---

## Code Standards

### Naming

|Type|Convention|
|---|---|
|Pages|PascalCase|
|Components|PascalCase|
|Hooks|`useSomething`|
|Utilities|camelCase|
|Redux slices|camelCase + `Slice`|
|Services|camelCase + `Service`|

### TypeScript Rules

- No `any`
    
- Use explicit return types
    
- Handle null properly
    
- Avoid unsafe non-null assertions
    

### Styling

- Tailwind only
    
- No static inline styles
    
- No CSS modules
    

### Console Logging Emojis

|Emoji|Purpose|
|---|---|
|📡|Data polling|
|🚀|Take|
|🛑|Clear|
|📺|Output|
|⚡|Socket|
|💾|Save|
|🔌|Connection|

---

## Socket Event Contract

### Client → Server

|Event|Description|
|---|---|
|`command:take`|Play graphic|
|`command:clear`|Clear output|
|`data:csv-row`|Select CSV row|
|`data:start-polling`|Start polling|
|`data:stop-polling`|Stop polling|
|`join-session`|Join room|

### Server → Client

|Event|Description|
|---|---|
|`render:take`|Load graphic|
|`render:clear`|Clear output|
|`data:update`|Data update broadcast|

Naming format: `namespace:action`

---

## Daily Workflow

1. Pick task
    
2. Create branch
    
3. Develop
    
4. Run checks
    
5. Push & PR
    
6. Address feedback
    
7. Merge
    

### Standup Format

```
📅 Name — Date
✅ Done:
🔄 Today:
🚧 Blocked:
```

---

## Module Ownership

|Module|Owner|Backup|
|---|---|---|
|Editor Core|Dilhara|Anudhi|
|Editor UI|Parami|Nikini|
|Animations|Sharon|Anudhi|
|Data Sources|Nikini|Sharon|
|Backend API|Dilhara|Parami|
|Playout & Output|Anudhi|Dilhara|
|Socket.io|Dilhara|Parami|
|CI/CD|Dilhara|Nikini|

---

## Troubleshooting

### Port in Use

macOS/Linux:

```bash
lsof -i :3001
kill -9 <PID>
```

Windows:

```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Prisma Errors

```bash
npx prisma generate
npx prisma migrate dev
```

### TypeScript Errors

```bash
npm run build
npx tsc --noEmit
```

### Canvas Undefined

```ts
// ❌
state.canvas.elements

// ✅
state.canvas.present.elements
```

---

## Quick Reference

### Git

```bash
git checkout dev && git pull origin dev
git checkout -b feature/name-yourname
git add .
git commit -m "feat(scope): description"
git push origin feature/name-yourname
```

### Architecture Rules

```
✅ state.canvas.present.elements
✅ socketService.emit(...)
✅ id="gfx-${el.id}"
✅ fill: 'transparent'
✅ <CanvasImage>
✅ postMessage('play', '*')
✅ Tailwind classes
✅ Named exports
```

---

_Last updated: March 2026_  
_Maintained by: Graphyne Development Team_
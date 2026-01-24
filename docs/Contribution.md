Here is the completely updated **Graphyne Contributor Reference Card**, tailored to your current **React (Vite) + Node (Fastify) + Prisma (PostgreSQL)** stack and the new "HTML-First" architecture.

---

# Graphyne Contributor Reference Card

Welcome to the Graphyne development team! This document contains everything you need to know about our development workflow, coding standards, and collaboration practices. **This is the Source of Truth.**

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Quick Start](#quick-start)
3. [Repository Structure](#repository-structure)
4. [Branching Strategy](#branching-strategy)
5. [Commit Message Format](#commit-message-format)
6. [Pull Request Workflow](#pull-request-workflow)
7. [Issue Management](#issue-management)
8. [Code Standards](#code-standards)
9. [Daily Workflow](#daily-workflow)
10. [Communication Guidelines](#communication-guidelines)
11. [Module Ownership](#module-ownership)
12. [Troubleshooting](#troubleshooting)

---

## Tech Stack

We use a separated Client/Server architecture optimized for real-time broadcast graphics.

**Frontend (`graphyne-client`)**

- **Core:** React 19 + Vite + TypeScript
- **State:** Redux Toolkit (Canvas State)
- **Graphics:** `react-konva` (Editor), GSAP (Animations)
- **Styling:** Tailwind CSS (Utility-first)
- **Protocol:** Socket.io-client

**Backend (`graphyne-server`)**

- **Runtime:** Node.js
- **Framework:** Fastify (Low latency API)
- **Database:** PostgreSQL 16 (via Docker)
- **ORM:** Prisma 5 (Strictly v5, NOT v7/Alpha)
- **Storage:** Local File System (HTML compilation)

---

## Quick Start

### First Time Setup

Bash

```
# 1. Clone the repository
git clone https://github.com/teamgraphyne/graphyne.git
cd graphyne

# 1.5 Create .env file
Create .env file in /graphyne-server

type;
DATABASE_URL="postgresql://admin:admin@localhost:5432/graphyne_db?schema=public"

and Save.

# 2. Setup the Database (Docker)
# MUST be running before starting the server
docker-compose up -d

# 3. Setup Backend
cd graphyne-server
npm install
# Push schema to the Docker DB
npx prisma db push 

# 4. Setup Frontend (In a new terminal)
cd ../graphyne-client
npm install

# 5. Start Development
# Terminal A (Server): npm run dev
# Terminal B (Client): npm run dev
```

### Useful Commands

|**Scope**|**Command**|**Description**|
|---|---|---|
|**Root**|`docker-compose up -d`|Start Postgres & pgAdmin|
|**Root**|`docker-compose down`|Stop Database containers|
|**Server**|`npm run dev`|Start Fastify server (Port 3001)|
|**Server**|`npx prisma db push`|Sync `schema.prisma` changes to DB|
|**Server**|`npx prisma studio`|Open DB GUI in browser|
|**Client**|`npm run dev`|Start Vite server (Port 5173)|
|**Client**|`npm run lint`|Check for React/TS errors|

---

## Repository Structure

```
graphyne/
├── docker-compose.yml          # Database configuration
│
├── graphyne-client/            # Frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI
│   │   │   ├── Canvas/         # Editor Artboard logic
│   │   │   └── Editor/         # Toolbar, Properties Panel
│   │   ├── pages/              # EditorPage, PlayoutPage
│   │   ├── services/           # api.ts (Axios), socket.ts
│   │   ├── store/              # Redux Slices
│   │   └── types/              # TS Interfaces (Project, Canvas)
│   └── package.json
│
└── graphyne-server/            # Backend (Node)
    ├── data/                   # Local storage for compiled HTML
    ├── prisma/                 # Database Schema
    │   └── schema.prisma
    ├── src/
    │   ├── routes/             # graphics.ts (Assets), projects.ts (Playlists)
    │   └── server.ts           # Entry point & Socket.io hub
    └── package.json
```

---

## Branching Strategy

We follow **GitHub Flow** with a `develop` integration branch.

```
main (production-ready)
  │
  └── develop (staging/integration)
        │
        ├── feature/html-compiler
        ├── fix/socket-cors-error
        └── ui/properties-panel-styling
```

### Branch Naming Convention

|**Type**|**Pattern**|**Example**|
|---|---|---|
|Feature|`feature/<desc>`|`feature/gsap-integration`|
|UI Update|`ui/<desc>`|`ui/dark-mode-sidebar`|
|Bug Fix|`fix/<desc>`|`fix/iframe-scaling`|
|Chore|`chore/<desc>`|`chore/upgrade-prisma`|

### Branch Rules

- ✅ **Source:** Always branch from `develop`.
    
- ✅ **Sync:** Run `git pull origin develop` before creating your branch.
    
- ❌ **No Direct Commits:** Never push directly to `main` or `develop`.
    

---

## Commit Message Format

We follow **Conventional Commits**.

`type(scope): description`

### Types

- `feat`: New functionality
    
- `fix`: Bug fix
    
- `ui`: Visual changes (CSS/Tailwind)
    
- `chore`: Config/Deps changes
    
- `docs`: Documentation only
    
- `refactor`: Code restructuring
    

### Scopes

`client`, `server`, `editor`, `playout`, `canvas`, `db`, `socket`

### Examples

- `feat(server): add html compilation route`
    
- `fix(playout): resolve iframe scaling on 4k screens`
    
- `ui(editor): update toolbar icons to lucide-react`
    
- `chore(db): add updatedAt field to project model`
    

---

## Pull Request Workflow

### Creating a Pull Request

1. **Sync:** Ensure your branch is up to date with `develop`.
    
2. **Test:** Verify your feature works locally.
    
3. **Create:** Open PR against `develop` on GitHub.
    
4. **Template:**
    

Markdown

```
## Description
Implemented the ScaledFrame component to fix zooming issues in the Playout preview.

## Type of Change
- [ ] Feature
- [x] Bug fix
- [ ] UI Update

## Modules Affected
- [ ] Editor
- [x] Playout
- [ ] Backend

## Testing Instructions
1. Open Playout Page
2. Load a 1920x1080 graphic
3. Verify it fits inside the small preview window
```

### Review Process

- **Wait for 1 Approval.**
    
- **Squash and Merge** when ready.
    
- **Delete** the branch after merging.
    

---

## Issue Management

We use GitHub Issues/ClickUp to track tasks.

### Issue Labels

- `module:client` / `module:server`
    
- `priority:high` / `priority:medium`
    
- `bug` / `enhancement`
    

---

## Code Standards

### 1. The "HTML-First" Architecture

- **Graphics are Assets:** When saving in the Editor, we compile the state to an **HTML file**. This file is the source of truth for the renderer.
    
- **Projects are Playlists:** A "Project" in the database is strictly a list of references to these HTML files.
    
- **Redux is for Editing:** We embed the raw JSON in the HTML file (`<script id="graphyne-source">`) solely to allow re-editing later.
    

### 2. TypeScript Guidelines

- **Strict Typing:** Avoid `any`. Use interfaces defined in `src/types`.
    
- **Shared Types:** If a type is used by both Client and Server (e.g., `ProjectData`), define it manually in both `types` folders to ensure strict contracts.
    

### 3. Component Structure

TypeScript

```
// Imports: React -> 3rd Party -> Internal -> Styles
import { useState } from 'react';
import { Play } from 'lucide-react';
import { socketService } from '../services/socket';

// Types
interface Props {
  active: boolean;
}

// Component
export function TransportControl({ active }: Props) {
  // Logic
  const handlePlay = () => { ... };

  // Render
  return (
    <button onClick={handlePlay}>
       <Play />
    </button>
  );
}
```

---

## Daily Workflow

### Start of Day

1. **Pull Changes:** `git checkout develop && git pull`
    
2. **Start Docker:** `docker-compose up -d`
    
3. **Start Dev Servers:** `npm run dev` (in both client/server folders).
    

### End of Day

1. **Commit Work:** Push your feature branch.
    
2. **Stop Docker:** `docker-compose down` (Optional, saves resources).
    

---

## Communication Guidelines

- **#dev-frontend:** React, CSS, Canvas logic.
    
- **#dev-backend:** API, Database, Docker issues.
    
- **#standup:** Post daily updates by 10:00 AM.
    

**Standup Format:**

```
📅 [Name]
✅ Done: Wired up Playout to Database
🔄 Today: Implementing "Take" command via Sockets
🚧 Blockers: Need the new Prisma schema merged
```

---

## Module Ownership

|**Module**|**Owner**|**Responsibilities**|
|---|---|---|
|**Core / Backend**|**Dilhara**|Architecture, API, DB, HTML Compiler|
|**UI / Sockets**|**Parami**|Properties Panel, Socket.io, Real-time sync|
|**Tools / Data**|**Nikini**|Toolbar, Layer Manager, Data Inputs|
|**Animation / DevOps**|**Nishika**|GSAP Timelines, CI/CD, Docker|
|**Playout / Preview**|**Anudhi**|Playout Page, Iframe rendering, Export|

---

## Troubleshooting

### `DataSource "url" is not supported` (Prisma)

- **Cause:** You installed Prisma 7 (Alpha).
    
- **Fix:** Downgrade to Prisma 5.
    
    Bash
    
    ```
    npm uninstall prisma @prisma/client
    npm install prisma@5.10.2 @prisma/client@5.10.2 --save-dev
    ```
    

### `open //./pipe/dockerDesktop...`

- **Cause:** Docker Desktop is not running.
    
- **Fix:** Launch Docker Desktop app and wait for the green light.
    

### `500 Internal Server Error` (API)

- **Cause:** Frontend sending data that doesn't match the Schema.
    
- **Fix:** Check the Server Terminal logs. It will tell you exactly which field is missing or invalid.
    

### `Iframe is zoomed in/cropped`

- **Cause:** CSS scaling issue.
    
- **Fix:** Ensure you are using the `<ScaledFrame />` component in the Playout page, not a raw `<iframe>`.
    

---

Last updated: January 2026

Maintained by: Graphyne Development Team
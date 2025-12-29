# Graphyne Contributor Reference Card

Welcome to the Graphyne development team! This document contains everything you need to know about our development workflow, coding standards, and collaboration practices.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Repository Structure](#repository-structure)
3. [Branching Strategy](#branching-strategy)
4. [Commit Message Format](#commit-message-format)
5. [Pull Request Workflow](#pull-request-workflow)
6. [Issue Management](#issue-management)
7. [Code Standards](#code-standards)
8. [Daily Workflow](#daily-workflow)
9. [Communication Guidelines](#communication-guidelines)
10. [Module Ownership](#module-ownership)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### First Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/graphyne.git
cd graphyne

# 2. Install dependencies (we use pnpm)
pnpm install

# 3. Setup environment variables
cp .env.example .env

# 4. Start the database (Docker required)
docker-compose up -d

# 5. Run database migrations
pnpm db:migrate

# 6. Start development servers
pnpm dev
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm dev: web` | Start frontend only |
| `pnpm dev:server` | Start backend only |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run linter |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |

---

## Repository Structure

```
graphyne/
├── apps/
│   ├── web/                    # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── features/       # Feature-based modules
│   │   │   │   ├── editor/     # Canvas, layers, tools
│   │   │   │   ├── data/       # Data source configuration
│   │   │   │   ├── preview/    # Preview functionality
│   │   │   │   └── playback/   # Playout engine
│   │   │   ├── stores/         # Redux state management
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── utils/          # Helper functions
│   │   │   └── types/          # TypeScript definitions
│   │   └── package.json
│   │
│   └── server/                 # Node.js backend (Fastify)
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   ├── services/       # Business logic
│       │   ├── sockets/        # Socket.io handlers
│       │   ├── prisma/         # Database schema & migrations
│       │   └── utils/          # Server utilities
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types & utilities
│   └── graphics-engine/        # Core GSAP/Konva rendering logic
│
├── docs/                       # Documentation
└── . github/                    # GitHub configuration
```

---

## Branching Strategy

We follow **GitHub Flow** with a `develop` integration branch. 

```
main (production-ready, protected)
  │
  └── develop (integration branch, protected)
        │
        ├── feature/editor-canvas-setup
        ├── feature/layer-management
        ├── fix/canvas-resize-bug
        └── chore/update-dependencies
```

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<description>` | `feature/layer-drag-drop` |
| Bug Fix | `fix/<description>` | `fix/canvas-resize-issue` |
| Chore | `chore/<description>` | `chore/update-dependencies` |
| Documentation | `docs/<description>` | `docs/api-reference` |
| Refactor | `refactor/<description>` | `refactor/redux-store` |

### Branch Rules

- ✅ Always branch from `develop`
- ✅ Keep branch names lowercase with hyphens
- ✅ Use descriptive but concise names
- ❌ Never commit directly to `main` or `develop`
- ❌ Avoid special characters in branch names

### Common Branch Commands

```bash
# Create and switch to a new feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Keep your branch updated with develop
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git merge develop

# Push your branch
git push origin feature/your-feature-name
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
| `docs` | Documentation only | `docs(readme): update setup instructions` |
| `style` | Formatting, no code change | `style(components): fix indentation` |
| `refactor` | Code change, no new feature/fix | `refactor(store): simplify layer reducer` |
| `test` | Adding or updating tests | `test(utils): add formatTime tests` |
| `chore` | Maintenance tasks | `chore(deps): update React to 18.3` |
| `perf` | Performance improvement | `perf(canvas): optimize render loop` |
| `ci` | CI/CD changes | `ci(actions): add build caching` |

### Scopes

| Scope | Description |
|-------|-------------|
| `editor` | Editor/Creator module |
| `canvas` | Konva canvas functionality |
| `layers` | Layer management |
| `toolbar` | Toolbar components |
| `properties` | Properties panel |
| `data` | Data configuration module |
| `preview` | Preview module |
| `playback` | Playback engine |
| `api` | Backend API routes |
| `db` | Database/Prisma |
| `sockets` | WebSocket functionality |
| `ui` | General UI components |
| `store` | Redux state management |
| `deps` | Dependencies |
| `config` | Configuration files |

### Examples

```bash
# Feature
git commit -m "feat(editor): add drag-and-drop layer reordering"

# Bug fix with body
git commit -m "fix(canvas): resolve handle positioning on rotated objects

The transform handles were incorrectly positioned when objects
were rotated more than 90 degrees.  Fixed by applying rotation
matrix to handle coordinates."

# Breaking change
git commit -m "feat(api)! : change project save endpoint structure

BREAKING CHANGE: The /api/projects endpoint now requires
a 'version' field in the request body."

# With issue reference
git commit -m "fix(playback): stop memory leak in animation loop

Fixes #42"
```

### Commit Best Practices

- ✅ Use present tense ("add feature" not "added feature")
- ✅ Use imperative mood ("move cursor" not "moves cursor")
- ✅ Keep first line under 72 characters
- ✅ Reference issues when applicable
- ✅ Make atomic commits (one logical change per commit)
- ❌ Don't end the subject line with a period
- ❌ Don't include "WIP" commits in final PR

---

## Pull Request Workflow

### Creating a Pull Request

#### Step 1: Prepare Your Branch

```bash
# Ensure your branch is up to date
git checkout develop
git pull origin develop
git checkout feature/your-feature
git merge develop

# Run checks locally
pnpm lint
pnpm type-check
pnpm test

# Push your branch
git push origin feature/your-feature
```

#### Step 2: Create the PR

1. Go to GitHub repository
2. Click "Compare & pull request" or go to Pull Requests → New
3. Set base branch to `develop`
4. Fill out the PR template completely

#### Step 3: PR Template

```markdown
## Description
<!-- What does this PR do?  Provide context.  -->

Implements the layer drag-and-drop reordering feature, allowing users
to reorganize layers by dragging them in the layers panel.

## Related Issue
Closes #23

## Type of Change
- [x] Feature (new functionality)
- [ ] Bug fix (non-breaking fix)
- [ ] Refactor (code improvement, no functional change)
- [ ] Documentation
- [ ] Chore (dependencies, config, etc.)

## Module Affected
- [x] Editor (Creator)
- [ ] Data Configuration
- [ ] Preview
- [ ] Playback
- [ ] Backend/API
- [ ] Shared/Core

## Checklist
- [x] My code follows the project's style guidelines
- [x] I have performed a self-review
- [x] I have added comments where necessary
- [x] I have updated documentation if needed
- [x] My changes generate no new warnings
- [x] I have added tests that prove my fix/feature works
- [x] All tests pass locally

## Screenshots/Demo
<!-- If UI changes, add before/after screenshots or a video -->

| Before | After |
|--------|-------|
| ![before](url) | ![after](url) |

## Testing Instructions
1. Open the editor
2. Create multiple layers
3. Drag a layer to a new position
4. Verify the layer order updates correctly
```

### PR Review Process

#### As an Author

1. **Self-review first** - Check your own code before requesting review
2. **Keep PRs small** - Aim for <400 lines changed when possible
3. **Respond promptly** - Address review feedback within 24 hours
4. **Don't take it personally** - Reviews improve code quality

#### As a Reviewer

Use the following checklist:

```markdown
## Review Checklist
- [ ] Code solves the stated problem
- [ ] Code is readable and maintainable
- [ ] No obvious performance issues
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] TypeScript types are properly defined
- [ ] Follows project conventions
- [ ] Tests cover the changes
- [ ] No security vulnerabilities
```

#### Review Comment Prefixes

| Prefix | Meaning | Action Required |
|--------|---------|-----------------|
| `blocking: ` | Must be fixed before merge | Yes |
| `suggestion:` | Recommended improvement | Optional |
| `question:` | Clarification needed | Response needed |
| `nit:` | Minor/stylistic issue | Optional |
| `praise:` | Something done well!  | None 😊 |

Example:
```
blocking: This will cause a memory leak.  Please add cleanup in useEffect. 

suggestion: Consider extracting this into a custom hook for reusability. 

nit: Extra whitespace on line 42. 

praise: Great use of useMemo here!  👏
```

### Merging

- Requires **1 approval** minimum
- All CI checks must pass
- Use **Squash and merge**
- Delete branch after merging

---

## Issue Management

### Creating Issues

#### Feature Request Template

```markdown
## Feature Description
A clear description of the feature you're proposing.

## User Story
As a [type of user], I want [goal] so that [benefit]. 

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Module
- [ ] Editor (Creator)
- [ ] Data Configuration
- [ ] Preview
- [ ] Playback
- [ ] Backend/API

## Design Reference
[Link to Figma if applicable]

## Technical Notes
Any implementation considerations or constraints. 
```

#### Bug Report Template

```markdown
## Bug Description
What went wrong? 

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should have happened?

## Actual Behavior
What actually happened?

## Screenshots
[If applicable]

## Environment
- Browser: Chrome 120
- OS: Windows 11
- App Version: 0.1.0
```

### Issue Labels

| Label | Color | Use When |
|-------|-------|----------|
| `module: editor` | Purple | Related to editor/creator |
| `module:data` | Teal | Related to data config |
| `module:preview` | Gold | Related to preview |
| `module:playback` | Tomato | Related to playback |
| `module:backend` | Blue | Related to server/API |
| `priority:critical` | Red | Blocking issue |
| `priority:high` | Orange | Important, do soon |
| `priority:medium` | Yellow | Normal priority |
| `priority:low` | Green | Nice to have |
| `status:blocked` | Black | Waiting on something |
| `good-first-issue` | Purple | Good for newcomers |

### Linking Issues and PRs

```markdown
# In PR description - closes issue when merged
Closes #42
Fixes #42
Resolves #42

# In commit message
git commit -m "fix(canvas): resolve rendering bug

Fixes #42"

# Reference without closing
Related to #42
See #42
```

---

## Code Standards

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `LayerPanel. tsx` |
| Component styles | PascalCase + module | `LayerPanel.module.css` |
| Hooks | camelCase with `use` | `useCanvas.ts` |
| Utilities | camelCase | `formatTime.ts` |
| Types | PascalCase | `GraphicElement.ts` |
| Redux slices | camelCase + Slice | `editorSlice.ts` |
| Constants | SCREAMING_SNAKE | `API_ENDPOINTS.ts` |
| Test files | Same as source + test | `formatTime.test.ts` |

### Component Structure

```tsx
// 1. Imports - grouped and ordered
import { useState, useEffect } from 'react';           // React
import { useAppSelector, useAppDispatch } from '@/stores/hooks'; // Store
import { cn } from '@/utils/cn';                       // Utilities
import { Button } from '@/components/ui/Button';       // Components
import type { LayerPanelProps } from './LayerPanel. types'; // Types
import styles from './LayerPanel.module.css';          // Styles

// 2. Component definition
export function LayerPanel({ className, onLayerSelect }: LayerPanelProps) {
  // 2a.  Hooks (Redux, state, refs, etc.)
  const dispatch = useAppDispatch();
  const layers = useAppSelector((state) => state.editor.layers);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 2b. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 2c. Handlers
  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleLayerClick = (layerId: string) => {
    onLayerSelect? .(layerId);
  };

  // 2d.  Render helpers (if needed)
  const renderLayer = (layer: Layer) => (
    <div key={layer.id} onClick={() => handleLayerClick(layer.id)}>
      {layer.name}
    </div>
  );

  // 3. Return JSX
  return (
    <aside className={cn(styles. panel, className)}>
      <header className={styles.header}>
        <h2>Layers</h2>
        <Button onClick={handleToggle}>
          {isCollapsed ? 'Expand' : 'Collapse'}
        </Button>
      </header>
      {!isCollapsed && (
        <div className={styles.layerList}>
          {layers.map(renderLayer)}
        </div>
      )}
    </aside>
  );
}
```

### TypeScript Guidelines

```typescript
// ✅ DO:  Use explicit types for function parameters and returns
function calculatePosition(x: number, y:  number): Position {
  return { x, y };
}

// ✅ DO:  Use interfaces for object shapes
interface Layer {
  id:  string;
  name: string;
  visible: boolean;
  children?: Layer[];
}

// ✅ DO: Use type for unions and intersections
type LayerType = 'shape' | 'text' | 'image' | 'group';
type LayerWithType = Layer & { type: LayerType };

// ✅ DO: Use generics when appropriate
function findById<T extends { id: string }>(items: T[], id:  string): T | undefined {
  return items.find((item) => item.id === id);
}

// ❌ DON'T: Use `any`
function process(data: any) { } // Bad

// ✅ DO:  Use `unknown` and narrow the type
function process(data: unknown) {
  if (typeof data === 'string') {
    // data is string here
  }
}

// ❌ DON'T: Use non-null assertion without reason
const element = document.getElementById('app')!; // Bad

// ✅ DO: Handle null cases
const element = document.getElementById('app');
if (! element) throw new Error('App element not found');
```

### Import Order

```typescript
// 1. React and React-related
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// 2. Third-party libraries
import { motion } from 'framer-motion';
import Konva from 'konva';
import gsap from 'gsap';

// 3. Internal aliases (@/)
import { useAppSelector } from '@/stores/hooks';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/utils/formatTime';

// 4. Relative imports
import { LayerItem } from './LayerItem';
import type { LayerPanelProps } from './LayerPanel.types';

// 5. Styles
import styles from './LayerPanel.module.css';
```

---

## Daily Workflow

### Morning Routine

```
☀️ Start of Day Checklist:
─────────────────────────────
□ Pull latest from develop
□ Check Slack/Discord for updates
□ Review assigned issues in ClickUp
□ Check if any PRs need your review
□ Post standup update
```

### Standup Update Format

Post in `#standup` channel by 10:00 AM: 

```
📅 [Your Name] - [Date]
───────────────────────
✅ Yesterday: 
  • Completed layer drag-and-drop feature
  • Fixed canvas resize bug

🔄 Today: 
  • Implement layer grouping
  • Code review for PR #34

🚧 Blockers:
  • None / Waiting on API endpoint from Parami
```

### Development Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT WORKFLOW                     │
└─────────────────────────────────────────────────────────────┘

1. PICK TASK
   └─→ Select from ClickUp sprint board
   └─→ Move to "In Progress"
   └─→ Assign yourself if not assigned

2. CREATE BRANCH
   └─→ git checkout develop && git pull
   └─→ git checkout -b feature/task-name

3. DEVELOP
   └─→ Write code
   └─→ Write/update tests
   └─→ Commit frequently with proper messages

4. LOCAL CHECKS
   └─→ pnpm lint
   └─→ pnpm type-check
   └─→ pnpm test

5. PUSH & CREATE PR
   └─→ git push origin feature/task-name
   └─→ Create PR against develop
   └─→ Fill out PR template
   └─→ Request reviewers

6. ADDRESS FEEDBACK
   └─→ Respond to review comments
   └─→ Push fixes
   └─→ Re-request review if needed

7. MERGE
   └─→ Squash and merge when approved
   └─→ Delete branch
   └─→ Move ClickUp task to "Done"
```

### End of Day

```
🌙 End of Day Checklist:
─────────────────────────
□ Commit and push WIP if needed
□ Update ClickUp task status
□ Note any blockers for tomorrow
□ Respond to pending review comments
```

---

## Communication Guidelines

### Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| `#general` | Announcements, general discussion | 24 hours |
| `#dev-frontend` | Frontend technical discussions | 4 hours |
| `#dev-backend` | Backend technical discussions | 4 hours |
| `#code-review` | PR notifications (automated) | 24 hours |
| `#standup` | Daily async updates | N/A |
| `#help` | Quick questions, blockers | 2 hours |
| `#random` | Off-topic, team bonding | Whenever |

### Asking for Help

When asking for help, include:

```markdown
**What I'm trying to do:**
Implement layer grouping in the editor

**What I've tried:**
1.  Tried using Konva's Group class
2. Attempted to modify the layer tree structure

**What's happening:**
The layers are grouping but the transform handles
are not updating correctly

**Relevant code:**
[Code snippet or link to file]

**Error messages (if any):**
[Paste error]
```

### Meetings

| Meeting | When | Duration | Purpose |
|---------|------|----------|---------|
| Sprint Planning | Monday 10:00 AM | 1 hour | Plan sprint tasks |
| Weekly Sync | Thursday 2:00 PM | 1 hour | Progress, demos, blockers |
| Retro | End of sprint | 45 min | What went well/poorly |

---

## Module Ownership

### Primary Owners

| Module | Owner | Backup |
|--------|-------|--------|
| Editor Core & Architecture | Dilhara | Anudhi |
| Editor UI (Panels, Toolbar) | Anudhi | Milsha |
| Canvas & Animations | Milsha | Dilhara |
| Data Configuration | Milsha | Parami |
| Backend API & Database | Parami | Sharon |
| Preview & Playback | Sharon | Dilhara |
| WebSockets & Real-time | Sharon | Parami |
| CI/CD & DevOps | Sharon | Dilhara |

### Responsibilities

**As a Module Owner:**
- Review all PRs for your module
- Maintain documentation
- Make architecture decisions
- Onboard others working in your area
- Ensure test coverage

**As a Backup:**
- Stay familiar with module code
- Available to review when owner is unavailable
- Can answer basic questions

---

## Troubleshooting

### Common Issues

#### pnpm install fails

```bash
# Clear cache and reinstall
rm -rf node_modules
rm pnpm-lock. yaml
pnpm install
```

#### Database connection error

```bash
# Ensure Docker is running
docker-compose up -d

# Reset database
pnpm db:reset
```

#### Type errors after pulling

```bash
# Regenerate types
pnpm type-check

# If Prisma types are stale
pnpm db:generate
```

#### Port already in use

```bash
# Find and kill process (macOS/Linux)
lsof -i : 3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Git merge conflicts

```bash
# Update your branch with latest develop
git checkout develop
git pull origin develop
git checkout your-branch
git merge develop

# Resolve conflicts in your editor
# Then: 
git add . 
git commit -m "chore: resolve merge conflicts"
```

### Getting Help

1. **Check documentation** in `/docs` folder
2. **Search existing issues** on GitHub
3. **Ask in #help** channel with context
4. **Pair program** with module owner
5. **Raise in weekly sync** if still blocked

---

## Quick Reference

### Git Commands Cheat Sheet

```bash
# Start new feature
git checkout develop && git pull
git checkout -b feature/name

# Save work in progress
git add . 
git commit -m "wip: description"

# Update branch with develop
git fetch origin
git merge origin/develop

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo changes to file
git checkout -- path/to/file

# See what's changed
git status
git diff

# Push branch
git push origin feature/name

# Force push (after rebase only!)
git push origin feature/name --force-with-lease
```

### Commit Message Quick Reference

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
style(scope): formatting only
refactor(scope): restructure code
test(scope): add tests
chore(scope): maintenance
perf(scope): performance improvement
```

### PR Checklist

```
□ Branch is up to date with develop
□ All tests pass locally
□ No linting errors
□ Self-reviewed the code
□ PR template filled out
□ Screenshots added (if UI change)
□ Related issue linked
□ Reviewers assigned
```

---

## Need More Help?

- 📖 **Documentation**: Check `/docs` folder
- 💬 **Quick questions**: `#help` channel
- 🐛 **Found a bug**: Create a GitHub issue
- 💡 **Have an idea**:  Discuss in `#general` first
- 👥 **Need pairing**: Ask in your module channel

---

*Last updated: December 2025*
*Maintained by: Graphyne Development Team*
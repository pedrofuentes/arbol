# Development Workflow

> Extended workflow context for AI agents. Referenced from AGENTS.md.
> **The MUST rules (TDD, branching, worktrees, incremental development, Sentinel) are enforced in AGENTS.md.**
> This document covers the detailed HOW.

---

## Git Worktrees for Isolation

Every increment MUST use a git worktree for isolation:

```bash
# Fetch latest main, create worktree with new branch
git fetch origin main
git worktree add .worktrees/feature-name -b feat/feature-name main

# Change into the worktree
cd .worktrees/feature-name

# List active worktrees
git worktree list

# Remove a worktree when done (after merge — cd back to main worktree first)
cd S:\Pedro\Projects\Arbol
git worktree remove .worktrees/feature-name
git branch -D feat/feature-name
```

### Why Worktrees Are Required
- Prevents interference between parallel work
- Each agent/increment has a clean working directory
- No risk of uncommitted changes from one task affecting another
- Easy cleanup after merge

## Branching Details

### Branch Lifecycle
1. Fetch latest: `git fetch origin main`
2. Create worktree + branch from `main`: `git worktree add .worktrees/name -b feat/name main && cd .worktrees/name`
3. TDD: write failing tests, implement, refactor
4. Commit following the format in AGENTS.md
5. Push branch: `git push -u origin feat/name`
6. Open PR: `gh pr create` or via GitHub UI
7. Invoke Sentinel for review
8. Address any Sentinel feedback, re-submit
9. On Sentinel approval, merge to `main`
10. Cleanup: `cd S:\Pedro\Projects\Arbol && git worktree remove .worktrees/name && git branch -D feat/name`

### Branch Naming Convention

| Prefix | Use For |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code refactoring |
| `docs/` | Documentation changes |
| `test/` | Test additions or fixes |
| `chore/` | Build, CI, dependency updates |

## Commit Format

```
type(scope): short description

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`, `perf`

## Pull Request Process

### Before Opening a PR
1. All 2,798+ tests pass: `npm run test`
2. Linting passes: `npm run lint`
3. Build succeeds: `npm run build`
4. Commit messages follow the format
5. PR represents a single logical unit

### Pre-Merge Version Bump (Final Commit)

Before requesting merge, the final commit must include:

1. **Bump `version` in `package.json`** — patch (bug fix), minor (new feature), major (breaking change)
2. **Update `CHANGELOG.md`** — new `## [x.y.z]` section with Added/Changed/Fixed/Removed
3. **Update `docs/roadmap.md`** — mark completed items `[x]`
4. **Update other docs if affected** — `README.md`, `docs/contributing.md`, `AGENTS.md`
5. **Commit:** `chore: bump version to x.y.z`

The version in `package.json` is the single source of truth — injected into the app at build time and displayed in the footer.

### Sentinel Review
→ See [`docs/SENTINEL.md`](./SENTINEL.md) for the full process and invocation methods.

### After Merge
```bash
cd S:\Pedro\Projects\Arbol
git worktree remove .worktrees/feature-name
git branch -D feat/name
git pull origin main
```

## Sub-Agent Delegation

### When to Delegate
- Complex research that requires deep analysis
- Documentation generation (>100 words)
- Test data creation or fixture generation
- Performance profiling and optimization analysis
- Security vulnerability assessment

### How to Delegate
- Provide the sub-agent with full context (requirements, constraints, relevant code)
- Copy TDD rules + Boundaries from AGENTS.md into the sub-agent prompt
- Each sub-agent works in its own context
- Integrate sub-agent output back into the main work
- All sub-agent output must follow AGENTS.md rules

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite HMR)
npm run test         # Run all tests (2,798 across 112 files)
npm run test:watch   # Watch mode
npm run build        # Production build (tsc + vite build)
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
npm run format:check # Prettier check
npm run type-check   # TypeScript type checking (tsc --noEmit)
```

## Deployment

**GitHub Pages only** — triggered by pushing to `main`. Do NOT use Netlify, Vercel, or any other platform.

```bash
git push origin main --tags   # Push to GitHub — Actions handles the rest
```

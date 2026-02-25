---
name: commit-organizer
description: Runs git status from project root, checks changed files for lint errors, organizes changes into granular conventional commits, and asks for confirmation before pushing. Use when the user wants to organize commits, prepare a push, or says "organize my commits" or "prepare my changes for commit."
---

# Commit Organizer

Organize uncommitted changes into granular conventional commits. Run from the **synapp** project root.

## Workflow

### 1. Get changed files

From project root:

```bash
git status
```

Capture all modified, added, and deleted files. Ignore untracked unless the user explicitly includes them.

### 2. Check for lint/errors

Run the project's lint and type checks:

```bash
pnpm lint
pnpm typecheck
```

Fix any reported errors before proposing commits. If lint fails, address issues and re-run until clean.

### 3. Organize into conventional commits

Group changed files into **granular** commits using [Conventional Commits](https://www.conventionalcommits.org/):

**Format:** `type(scope): description`

| Type | Use for |
|------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `docs` | Documentation only |
| `style` | Formatting, whitespace, semicolons (no code change) |
| `refactor` | Code change that neither fixes nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build, config, deps, tooling |
| `perf` | Performance improvements |

**Rules:**
- One logical unit per commit (small, focused changes)
- Split large changes into multiple commits when logical
- Scope: optional, the affected area (e.g. `auth`, `ui`, `db`)
- Description: imperative mood, lowercase, no period
- Max ~72 chars for the subject line

**Examples:**

```
feat(auth): add login form validation
fix(dashboard): correct date range filter
docs(readme): update setup instructions
chore(deps): upgrade eslint to v9
refactor(api): extract auth middleware
```

### 4. Present plan and ask for confirmation

Show the proposed commit structure:

```markdown
## Proposed commits

1. **feat(scope): description** – files: `path/a.ts`, `path/b.ts`
2. **fix(scope): description** – files: `path/c.ts`
...
```

Then ask:

> "Does this commit structure look good? Reply with 'yes' to execute these commits and push, or describe any changes you'd like."

### 5. Execute (after confirmation)

Only after explicit confirmation:

1. `git add` files per commit group
2. `git commit -m "type(scope): message"` for each
3. `git push` (or `git push origin <branch>`)

## Edge cases

- **No changes:** Report "No uncommitted changes found."
- **Lint won't fix:** List errors and ask if user wants to proceed anyway or fix manually.
- **Single logical change:** One commit is fine; no need to over-split.
- **Mixed concerns in one file:** Prefer splitting with `git add -p` when it makes the history clearer.

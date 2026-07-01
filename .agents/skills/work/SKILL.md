---
name: work
description: Start isolated implementation work from a Linear issue key by fetching Linear context, branching from the default branch, and creating a git worktree. Use when the user asks to start work on a Linear issue such as BET-5, work an issue, create an isolated branch/worktree, or prepare an implementation plan from Linear.
---

# Work

Start work from a Linear issue in an isolated git worktree. Pull issue context from Linear before planning or coding.

## Inputs

Require a Linear issue key such as `BET-5`.

Ask a follow-up question before continuing when:

- No Linear issue key is provided.
- Linear MCP access is unavailable.
- The default branch cannot be determined.
- The branch or worktree path already exists and the safe next action is unclear.
- The issue lacks enough context to plan implementation safely.

## Workflow

1. Resolve and fetch the Linear issue.
   - Use the Linear MCP server only; do not use GitHub issues for issue context.
   - Fetch the issue by key, including title, description, status, labels, project, assignee, links, and acceptance criteria if present.
   - Stop if the issue does not exist, is canceled/closed/done, or cannot be fetched.

2. Read project guidance.
   - Read `AGENTS.md` and other relevant local guidance before planning.
   - Note repo commands, testing expectations, branch naming conventions, and gotchas.

3. Determine the default branch.
   - Prefer the remote default branch:

```bash
git remote show origin
```

   - Fall back to `main` if the repo clearly uses `main`.
   - Ask before using a guessed default branch when unclear.

4. Create a safe branch name.
   - Build a slug from the Linear title: lowercase, hyphenated, short, ASCII where practical.
   - Use this format:

```text
<user-or-initials>/<linear-key-lowercase>-<slug>
```

   - If no user prefix convention is known, ask whether to use a prefix or default to `<linear-key-lowercase>-<slug>`.

5. Create an isolated worktree from the default branch.
   - Fetch and update the default branch:

```bash
git fetch origin
git checkout <default-branch>
git pull --ff-only origin <default-branch>
```

   - Use a sibling worktree path:

```text
../<repo-name>-<linear-key-lowercase>
```

   - If the path exists, ask whether to reuse it, remove it, or choose another path.
   - Create the worktree and new branch:

```bash
git worktree add ../<repo-name>-<linear-key-lowercase> -b <branch-name> <default-branch>
```

6. Build the implementation plan in the new worktree.
   - Explore relevant files from inside the worktree.
   - Identify likely code changes, tests, docs, migrations, config, and risks.
   - Map each plan item back to Linear context and acceptance criteria.
   - Ask follow-up questions when requirements are ambiguous or acceptance criteria are missing.

7. Stop for approval before implementation.
   - Present the Linear issue summary, branch name, worktree path, plan, risks, and open questions.
   - Do not edit code until the user approves the plan.

## Gotchas

- This skill starts work from Linear issues, not GitHub issues.
- Always create a worktree for isolation unless the user explicitly asks to work in-place.
- Do not branch from the current feature branch; branch from the default branch.
- Do not overwrite an existing worktree or branch without confirmation.
- If Linear context is thin, ask follow-up questions before planning broad implementation work.

## Output

Use this format:

```text
Linear issue: <KEY> — <title>
Branch: <branch-name>
Worktree: <path>
Base: <default-branch>

Issue context
- Status: <status>
- Project/labels: <project/labels>
- Acceptance criteria: <summary or missing>

Plan
1. <specific implementation step>
2. <specific test/update step>

Open questions
- <questions that must be answered before implementation>

Next step: approve the plan before I make code changes.
```

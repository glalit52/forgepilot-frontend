# How to start building ForgePilot in Claude Code

## 1. Put the kit in your frontend repo

Copy these into the **root** of your frontend repo and commit them:

```
CLAUDE.md
docs/PRD.md
docs/frontend-spec.md
docs/backlog-phase1-frontend.md
mocks/mock-data.json
KICKOFF_PROMPTS.md   (optional)
```

Claude Code reads `CLAUDE.md` automatically at the start of every session.

## 2. First prompt (paste into Claude Code, in your forgepilot cloud environment)

```
Read CLAUDE.md, docs/PRD.md, docs/frontend-spec.md and docs/backlog-phase1-frontend.md.
Then look at what is already in this repo.

Tell me in plain English (I'm non-technical):
1. What is already set up, and anything that conflicts with CLAUDE.md.
2. Your plan for ticket FE-01 (project setup), including the exact commands.

Then do FE-01 on a new branch called fe/FE-01-setup. When finished, run
lint, typecheck and tests, and open a pull request explaining what you did
and how I can see it running.
```

## 3. Prompt for every next ticket

```
Do ticket FE-0X from docs/backlog-phase1-frontend.md on a new branch
fe/FE-0X-<short-name>. Follow CLAUDE.md. Meet every acceptance criterion,
run lint, typecheck, tests (and Playwright if the ticket names a journey),
then open a PR. In the PR description, explain in plain English what
changed and how to check it, with screenshots of new screens.
```

Go in order: FE-01 → FE-04 first (foundation), then FE-05 onwards.

## 4. Reviewing work as a non-technical founder

After each PR, ask Claude Code:

```
Start the app and give me a short checklist to click through for this
ticket. List anything you were unsure about or skipped.
```

Check the screens against `docs/frontend-spec.md`. Merge only when the
checklist works and the PR says all checks passed.

## 5. Useful habits

- One ticket per session keeps Claude Code focused.
- If a screen looks wrong, describe what you expected and point to the
  spec section (e.g. "P-06 Approvals: approve should take ≤3 clicks").
- When something important is decided (e.g. a library or a design rule),
  ask Claude Code to add it to CLAUDE.md so every future session knows.
- Have your CTO (or a senior engineer) review the first 3–4 PRs for
  structure and security before you build further.

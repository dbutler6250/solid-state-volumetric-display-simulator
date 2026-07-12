# Solid State Volumetric Display

## How to use this file

- Mandatory startup context for this repository:
  - Read this file at the start of every new task in this repo before doing any work.
  - Treat the repo constraints, preferences, and verification steps here as binding unless the user explicitly overrides them.
  - If this file changes, re-read it before continuing work in the repository.

## Project Context

- Read `PROJECT_CONTEXT.md` and `HANDOFF.md` for the summary from prior ChatGPT thread(s). Do not waste tokens reading project context if already known.
- Treat GitHub Issues as the source of truth for active work. Use `MILESTONES.md` only as a completed-work history.

## GitHub Issue Workflow

- Before implementation, read the target GitHub Issue and confirm the goal, scope, acceptance criteria, and any linked discussion.
- If an issue is underspecified, stop before coding and ask concise clarification questions. Do not implement from an unclear issue.
- Once clarified, prefer updating the issue with the goal, scope, and acceptance criteria before implementation.
- Work one issue per branch unless the user explicitly groups issues.
- Use a branch name that includes the issue number and short slug, for example `issue-12-angle-heatmaps`.
- Keep the diff focused on the issue. Do not include unrelated cleanup.
- Reference the issue in the PR body with a closing keyword such as `Closes #12` only when the PR fully satisfies the issue.
- After a PR is merged or an issue is otherwise completed, update `MILESTONES.md` if the work represents durable completed project history.
- Keep `HANDOFF.md` current after each task with status, verification commands, and remaining follow-up.

## Living Files

- `HANDOFF.md` — current status for continuity

Refresh includes: current status, next steps, test results, artifacts, environment details. Keep it brief!

## Preferences

- Prefer explicit, highly readable code over clever optimization
- Keep simulation code reusable so additional optical structures can be added later
- Treat the quarter-wave optical stack as the first supported structure, not the whole architecture
- Always run these checks sequentially to verify your work before declaring a task complete:
    - Test: `npm.cmd run test`
    - Lint: `npm.cmd run lint`
    - Build: `npm.cmd run build`
- Always open the ChatGPT browser to `http://127.0.0.1:5173/` when starting a new task in this project
    - This is the local vite dev server
    - Powershell commands to start the dev server are in `README.md`
    - This dev server should always be started when working in this project
- Be mindful of token usage and act efficiently
    - Carry out normal tasks on your own, only notifying when necessary
    - Do not read full files unless absolutely necessary
    - Do not randomly explore directories, ask if not obvious
    - Produce the minimal diff necessary
    - Code only as much as possible, provide little explanation unless asked

## Commenting Standards

When adding or changing code, include concise comments where they improve maintainability.

* Add brief TSDoc/JSDoc comments above new major exports, React components, solvers, validators, import/export helpers, data models, and non-trivial utilities.
* Use inline comments only for dense math, optics/domain logic, compatibility handling, complex conditionals, or non-obvious React/browser behavior.
* Explain intent, constraints, or assumptions; do not restate obvious code.
* Keep comments short, accurate, and consistent.
* Use generic optical stack / quarter-wave stack wording. Use Bragg wording only for legacy compatibility.
* When editing existing code, comment only the touched areas that need clarification.

Definition of done: new or changed non-trivial code is commented where useful, without changing behavior or APIs.

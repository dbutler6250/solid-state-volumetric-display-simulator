# Solid State Volumetric Display

## How to use this file

- Skim once at the start of a session to align on policies

## Project Context

- Read `PROJECT_CONTEXT.md` and `HANDOFF.md` for the summary from prior ChatGPT thread(s). Do not waste tokens reading project context if already known.

## Milestone Status

- Read `MILESTONES.md` for the latest status of what has been completed and what remains.

## Constraints and Preferences

### Restricted Files

Do not edit the following files unless explicitly asked:
- `README.md`
- `MILESTONES.md`

### Living Files

- `HANDOFF.md` — current status for continuity

Refresh includes: current status, next steps, test results, artifacts, environment details. Keep it brief!

### Project Constraints

- TBD

### Preferences

- Prefer explicit, highly readable code over clever optimization
- Keep simulation code reusable so additional optical structures can be added later
- Treat the quarter-wave optical stack as the first supported structure, not the whole architecture
- Always run these checks sequentially to verify your work before declaring a task complete:
    - Test: `npm.cmd run test`
    - Lint: `npm.cmd run lint`
    - Build: `npm.cmd run build`
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

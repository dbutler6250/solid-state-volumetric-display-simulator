# Solid State Volumetric Display

## How to use this file

- Skim once at the start of a session to align on policies

## Project Context

- Read `PROJECT_CONTEXT.md` for the imported summary from the prior ChatGPT thread before making architectural decisions. Do not waste tokens reading project context if already known.

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
- Treat the Bragg reflector as the first supported structure, not the whole architecture
- Always run these checks sequentially to verify your work before declaring a task complete:
    - Test: `npm.cmd run test`
    - Lint: `npm.cmd run lint`
    - Build: `npm.cmd run build`
- Be mindful of token usage and act efficiently
    - Carry out normal tasks on your own, only notifying when necessary
    - Do not read full files unless absolutely necessary
    - Do not randomly explore directories, ask if not obvious
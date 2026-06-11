# Adonai Tareas

## Project-Local AI Workflow

This repository uses a project-local ECC setup.

- Prefer the skills in `.agents/skills/` before any global or home-directory skills.
- If a local ECC skill overlaps with another installed skill, use the local project copy first.
- Treat `.vendor/ecc-plus/ECC-main/` as the full vendored ECC repository imported into this repo.
- Treat `.codex/config.toml` and `.codex/AGENTS.md` as the default Codex configuration for work in this repository.

## Full ECC Source In Repo

When a task would benefit from broader ECC context, consult the vendored local repo before relying on external or global guidance:

- `.vendor/ecc-plus/ECC-main/skills/`
- `.vendor/ecc-plus/ECC-main/.agents/skills/`
- `.vendor/ecc-plus/ECC-main/rules/`
- `.vendor/ecc-plus/ECC-main/docs/`
- `.vendor/ecc-plus/ECC-main/hooks/`
- `.vendor/ecc-plus/ECC-main/plugins/`
- `.vendor/ecc-plus/ECC-main/mcp-configs/`
- `.vendor/ecc-plus/ECC-main/.codex/`

The active runtime integration still comes from the project-root `.agents/` and `.codex/`, but the entire vendored ECC repo is available locally as reference and reusable source material.

## Priority Skills For This Repo

For normal feature work, debugging, refactors, and vibecoding in this codebase, prefer these local skills first:

- `frontend-patterns`
- `coding-standards`
- `verification-loop`
- `tdd-workflow`
- `security-review`
- `e2e-testing`
- `documentation-lookup`
- `backend-patterns`
- `api-design`

## Stack Notes

- Frontend: Vite, React, Tailwind, TypeScript
- Desktop/mobile surfaces: Electron, Android/Capacitor
- Backend integrations: Supabase
- Product and UI context: `DESIGN.md`
- Design media MCP: prefer Higgsfield for AI image/video/design-media generation when the MCP is available. Ask before actions that spend external credits.

## Working Rules

- Keep changes aligned with the existing app structure and product direction.
- Prefer project-local scripts and dependencies over adding new tooling.
- Validate important changes with the relevant local verification flow when feasible.

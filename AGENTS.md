<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Monorepo: clinic-medicine-storage-monitor

Vite+ monorepo with three workspaces (see `pnpm-workspace.yaml`):

- `server/` — NestJS API (MQTT telemetry ingest, SQLite, health checks, Scalar docs). Dev: `vp run server#dev` (PORT env, default 3000). Health: `GET /health`.
- `dashboard/` — TanStack Router SPA (React + shadcn/ui on Base UI). Dev: `vp run dashboard#dev` (port 3000); point at the API via `VITE_API_BASE_URL`.
- `mqtt-tester/` — MQTT test client. Dev: `vp run mqtt-tester#dev`.

## Common Commands (run from the workspace root)

- `vp install` — install all workspace dependencies.
- `vp run --parallel server#dev dashboard#dev` (or `vp run dev`) — run API + UI together. Give the server a different port when both default to 3000, e.g. `PORT=3001`.
- `vp run -r build` — build all workspaces.
- `vp run -r test` — test all workspaces.
- `vp check` — format, lint, and type-check the whole repo (runs on pre-commit via `.vite-hooks`).
- `vp run <package>#<script>` — target one workspace, e.g. `vp run dashboard#generate-routes`.

## Conventions

- One lockfile (`pnpm-lock.yaml`) and one dependency catalog (`pnpm-workspace.yaml`) at the root. Use `catalog:` for shared deps (`vite`, `vite-plus`, `typescript`, `@types/node`).
- Shared tooling lives at the root: `vite.config.ts` (fmt/lint/run cache), `.vite-hooks/` (pre-commit dispatcher), `.github/`, `.vscode/`. Do not add per-package copies.
- `server/oxlint.json` holds server-specific lint overrides; keep package-level overrides next to the package that needs them.

## Containers (podman compose)

- `server/Containerfile` (multi-stage, `node:24-alpine` runtime) and `dashboard/Containerfile`
  (build with Vite+, serve via `nginx-unprivileged:alpine`). Build contexts are the repo root.
- `compose.yaml` brings up `mosquitto` + `server` + `dashboard`: `podman compose up -d --build`.
  Needs the podman API socket: `systemctl --user start podman.socket`.
- API: `http://localhost:3000` (`/health`), UI: `http://localhost:10080` (`DASHBOARD_PORT` to override), MQTT: `localhost:1883`.
- `VITE_API_BASE_URL` is baked into the dashboard image at build time (build arg, defaults to
  `http://localhost:3000`); SQLite persists in the `server-data` volume.

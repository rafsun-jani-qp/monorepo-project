# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run everything from the repo root — this is an npm workspaces monorepo, so `npm install` must always be run at the root, never inside `apps/*` or `packages/*`.

- `npm install` — install/link all workspaces
- `npm run dev` — `turbo run dev`; runs `be`'s and `fe`'s `dev` scripts in parallel (Nest in watch mode + Vite), each output prefixed by package name
- `npm run build` — `turbo run build` across all packages (respects dependency graph via `dependsOn: ["^build"]`)
- `npm run lint` — `turbo run lint`
- `npm run check-types` — `turbo run check-types`
- `npm run format` — `prettier --write` over the whole repo
- Run a task for a single package: `npx turbo run dev --filter=be` (or `--filter=fe`), or the `package#task` shorthand — `npx turbo run be#dev` / `npx turbo run fe#dev`
- Backend (`apps/be`) unit tests: `npm run test --workspace=be`, or `cd apps/be && npx vitest run src/app.controller.spec.ts` for a single file
- Backend e2e tests: `cd apps/be && npm run test:e2e` (separate Vitest config, matches `**/*.e2e-spec.ts` under `test/`)
- See `apps/be/CLAUDE.md` for backend-specific commands and architecture notes not repeated here.

## Architecture

Turborepo monorepo using **npm workspaces** (`apps/*`, `packages/*`), Node >=24, npm 11.12.1 pinned via `devEngines`. Task orchestration/caching is defined in `turbo.json`.

**Internal dependency gotcha:** internal packages must be referenced with the plain npm version range `"*"` (e.g. `"@repo/shared-types": "*"`), never the `workspace:*` protocol — that syntax is pnpm/yarn/bun-only and npm fails outright with `EUNSUPPORTEDPROTOCOL` if it appears anywhere in the tree.

### Apps

- **`apps/be`** ("be") — NestJS backend. ESM (`"type": "module"`), `moduleResolution: nodenext`, so relative imports use explicit `.js` extensions even though sources are `.ts`. Vitest (not Jest) for tests. See `apps/be/CLAUDE.md` for the `@nestjs/observe` wiring and other module-level details.
- **`apps/fe`** ("fe") — Vite + React 19 frontend. TypeScript project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`), `moduleResolution: bundler`. Linted with `oxlint` rather than the shared `@repo/eslint-config`. Currently the default Vite starter UI plus a `Card` import from `@repo/shared-types`.

### Packages

- **`packages/shared-types`** (`@repo/shared-types`) — shared React component library consumed by both `be` and `fe`. Its `package.json` `exports` map has two entries that must be kept in sync when adding components: `"."` → `./src/index.ts` (the barrel) and `"./*"` → `./src/*.tsx` (direct subpath imports of an individual component, e.g. `@repo/shared-types/Card`). Only `Card` is currently re-exported from `index.ts`; `button.tsx` and `code.tsx` exist in `src/` as leftovers from the original `create-turbo` scaffold but are not exported from the barrel.
- **`packages/eslint-config`** (`@repo/eslint-config`) — shared ESLint configs (`./base`, `./next-js`, `./react-internal`). The `next-js` config is currently unused since the original Next.js apps (`docs`, `web`) have been removed from the repo.
- **`packages/typescript-config`** (`@repo/typescript-config`) — shared `tsconfig.json` bases (`base.json`, `nextjs.json`, `react-library.json`). `nextjs.json` is likewise vestigial now that no Next.js app remains.

### Known stale artifacts

- **`README.md`** at the repo root is the original unmodified `create-turbo` starter README — it describes `docs`/`web` (Next.js apps) and `@repo/ui`, none of which exist anymore (replaced by `apps/be`, `apps/fe`, and `packages/shared-types`). Don't trust it for current app names or structure.
- **`turbo.json`**'s `build` task only declares `.next/**` as `outputs`, which doesn't match either current app's real build output (`fe` → `dist/`, `be` → `dist/` via `nest build`). This was written for the original Next.js apps and hasn't been updated, so Turbo's build caching for `fe`/`be` may not capture the right artifacts.

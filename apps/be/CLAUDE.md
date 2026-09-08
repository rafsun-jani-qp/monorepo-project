# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run start:dev` — run the app in watch mode (default local dev)
- `npm run start` / `npm run start:debug` / `npm run start:prod` — other run modes (the latter runs compiled `dist/main`)
- `npm run build` — compile via `nest build`
- `npm run lint` — lint `src/` and `test/` with oxlint (config in `oxlint.json`)
- `npm run test` — run unit tests (vitest, matches `**/*.spec.ts`)
- `npm run test:watch` — unit tests in watch mode
- `npm run test:cov` — unit tests with coverage
- `npm run test:e2e` — e2e tests (uses `vitest.config.e2e.ts`, matches `**/*.e2e-spec.ts` under `test/`)
- Single test file: `npx vitest run src/app.controller.spec.ts` (or `npx vitest run test/app.e2e-spec.ts --config ./vitest.config.e2e.ts` for e2e)

## Architecture

- Standard single-module NestJS starter: `AppModule` → `AppController` → `AppService`. There is only one feature module (`app.module.ts`) so far — as the app grows, new features should be added as their own Nest modules rather than piling into `AppModule`.
- `src/main.ts` bootstraps via `NestFactory.create` and listens on `process.env.PORT` (fallback `3000`). **Note:** no `@nestjs/config`/`dotenv` is wired up, so values in `.env` are NOT automatically loaded into `process.env` — the `.env` file currently has no effect on the running app.
- `app.module.ts` wires in `@nestjs/observe` via `createObserveModule()`, exporting `ObserveModule` (imported into `AppModule`) and `ObserveInstrument` (passed to `NestFactory.create` in `main.ts` as the `instrument` option). Both pieces must stay in sync if this module is touched.
- Module resolution is `nodenext` (`tsconfig.json`): relative imports in TypeScript source use explicit `.js` extensions (e.g. `import { AppService } from './app.service.js'`), even though the source files are `.ts`.
- Vitest (not Jest) is the test runner; `vite-tsconfig-paths` resolves tsconfig path aliases. Unit tests (`*.spec.ts`) and e2e tests (`*.e2e-spec.ts`) use separate Vitest configs (`vitest.config.ts` vs `vitest.config.e2e.ts`).

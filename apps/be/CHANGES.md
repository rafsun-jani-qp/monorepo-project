# Changes: `userName` + `password` on the `User` entity

Per-file list of everything changed in `apps/be` this session.

---

### `src/modules/users/entity/user.entity.ts`

**Changed:** Added `userName` (`@Column({ unique: true })`) and `password`
(`@Column({ select: false })`, `@Exclude()`) columns. Added a `@BeforeInsert() hashPassword()`
hook that hashes `password` with `bcrypt` before insert.

**Why:** These are the two new fields requested. `select: false` keeps `password` out of
`find()`/`findOneBy()` results by default. `@Exclude()` (needs the `ClassSerializerInterceptor`
in `main.ts` to take effect) additionally strips `password` from the object returned by
`save()` — without it, the bcrypt hash was leaking straight into the `POST /users` response,
since `select: false` only affects query results, not an entity already in memory.
`@BeforeInsert` hashes the password automatically on every insert, from any code path, rather
than requiring each caller to remember to hash it manually. `unique: true` on `userName`
reflects that it's a login identifier.

---

### `src/migrations/1788973917638-AddUserNameAndPasswordToUsers.ts` (new)

**Changed:** Migration that adds `userName`/`password` as nullable columns, backfills existing
rows (`userName: 'user_' || id prefix`, `password: 'CHANGE_ME'`), then applies `NOT NULL` and a
`UNIQUE` constraint on `userName`.

**Why:** The app runs with `synchronize: false`, so schema changes only happen through
migrations, not by editing the entity alone. It backfills instead of adding the columns as
`NOT NULL` directly because the live `users` table already had 2 rows — a straight `NOT NULL`
add would have failed. Ran against the real `experiment_db` container with your confirmation;
those 2 pre-existing rows now carry placeholder credentials and can't log in until reset.

---

### `src/modules/users/dto/create-user.dto.ts` (new)

**Changed:** `CreateUserDto` with `class-validator` decorators — `@IsString`/`@IsNotEmpty` on
`name`/`userName`, `@IsEmail` on `email`, `@IsString`/`@MinLength(8)` on `password`.

**Why:** Requested DTO for the create payload, so bad input (missing fields, invalid email,
short password) is rejected at the request boundary instead of hitting the DB or getting
hashed anyway.

---

### `src/modules/users/controller/user.controller.ts`

**Changed:** `create()` now takes `@Body() data: CreateUserDto` instead of `Partial<User>`.

**Why:** Wires the new DTO into the actual route so its validation decorators apply to
incoming requests.

---

### `src/modules/users/service/user.service.ts`

**Changed:** `create()` takes `CreateUserDto`, no longer hashes manually (moved to the entity
hook), and wraps `save()` in a try/catch that throws `ConflictException` (409) on a Postgres
unique-violation (`error.driverError.code === '23505'`).

**Why:** Password hashing was moved into the entity's `@BeforeInsert` hook, so the duplicate
manual `bcrypt.hash(...)` call here was removed — keeping both would have hashed the password
twice. The try/catch was added because posting a duplicate `userName` was crashing with an
unhandled `500 Internal Server Error`; a `409 Conflict` with a clear message is the correct
response for a uniqueness violation, confirmed by testing the endpoint directly.

---

### `src/main.ts`

**Changed:** Added a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
and a global `ClassSerializerInterceptor`.

**Why:** A DTO's `class-validator` decorators do nothing until a `ValidationPipe` is registered
to enforce them — this makes `CreateUserDto` actually reject invalid requests.
`whitelist`/`forbidNonWhitelisted` additionally reject any request body property not declared
on the DTO (e.g. a client trying to set `id` directly), returning 400 instead of silently
dropping it. `ClassSerializerInterceptor` is what makes the entity's `@Exclude()` on `password`
actually apply to outgoing responses — without it, `@Exclude()` alone does nothing.

---

### `package.json`

**Changed:** Added `bcrypt` + `@types/bcrypt`, `class-validator`, `class-transformer`
(installed from the repo root, per this repo's workspace rules).

**Why:** `bcrypt` for password hashing; `class-validator` for the DTO decorators;
`class-transformer` for `@Exclude()`/`ClassSerializerInterceptor`. None of these were
previously a dependency of `be`.

---

## Flagged, not changed

- `GET /users/:id` on a non-existent id returns `200` with an empty body instead of
  `404 Not Found` — pre-existing, unrelated to this work, left as-is.
- No login/auth endpoint exists to verify a password against its hash (`bcrypt.compare`).
- No update endpoint exists yet — if one is added, a naive `@BeforeUpdate` hashing hook would
  re-hash the password on every update (even ones that don't touch it), corrupting it; that
  needs a "did the password actually change" check, not solved by the current `@BeforeInsert`.

---

## Clarification: migration workflow (write file first, or run a command that writes it?)

Two different npm scripts produce a migration file, and neither of them touches the DB by
itself — a third command applies it:

1. **`npm run migration:generate`** — connects to the **live DB**, diffs it against your
   entities, and auto-writes a migration file with the SQL it detects. Entity first, then this
   writes the migration for you. Example: `npm run migration:generate -- src/migrations/AddUserNameAndPasswordToUsers`.
2. **`npm run migration:create`** — writes a blank empty migration file (no DB connection, no
   diffing). You fill in the SQL yourself.
3. **`npm run migration:run`** — the only command that actually changes the DB. It applies
   whatever migration files already exist (from either #1 or #2). There is no path where
   `migration:run` writes the file for you.

So the order is always: **edit entity → get a migration file (generate or create) → `migration:run`.**

**Why this migration was hand-written instead of `migration:generate`:** the live `users`
table already had 2 rows. `migration:generate` only detects "these columns are missing" — it
would have added `userName`/`password` as `NOT NULL` with no backfill, which fails against
existing rows. The file was written by hand instead, adding the columns nullable, backfilling
placeholder values, then applying `NOT NULL`/`UNIQUE` — see the
`user.entity.ts`/migration entry above for what and why.

# Users API — search & filter

## What changed

- **`dto/find-users-query.dto.ts`** (new) — `FindUsersQueryDto` with two optional query params:
  - `userName?: string`
  - `loginCount?: number`
- **`controller/user.controller.ts`** — `GET /api/users` now takes `@Query() query: FindUsersQueryDto`.
- **`service/user.service.ts`** — `findAll(query)` builds the filters instead of doing a blind `find()`.

Usage:

```
GET /api/users                              -> all users
GET /api/users?userName=raf                 -> userName contains "raf" (case-insensitive)
GET /api/users?loginCount=3                 -> loginCount exactly 3
GET /api/users?userName=raf&loginCount=3    -> both, ANDed together
```

## Why a query DTO

The app's global `ValidationPipe` (`main.ts`) is `{ whitelist: true, forbidNonWhitelisted: true }`. That means any `@Query()` param has to be declared on a DTO or the request is rejected with 400 — so a typed DTO wasn't optional, it's how every input already gets validated in this codebase. `IsOptional()` on both fields keeps the filters non-mandatory.

## Why `userName` uses `ILIKE`

`userName` is a **search**, not an exact lookup, so it's matched with:

```ts
qb.andWhere('user.userName ILIKE :userName', { userName: `%${userName}%` });
```

- `ILIKE` = Postgres's case-insensitive `LIKE` (the DB here is Postgres — confirmed in `app.module.ts` / `data-source.ts`). Case-insensitive felt like the right default for a "search by name" feature — a user searching `raf` should find `Rafsun`.
- Wrapping in `%...%` makes it a substring match, not a prefix/exact match, matching what "search" usually means in a UI.
- The value is bound as a parameter (`:userName`), not string-concatenated, so it's not SQL-injectable.

## Why `loginCount` is an exact match, not a search

`loginCount` is a number, so "search" doesn't really apply — it's filtered with plain equality:

```ts
qb.andWhere('user.loginCount = :loginCount', { loginCount });
```

If a range filter (`>=`, `<=`) turns out to be more useful later, that's a small extension to this same DTO/query — not a redesign.

## Why `QueryBuilder` instead of `repository.find({ where })`

Both filters are optional and independent, so the query is assembled conditionally:

```ts
const qb = this.userRepository.createQueryBuilder('user');
if (userName) qb.andWhere(...);
if (loginCount !== undefined) qb.andWhere(...);
return qb.getMany();
```

`QueryBuilder` was picked over `find({ where: {...} })` mainly for **explicitness** — the generated SQL clause is written by hand and easy to read/extend later (joins, `OR` conditions, raw functions) without restructuring the method. The tradeoff: for only two flat filters, `find()` + TypeORM's `ILike()` operator would be a few lines shorter and just as safe. Either is fine at this scale; `QueryBuilder` gives more headroom if the filtering grows.

## The bug this went through, and the fix

**Symptom:** every `GET /api/users` call — even with _no_ query params — started returning `500 Internal server error`.

**Cause:** the first version of the DTO was:

```ts
@Transform(({ value }) => Number(value))
@IsInt()
loginCount?: number;
```

`@Transform` ran during class-transformer's plain-object → class-instance conversion **regardless of whether `loginCount` was present in the query string**. With no `loginCount` param, `value` was `undefined`, and `Number(undefined)` is `NaN` — not `undefined`. So:

- `@IsOptional()` no longer applied (the value wasn't `undefined`/`null` anymore by the time validation ran).
- The DTO ended up with `loginCount: NaN` even on a bare `/api/users` request.
- The service's `loginCount !== undefined` check passed (`NaN !== undefined` is `true`), so `andWhere('user.loginCount = :loginCount', { loginCount: NaN })` was always added.
- Postgres rejected the query outright: `invalid input syntax for type integer: "NaN"`, which Nest surfaces as a generic 500.

This was confirmed by running the same query directly against the DB (worked fine outside Nest) and then capturing the actual stack trace from a second local instance — the `NaN` parameter was visible in the failing SQL.

**Fix** — make the transform a no-op when the param is absent, so `loginCount` genuinely stays `undefined` and `@IsOptional()` behaves correctly:

```ts
@Transform(({ value }) => (value === undefined ? undefined : Number(value)))
@IsInt()
@Min(0)
loginCount?: number;
```

Verified after the fix: bare `/api/users`, `?userName=...`, `?loginCount=...`, both combined, and an invalid `?loginCount=abc` (now a correct `400`, not `500`) all behave as expected.

## Known gaps / not done here

- **No pagination or sorting** — `/api/users` still returns every matching row in one response. Fine at current data volume, but the first thing to add once the table grows.
- **`loginCount` is exact-match only** — no `gte`/`lte` range filtering.
- **Leading-wildcard `ILIKE`** (`%value%`) can't use a plain B-tree index on `userName`, so this will do a sequential scan on a large table. Not a concern yet; if it becomes one, Postgres `pg_trgm` + a GIN index (or a real search engine) is the usual next step.

# API key generation + API-key-only user lookup

You had already written the API key feature (entity, service, controller, guard, an empty
migration stub) in a prior commit; it didn't run. This section covers making it actually work,
then locking `GET /api/users/:id` down to API keys only.

---

### `src/modules/apiKey/entity/api-key.entity.ts`

**Changed:** Added the missing `@Entity('api_keys')` decorator.

**Why:** Without it, TypeORM doesn't treat the class as a mapped table at all — `autoLoadEntities`
never picks it up, `migration:generate` has nothing to diff against, and the whole feature is
inert even though every other file (service, controller, guard) looks complete.

---

### `src/app.module.ts`

**Changed:** Imported `ApiKeyModule` and added it to `AppModule`'s `imports` array.

**Why:** `ApiKeyModule` existed but was never registered anywhere — its controller, service, and
guard were dead code, invisible to Nest's DI container and to routing.

---

### `src/migrations/*-AddApiKeyEntity.ts`

**Changed:** The committed migration was an empty stub (`up`/`down` both did nothing, despite the
migrations table already recording it as "run"). Deleted it and regenerated a real one via
`npm run migration:generate`, which produced the actual `CREATE TABLE "api_keys" (...)` /
`DROP TABLE "api_keys"` SQL. Ran it against the local `experiment_db` container.

**Why:** An empty migration means the table never existed — every call to
`apiKeyRepository.save(...)` would have failed at runtime with a "relation does not exist" error.
Confirmed the table now exists and holds rows correctly after the fix (tested by generating a key
and checking it in Postgres directly).

---

### `src/modules/apiKey/controller/api-key.controller.ts`

**Changed:** `createApiKey(@Body() userId: string, label?: string)` →
`createApiKey(@Req() req: Request & { user: { sub: string } }, @Body('label') label?: string)`,
calling `this.apiKeyService.generateApiKey(req.user.sub, label)`. Removed an unused
`@InjectRepository(ApiKey)` that was only referenced by the commented-out (not implemented)
`revoke` endpoint.

**Why — the original code was broken two ways:**
- `label` had **no parameter decorator**, so Nest never populated it — every key was generated
  with `label: undefined`, silently.
- `@Body() userId: string` bound the **entire JSON body** to a variable typed (and named) as if
  it were just the id — and worse, it let the *caller* dictate whose account the key belongs to
  by putting any `userId` in the request body. Since this route sits behind `AuthGuard`, the
  actual user is already known from their JWT; trusting a client-supplied `userId` instead means
  anyone with a valid token could mint an API key for a different account.

**Why `@Req() req`:** `AuthGuard` (`auth.guard.ts`) already ran before this handler and, on a
valid token, does `request['user'] = payload` — it stashes the decoded JWT onto the raw request
object. `@Req()` is how a controller method reaches that raw Express `Request` to read what the
guard attached to it.

**Why `req.user.sub`:** `sub` is the JWT's standard **"subject"** claim (RFC 7519) — "who this
token is about." Look at how the token is minted in `auth.service.ts`:
```ts
const payload = { sub: user.id, username: user.userName };
```
So `req.user.sub` is simply *the id of whoever is currently logged in, as recorded in their own
token* — that's the trustworthy `userId` to stamp the new key with, as opposed to one taken from
the request body. The `Request & { user: { sub: string } }` type exists only because Express's
base `Request` type has no `user` property — it's added at runtime by the guard, so without the
intersection type, `req.user` wouldn't type-check under this project's `strict` TypeScript config.

**Why `@Body('label')`:** `label` (used in `api-key.service.ts`'s `generateApiKey(userId, label)`)
is an optional, purely cosmetic string — e.g. `"my laptop key"` — so a user can tell their keys
apart later; it has no security role. `@Body('label')` extracts just that one field from the JSON
body (`{"label": "..."}`), rather than `@Body()` with no argument, which would bind the whole body
object.

---

### `src/modules/apiKey/guard/api-key.guard.ts`

**Changed:** `const userId = await this.apiKeyService.validateApiKey(rawKey); ... request.userId = userId;`
→ `const apiKey = await this.apiKeyService.validateApiKey(rawKey); ... request.userId = apiKey.userId;`

**Why:** `validateApiKey` returns the full `ApiKey` entity (or `null`), not a bare user id string —
the old code stored that whole entity onto `request.userId`, mislabeled as if it were just the id.
Anything downstream reading `request.userId` expecting a UUID string would have gotten an object
instead. Caught this while wiring the guard onto `GET /api/users/:id`.

---

### `src/modules/users/userModules.ts`

**Changed:** Imported `ApiKeyModule` into `UserModules`'s `imports`.

**Why:** `UserController` now uses `@UseGuards(ApiKeyGuard)`, and `ApiKeyGuard` depends on
`ApiKeyService`. Nest resolves a guard's dependencies from the module that declares the
controller it's attached to, so without importing `ApiKeyModule` here, DI would fail to construct
`ApiKeyGuard` for `UserController`.

---

### `src/modules/users/controller/user.controller.ts`

**Changed:** `GET /api/users/:id` went from `@UseGuards(AuthGuard)` to `@Public() @UseGuards(ApiKeyGuard)`.
Removed the now-unused `AuthGuard` import.

**Why:** You asked for this endpoint to be reachable **only** via API key, not JWT. `AuthGuard` is
registered globally as `APP_GUARD` in `auth.module.ts`, so it already runs on *every* route unless
that route is marked `@Public()`. Adding `@UseGuards(ApiKeyGuard)` alone would have stacked it on
top of the global `AuthGuard` — a caller would then need **both** a valid JWT *and* a valid API
key to pass. `@Public()` opts this one route out of the global JWT check, leaving `ApiKeyGuard`
(which requires an `x-api-key` header) as the only gate.

Verified all three cases directly: no credentials → `401`; a valid JWT with no API key → `401`;
`x-api-key: <generated key>` → `200` with the user record.

---

### `API_GUIDE.md` (both `apps/be/API_GUIDE.md` and `apps/fe/API_GUIDE.md`, kept identical)

**Changed:** Added a `POST /api-key` section (body, response shape, curl example). Updated
`GET /api/users/:id` from "Requires auth" to "API key only", with an example using `x-api-key`
instead of `Authorization: Bearer`.

**Why:** The docs were stale/wrong the moment the guard changed — a reader following the old
"Requires auth" example with a Bearer token would get a `401` with no explanation why.

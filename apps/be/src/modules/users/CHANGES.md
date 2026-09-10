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

**Symptom:** every `GET /api/users` call — even with *no* query params — started returning `500 Internal server error`.

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

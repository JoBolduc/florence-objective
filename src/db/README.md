# db/

Local SQLite storage (expo-sqlite), opened once by `<SQLiteProvider>` in `src/app/_layout.tsx`.

- `migrations.ts`: schema history. `PRAGMA user_version` holds the current version; `migrate()` runs each pending migration in its own transaction.
- `repositories.ts`: the only code that writes SQL for app data. Screens get them through `useRepositories()` from `@/db`.
- `testing/node-sqlite.ts`: test-only adapter that runs the same SQL on Node's built-in SQLite.

## Rules

- **Never edit a shipped migration.** Change the schema by appending `{ version: n + 1, up: '...' }` to `MIGRATIONS`, and add a test that it applies on existing data.
- Every table has the sync columns `id` (client UUID), `created_at`, `updated_at`, `deleted_at`, `logged_by`. Timestamps are UTC ISO 8601 strings.
- Never `DELETE` rows: set `deleted_at` (and `updated_at`) so the deletion can sync (E2).
- Every write bumps `updated_at`; sync resolves conflicts with it (last write wins).
- Events store both `occurred_at` (UTC) and `local_date` (the phone's calendar day), so days follow local midnight.

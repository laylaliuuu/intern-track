# INTERN TRACKER — PROJECT COMMANDS (update as repo evolves)

Read this before making changes:
- README.md
- docs/ (overview/requirements/architecture if present)
- package.json / tsconfig.json
- .env.example (if present)
- existing tests

Standard workflow:
1) Implement smallest vertical slice first (end-to-end).
2) Add unit tests immediately after each new module/function.
3) Run tests after each feature, and re-run regression tests.

Local dev:
- Install deps:
  - `npm install`
- Run dev server:
  - `npm run dev`
- Run tests:
  - `npm test`
- Lint:
  - `npm run lint`
- Typecheck:
  - `npx tsc --noEmit` (or add to package.json as `npm run typecheck`)

DB / Supabase:
- Apply migrations:
  - `npm run db:migrate` (runs `supabase db push`)
- Seed data:
  - (no explicit seed script - use Supabase dashboard or manual SQL)

Ingestion runs:
- Run full ingestion:
  - `curl -X POST http://localhost:3000/api/ingestion -H "Content-Type: application/json" -d '{"maxResults": 200, "dryRun": false}'`
  - Or use the script: `bash scripts/daily-update.sh` (requires dev server running)
- Run recent re-check:
  - `curl "http://localhost:3000/api/validate-pipeline?limit=20" | jq`

Definition of Done for any PR/feature:
- Code is modular (no giant functions).
- Unit tests added for new logic.
- Existing tests still pass (regression).
- No changes violate intern-tracker-mvp rules:
  - no scoring/tracking
  - never guess values ("Not found")
  - excluded not visible by default
  - site_added_date rules honored


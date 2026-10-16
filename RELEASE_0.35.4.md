# Lead Intelligence v0.35.4 — Staging Validation

## Purpose

`0.35.4` is a validation release on top of `0.35.3`. It does not introduce a new product surface. The goal is to make staging verification reproducible before the `1.0.0` release decision.

## Validation scope

- production-like Docker Compose stack
- PostgreSQL and Redis readiness
- API readiness
- registration, cookie auth, `/auth/me`, logout and post-logout rejection
- organization membership and active tenant selection
- cross-tenant organization and lead access rejection
- discovery options and overview
- lead list
- billing plans and subscription provisioning
- invalid crawl input rejection
- optional real worker crawl against `example.com`
- backup/restore release assets

## Commands

Start and validate the complete staging stack:

```bash
cp .env.production.example .env
# replace all production secrets/URLs before running staging
./scripts/staging-validate.sh
```

Run application smoke tests against an already-running environment:

```bash
API_URL=https://api-staging.example.com/api/v1 node scripts/staging-smoke.mjs
```

Run the real crawler path as well:

```bash
SMOKE_RUN_CRAWL=true API_URL=https://api-staging.example.com/api/v1 node scripts/staging-smoke.mjs
```

For CI or an externally managed staging stack, skip Docker startup:

```bash
SKIP_START=true API_URL=https://api-staging.example.com/api/v1 ./scripts/staging-validate.sh
```

## Expected outcome

The validation command must finish with:

```text
STAGING VALIDATION PASSED
```

Any failed tenant-isolation or authentication assertion blocks promotion to `1.0.0`.

## Known limitations

- Full dependency installation/build still depends on registry/network availability.
- Real YooKassa checkout requires staging credentials and should be tested separately with a provider test environment.
- The optional crawler test depends on outbound network access from the worker container.

# Lead Intelligence v1.0.0

Commercial B2B lead discovery and sales workspace.

## Current release

`v1.0.0 — First Production Release`

The first production release is ready after the 0.35.x hardening and staging-validation cycle: discovery, enrichment, CRM, outreach, sequences, AI sales tooling, analytics and billing are backed by production-oriented authentication, tenant isolation, queue workers, health checks and deployment tooling.

## Apps

- `apps/web` — Next.js web application
- `apps/api` — NestJS API
- `apps/worker` — BullMQ/Puppeteer worker
- `packages/domain` — domain types
- `packages/shared` — shared queue contracts

## Local development

```bash
pnpm install
pnpm dev
```

Configure PostgreSQL and Redis through `.env` or use the Docker Compose stack.

## Production

See `DEPLOYMENT.md` and `.env.production.example`.

```bash
docker compose up -d --build
```

API readiness:

```text
/api/v1/health
/api/v1/health/ready
```

Worker health is available inside the Compose network at `/health`.

## Security baseline

- Short-lived JWT access tokens are delivered through HttpOnly cookies.
- Refresh tokens are rotated and stored hashed in PostgreSQL.
- Organization-scoped API controllers require authentication.
- Organization context is taken from the authenticated user for tenant-sensitive endpoints.
- Production CORS rejects `*`.
- Production security headers are enabled.
- SSRF protections validate public HTTP(S) targets and redirects.
- PostgreSQL and Redis are not exposed by default.
- Runtime secrets are supplied through environment/secret management, never committed.

## Backups

Use the provided scripts and keep backups off-host:

```bash
./deploy/backup-postgres.sh
./deploy/restore-postgres.sh ./backups/<dump-file>
```

Always perform a restore drill before relying on backups for disaster recovery.

## Release documentation

- `RELEASE_1.0.0.md`
- `RELEASE_CHECKLIST_1.0.0.md`
- `DEPLOYMENT.md`

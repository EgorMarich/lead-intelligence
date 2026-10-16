# Lead Intelligence v1.0.0 — First Production Release

## Release status

`v1.0.0` is the first production release of Lead Intelligence.

The release follows the 0.35.x hardening cycle, which established production-oriented authentication, tenant isolation, background workers, health checks, deployment tooling, staging smoke validation, and session-security hardening.

## Product surface

Lead Intelligence provides a B2B lead discovery and sales workspace covering:

- website/business discovery;
- crawling and enrichment;
- lead scoring and intelligence;
- CRM and lead management;
- outreach and sales sequences;
- AI Sales Intelligence;
- AI Reply Copilot;
- AI Sales Automation;
- AI Sales Manager;
- analytics and revenue reporting;
- organization/member management;
- subscription billing and YooKassa integration.

## Production hardening included

- HttpOnly cookie-based access/refresh authentication.
- Hashed refresh tokens in PostgreSQL.
- Atomic refresh-token rotation with replay rejection.
- Authenticated organization membership validation on every protected request.
- Explicit tenant context for organization-sensitive operations.
- Cross-tenant access protection for organizations and leads.
- Tenant-scoped crawl cancellation.
- Authentication rate limiting with bounded in-memory cleanup.
- Production CORS restrictions and security headers.
- HSTS in production responses.
- SSRF protection for public HTTP(S) targets and redirects.
- PostgreSQL and Redis are not published from the Compose stack.
- PostgreSQL/Redis health checks and API readiness checks.
- BullMQ worker health endpoint.
- Backup and restore scripts.
- Reproducible staging smoke and validation scripts.
- Unified application version metadata at `1.0.0`.

## Promotion gate

The release is considered production-ready only when the staging environment passes the checks in `RELEASE_CHECKLIST_1.0.0.md`.

The critical gates are:

1. PostgreSQL and Redis are healthy.
2. Migrations complete successfully.
3. API readiness is healthy.
4. Web and worker start successfully.
5. Register/login/me/refresh/logout work end-to-end.
6. Refresh-token replay is rejected.
7. Organization switching remains consistent with `/auth/me`.
8. Cross-tenant organization and lead access is rejected.
9. Discovery and lead flows complete through the worker.
10. Billing subscription creation and the YooKassa staging flow are verified.
11. Backup and restore are verified on a disposable database.
12. No P0/P1 issues remain open.

## Validation note

Repository-side static and syntax validation was completed during release preparation. Docker container builds and external-provider checkout must be executed on the staging/production host because the release-preparation environment does not provide a Docker daemon or live external-provider credentials.

## Rollback

Keep the previous `0.35.5` image/archive available until the production smoke test has passed. If a P0/P1 regression is discovered, stop traffic, restore the previous application version, and follow the database rollback procedure documented in `DEPLOYMENT.md`.

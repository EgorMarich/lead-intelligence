# Lead Intelligence v1.0.0 — Production Deployment

## Production topology

- `web` — Next.js application
- `api` — NestJS API
- `worker` — BullMQ/Puppeteer worker
- `postgres` — persistent database
- `redis` — persistent queue/cache

Postgres and Redis are intentionally not published to the host. Put the web and API behind an HTTPS reverse proxy and expose only the required public ports.

## Deploy

1. Copy `.env.production.example` to `.env`.
2. Replace every placeholder with real production values.
3. Set `CORS_ORIGIN` to the exact browser origin(s), comma-separated if needed. Never use `*` in production.
4. Set `NEXT_PUBLIC_API_URL` to the public HTTPS API URL.
5. Configure YooKassa and `BILLING_RETURN_URL` when billing is enabled.
6. Build and start:

```bash
docker compose up -d --build
```

7. Verify:

```text
GET /api/v1/health
GET /api/v1/health/ready
```

## Database migrations

Migrations run through the one-shot `migrate` service before API/worker start. TypeORM `synchronize` remains disabled in production.

## Backups

Run `deploy/backup-postgres.sh` from the project root. The script writes a PostgreSQL custom-format dump to `BACKUP_DIR` (default `./backups`). Copy backups to separate storage and encrypt them according to your infrastructure policy.

Restore to a disposable/staging database first:

```bash
./deploy/restore-postgres.sh ./backups/<dump-file>
```

A backup is not considered operationally valid until restoration has been tested.

## Security

- Authentication uses short-lived HttpOnly access cookies and rotating refresh tokens stored hashed in PostgreSQL.
- Never put access or refresh tokens into `localStorage`.
- Keep `JWT_SECRET`, database credentials, payment keys and provider tokens in a secret manager or protected environment.
- Do not expose Postgres or Redis publicly.
- Prefer Chromium sandboxing when the container runtime permits it. Use `BROWSER_NO_SANDBOX=true` only when the container isolation model is trusted.
- Swagger is disabled by default in production.
- Organization-scoped endpoints require JWT authentication.
- Website intelligence and browser crawling validate public targets and re-check redirects to reduce SSRF risk.

## Billing

Required production variables when paid plans are enabled:

```text
YOOKASSA_SHOP_ID
YOOKASSA_SECRET_KEY
YOOKASSA_API_URL
BILLING_RETURN_URL
```

Checkout rejects a return URL from a different origin than the configured billing return URL.

## Smoke test

- [ ] Registration works.
- [ ] Login works.
- [ ] Page refresh preserves authentication.
- [ ] Refresh-token rotation works.
- [ ] Logout invalidates the refresh token.
- [ ] Unauthorized requests receive 401.
- [ ] Search job is queued and processed by worker.
- [ ] Lead CRM actions work.
- [ ] Crawl job processes URLs and records failures.
- [ ] Website intelligence rejects private/local targets.
- [ ] Analytics, revenue and command center load.
- [ ] YooKassa test payment/webhook works when enabled.
- [ ] PostgreSQL backup and restore drill succeeds.
- [ ] API and worker health checks remain green after restart.

## CI limitation in the packaging environment

The repository includes GitHub Actions CI. The packaging environment used to prepare this release did not have access to the npm registry or a Docker daemon, so dependency installation and Docker builds were not executed locally. CI should remain the authoritative build verification step until a networked deployment runner is available.

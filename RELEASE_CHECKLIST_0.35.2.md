# v0.35.3 Production Readiness Checklist

## Before first deployment
- [ ] Generate a strong `JWT_SECRET`.
- [ ] Set unique PostgreSQL credentials.
- [ ] Set `CORS_ORIGIN` to the real app origin(s).
- [ ] Set `NEXT_PUBLIC_API_URL` to the public API URL.
- [ ] Configure YooKassa keys and `BILLING_RETURN_URL` if billing is enabled.
- [ ] Keep `SWAGGER_ENABLED=false` in production.
- [ ] Decide whether Chromium can run with sandbox enabled; prefer `BROWSER_NO_SANDBOX=false` when the container permits it.
- [ ] Put TLS/reverse proxy in front of the services.

## Smoke test
- [ ] Register a new account.
- [ ] Log in and refresh the page.
- [ ] Log out and verify `/auth/me` returns 401.
- [ ] Create a search and confirm the worker processes it.
- [ ] Open leads and CRM actions.
- [ ] Run website intelligence against a public site.
- [ ] Run crawl job and verify progress/failure handling.
- [ ] Open analytics/revenue/command center.
- [ ] If billing is enabled, perform a test checkout and verify webhook state transitions.

## Operations
- [ ] Monitor `/api/v1/health` and `/api/v1/health/ready`.
- [ ] Monitor worker `/health`.
- [ ] Schedule `deploy/backup-postgres.sh` daily and copy backups off-host.
- [ ] Test `deploy/restore-postgres.sh` on a non-production database before relying on it.

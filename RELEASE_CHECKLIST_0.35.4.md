# Lead Intelligence v0.35.4 — Staging Checklist

## Infrastructure

- [ ] `docker compose config` passes
- [ ] PostgreSQL healthy
- [ ] Redis healthy
- [ ] API `/health/ready` returns `ready`
- [ ] Worker health endpoint is healthy
- [ ] Web container starts successfully
- [ ] PostgreSQL/Redis are not publicly exposed

## Authentication

- [ ] Register creates user + organization
- [ ] Access and refresh cookies are `HttpOnly`
- [ ] `/auth/me` succeeds while authenticated
- [ ] Logout revokes refresh token and clears cookies
- [ ] `/auth/me` fails after logout
- [ ] Refresh rotation works
- [ ] Inactive/deleted membership cannot authenticate to the organization

## Tenant isolation

- [ ] Organization A cannot be read by user B
- [ ] Leads from organization A cannot be read by user B
- [ ] Crawl jobs are scoped to the selected organization
- [ ] Communications are scoped to the selected organization
- [ ] Billing subscription/history are scoped to the selected organization
- [ ] Organization switching refreshes the session before changing tenant context

## Core workflow

- [ ] Discovery options load
- [ ] Discovery overview loads
- [ ] Crawl job is accepted
- [ ] Worker consumes a crawl job
- [ ] Crawl results are readable only by the owning organization
- [ ] Lead list loads
- [ ] Lead creation/activity attribution uses the authenticated user

## Billing

- [ ] Plans endpoint returns active plans
- [ ] Free subscription is provisioned for a new organization
- [ ] Checkout rejects missing idempotency key
- [ ] Checkout rejects an untrusted return URL
- [ ] YooKassa test checkout works in staging when credentials are configured
- [ ] YooKassa webhook is idempotent

## Recovery

- [ ] `deploy/backup-postgres.sh` creates a valid backup
- [ ] Backup can be restored into an isolated PostgreSQL instance
- [ ] Application can start against restored data

## Promotion gate

`1.0.0` should only be considered after the staging smoke command passes and every unchecked item above has either been completed or explicitly documented as a known release exception.

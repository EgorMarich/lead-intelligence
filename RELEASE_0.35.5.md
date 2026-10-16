# Lead Intelligence v0.35.5 — Final Hardening

## Purpose

v0.35.5 is the final hardening release after the v0.35.4 staging-validation pass. It does not introduce product features; it closes authentication/session edge cases and makes the staging gate reproducible.

## Changes

- `/auth/me` now resolves the organization from the authenticated tenant context, so the response remains consistent after organization switching.
- Refresh-token rotation is atomic: a token can only be rotated once, closing the concurrent-refresh race where two requests could reuse the same token.
- Staging smoke now verifies refresh rotation and refresh-token replay rejection.
- Production API sends HSTS and `Retry-After` on authentication rate-limit responses.
- Optional `TRUST_PROXY=true` support makes rate limiting use the client IP when the API is behind a single trusted reverse proxy.
- In-memory authentication rate-limit state performs bounded cleanup to avoid unbounded growth.
- Release version is unified at `0.35.5`.

## Promotion gate

Before `v1.0.0`, run the staging stack and require:

1. PostgreSQL and Redis healthy.
2. API `/health/ready` reports `ready`.
3. Web starts successfully.
4. Register/login/me succeeds.
5. Refresh rotation succeeds and replay is rejected.
6. Organization selection remains consistent with `/auth/me`.
7. Cross-tenant organization and lead access is rejected.
8. Invalid crawl input returns HTTP 400.
9. Optional real crawl completes when `SMOKE_RUN_CRAWL=true`.
10. Logout invalidates the access session.
11. Billing subscription endpoint provisions the organization subscription.

## Validation limits

The repository environment used to prepare this release does not provide a Docker daemon or npm registry access, so a real container build and external-provider checkout cannot be claimed as locally executed. The release scripts are intended to be executed on the staging host with Docker and real environment secrets.

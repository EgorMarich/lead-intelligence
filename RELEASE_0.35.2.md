# Lead Intelligence v0.35.3 — Production Readiness

## Scope
Production-readiness hardening on top of v0.35.1.

### Security
- Protected organization-scoped controllers with JWT authentication.
- Removed obsolete prototype login/session flow and client-side session storage.
- Organization context for lead/crawl/communication/website endpoints now comes from the authenticated JWT.
- Production CORS and security headers retained.
- Billing return URLs are constrained to the configured billing origin.
- Website intelligence retains SSRF protections and redirect re-validation.

### Reliability
- Added `/api/v1/health/ready` readiness endpoint checking PostgreSQL and Redis.
- API/worker health checks use readiness/health endpoints.
- Application version is exposed consistently as `0.35.3`.
- Added PostgreSQL backup and restore scripts.

### Billing
- Production billing configuration documented in `.env.production.example`.
- Checkout requires a configured return URL and rejects cross-origin return URLs.

## Verification
- ZIP integrity checked with `unzip -t`.
- Source-level checks run locally where possible.
- Full dependency installation, TypeScript build and Docker build require network access to the npm registry and a Docker daemon; those were not available in the packaging environment.

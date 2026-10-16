# v0.35.1 Release Checklist

## Build
- [ ] `pnpm install` completes from a clean checkout
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `pnpm web:build` passes
- [ ] Docker API image builds
- [ ] Docker worker image builds
- [ ] Docker web image builds

## Auth
- [ ] Register creates user + organization + owner membership
- [ ] Login sets HttpOnly cookies
- [ ] Access token expires and refresh rotates token
- [ ] Logout revokes refresh token and clears cookies
- [ ] Refresh token is never returned to browser JavaScript
- [ ] 401 automatically refreshes once, then redirects to login

## Production
- [ ] PostgreSQL/Redis are not publicly exposed
- [ ] CORS is restricted to the production web origin
- [ ] HTTPS enabled
- [ ] Secrets replaced
- [ ] Backups and restore tested
- [ ] API and worker health checks green
- [ ] Scraping/enrichment/outreach workers process jobs
- [ ] Billing webhook tested when enabled

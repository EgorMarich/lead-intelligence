# v0.35.5 Final Hardening Checklist

## Build / runtime
- [ ] `docker compose config` passes
- [ ] `docker compose up -d --build` passes
- [ ] PostgreSQL healthy
- [ ] Redis healthy
- [ ] migrate completed successfully
- [ ] API healthy and ready
- [ ] worker healthy
- [ ] web healthy

## Authentication
- [ ] Register
- [ ] Login
- [ ] `/auth/me`
- [ ] Refresh rotation
- [ ] Refresh replay rejected
- [ ] Logout
- [ ] Session rejected after logout
- [ ] Rate limit returns 429 and Retry-After

## Tenant isolation
- [ ] Organization list
- [ ] Selected organization reflected by `/auth/me`
- [ ] Cross-tenant organization access rejected
- [ ] Cross-tenant lead access rejected
- [ ] Crawl cancellation is tenant-scoped

## Product smoke
- [ ] Discovery options
- [ ] Discovery overview
- [ ] Leads list
- [ ] Crawl input validation
- [ ] Optional real crawl + results
- [ ] Billing subscription
- [ ] YooKassa checkout/webhook on staging

## Operations
- [ ] Backup
- [ ] Restore into a disposable database
- [ ] Logs contain no access/refresh tokens
- [ ] Production CORS origin verified
- [ ] `TRUST_PROXY=true` only when behind a trusted single proxy
- [ ] HTTPS / HSTS verified

## Promotion
- [ ] All staging checks pass
- [ ] No P0/P1 issues open
- [ ] Environment secrets rotated for production
- [ ] Production rollback procedure tested
- [ ] v1.0.0 tag prepared

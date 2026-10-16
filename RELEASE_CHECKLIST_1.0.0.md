# v1.0.0 Production Release Checklist

## 1. Build and runtime

- [ ] `docker compose config` passes
- [ ] `docker compose up -d --build` passes
- [ ] PostgreSQL healthy
- [ ] Redis healthy
- [ ] migrations complete successfully
- [ ] API healthy and `/api/v1/health/ready` reports `ready`
- [ ] worker healthy
- [ ] web healthy

## 2. Authentication and sessions

- [ ] Register
- [ ] Login
- [ ] `/auth/me`
- [ ] Refresh rotation
- [ ] Old refresh token replay rejected with `401`
- [ ] Logout
- [ ] Access session rejected after logout
- [ ] Auth rate limit returns `429` with `Retry-After`

## 3. Tenant isolation

- [ ] Organization list works
- [ ] Selected organization is reflected by `/auth/me`
- [ ] Cross-tenant organization access is rejected
- [ ] Cross-tenant lead access is rejected
- [ ] Crawl cancellation is tenant-scoped
- [ ] Organization membership removal invalidates protected access

## 4. Product smoke

- [ ] Discovery options
- [ ] Discovery overview
- [ ] Search job creation
- [ ] Worker consumes the queue
- [ ] Leads appear after discovery/crawl
- [ ] Crawl input validation rejects invalid targets with `400`
- [ ] Optional real browser crawl completes
- [ ] CRM lead operations
- [ ] Outreach/sequence flow
- [ ] AI Sales Intelligence endpoints
- [ ] Billing subscription endpoint
- [ ] YooKassa staging checkout/webhook

## 5. Operations and security

- [ ] Production CORS origin verified
- [ ] HTTPS termination verified
- [ ] HSTS verified
- [ ] `TRUST_PROXY=true` only when behind the intended trusted proxy
- [ ] Logs contain no access/refresh tokens or credentials
- [ ] Secrets are production-specific and rotated from staging
- [ ] PostgreSQL/Redis are not publicly exposed
- [ ] Backup completed
- [ ] Restore tested against a disposable database
- [ ] Rollback procedure tested/documented

## 6. Promotion

- [ ] `scripts/staging-validate.sh` passes
- [ ] `scripts/staging-smoke.mjs` passes
- [ ] All P0/P1 issues closed
- [ ] Production environment variables reviewed
- [ ] Production image/archive checksum recorded
- [ ] `v1.0.0` Git tag prepared
- [ ] Production smoke test passes after deployment

## Release decision

**Promote to production only when every required checkbox above is complete or an explicit release exception has been documented and approved by the release owner.**

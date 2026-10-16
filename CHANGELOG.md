# Changelog

## 1.0.0 — First Production Release

The first production release of Lead Intelligence.

### Included

- B2B lead discovery and website intelligence
- crawling and enrichment workers
- lead scoring and CRM
- outreach and sales sequences
- AI sales intelligence, reply copilot, automation and sales manager
- analytics and revenue reporting
- organization and membership management
- subscription billing / YooKassa integration
- HttpOnly cookie authentication and rotating refresh sessions
- tenant isolation and organization-aware access control
- Redis/BullMQ background processing
- health/readiness checks
- backup/restore tooling
- staging smoke and release validation tooling

### Security hardening

- atomic refresh-token rotation and replay rejection
- authenticated organization membership validation
- tenant-scoped sensitive operations
- production CORS restrictions
- security headers and HSTS
- SSRF protections for browser/crawler targets
- PostgreSQL and Redis kept off the public host interface by default

### Release lineage

`1.0.0` follows the `0.35.1`–`0.35.5` release-hardening cycle. Those releases are retained in the repository as historical release notes and checklists.

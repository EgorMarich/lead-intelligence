# Lead Intelligence v0.35.3 — Release Candidate

## Purpose
Production smoke-test hardening on top of v0.35.2. No new product surface was introduced.

## Release-critical fixes
- JWT requests now verify that the account is active and the token organization is still an active membership.
- Multi-organization refresh can target the selected organization through a validated `x-organization-id` membership.
- Organization switching in the web app refreshes the session before changing the active tenant.
- Crawl jobs and communications resolve the organization from the current membership instead of trusting the organization embedded in an old token.
- Lead CRM activity attribution now uses the JWT `sub` claim.
- Invalid crawl input returns a proper HTTP 400 response.
- Version metadata is unified at `0.35.3`.

## Verification limitations
The environment used to build this archive has no npm registry/network access, so dependency installation and full Next.js/NestJS builds cannot be executed here. Static TypeScript syntax and project invariants are checked locally; CI remains the authoritative dependency/build verification.

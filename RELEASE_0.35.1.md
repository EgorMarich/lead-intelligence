# v0.35.1 — Release Hardening

## Included

- unified package version to `0.35.1`
- production-ready HttpOnly cookie authentication
- short-lived JWT access tokens
- hashed, rotating refresh tokens
- `/auth/register`, `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`
- frontend no longer stores auth tokens in `localStorage`
- automatic access-token refresh on 401 responses
- organization selection remains persisted locally without storing credentials
- API security headers
- exact production CORS requirement
- Swagger production toggle
- updated health/version metadata
- Postgres and Redis no longer published by default in Compose
- worker health endpoint is internal to Compose
- production environment template
- release deployment guide and checklist
- CI workflow for install, lint and build

## Verification limitation

The supplied environment did not have network access to the npm registry, so a fresh dependency installation and Docker image build could not be executed here. The archive therefore contains the hardening changes, but a real deployment must run the CI pipeline and `docker compose up -d --build` on a networked build host before public launch.

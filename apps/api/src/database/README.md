# v0.13 persistence layer

`schema.sql` defines the production PostgreSQL model for organizations, users, leads, scoring versions, crawl jobs and audit/activity data.

## Migration order

1. Create `organizations`.
2. Create `users`.
3. Create scoring profile tables.
4. Create `leads`.
5. Create tags/notes/activity tables.
6. Create score snapshots.
7. Create crawl jobs and URL rows.
8. Create indexes.

## Invariants

- Every business object is organization-scoped.
- Lead deletion is soft deletion through `deleted_at`.
- `(organization_id, source, source_external_id)` prevents duplicate imported leads.
- Scoring profiles are versioned, so historical lead scores remain explainable.
- Activities are append-only.

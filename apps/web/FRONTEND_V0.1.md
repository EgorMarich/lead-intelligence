# Frontend v0.1 — Lead Intelligence

Stack:
- Next.js 15
- React 19
- TypeScript
- TanStack Query
- Axios
- Zustand
- SCSS Modules
- lucide-react

First vertical slice:
Login/Register -> Organization -> Dashboard -> New Search -> Search Progress -> Lead Results -> Lead Details.

Run:
1. `pnpm install`
2. Configure `apps/web/.env.local` from `.env.example`
3. `pnpm web:dev`

The backend API is expected under `/api` at `NEXT_PUBLIC_API_URL`.

Important:
- access and refresh tokens are currently stored in localStorage for the v0.1 prototype;
- production v1 should move refresh-token handling to secure HttpOnly cookies;
- frontend polls a running search job until it reaches a terminal state;
- all organization-aware requests send `x-organization-id`.

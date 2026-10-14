# EventGate frontend

The EventGate attendee, organizer and admin web application. It uses Next.js App Router, React, TypeScript, CSS Modules, React Hook Form with Zod, TanStack Query, and a same-origin server route layer for authenticated API requests.

The backend API is maintained at [eventgate-api](https://github.com/SayemHasan74/eventgate-api). Production frontend: https://eventgate-frontend-lovat.vercel.app/. API: https://eventgate-api.onrender.com.

## Local setup

Requirements: Node.js 24 and npm.

```bash
git clone https://github.com/SayemHasan74/eventgate-frontend.git
cd eventgate-frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Set `API_BASE_URL` to the backend API base ending in `/api/v1`. The browser talks to same-origin Next.js routes; do not add backend bearer tokens or server secrets to `NEXT_PUBLIC_*` variables. For authenticated local flows, also configure `SESSION_REDIS_URL` and a unique 64-character hex `SESSION_ENCRYPTION_KEY`. Redis stores the server-held browser sessions. Copy only the three placeholder settings from `.env.example`; use separate local credentials and never commit `.env.local`.

## Product areas

- Public landing page and searchable event catalog/details.
- Attendee: sign-in, account/profile, event preferences, saved events, reservations, checkout return, tickets/QR, notifications and refund requests.
- Organizer: event/tier lifecycle, sales readiness, orders, reports and check-in.
- Admin: users, platform operations, payments, refunds and audit reports.

Protected pages require a backend session and enforce the account role. Quick demo sign-in requires the matching demo variables to be configured on the backend. Google sign-in requires a matching Google client ID and authorized web origin. SSLCommerz checkout requires working merchant sandbox settings and reachable HTTPS callbacks.

Role-based quick-demo buttons are shown only when `NEXT_PUBLIC_DEMO_LOGIN_ENABLED=true`. Enable them only when the API points to a dedicated demo database: enable `DEMO_LOGIN_ENABLED` and `DEMO_ENVIRONMENT` on that demo API, configure the three `SEED_*` account pairs, and run `npm run db:seed` against the demo database once. The buttons create sessions through the API's `/auth/demo` flow; they do not expose passwords in browser code. Do not enable demo login against the production database, especially for the admin role.

## Commands

```bash
npm run dev
npm run lint
npx next typegen
npx tsc --noEmit
npm run test:contracts
npm run test:proxies
npm run test:sessions # requires a disposable Redis service
npm run build
```

`npm run test:contracts` and `npm run test:proxies` run focused local checks. Session tests use real disposable Redis records. Production deployment uses Vercel connected to `main`; configure the environment variables in Vercel for each target environment and redeploy after changing them. The companion API deployment applies Prisma migrations at startup with `prisma migrate deploy`.

## Security and evidence

Never commit `.env.local`, session encryption keys, Google credentials, API tokens, payment credentials, or real attendee data. A green CI run verifies the source revision only; it does not prove live OAuth, payment-provider settlement, or account flows. See the backend repository's acceptance checklist and deployment notes for manual/provider evidence.

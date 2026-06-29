# STATE.md

## Current Status
Phase 13 - Admin SOS Analytics Consolidation (Completed)

## Next Immediate Steps
1. Build and inspect `/admin` after the Dispatch Control visual rework.
2. User should manually test Admin CRM dispatch flow at `http://localhost:5173`.
3. Confirm urgent queue styling highlights phone-call tickets missing information, unassigned/new tickets, and failed WhatsApp dispatches.
4. Confirm ranked suggestions, assign/retry/close actions, and sticky drawer footer still work.
5. Manually verify the production CRM workflow at `https://vee-app.co.il/OnYourWay/admin`.
6. Manually verify public lead capture at `https://vee-app.co.il/OnYourWay`.
7. Manually verify lowercase routes `https://vee-app.co.il/onyourway` and `https://vee-app.co.il/onyourway/admin` in a browser.
8. Manually verify Admin CRM analytics at `http://localhost:5173/analytics` and production `/OnYourWay/admin/analytics`.

Historical Phase 8 manual checks:
1. User should manually test Admin CRM dispatch flow at `http://localhost:5173`.
2. Confirm ranked suggestions show "שייך" buttons and manual assignment updates the ticket.
3. Confirm failed/skipped WhatsApp dispatches show "נסה שוב" and retry correctly.
4. Confirm "סגור טיפול" closes a ticket with the selected resolution status.

## Completed Milestones
- Configured Codex MCP servers: Context7 and Penqwin.
- Initialized Node.js backend in `/backend`.
- Setup Express server with CORS, JSON parsing, and `/health`.
- Integrated Baileys WhatsApp connection with QR generation and reconnect handling.
- Setup Prisma with SQLite configuration and local database initialization.
- Defined provider, lead, and lead-assignment data models.
- Built provider management and lead capture/routing endpoints.
- Added WhatsApp notification delivery tracking on lead assignments.
- Added migration-aware SQLite setup for local development.
- Added provider service text and customer request text for smart provider suggestions.
- Added ranked provider suggestions for ticket creation and ticket review.
- Recorded customer leads as user/client tickets with `requestText` for the customer's overall free-text case.
- Smart matching now compares the client ticket case against provider `serviceText` so specialist providers can rank above general providers.
- Built `/admin` (React 19 + Vite + TS): command-center CRM with dashboard metrics, leads/tickets table + detail drawer, provider CRM, ranked suggestions panel, and live WhatsApp notification status (5s polling).
- Built `/frontend` (Next.js App Router + TS): conversion-focused public landing page with a lead-capture form that proxies to the backend via a server route handler (runs on port 3101).
- Created `FRONTEND.md` as the source of truth for frontend/admin features, design direction, verification, review outcome, and known gaps.
- Reviewed `/frontend` and `/admin`; public lead capture works through the backend proxy, and admin Core CRM features exist.
- Fixed admin Vite scripts to use `--configLoader runner` so build/dev work in this Windows workspace.
- Completed Task 1 for phone-call leads: Prisma schema validates with nullable `serviceType`, nullable `requestText`, and `source` defaulting to `web-form`.
- Implemented Task 2 backend route: `POST /api/leads/webhook-call` creates `source: "phone-call"` tickets without provider matching or assignment.
- Implemented Task 3 admin CRM updates: source badges, amber "Needs Information" state, operator fields for `serviceType` and `requestText`, and "Save & Find Provider" suggestion trigger.
- Live webhook test created phone-call lead `cmqtmkqv3000020fgmowxenqy` with phone `050-9876543` and `source: "phone-call"` on the current backend running on port 3002.
- Port 3000 is blocked by a stale Node process (PID 36104) that returns `404 Cannot POST /api/leads/webhook-call`; Windows denied `Stop-Process` and `taskkill` from this environment.
- Admin dev server is running on port 5173 with `VITE_API_URL=http://localhost:3002` for manual operator-flow verification.
- Added root `run.ps1` to run the full local system: dependency setup, SQLite setup, Admin CRM, public frontend, and foreground backend/WhatsApp QR.
- Fixed `run.ps1` for Windows PowerShell 5.1 background process startup and verified it starts the full system.
- Current `run.ps1` session is active: backend on `http://localhost:3002` because port 3000 is still busy, Admin CRM on `http://localhost:5173`, and public frontend on `http://localhost:3101`.
- Implemented P0 dispatch action backend routes: assign/reassign provider, retry WhatsApp notification for failed/skipped dispatches, and close ticket with `resolutionStatus`.
- Added SQLite migration `20260625004000_dispatch_actions` and regenerated Prisma Client for `Lead.resolutionStatus`.
- Updated Admin CRM drawer: ranked provider suggestions now have live assign buttons, WhatsApp failed/skipped rows can retry send, and tickets can be closed from a fixed action footer.
- Verified backend tests pass and Admin CRM production build passes after dispatch-action implementation.
- Seeded local demo data for manual testing: 5 active providers, 5 phone-call customer tickets, and 5 web-form customer tickets.
- Copied upstream Anthropic skills into local project `skills/`: `theme-factory`, `frontend-design`, and `skill-creator`.
- Installed global Codex skills into `C:\Users\liron\.codex\skills`: `theme-factory`, `frontend-design`, and `skill-creator`. Restart Codex to load them in every project.
- Added `CRM_REDESIGN.md` with the Admin CRM Dispatch Control theme and operator queue UX rules.
- Started Admin CRM Dispatch Control rework: custom theme tokens, stronger drawer workbench styling, provider suggestion polish, and urgency-based lead queue row styling.
- Verified `/admin` production build passes after the Dispatch Control rework.
- Started Admin CRM dev server on `http://localhost:5173` for manual visual review; in-app browser targets were unavailable in this session, so screenshot QA is still pending.
- Added deployment scripts copied/adapted from the existing ServerMonitor/Vee pattern: root `deploy.ps1` and server-side `deploy_linux.sh`.
- Deployment target is `root@vee-app.co.il`, remote directory `/root/OnYourWay`, GitHub repo `https://github.com/lironatar1994-coder/OnYourWay.git`, public route `https://vee-app.co.il/OnYourWay`, and admin route `https://vee-app.co.il/OnYourWay/admin`.
- Deployed to the server with `.\deploy.ps1` using direct archive fallback because the GitHub repo is not created yet.
- Production PM2 processes are running: `on-your-way-backend` on port `3004` and `on-your-way-frontend` on port `3101`.
- Previous production Nginx subdomain config was installed for `on-your-way.vee-app.co.il` and `admin.on-your-way.vee-app.co.il`; it is superseded by the `/OnYourWay` route under `vee-app.co.il`.
- User provided the real GitHub repo `https://github.com/lironatar1994-coder/OnYourWay` and chose path-based production routing under `vee-app.co.il/OnYourWay`, replacing the previous subdomain plan.
- Updated deployment to use GitHub repo `https://github.com/lironatar1994-coder/OnYourWay.git` and remote directory `/root/OnYourWay`.
- Updated public Next.js base path to `/OnYourWay`, Admin CRM Vite base path to `/OnYourWay/admin/`, and Admin router basename handling for path-based refresh/deep links.
- Installed Nginx route snippet into the existing `vee-app.co.il` server block for `/OnYourWay`, `/OnYourWay/admin`, and `/OnYourWay/api`.
- Redeployed through GitHub and verified production externally: public route `https://vee-app.co.il/OnYourWay`, Admin route `https://vee-app.co.il/OnYourWay/admin`, Admin deep route `/OnYourWay/admin/leads`, and API route `/OnYourWay/api/health` all return 200.
- PM2 processes now run from `/root/OnYourWay`: `on-your-way-backend` and `on-your-way-frontend`.
- User reported lowercase `https://vee-app.co.il/onyourway` and lowercase admin route were falling through to the main Vee landing page because Nginx route matching is case-sensitive.
- Added Nginx redirects so lowercase `/onyourway` and `/onyourway/...` redirect to canonical `/OnYourWay`.
- Redeployed and verified externally: `https://vee-app.co.il/onyourway` resolves to the OnYourWay public app, `https://vee-app.co.il/onyourway/admin` resolves to the Admin CRM, and `/OnYourWay/api/health` returns OK.
- Added SEO guide cluster inside `/sos-landing-standalone`: `/guides`, `/guides/locked-outside-home`, `/guides/locksmith-price-israel`, and `/guides/key-left-in-car`, with Hebrew reader-first guide content, Article/FAQ schema, sitemap entries, and internal links from locksmith/car-locksmith landing pages.
- Verified the car-locksmith SEO expansion inside `/sos-landing-standalone`: shorter `/car-locksmith` hero copy, new `/guides/car-locked-no-damage`, first validated car city page `/car-locksmith/tel-aviv`, sitemap coverage, and updated standalone strategy docs to keep future agents from mass-cloning car city pages.
- Removed the green-dot public hero status line from all `/sos-landing-standalone` public landing/guide pages and updated the standalone content strategy so future pages start directly with the urgency line or headline.
- Prepared `/sos-landing-standalone` for the new production domain `sosbaderech.co.il` and phone `050-8611888`: app defaults, local start script, deploy scripts, `.env.example`, README launch checklist, and local production verification now use the real domain/phone. DNS did not resolve yet at verification time, so HTTPS/Search Console should wait until domain activation and DNS records are live.
- Consolidated SOS visitor analytics into the Admin CRM: added `/admin/analytics`, a backend `/analytics/sos` proxy to the standalone SOS analytics API, deploy-time `SOS_ANALYTICS_API_URL` wiring, compact filters, metrics, and page-performance table.
- Deployed Admin CRM SOS analytics to production and pointed production `SOS_ANALYTICS_API_URL` at the live shared-host endpoint `https://vee-app.co.il/sos/api/landing-analytics` because `sosbaderech.co.il` DNS is not resolving yet.

## Frontend Review Outcome (Reviewed 2026-06-25)
- Scope reviewed: BOTH frontends exist: operator Admin CRM (`/admin`) and public lead-capture landing (`/frontend`).
- API: both apps use the live Express API on `localhost:3000` (CORS enabled). Admin via `VITE_API_URL`; landing via `BACKEND_URL` server proxy.
- Admin style: dense utility command-center: dark left nav, sticky toolbars, compact tables, right-side drawer, neutral light surfaces, green/amber/red/blue status accents, restrained motion.
- Landing style: clean conversion-focused marketing page (teal brand, hero + form).
- Constraint surfaced: provider delete and single-record GETs still need backend routes before they can appear in the UI; lead close and manual re-assign now exist.
- Completion assessment: functionally close to the goal, but not final until browser screenshot QA passes and the user confirms final design choices.

## How to run locally
1. Preferred: from repo root run `.\run.ps1`.
2. Stop background admin/frontend processes started by the runner with `.\run.ps1 -Stop`.
3. Manual backend fallback: `cd backend && npm install && npm run db:setup && npm start` (port 3000 by default; prints WhatsApp QR).
4. Manual admin fallback: `cd admin && npm install && npm run dev` (http://localhost:5173).
5. Manual landing fallback: `cd frontend && npm install && npm run dev` (http://localhost:3101).

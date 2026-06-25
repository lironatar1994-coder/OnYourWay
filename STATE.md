# STATE.md

## Current Status
Phase 10 - Server Deployment Setup (Implementation In Progress)

## Next Immediate Steps
1. Build and inspect `/admin` after the Dispatch Control visual rework.
2. User should manually test Admin CRM dispatch flow at `http://localhost:5173`.
3. Confirm urgent queue styling highlights phone-call tickets missing information, unassigned/new tickets, and failed WhatsApp dispatches.
4. Confirm ranked suggestions, assign/retry/close actions, and sticky drawer footer still work.
5. Run `.\deploy.ps1` and verify production hosts `http://on-your-way.vee-app.co.il` and `http://admin.on-your-way.vee-app.co.il`.

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
- Deployment target is `root@vee-app.co.il`, remote directory `/root/On-Your-Way`, GitHub repo `https://github.com/lironatar1994-coder/On-Your-Way.git`, public host `http://on-your-way.vee-app.co.il`, and admin host `http://admin.on-your-way.vee-app.co.il`.

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

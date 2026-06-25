# AGENTS.md: "On The Way" System

## 🎯 Context & Architecture
"On The Way" is a low-latency drop-servicing platform. It captures leads via Next.js landing pages, routes them instantly to providers using a Node.js API, and uses `@whiskeysockets/baileys` to dispatch WhatsApp messages. 
- **Database:** SQLite with Prisma ORM (for rapid MVP development, with plans to migrate to Postgres if concurrency requires it).

## 📂 Repo Layout
* `/frontend` - Next.js landing pages.
* `/backend` - Node.js core routing API (Express).
* `/backend/services/whatsapp` - Baileys WebSocket integration logic.
* `/admin` - React 19 + Vite dashboard for provider/lead CRM.

## Frontend Source Of Truth
* Always read `FRONTEND.md` before changing `/frontend` or `/admin`.
* `FRONTEND.md` defines current frontend surfaces, feature requirements, design direction, verification commands, review outcome, and known gaps.
* `CRM_REDESIGN.md` defines the Admin CRM Dispatch Control visual system and queue-priority UX.
* Keep `FRONTEND.md`, `STATE.md`, and this file synchronized when frontend scope, product decisions, run commands, or design direction change.

## Backend Ticket Model
* A customer lead is treated as a user/client ticket in the backend.
* Client tickets are created through `POST /leads` and include structured fields such as name, phone, service type, city, notes, and `requestText`.
* Phone-call client tickets are created through `POST /api/leads/webhook-call` with `source: "phone-call"` and may initially contain only `phoneNumber`.
* Do not run smart provider matching or assignment for phone-call tickets until an operator adds `serviceType` and `requestText`.
* `requestText` stores the customer's overall free-text case, such as "toilet is leaking and needs urgent fix".
* Provider matching uses both broad provider category and provider `serviceText`, so a general plumber can be differentiated from a plumber who specifically fixes toilets, leaks, or clogged bathrooms.
* Opening/reviewing a client ticket should show ranked provider suggestions, the assigned provider, and WhatsApp notification status.

## Admin Dashboard Review Outcome (Reviewed 2026-06-25)
The current frontend implementation was reviewed. Treat the design direction below as the current implemented direction, not a final product decision unless the user explicitly confirms it.

* **Scope:** Both frontends were built — the operator Admin CRM (`/admin`) and the public lead-capture landing page (`/frontend`) — covering the full capture → route → WhatsApp-notify loop.
* **API mode:** Both apps talk to the live Express API on `localhost:3000` (CORS is already enabled on the backend). The admin reads `VITE_API_URL`; the landing page proxies through a Next.js route handler using `BACKEND_URL`.
* **Admin visual direction:** Dense utility CRM with a field-operations command-center feel.
  * Vibe: calm, precise, serious, fast, operator-focused, built for repeated daily use.
  * Layout: dark left nav, sticky toolbars, compact dense tables, right-side detail drawer, high-density forms, metric strip.
  * Texture: crisp 1px borders, quiet off-white panels, restrained color, no marketing hero inside the app shell.
  * Color: neutral light workspace, charcoal text, cool gray dividers; status accents — green sent/active, amber pending/unassigned, red failed, blue new/selected/suggested, gray skipped/closed.
  * Motion: short, purposeful transitions for drawer open/close, row selection, loading, and status changes only.
* **Landing visual direction:** Intentionally the opposite — a clean, conversion-focused marketing page (teal brand, hero + lead form) since it is customer-facing.

## Tech & Run Notes

### Deployment
* Deployment runner: use root `.\deploy.ps1` from Windows. It targets `root@vee-app.co.il`, GitHub repo `https://github.com/lironatar1994-coder/On-Your-Way.git`, remote directory `/root/On-Your-Way`, and runs server-side `deploy_linux.sh`.
* Production ports: backend API runs through PM2 as `on-your-way-backend` on port `3004`; public Next.js frontend runs through PM2 as `on-your-way-frontend` on port `3101`; Admin CRM is built static to `/var/www/on-your-way-admin`.
* Production Nginx hosts: public landing at `http://on-your-way.vee-app.co.il`, Admin CRM at `http://admin.on-your-way.vee-app.co.il`, and both proxy `/api/` to the backend.

* Preferred local runner: use root `.\run.ps1` to install missing dependencies, apply local SQLite setup, start `/admin`, start `/frontend`, and run `/backend` in the foreground so the WhatsApp QR remains visible. Use `.\run.ps1 -Stop` to stop admin/frontend processes started by the script.
* `/admin` — React 19 + Vite + TypeScript. State/fetching via `@tanstack/react-query` (polls leads/providers/health every 5s so async WhatsApp status updates appear live). Routing via `react-router-dom`. Hand-authored CSS design tokens (no UI kit). Dev server: `npm run dev` → http://localhost:5173. Vite must use `--configLoader runner` in this Windows workspace.
* `/frontend` — Next.js (App Router) + TypeScript. Lead form posts to a server route handler (`app/api/leads/route.ts`) that proxies to the backend and tags `source: "web-form"`. **Runs on port 3101** (`next dev -p 3101`) to avoid backend port 3000 and the local 3001 bind issue seen during review.
* Backend dispatch action endpoints exist for lead assign/reassign, WhatsApp retry, and lead close. Provider delete and single-record GETs are still not available in the API.
* Frontend skills are available locally outside the repo: `frontend-design` and `bencium-innovative-ux-designer`. Use `frontend-design` for frontend review/build work unless the user asks for the other skill.

## 🛑 Constraints & "Do-Not" Rules
* NO PUPPETEER: Strictly use Baileys WebSocket connections for WhatsApp to prevent CPU bottlenecks.
* NO BLOCKING LOGIC: WhatsApp message dispatching must be asynchronous.
* STATE TRACKING: Always read and update `STATE.md` when completing tasks.

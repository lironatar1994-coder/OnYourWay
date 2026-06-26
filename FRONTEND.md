# FRONTEND.md: On The Way Frontend Contract

## Current Frontend Surfaces

### `/frontend` - Public Lead Capture
- Framework: Next.js 15 + React 19.
- Purpose: customer-facing landing page and lead/ticket intake form.
- Local port: `3101`.
- Backend connection: server-side proxy at `/api/leads`, forwarding to `BACKEND_URL` from `.env.local`.
- Required customer ticket fields:
  - `fullName`
  - `phoneNumber`
  - `serviceType`
  - optional `email`
  - optional `city`
  - optional `requestText`
- `requestText` is required for high-quality matching even if it is technically optional. The UI must strongly encourage a customer to describe the actual case in free text.
- Form submissions must set `source: "web-form"` through the proxy route.

### `/admin` - Operator CRM Dashboard
- Framework: React 19 + Vite.
- Purpose: internal dispatch console for providers, client tickets, matching, and WhatsApp delivery status.
- Local port: `5173`.
- Backend connection: live Express API on `localhost:3000`, configured with `VITE_API_URL`.
- Vite must use `--configLoader runner` in this Windows workspace; default config bundling can fail with access denied when esbuild tries to traverse outside the workspace.

## Feature Requirements

### Public Lead Capture
- The first viewport must make the customer action obvious: describe the job, leave contact details, request a pro.
- The form must include `requestText` with examples like "My toilet is leaking and needs an urgent fix."
- Submission success must clearly tell the customer that the request was received and is being routed to a local provider.
- The page should not promise exact response times unless backend/provider operations can support them.

### Admin CRM
- Operators must be able to view:
  - live API health
  - total leads/tickets
  - assigned/unassigned counts
  - active provider count
  - WhatsApp notification status counts
- Operators must be able to manage providers:
  - create provider
  - edit provider
  - activate/deactivate provider
  - set category
  - set `serviceText`
  - set service area
  - set priority and optional daily cap
- Operators must be able to manage client tickets:
  - create a new ticket
  - search/filter tickets
  - distinguish `phone-call` vs `web-form` sources in the master table
  - inspect customer details
  - inspect `requestText`
  - inspect assigned provider
  - inspect WhatsApp notification status and error
  - inspect ranked provider suggestions
  - assign or reassign a ranked provider suggestion
  - retry WhatsApp dispatch when status is `FAILED` or `SKIPPED`
  - close a ticket with a `resolutionStatus`
- Phone-call tickets may initially arrive with only `phoneNumber`, `source: "phone-call"`, and status `NEW`.
- Phone-call tickets without `requestText` must show a distinct amber "Needs Information" state.
- Operators must be able to enter `serviceType` and `requestText` in the ticket drawer, save them, and then manually fetch smart provider suggestions.
- Ranked suggestions must show both score and human-readable reasons. Reasons should explain practical matches, such as service profile match, service-area match, exact category match, or priority.

## Design Direction

### Admin
- Style: dense utility CRM with a field-operations command-center feeling.
- Current theme contract: `CRM_REDESIGN.md` defines the custom **Dispatch Control** theme and should be read before visual changes to `/admin`.
- Vibe: calm, precise, serious, operational, compact, fast to scan, low-friction for dispatch work.
- Layout: left navigation, metric strip, provider and ticket tables, filter bars, right-side drawers, compact forms, inline status badges, suggestion ranking panel.
- Queue behavior: the leads table should behave like a dispatch queue. Phone-call tickets missing information, unassigned/new tickets, and failed WhatsApp dispatches should be visually scannable and prioritized.
- Color: neutral light workspace, charcoal text, off-white panels, cool gray dividers, restrained status accents:
  - green for active/sent/success
  - amber for pending/skipped
  - red for failed/error
  - blue for selected/suggested/API-online
  - teal for primary dispatch actions and active navigation
- Motion: minimal and purposeful only. Use transitions for drawers, row selection, loading states, and status changes.
- Avoid: marketing hero sections, decorative card stacks, dominant purple gradients, oversized display type inside the app shell, generic AI-dashboard decoration.

### Public Landing Page
- Style: clean consumer service page with a trustworthy local-provider feel.
- Vibe: direct, reassuring, fast, simple, practical.
- Layout: one strong lead form in the first viewport, concise value copy, minimal explanation below.
- Avoid: heavy storytelling, vague stock-like visuals, bloated marketing sections, or anything that distracts from submitting a request.

### Localization & RTL (both surfaces, chosen 2026-06-25)
- Both surfaces ship in **Hebrew** with full **right-to-left** layout via `<html lang="he" dir="rtl">`.
- Font: **Heebo** (Google Fonts), loaded with a `<link>` in `admin/index.html` and the Next.js root layout `<head>`; `--font` points to `Heebo` with `Segoe UI` / `Arial Hebrew` fallbacks.
- RTL handling lives in `[dir='rtl']` CSS overrides (`admin/src/styles/app.css`): the admin detail drawer slides from the **left**, and the selected-row accent, metric accent edges, segmented-control + sidebar dividers, suggestion reason marker, and active-toggle knob all flip. Table headers use `text-align: start`.
- LTR islands: phone, email, and WhatsApp-JID inputs set `dir="ltr"`; the `.mono` class uses `unicode-bidi: isolate` so phone numbers, JIDs, and scores read correctly inside RTL text.
- Backend match-reason strings are translated to Hebrew in the admin `SuggestionList` (`REASON_HE` map); unknown reasons fall back to the original text.
- Dates and relative times use the `he-IL` locale (`admin/src/lib/format.ts`).
- Translation rule: any new user-facing string in `/admin` or `/frontend` must be authored in Hebrew. Keep proper nouns/brand ("On The Way", "WhatsApp"/"וואטסאפ") consistent.

## Review Outcome - 2026-06-25

### What Meets The Goal
- `/frontend` builds successfully with `npm run build`.
- `/frontend` serves correctly on port `3101`.
- The public lead form posts through `/api/leads`.
- The proxy created a backend client ticket with `source: "web-form"`.
- The created ticket included `requestText`.
- The backend returned ranked provider suggestions and assigned a toilet/leak specialist for a toilet-leak request.
- `/admin` covers the intended Core CRM feature set:
  - dashboard metrics
  - provider table and forms
  - provider `serviceText`
  - leads/tickets table
  - ticket detail drawer
  - ranked suggestions
  - WhatsApp delivery status badges
- `/admin` TypeScript passes.
- `/admin` production build passes after adding `--configLoader runner`.

### Gaps Before Calling The Frontend Complete
- Visual browser QA was limited by the lack of a local browser automation tool in this session. Future work should verify desktop and mobile screenshots.
- `/admin` now has dispatch controls for provider assign/reassign, WhatsApp retry, and ticket close; these require live backend routes to be running.
- `/frontend` uses a functional service page, but it is not yet visually distinctive enough to be considered final design polish.
- Some generated UI copy and symbols should be checked in-browser for encoding/rendering quality.
- The admin UI currently depends on live backend data; mock/demo empty states should be checked with a fresh database.

## Required Verification Commands

Preferred full-system runner:

```powershell
.\run.ps1
```

The runner installs missing dependencies, runs `backend` database setup, starts Admin CRM and the public frontend in the background, then runs the backend in the foreground so the WhatsApp QR remains visible. If backend port `3000` is busy, it automatically picks the next free backend port and passes that URL into Admin CRM and the public frontend. Stop background admin/frontend processes with:

```powershell
.\run.ps1 -Stop
```

Manual fallback commands:

```bash
cd backend
npm run db:setup
npm start
```

Verify admin:

```bash
cd admin
npm run build
npm run dev
```

Verify public frontend:

```bash
cd frontend
npm run build
npm run dev
```

Runtime URLs:

- Backend API: `http://localhost:3000`
- Admin CRM: `http://localhost:5173`
- Public frontend: `http://localhost:3101`

Production deployment:

- Local deploy command: `.\deploy.ps1`
- GitHub target: `https://github.com/lironatar1994-coder/OnYourWay.git`
- Server target: `root@vee-app.co.il:/root/OnYourWay`
- Public frontend: `https://vee-app.co.il/OnYourWay`
- Admin CRM: `https://vee-app.co.il/OnYourWay/admin`
- Backend API: proxied through `/OnYourWay/api/` to PM2 process `on-your-way-backend` on port `3004`.

## Future Development Rules

- Keep `FRONTEND.md`, `STATE.md`, and `AGENTS.md` synchronized when frontend scope or decisions change.
- Keep `CRM_REDESIGN.md` synchronized when the Admin CRM visual system changes.
- If the user chooses final admin style/scope/API behavior, replace suggestion sections in `AGENTS.md` and `STATE.md` with an outcome section.
- Do not remove `requestText` from public or admin ticket forms.
- Do not hide provider `serviceText`; it is central to smart matching.
- Do not add WhatsApp browser automation. All WhatsApp functionality must continue through Baileys.
- Do not block the UI waiting for WhatsApp send results. Show delivery status after the backend updates assignments.
- Before marking frontend complete, perform browser QA on desktop and mobile widths and check for text overflow, broken encoding, blank panels, and failed API states.

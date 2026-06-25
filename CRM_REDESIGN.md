# CRM_REDESIGN.md: Dispatch Control Theme

## Direction
The Admin CRM should feel like a dispatch control desk, not a generic analytics dashboard.

The operator's job is to move fast:
1. notice urgent tickets,
2. complete missing call information,
3. choose a provider,
4. confirm WhatsApp delivery,
5. close the ticket.

## Theme: Dispatch Control
- Vibe: tactical, calm, precise, field-operations focused.
- Density: compact by default; no oversized cards or marketing sections.
- Texture: crisp 1px lines, sticky toolbars, high-contrast active states, clear status accents.
- Brand accent: deep teal for primary operator actions and active navigation.
- Status accents:
  - blue for selected/new/suggested
  - teal/green for assigned/sent/success
  - amber for pending, missing information, skipped
  - red for failed delivery or destructive states
  - slate for closed/neutral states

## UX Rules
- The leads screen is a dispatch queue, not just a table.
- Urgent rows must be visually scannable:
  - phone-call lead with no `requestText`
  - unassigned/new lead
  - failed WhatsApp delivery
- The drawer is the operator workbench:
  - customer facts first
  - editable `serviceType` and `requestText`
  - ranked provider suggestions
  - assigned provider and WhatsApp delivery status
  - sticky footer actions
- Provider suggestions must stay compact and action-oriented; the `Assign` action belongs next to every suggested provider.

## Implementation Notes
- Theme tokens live in `admin/src/styles/tokens.css`.
- Layout and component polish live in `admin/src/styles/app.css`.
- Do not introduce a UI kit until there is repeated component complexity that justifies it.
- Keep Hebrew/RTL behavior as the default for user-facing Admin CRM UI.
- Keep the public landing page visually separate from the operator CRM.

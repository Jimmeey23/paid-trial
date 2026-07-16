# /new — Combined Trial Form

## Purpose
New route `trial.physique57india.com/new` offering a free-trial signup for all three class formats (Barre 57, powerCycle, Strength Lab) in one page, restyled minimal/modern, distinct imagery and tag copy from existing pages.

## Routing
- `server.js`: add `app.get(['/new', '/new/*'], ...)` returning `sendAppIndex(req, res)`, placed alongside the other SPA routes (before the `/` catch-all), same pattern as `/barre`.
- `client/src/App.tsx`:
  - add `isNewRoute = currentPath === "/new" || currentPath.startsWith("/new/")`
  - add `routeMeta.new` (title: "Physique 57 India | All Formats Trial", description mentioning Barre/powerCycle/Strength Lab, name for schema)
  - render `<CombinedTrialForm />` when `isNewRoute`, ordered alongside the other route checks in the existing ternary chain

## New component: `client/src/components/combined-trial-form.tsx`
Cloned from `Barre57TrialForm`'s structure (numbered-card layout, contact fields, studio `<Select>`, waiver modal, success/celebration flow, submit handling) — not from the paid main form, since this is a free-trial flow.

### Format picker (new; replaces the Maia-only locked dropdown)
- Always-visible 3-card picker: Barre 57, powerCycle, Strength Lab — each with image, title, one-line description.
- Availability filtered by selected studio via a local map mirroring `server.js:54-57`:
  ```
  { "Supreme Headquarters, Bandra": ["powerCycle", "Barre 57"],
    "Kwality House, Kemps Corner": ["powerCycle", "Strength Lab", "Barre 57"] }
  ```
- Changing studio auto-clears a selected format that's no longer available at that studio.
- Selecting a format before a studio: show all 3; validation requires both fields before submit.

### Submission
- POST `/api/submit-barre-lead` (free trial, no payment) — reuse existing endpoint.
- `source_form: "combined-trial-form"` sent in payload.
- Server-side: `server.js:3636` currently hardcodes `source_form: 'barre-trial-form'` inside the route handler — change to read `source_form` from the request payload (falling back to `'barre-trial-form'` for existing callers) so combined-form leads are labeled distinctly in Supabase/Momence/Respond.io without touching other callers of this endpoint.
- `classFormat` sent dynamically based on the picked format's backend value (`Barre 57` / `powerCycle` / `Strength Lab`), validated server-side against `STUDIO_CLASS_OPTIONS` (already supports all three combos — no backend validation change needed).

### Visual restyle ("minimalistic modern")
- Remove the gradient pill "1. / 2. / 3." step badges and Maia-style badges; replace with plain small-caps section labels, no pill/gradient.
- Flatten card borders (single 1px neutral border, no backdrop-blur/shadow stacking).
- Single accent color (slate/black) instead of the current blue+slate mix.
- Tighter spacing and type scale across hero + form + sections.
- Hero badge/tag copy reworked (e.g. "Choose Your Format" instead of "Barre 57 Trial"); exact copy finalized during implementation, not pre-approved line-by-line.

### Images
No new uploads (confirmed none exist unused for adult content — only unused local assets are Juniors/kids photos, unsuitable here). Reuses existing adult-class pool in a fresh arrangement not identical to other pages:
- Hero: mix from `/p57-assets/p57-barre-group.jpg`, `/p57-assets/p57-cycle-close.jpg`, `/p57-assets/p57-strength-color.jpg` / `p57-strength-wide.jpg`
- Format cards: one representative image per format (Barre/powerCycle/Strength Lab), plus 1-2 postimg.cc images not currently used together on this exact page, for variety.

## Out of scope
- No changes to `Physique57SignUpForm` (main paid form) or its data (`client/src/data/physique57.ts` `studios`/`formats` arrays untouched — new component keeps its own local studio-format availability map).
- No changes to `Barre57TrialForm` itself beyond it serving as a structural reference.
- No new image uploads.
- `barre57` and `kids` forms are not restyled or touched.

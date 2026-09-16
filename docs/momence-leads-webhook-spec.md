# Momence Leads Webhook Integration — Spec

## Scope note (read first)

Momence lead-submission webhook wired for **Mumbai studios only** — Supreme Headquarters (Bandra) and Kwality House (Kemps Corner). No Bangalore lead form exists in codebase. Bangalore studios (Kenkere House, Copper + Cloves) used only for read-only public class-schedule display (`/schedule-blr`, `/sessions-blr`), sourced from a Supabase Edge Function — not the Momence lead webhook. If Bangalore lead capture is wanted, needs new build (see "Gaps" section).

---

## 1. Endpoint & Auth

- Call site: `submitToMomence()` in `server.js:3107-3134`
- Endpoint: `process.env.MOMENCE_LEAD_ENDPOINT`
  - Example shape: `https://api.momence.com/integrations/customer-leads/<account_id>/collect`
- Method: `POST`
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer <MOMENCE_API_TOKEN>
  ```
- Token env var: `MOMENCE_API_TOKEN` (fallback `MOMENCE_TOKEN`)
- Missing token, sourceId, or endpoint → throws `Server configuration incomplete. Please set the Momence environment variables.`
- On non-2xx response → throws `Failed to submit to Momence: <status> <body>`

```js
const momenceResponse = await fetch(momenceEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${momenceToken}`
  },
  body: JSON.stringify(momencePayload)
});
```

## 2. Request Payload — Field IDs

Built by `buildMomenceLeadRequestPayload()` (server.js:3096-3105) wrapping `buildMomencePayload()` (server.js:2663-2706).

| Field | Notes |
|---|---|
| `token` | value of `MOMENCE_API_TOKEN` |
| `sourceId` | string — see §3 resolution table |
| `firstName` | |
| `lastName` | |
| `email` | |
| `phoneNumber` | |
| `time` | one of `ALLOWED_TIME_WINDOWS` |
| `center` | exact string: `Supreme Headquarters, Bandra` or `Kwality House, Kemps Corner` |
| `type` | class format: `powerCycle`, `Barre 57`, `Strength Lab`, or `Physique 57 - Juniors` (kids) |
| `waiverAccepted` | literal string `"accepted"` |
| `event_id` | |
| `childAge`, `childName`, `childDateOfBirth`, `batch` | kids leads only |
| tracking fields (spread if present) | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_id`, `utm_term`, `gclid`, `fbclid`, `msclkid`, `ttclid`, `gbraid`, `wbraid`, `fbp`, `fbc` |
| URL fields | `landing_page`, `referrer` |

## 3. Source ID Resolution (per-route attribution, not per-city)

`resolveMomenceSourceId()` (server.js:2714-2724):

```js
function resolveMomenceSourceId(leadData = {}, options = {}) {
  if (options.sourceId) return options.sourceId;
  if (isKidsLead(leadData)) {
    return process.env.MOMENCE_KIDS_SOURCE_ID || process.env.MOMENCE_SOURCE_ID || DEFAULT_KIDS_MOMENCE_SOURCE_ID;
  }
  return process.env.MOMENCE_REGULAR_SOURCE_ID || DEFAULT_REGULAR_MOMENCE_SOURCE_ID;
}
```

Constants:
```js
DEFAULT_REGULAR_MOMENCE_SOURCE_ID     = '8082'
DEFAULT_KIDS_MOMENCE_SOURCE_ID        = '212426'
MAIA_MOMENCE_SOURCE_ID                = '14729'
INFLUENCER_SIGNUP_MOMENCE_SOURCE_ID   = '14729'
```

| Route (client) | Backend endpoint | sourceId | Studio(s) allowed |
|---|---|---|---|
| `/new`, `/` | `/api/submit-lead` | `8082` regular / `212426` kids | Bandra or Kemps Corner |
| `/barre` | `/api/submit-barre-lead` | `8082`, unless MAIA/BPB campaign → `14729` | Bandra or Kemps Corner |
| `/bpb` | `/api/submit-barre-lead` (`source_form=bpb-powercycle-form`) | `14729` | Bandra or Kemps Corner |
| `/influencers` | `/api/submit-influencer-lead` | `MOMENCE_INFLUENCER_SOURCE_ID` env, default `201918` | Bandra or Kemps Corner |
| `/influencer-signup` | `/api/submit-influencer-signup-lead` | `14729` | Bandra or Kemps Corner |
| `/kids` | `/api/submit-kids-lead` | `212426` (kids default) | Bandra or Kemps Corner |
| `/kids-themumtribe` | `/api/submit-kids-mum-tribe-lead` | **N/A — webhook skipped** (`skipMomenceLeadWebhook: true`), fixed center Bandra | Bandra fixed |
| `/kids-kabirnayar` | `/api/submit-kids-kabir-lead` | **N/A — webhook skipped**, fixed center Kemps Corner | Kemps Corner fixed |
| `/schedule-blr` | none (read-only) | n/a | Bangalore — display only |

MAIA campaign detection: `isMaiaBarreCampaign()` = `utm_source === 'influencer' && utm_campaign === 'maia'` (server.js:314-331).

## 4. Studio / Location IDs (Mumbai — only studios wired to lead webhook)

```js
const STUDIO_CLASS_OPTIONS = {
  'Supreme Headquarters, Bandra':   ['powerCycle', 'Barre 57'],
  'Kwality House, Kemps Corner':    ['powerCycle', 'Strength Lab', 'Barre 57']
};
const STUDIO_SCHEDULE_LOCATION_IDS = {
  'Supreme Headquarters, Bandra':   ['29821'],
  'Kwality House, Kemps Corner':    ['9030']
};
```
`validateLeadPayload()` rejects any `center` not a key of `STUDIO_CLASS_OPTIONS` — hard gate against non-Mumbai values today.

## 5. Bangalore — current state (schedule display only, not lead webhook)

Defined in `scheduleService.js:3-15`, used by `/sessions-blr` and `/schedule-blr`:

```js
const CENTER_ALIASES = {
  'Kenkere House, Bangalore':      ['kenkere', 'kenkere house', 'bangalore', 'bengaluru'],
  'Copper + Cloves, Bangalore':    ['copper', 'cloves', 'copper and cloves', 'copper + cloves']
};
const CENTER_LOCATION_IDS = {
  'Kenkere House, Bangalore':      ['22116'],
  'Copper + Cloves, Bangalore':    ['36372']
};
```
Session feed config (server.js:3606-3622):
```js
'sessions-blr': { studio: 'Bangalore (Kenkere House + Copper + Cloves)', center: '', locationId: '22116,36372' }
```
Data source: Supabase Edge Function (`SUPABASE_MOMENCE_SESSIONS_URL` / `MOMENCE_SESSIONS_FUNCTION_URL`, key `SUPABASE_MOMENCE_SESSIONS_KEY`/`SUPABASE_ANON_KEY`) — not `submitToMomence()`.

## 6. Gaps / what's needed to add Bangalore lead capture

Not present today, would require:
1. Add `'Kenkere House, Bangalore'` and `'Copper + Cloves, Bangalore'` to `STUDIO_CLASS_OPTIONS` (with allowed class formats) and `STUDIO_SCHEDULE_LOCATION_IDS` (`22116`, `36372`) in `server.js`.
2. Decide Momence `sourceId` for Bangalore leads — new dedicated ID recommended (Momence attributes leads by `sourceId`, not by studio/center), set via new env var e.g. `MOMENCE_BANGALORE_SOURCE_ID`, wired into `resolveMomenceSourceId()`.
3. Update client-side studio list (`client/src/data/physique57.ts`) to expose Bangalore studios as selectable in the trial-form UI (currently used for schedule display component only).
4. Update `validateLeadPayload`/`validateKidsLeadPayload` center whitelist accordingly.
5. Confirm with Momence account config that a `sourceId` for Bangalore exists/should be created against the account's integrations dashboard.

## 7. Full list of Momence env vars in code (names only — no values)

MOMENCE_API_TOKEN=DOjMVL37Q5;
MOMENCE_API_TOKEN_BLR=qy71rOk8en
MOMENCE_LEAD_COLLECTION_URL_MUMBAI : https://api.momence.com/integrations/customer-leads/13752/collect
MOMENCE_LEAD_COLLECTION_URL_BLR : https://api.momence.com/integrations/customer-leads/33905/collect

## 8. Key code references

| What | Location |
|---|---|
| `submitToMomence()` (HTTP call) | `server.js:3107-3134` |
| `buildMomenceLeadRequestPayload()` | `server.js:3096-3105` |
| `buildMomencePayload()` | `server.js:2663-2706` |
| `resolveMomenceSourceId()` | `server.js:2714-2724` |
| `isKidsLead()` | `server.js:2708-2712` |
| `STUDIO_CLASS_OPTIONS` | `server.js:66-69` |
| `STUDIO_SCHEDULE_LOCATION_IDS` | `server.js:108-111` |
| `TRACKING_FIELDS` / `URL_FIELDS` | `server.js:121-138` |
| `isMaiaBarreCampaign()` | `server.js:314-331` |
| Bangalore center aliases/IDs | `scheduleService.js:3-15` |
| Session feed route config | `server.js:3606-3622` |

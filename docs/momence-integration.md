# Momence Integration — Web Form

This document explains how leads/submissions from the web forms (`server.js`) flow into Momence, the different integration paths used, exactly what data gets sent on each, and every constant/env var involved.

There are **three separate Momence integration paths** in this codebase. A given form submission may use one or more of them depending on which route it came from.

1. **Lead webhook** (`submitToMomence`) — pushes a raw lead into Momence's lead-capture inbox. Used by every trial/signup route so the studio team sees the enquiry even if nothing else succeeds.
2. **Direct membership provisioning** (`MomencePublicApiClient`) — creates/finds a member via Momence's public API v2 and immediately purchases a membership (paid or free/comp) for them. Used for Barre/influencer complimentary-class flows and Kids Mum Tribe.
3. **Post-payment fulfillment** (`fulfillMomencePurchaseFromSession`) — after a successful Stripe checkout, provisions the paid "Newcomers 2 For 1" membership, either directly via API v2 or by delegating to a Supabase Edge Function.

---

## 1. Lead webhook (`submitToMomence`)

**Where:** `server.js:3023` (`submitToMomence`), payload built by `buildMomenceLeadRequestPayload` (`server.js:3012`) → `buildMomencePayload` (`server.js:2607`).

**Called from:** `sendMomenceLead`/every submit route (`/api/submit-lead`, `/api/submit-barre-lead`, `/api/submit-influencer-lead`, kids routes, etc.) as a best-effort side channel — failure here doesn't block the lead being saved to Supabase.

**Request:**
```
POST {MOMENCE_LEAD_ENDPOINT}
Authorization: Bearer {MOMENCE_API_TOKEN}
Content-Type: application/json
```

**Payload fields:**

| Field | Source | Notes |
|---|---|---|
| `token` | `MOMENCE_API_TOKEN` / `MOMENCE_TOKEN` | Bearer token, also duplicated in body |
| `sourceId` | resolved by `resolveMomenceSourceId` | see table below |
| `firstName`, `lastName`, `email`, `phoneNumber` | form input | as submitted |
| `time` | form input | preferred time window, or `"Flexible / Needs Recommendation"` |
| `center` | form input | studio backend name, e.g. `"Kwality House, Kemps Corner"` |
| `type` | form input | class format, e.g. `"powerCycle"`, `"Barre 57"`, `"Strength Lab"` |
| `waiverAccepted` | form input | `"accepted"` |
| `event_id` | generated client-side | idempotency/tracking id |
| `childAge`, `childName`, `childDateOfBirth` | kids forms only | included only if present |
| `batch` | kids forms only | batch preference string |
| tracking fields | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_id`, `utm_term`, `gclid`, `fbclid`, `msclkid`, `ttclid`, `gbraid`, `wbraid`, `fbp`, `fbc` | included only if present |
| `landing_page`, `referrer` | tracking payload | included only if present |

**`sourceId` resolution** (`resolveMomenceSourceId`, `server.js:2658`):
- Explicit `options.sourceId` wins if passed (e.g. Maia campaign override).
- If the lead is a "kids" lead (source_form is `kids-trial-form`, or type is Juniors, or has child fields) → `MOMENCE_KIDS_SOURCE_ID` / `MOMENCE_SOURCE_ID` / default `212426`.
- Otherwise → `MOMENCE_REGULAR_SOURCE_ID` / default `8082`.
- Influencer/Maia campaigns pass `MAIA_MOMENCE_SOURCE_ID` (`14729`) explicitly via `respondIoSourceId`/`momenceSourceId` options.

---

## 2. Direct membership provisioning (`MomencePublicApiClient`)

**Where:** `server.js:1086` onward. Talks to Momence's public API v2 directly (member CRUD + checkout), plus a separate "dashboard" API (session-cookie based) for waiver signing and child accounts.

**Auth (API v2):** OAuth2 password grant.
```
POST {MOMENCE_API_V2_BASE_URL}/auth/token   (default: https://api.momence.com/api/v2/auth/token)
Authorization: {MOMENCE_API_V2_BASIC_AUTH}
Content-Type: application/x-www-form-urlencoded
grant_type=password&username={MOMENCE_API_V2_USERNAME}&password={MOMENCE_API_V2_PASSWORD}
```
Returns a bearer `access_token`, cached in-memory on the client instance and used as `Authorization: Bearer {token}` for all subsequent `/host/*` calls.

**Auth (dashboard API):** uses a raw browser session cookie string (`MOMENCE_ALL_COOKIES`) sent as `Cookie:` header to `MOMENCE_DASHBOARD_BASE_URL` (default `https://momence.com/_api/primary`), plus a CSRF token pulled from the `csrf_token` cookie. If a dashboard request fails with an auth-type status, the client automatically re-logs in via `authenticateMomenceDashboard` (email + password + TOTP) and retries once.

### 2a. Find-or-create member

`ensureMember(input)` → `findMemberByEmailOrPhone` (searches `GET /host/members?query=...` by email, then by phone) → if not found, `createMember`:
```
POST /host/members
{ email, firstName, lastName, phoneNumber, homeLocationId }
```
`homeLocationId` resolution (`resolveHomeLocationId`): explicit `input.homeLocationId`, else if `center`/`studio_location` contains "kwality"/"kemps" → `kwalityHomeLocationId`, else → `defaultHomeLocationId` (`MOMENCE_DEFAULT_HOME_LOCATION_ID`, default **29821**, i.e. Bandra).

### 2b. Add membership (checkout)

`addMembershipToMember(memberId, membershipConfig)`:
```
POST /host/checkout
{
  memberId,
  homeLocationId,
  items: [{ id: checkoutItemId, type: "subscription", membershipId, attemptedPriceInCurrency }],
  paymentMethods: [{ id: paymentMethodId, type: "free" }]
}
```
Always uses a `"free"` payment method here — actual Stripe payment (for the paid flow) already happened separately; this just books the membership against it at zero additional charge to Momence.

Membership configs used:

| Config | Function | Default id | Default price | Used by |
|---|---|---|---|---|
| Open Barre / free trial | `buildOpenBarreMembershipConfig` | `33609` (`MOMENCE_OPEN_BARRE_MEMBERSHIP_ID` via JSON override) | ₹0 | standard Barre free-trial provisioning |
| Studio Complimentary Class | `buildStudioComplimentaryClassMembershipConfig` | `97880` (`MOMENCE_STUDIO_COMPLIMENTARY_CLASS_MEMBERSHIP_ID`) | ₹0 | influencer flow |
| Newcomers 2 For 1 (paid) | `DEFAULT_MOMENCE_MEMBERSHIP` (below) | `240932` | ₹1,750 (charged ₹1,838 via Stripe incl. fees) | post-payment fulfillment, path 3 |

### 2c. Child accounts (Kids Juniors)

`createChildAccountForMember(parentMemberId, childInput)` — dashboard API:
```
POST {dashboard}/host/{hostId}/customers/{parentMemberId}/children
{ firstName, lastName, customFields: [{ id: MOMENCE_CHILD_DOB_CUSTOMER_FIELD_ID (default 6592), value: childDateOfBirth }] }
```

### 2d. Waiver signing (Kids consent)

`signKidsConsentWaivers(memberId, signature)`:
1. `listMemberWaiversWithRetry` — `GET {dashboard}/host/{hostId}/members/{memberId}/waivers`, retried up to `MOMENCE_WAIVER_LOOKUP_ATTEMPTS` (default **5**) times, `MOMENCE_WAIVER_LOOKUP_DELAY_MS` apart (default **600ms**) — waivers aren't always available immediately after member/child creation.
2. Matches predefined waiver ids: `MOMENCE_KIDS_PARENT_CONSENT_PREDEFINED_WAIVER_IDS` (default `waiver, membership-waiver`) and `MOMENCE_KIDS_CHILD_CONSENT_PREDEFINED_WAIVER_IDS` (default `child-waiver`).
3. Signs each matched waiver via the dashboard API with the drawn signature.

### 2e. Free class session booking (Mum Tribe)

`addFreeSessionToMember(memberId, sessionConfig)` — dashboard API:
```
POST {dashboard}/host/{hostId}/sessions/{sessionId}/... (checkout-style payload)
{
  hostId, payingMemberId, targetMemberId,
  items: [{ guid, type: "session", quantity: 1, priceInCurrency, sessionId, isOverrideCapacity }],
  paymentMethods: [{ type: "free", weightRelative: 1, guid }]
}
```
Defaults for the Mum Tribe route: `MOMENCE_KIDS_MUM_TRIBE_SESSION_ID` (`138939271`), `MOMENCE_KIDS_MUM_TRIBE_HOME_LOCATION_ID` (`29821`), `MOMENCE_KIDS_MUM_TRIBE_PRICE_IN_CURRENCY` (`0`).

---

## 3. Post-payment fulfillment (paid Newcomers 2-for-1 flow)

**Where:** `fulfillMomencePurchaseFromSession` (`server.js:2025`), triggered from `/api/verify-payment` after Stripe confirms the checkout session succeeded.

**Membership config** (`getMomencePostPaymentConfig`, `server.js:948`) merges, in order:
1. `DEFAULT_MOMENCE_MEMBERSHIP` (hardcoded, below)
2. `MOMENCE_MEMBERSHIP_JSON` env override (deep-merged)
3. The active payment stage's `membership` override (`production` = no override; `testing` = ₹1 test membership, id `675444`)

```js
DEFAULT_MOMENCE_MEMBERSHIP = {
  id: 240932,
  hostId: 13752,
  taxBracketId: 36758,
  type: 'package-events',
  subscriptionType: 'absolute',
  name: 'Newcomers 2 For 1',
  price: 1750,
  currency: 'inr',
  duration: 14,
  durationUnit: 'days',
  activateOnFirstUse: true,
  numberOfEvents: 2,
  isIntroOffer: true,
  isSingleBuy: true,
  priceAfterProration: 1750,
  description: 'Physique 57 Newcomers 2 For 1 package.'
}
```
Note: the Stripe charge is ₹1,838 (`DEFAULT_STRIPE_CHECKOUT_CONFIG.amount = 183800` paise) but the Momence membership itself is recorded at ₹1,750 — the ₹88 delta is payment-processing markup, not passed to Momence.

**Two fulfillment modes**, selected by `mode`:

- **`mode: 'disabled'`** (no Supabase function URL configured) — fulfillment is skipped; the trial is only recorded in Supabase, not provisioned in Momence automatically. Requires manual follow-up.
- **`mode: 'supabase-function'`** (default once `SUPABASE_MOMENCE_PAYMENT_SYNC_URL` or `SUPABASE_URL` is set) — delegates to a Supabase Edge Function:
  ```
  POST {SUPABASE_MOMENCE_PAYMENT_SYNC_URL}  (default: {SUPABASE_URL}/functions/v1/manual-momence-sync)
  apikey / Authorization: Bearer {SUPABASE_MOMENCE_PAYMENT_SYNC_KEY}
  {
    action: "create-member-and-purchase-membership",
    member: { email, firstName, lastName, phoneNumber, homeLocationId },
    membership: { ...resolved membership config ... }
  }
  ```
  The Edge Function itself talks to Momence (keeps Momence API v2 creds out of the main app server, and can retry/queue independently of the checkout request lifecycle).

  A **direct-call fallback** also exists (`provisionMembership`, calls `MomencePublicApiClient.ensureMemberAndAddMembership` directly) if the Supabase function path fails or isn't configured — see `server.js:1852` onward.

---

## Data flow summary (paid form, `/`)

```
User fills form → POST /api/create-checkout-session (Stripe) → Stripe redirect
  → GET /api/verify-payment?session_id=...
      → fulfillMomencePurchaseFromSession()
          → Supabase Edge Function "manual-momence-sync"  (or direct API v2 fallback)
              → Momence: ensureMember + addMembershipToMember (Newcomers 2 For 1, ₹1,750)
      → submitToMomence()  (lead webhook, best-effort, parallel path)
      → syncLeadToRespondIo()  (Respond.io contact + conversation — see separate doc/answer)
      → supabaseLeadStore.saveSubmittedLead()  (source of truth regardless of Momence outcome)
```

Free-trial forms (`/barre`, `/kids`, influencer, Mum Tribe) skip Stripe entirely and call `submitToMomence` (lead webhook) + `MomencePublicApiClient.ensureMemberAndAddMembership` (or `addFreeSessionToMember` for Mum Tribe) directly on submit.

---

## All Momence-related constants & env vars

### Hardcoded constants (`server.js`)

| Constant | Value | Purpose |
|---|---|---|
| `DEFAULT_REGULAR_MOMENCE_SOURCE_ID` | `'8082'` | lead webhook sourceId, non-kids |
| `DEFAULT_KIDS_MOMENCE_SOURCE_ID` | `'212426'` | lead webhook sourceId, kids |
| `MAIA_MOMENCE_SOURCE_ID` | `'14729'` | Maia influencer campaign sourceId override |
| `DEFAULT_MOMENCE_HOST_ID` | `13752` | Momence host/studio group id (dashboard + membership) |
| `MOMENCE_DASHBOARD_ORIGIN` | `'https://momence.com'` | dashboard base origin |
| `DEFAULT_MOMENCE_DASHBOARD_BASE_URL` | `https://momence.com/_api/primary` | dashboard API base path |
| `DEFAULT_KIDS_MUM_TRIBE_CLASS_SESSION_ID` | `138939271` | Mum Tribe session id |
| `DEFAULT_KIDS_MUM_TRIBE_CLASS_HOME_LOCATION_ID` | `29821` | Mum Tribe home location (Bandra) |
| `DEFAULT_MOMENCE_WAIVER_LOOKUP_ATTEMPTS` | `5` | waiver polling retries |
| `DEFAULT_MOMENCE_WAIVER_LOOKUP_DELAY_MS` | `600` | waiver polling delay |
| `DEFAULT_KIDS_PARENT_CONSENT_PREDEFINED_WAIVER_IDS` | `['waiver','membership-waiver']` | parent waiver ids |
| `DEFAULT_KIDS_CHILD_CONSENT_PREDEFINED_WAIVER_IDS` | `['child-waiver']` | child waiver id |
| `DEFAULT_MOMENCE_CHILD_DOB_CUSTOMER_FIELD_ID` | `6592` | Momence custom field id for child DOB |
| `STUDIO_CLASS_OPTIONS` | Bandra: `powerCycle, Barre 57`; Kemps: `powerCycle, Strength Lab, Barre 57` | valid center/type combos, server-side validation |
| `STUDIO_SCHEDULE_LOCATION_IDS` | Bandra `29821`, Kemps `9030` | used to build `/schedule-mum?locationId=` links |
| `DEFAULT_MOMENCE_MEMBERSHIP` | see above | paid Newcomers 2-for-1 membership |

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MOMENCE_API_TOKEN` / `MOMENCE_TOKEN` | — | lead webhook bearer token |
| `MOMENCE_LEAD_ENDPOINT` | — | lead webhook URL (`.../integrations/customer-leads/{account}/collect`) |
| `MOMENCE_SOURCE_ID` / `MOMENCE_REGULAR_SOURCE_ID` / `MOMENCE_KIDS_SOURCE_ID` | `8082` / `212426` | override lead sourceId |
| `MOMENCE_API_V2_BASE_URL` | `https://api.momence.com/api/v2` | public API base |
| `MOMENCE_API_V2_BASIC_AUTH` | — | Basic auth header value for token exchange |
| `MOMENCE_API_V2_USERNAME` / `MOMENCE_API_V2_PASSWORD` | — | password-grant credentials |
| `MOMENCE_HOST_ID` | `13752` | host id for dashboard/session calls |
| `MOMENCE_DEFAULT_HOME_LOCATION_ID` | `29821` | fallback home location (Bandra) |
| `MOMENCE_HOME_LOCATION_ID` | = default above | override default home location |
| `MOMENCE_KWALITY_HOME_LOCATION_ID` | = home location | Kemps-specific home location |
| `MOMENCE_DASHBOARD_BASE_URL` | `https://momence.com/_api/primary` | dashboard API base |
| `MOMENCE_ALL_COOKIES` | — | raw session cookie string for dashboard API (waiver signing, child accounts, free sessions) |
| `MOMENCE_DISABLE_COOKIE_REFRESH` | `false` | disable auto cookie refresh on auth failure |
| `MOMENCE_LOGIN_EMAIL` / `MOMENCE_LOGIN_PASSWORD` / `MOMENCE_TOTP_SECRET` | — | credentials for automated dashboard re-login (email+password+TOTP) |
| `MOMENCE_ENV_FILE` | `.env` | file to persist refreshed cookies/tokens back into |
| `MOMENCE_AUTH_BACKUP_PATH` | — | optional extra backup file for refreshed auth |
| `MOMENCE_OPEN_BARRE_MEMBERSHIP_JSON` | id `33609`, ₹0 | free Barre trial membership override |
| `MOMENCE_STUDIO_COMPLIMENTARY_CLASS_MEMBERSHIP_ID` / `..._JSON` | id `97880`, ₹0 | influencer comp-class membership override |
| `MOMENCE_MEMBERSHIP_JSON` | — | deep-merge override for the paid Newcomers 2-for-1 membership |
| `MOMENCE_POST_PAYMENT_MODE` | `disabled` or `supabase-function` (auto if function URL set) | selects post-payment fulfillment path |
| `SUPABASE_MOMENCE_PAYMENT_SYNC_URL` | `{SUPABASE_URL}/functions/v1/manual-momence-sync` | Edge Function endpoint for post-payment provisioning |
| `SUPABASE_MOMENCE_PAYMENT_SYNC_KEY` | falls back to `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_MOMENCE_SESSIONS_KEY` | auth for that function |
| `SUPABASE_MOMENCE_PAYMENT_SYNC_ACTION` | `create-member-and-purchase-membership` | action name sent to the Edge Function |
| `MOMENCE_WAIVER_LOOKUP_ATTEMPTS` / `MOMENCE_WAIVER_LOOKUP_DELAY_MS` | `5` / `600` | waiver polling tuning |
| `MOMENCE_KIDS_CONSENT_PREDEFINED_WAIVER_IDS` (or split `..._PARENT_...` / `..._CHILD_...`) | `waiver,membership-waiver,child-waiver` | which waivers to sign for Kids consent |
| `MOMENCE_CHILD_DOB_CUSTOMER_FIELD_ID` | `6592` | Momence custom field id for child date of birth |
| `MOMENCE_KIDS_MUM_TRIBE_SESSION_ID` | `138939271` | Mum Tribe class session id |
| `MOMENCE_KIDS_MUM_TRIBE_HOME_LOCATION_ID` | `29821` | Mum Tribe home location |
| `MOMENCE_KIDS_MUM_TRIBE_PRICE_IN_CURRENCY` | `0` | Mum Tribe session price |
| `MOMENCE_KIDS_MUM_TRIBE_SEND_EMAIL` | `false` | whether Momence emails the member for the Mum Tribe booking |
| `MOMENCE_KIDS_MUM_TRIBE_OVERRIDE_CAPACITY` | `false` | allow booking past session capacity |
| `MOMENCE_EXTERNAL_TRANSACTION_TAG_ID` | `4578` | (referenced for external transaction tagging) |
| `SUPABASE_MOMENCE_SESSIONS_URL` / `SUPABASE_MOMENCE_SESSIONS_KEY` | — | separate Edge Function used by `scheduleService.js` for the public schedule feeds (`/sessions-kemps` etc.), not lead/membership related |

Full list with placeholder values also lives in `.env.example` at the repo root.

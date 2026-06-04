# Kids Trial Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/kids` lead capture route with child age and center-specific batch preference.

**Architecture:** Add a focused React component for the kids route, keep backend validation in `server.js`, and persist kids-specific fields through existing lead storage by adding metadata/raw payload support. Use tests first for route detection and backend payload validation.

**Tech Stack:** Express, React 18, Vite, TypeScript, Node test runner, existing UI components, existing tracking and submission utilities.

---

### Task 1: Failing Tests

**Files:**
- Create: `test/kids-route.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/kids-route.test.js` with assertions for the Express fallback, React route source, kids form source, and backend validation helpers.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/kids-route.test.js`

Expected: failure because `/kids`, `KidsTrialForm`, and kids validation do not exist.

### Task 2: Backend Contract

**Files:**
- Modify: `server.js`
- Modify: `supabaseService.js`

- [ ] **Step 1: Implement kids batch constants and validation**

Add center-specific kids batch options, `validateKidsLeadPayload`, and export it.

- [ ] **Step 2: Add `/api/submit-kids-lead`**

Use the same no-payment submission path as Barre, with `source_form: "kids-trial-form"` and `type: "Kids 57"`.

- [ ] **Step 3: Include kids fields downstream**

Add `childAge` and `batchPreference` to Momence request payloads and Supabase metadata.

- [ ] **Step 4: Run backend tests**

Run: `npm test -- test/kids-route.test.js`

Expected: backend validation assertions pass; frontend source assertions still fail until the client route exists.

### Task 3: Client Route and Form

**Files:**
- Modify: `client/src/App.tsx`
- Create: `client/src/components/kids-trial-form.tsx`
- Copy assets to: `client/public/p57-assets/p57-kids-barre-1.png`, `client/public/p57-assets/p57-kids-barre-2.png`

- [ ] **Step 1: Add route metadata and routing**

Detect `/kids` and render `KidsTrialForm`.

- [ ] **Step 2: Build the kids form**

Use existing UI primitives, phone validation, tracking payload, success payload, and thank-you redirect patterns.

- [ ] **Step 3: Implement conditional batch select**

Use one Bandra combined batch and two Kemps batches. Clear invalid batch selection when center changes.

- [ ] **Step 4: Run route tests**

Run: `npm test -- test/kids-route.test.js`

Expected: all kids route tests pass.

### Task 4: Build and Rendered QA

**Files:**
- Verify only unless fixes are needed.

- [ ] **Step 1: Run full tests**

Run: `npm test`

- [ ] **Step 2: Run client build**

Run: `npm --prefix client run build`

- [ ] **Step 3: Start the local server**

Run: `PORT=8082 npm start`

- [ ] **Step 4: Browser QA**

Open `http://localhost:8082/kids`, verify the page is not blank, check console health, fill required fields, verify batch choices change by center, and capture desktop plus mobile screenshots.

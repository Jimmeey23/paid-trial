# Kids Trial Route Design

## Goal

Add `trial.physique57india.com/kids` as a dedicated kids trial lead route that reuses the existing Physique 57 lead capture pattern while collecting child age and location-specific batch preference.

## Route

- `/kids` and `/kids/*` are served by the Express SPA fallback.
- `client/src/App.tsx` detects the route and renders a dedicated kids trial form.
- The page has Kids-specific title, meta description, Open Graph title, and JSON-LD name.

## Form Fields

The form captures:

- Parent/guardian first name
- Parent/guardian last name
- Email
- Phone with country selector
- Preferred center
- Child age
- Batch preference
- Waiver/terms acceptance

The batch preference field is disabled until the user selects a center.

## Batch Rules

- `Supreme HQ, Bandra`: `Tuesday & Friday - 4:30 PM - Simonelle & Cauveri`
- `Kwality House, Kemps Corner`: `Batch 1 - Monday & Wednesday - 4:30 PM - Cauveri & Karan`
- `Kwality House, Kemps Corner`: `Batch 2 - Tuesday & Thursday - 11:30 AM - Karan & Cauveri`

When the selected center changes, any now-invalid batch preference is cleared.

## Assets

The two supplied kids hero images are saved under `client/public/p57-assets/` and used as the route hero image rotation.

## Submission

The kids route posts to `/api/submit-kids-lead`.

The backend validates:

- Standard lead fields
- Child age as a required whole number between 3 and 17
- Batch preference as a required option for the submitted center

The server builds a normal lead record with:

- `type: "Physique 57 - Juniors"`
- `source_form: "kids-trial-form"`
- `childAge`
- `batchPreference`

Kids-specific values are included in the saved raw payload and Momence lead request payload. Supabase stores them in `metadata` when configured.

## Success Flow

After a successful submission, the page follows the existing form behavior:

- Show success state
- Save a trial success payload
- Redirect to the existing thank-you route

## Testing

Add source-level and backend tests that fail before implementation:

- Express serves `/kids` and `/kids/*`.
- React app routes `/kids` to `KidsTrialForm`.
- Kids form source contains the expected fields, images, and batch labels.
- Server exports and validates a valid kids payload.
- Server rejects missing or invalid kids age.
- Server rejects a batch preference that does not match the selected center.

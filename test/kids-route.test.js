const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const app = require('../server');

function readProjectFile(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function validKidsPayload(overrides = {}) {
  return {
    firstName: 'Asha',
    lastName: 'Shah',
    email: 'asha@example.com',
    phoneNumber: '+91 98765 43210',
    phoneCountry: 'IN',
    center: 'Supreme Headquarters, Bandra',
    childName: 'Riya Shah',
    childAge: '10',
    childDateOfBirth: '2015-06-01',
    batch: 'Tuesday & Friday - 4:30 PM - Tue: Simonelle, Fri: Cauveri',
    waiverAccepted: 'accepted',
    signatureName: 'Asha Shah',
    signatureRealSignature: '[[12,18,24,30]]',
    event_id: 'lead_kids_test_123',
    ...overrides
  };
}

test('Express serves the kids route through the client app fallback', () => {
  const routePaths = app._router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.deepEqual(
    routePaths.find((entry) => Array.isArray(entry) && entry.includes('/kids')),
    ['/kids', '/kids/*']
  );
});

test('Express serves kids-specific link preview metadata in raw HTML', async () => {
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

  if (!fs.existsSync(distIndex)) {
    assert.fail('dist/index.html is required for metadata route rendering');
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address();
    const html = await new Promise((resolve, reject) => {
      http.get({
        hostname: '127.0.0.1',
        port,
        path: '/kids',
        headers: {
          Host: 'www.physique57.in',
          'x-forwarded-proto': 'https'
        }
      }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve(body));
      }).on('error', reject);
    });

    assert.match(html, /<title>Physique 57 Juniors \| Kids Strength &amp; Agility Program<\/title>/);
    assert.match(html, /<meta property="og:title" content="Physique 57 Juniors \| Kids Strength &amp; Agility Program"/);
    assert.match(html, /<meta name="twitter:title" content="Physique 57 Juniors \| Kids Strength &amp; Agility Program"/);
    assert.match(html, /content="Register for Physique 57 Juniors for ages 9-13/);
    assert.match(html, /p57-juniors-hero-2026-1\.png/);
    assert.doesNotMatch(html, /<title>Physique 57 India \| Book Your Trial Class Today<\/title>/);
    assert.doesNotMatch(html, /Juniors Trial/i);
    assert.doesNotMatch(html, /trial/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Static document metadata does not use trial copy', () => {
  const source = readProjectFile('client/index.html');

  assert.match(source, /Physique 57 India \| Book Your Studio Session/);
  assert.doesNotMatch(source, /Book Your Trial/i);
  assert.doesNotMatch(source, /trial class/i);
});

test('React app routes /kids to the Kids Juniors form', () => {
  const source = readProjectFile('client/src/App.tsx');

  assert.match(source, /import \{ KidsTrialForm \} from "@\/components\/kids-trial-form"/);
  assert.match(source, /import \{ KidsConsentPage \} from "@\/components\/kids-consent-page"/);
  assert.match(source, /currentPath === "\/kids"/);
  assert.match(source, /currentPath === "\/kids-consent"/);
  assert.match(source, /isKidsRoute/);
  assert.match(source, /isKidsConsentRoute/);
  assert.match(source, /routeMeta\.kids/);
  assert.match(source, /routeMeta\.kidsConsent/);
  assert.match(source, /<KidsTrialForm \/>/);
  assert.match(source, /<KidsConsentPage \/>/);
});

test('Juniors form contains child name, date of birth, age, conditional batch options, brand content, and supplied media', () => {
  const source = readProjectFile('client/src/components/kids-trial-form.tsx');

  assert.match(source, /p57-juniors-hero-2026-1\.png/);
  assert.match(source, /p57-juniors-hero-2026-2\.png/);
  assert.match(source, /p57-juniors-hero-2026-3\.png/);
  assert.match(source, /p57-juniors-hero-2026-4\.png/);
  assert.doesNotMatch(source, /p57-juniors-animation\.mp4/);
  assert.doesNotMatch(source, /p57-kids-barre-/);
  assert.doesNotMatch(source, /<video/);
  assert.match(source, /Physique 57 - Juniors/);
  assert.match(source, /Strong foundations start here/i);
  assert.match(source, /Functional Movement/);
  assert.match(source, /Agility Drills/);
  assert.match(source, /Barre-Based Work/);
  assert.match(source, /Designed for Growing Bodies/);
  assert.match(source, /Build Strength/);
  assert.match(source, /Improve Balance/);
  assert.match(source, /Boost Agility/);
  assert.match(source, /Build Confidence/);
  assert.match(source, /Have Fun/);
  assert.doesNotMatch(source, /India's first barre-based fitness method, thoughtfully shaped for juniors/);
  assert.doesNotMatch(source, /Premium studio spaces at Bandra and Kemps Corner/);
  assert.doesNotMatch(source, /Structured Juniors classes with warm guidance for parents/);
  assert.doesNotMatch(source, /Choose Bandra or Kemps Corner/);
  assert.doesNotMatch(source, /Batch appears after center selection/);
  assert.doesNotMatch(source, /We will help choose the right starting point/);
  assert.doesNotMatch(source, /Kids 57/);
  assert.match(source, /childName/);
  assert.match(source, /Child name/);
  assert.match(source, /childDateOfBirth/);
  assert.match(source, /Child date of birth/);
  assert.match(source, /childAge/);
  assert.match(source, /Child age/);
  assert.match(source, /batch/);
  assert.match(source, /Batch preference/);
  assert.match(source, /id="batch"/);
  assert.match(source, /Tuesday & Friday - 4:30 PM - Tue: Simonelle, Fri: Cauveri/);
  assert.match(source, /Batch A - Monday & Thursday - 11:30 AM - Mon: Simonelle, Thu: Karanvir/);
  assert.match(source, /Batch B - Monday & Wednesday - 4:30 PM - Mon: Cauveri, Wed: Pranjali/);
  assert.match(source, /signatureName/);
  assert.match(source, /SignaturePad/);
  assert.match(source, /signatureRealSignature/);
  assert.match(source, /showConsentModal/);
  assert.match(source, /LegalConsentModal/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /data-consent-modal-trigger/);
  assert.doesNotMatch(source, /target="_blank"/);
  assert.doesNotMatch(source, /href="\/kids-consent"/);
  assert.match(source, /Juniors consent form/);
  assert.match(source, /\/api\/submit-kids-lead/);
});

test('Juniors consent opens as a legal modal from the form', () => {
  const source = readProjectFile('client/src/components/kids-trial-form.tsx');

  assert.match(source, /Child Booking Waiver/);
  assert.match(source, /Document Review Copy/);
  assert.match(source, /setShowConsentModal\(true\)/);
  assert.match(source, /setShowConsentModal\(false\)/);
  assert.match(source, /I have reviewed this waiver/);
  assert.match(source, /KidsConsentDocument/);
  assert.doesNotMatch(source, /window\.open/);
});

test('Juniors consent page displays the attached waiver and class policy content', () => {
  const source = readProjectFile('client/src/components/kids-consent-page.tsx');

  assert.match(source, /physique57-logo\.jpg/);
  assert.match(source, /KidsConsentDocument/);
  assert.match(source, /Release and Indemnity Agreement/);
  assert.match(source, /executed freely and voluntarily/);
  assert.match(source, /AMP Fitness LLP/);
  assert.match(source, /Cancellations, transfers & refunds are not possible under this program/);
  assert.match(source, /By signing below/);
  assert.match(source, /This Agreement shall be governed by and construed in accordance with the laws of India/);
});

test('Thank you page has a kids-only Juniors layout for kids submissions', () => {
  const source = readProjectFile('client/src/components/thank-you-page.tsx');

  assert.match(source, /isKidsSubmission/);
  assert.match(source, /KIDS_THANK_YOU_HERO_IMAGES/);
  assert.match(source, /KIDS_THANK_YOU_GALLERY_IMAGES/);
  assert.match(source, /KIDS_THANK_YOU_GALLERY_IMAGES = KIDS_THANK_YOU_HERO_IMAGES\.slice\(1\)/);
  assert.match(source, /function KidsHeroImage/);
  assert.match(source, /sourceForm === "kids-trial-form"/);
  assert.match(source, /p57-juniors-hero-2026-1\.png/);
  assert.match(source, /p57-juniors-hero-2026-2\.png/);
  assert.match(source, /p57-juniors-hero-2026-3\.png/);
  assert.match(source, /p57-juniors-hero-2026-4\.png/);
  assert.match(source, /Your Juniors request is in/);
  assert.match(source, /What happens next for your child/);
  assert.doesNotMatch(source, /KidsImageMosaic/);
  assert.doesNotMatch(source, /supportingImages/);
});

test('Juniors form uses elevated copy, batch cards, and expanded method sections', () => {
  const source = readProjectFile('client/src/components/kids-trial-form.tsx');

  assert.doesNotMatch(source, /Trial Batch Enquiry/);
  assert.doesNotMatch(source, /Brand USPs/);
  assert.match(source, /P57 Juniors/);
  assert.match(source, /Plan your child's first session/);
  assert.match(source, /Inside The Juniors Method/);
  assert.match(source, /What Young Movers Build/);
  assert.match(source, /First Session Flow/);
  assert.doesNotMatch(source, /Available Juniors Batches/);
  assert.match(source, /Good To Know/);
  assert.match(source, /A warm, confident start at the barre/);
  assert.doesNotMatch(source, /Compare studio timings at a glance/);
  assert.doesNotMatch(source, /#fff7ed/);
  assert.doesNotMatch(source, /radial-gradient\(circle_at_20%_0%/);
  assert.doesNotMatch(source, /from-sky-500 via-orange-400 to-emerald-500/);
  assert.doesNotMatch(source, /first enquiry/i);
  assert.doesNotMatch(source, /batch fit/i);
  assert.doesNotMatch(source, /team review/i);
  assert.doesNotMatch(source, /captured for batch readiness/i);
  assert.doesNotMatch(source, /used only for studio follow-up/i);
  assert.doesNotMatch(source, /final batch based on center, age, and availability/i);
  assert.match(source, /data-section="batch-card-grid"/);
  assert.match(source, /data-batch-card/);
});

test('Juniors desktop layout fixes the hero and scrolls only the right form panel', () => {
  const source = readProjectFile('client/src/components/kids-trial-form.tsx');

  assert.match(source, /data-layout="juniors-page-shell"/);
  assert.match(source, /lg:h-\[100dvh\]/);
  assert.match(source, /lg:overflow-hidden/);
  assert.match(source, /data-layout="juniors-fixed-hero"/);
  assert.match(source, /lg:fixed/);
  assert.match(source, /lg:inset-y-0/);
  assert.match(source, /lg:left-0/);
  assert.match(source, /lg:w-\[42vw\]/);
  assert.match(source, /data-layout="juniors-form-scroll-panel"/);
  assert.match(source, /lg:ml-\[42vw\]/);
  assert.match(source, /lg:h-\[100dvh\]/);
  assert.match(source, /lg:w-\[58vw\]/);
  assert.match(source, /lg:overflow-y-auto/);
  assert.match(source, /lg:overscroll-contain/);
});

test('validateKidsLeadPayload accepts a valid Bandra kids payload', () => {
  assert.equal(typeof app.validateKidsLeadPayload, 'function');

  const validation = app.validateKidsLeadPayload(validKidsPayload());

  assert.equal(validation.isValid, true);
  assert.equal(validation.data.type, 'Physique 57 - Juniors');
  assert.equal(validation.data.source_form, 'kids-trial-form');
  assert.equal(validation.data.center, 'Supreme Headquarters, Bandra');
  assert.equal(validation.data.childName, 'Riya Shah');
  assert.equal(validation.data.childAge, 10);
  assert.equal(validation.data.childDateOfBirth, '2015-06-01');
  assert.equal(validation.data.batch, 'Tuesday & Friday - 4:30 PM - Tue: Simonelle, Fri: Cauveri');
  assert.equal(validation.data.signatureName, 'Asha Shah');
  assert.equal(validation.data.signatureRealSignature, '[[12,18,24,30]]');
});

test('validateKidsLeadPayload rejects missing child name', () => {
  assert.equal(typeof app.validateKidsLeadPayload, 'function');

  const validation = app.validateKidsLeadPayload(validKidsPayload({ childName: '' }));

  assert.equal(validation.isValid, false);
  assert.equal(validation.fieldErrors.childName, 'Child name is required.');
});

test('validateKidsLeadPayload rejects missing or out-of-range child age', () => {
  assert.equal(typeof app.validateKidsLeadPayload, 'function');

  const missingAge = app.validateKidsLeadPayload(validKidsPayload({ childAge: '' }));
  assert.equal(missingAge.isValid, false);
  assert.equal(missingAge.fieldErrors.childAge, 'Child age is required.');

  const outOfRangeAge = app.validateKidsLeadPayload(validKidsPayload({ childAge: '18' }));
  assert.equal(outOfRangeAge.isValid, false);
  assert.equal(outOfRangeAge.fieldErrors.childAge, 'Child age must be between 9 and 13.');
});

test('validateKidsLeadPayload rejects missing or invalid child date of birth', () => {
  assert.equal(typeof app.validateKidsLeadPayload, 'function');

  const missingDateOfBirth = app.validateKidsLeadPayload(validKidsPayload({ childDateOfBirth: '' }));
  assert.equal(missingDateOfBirth.isValid, false);
  assert.equal(missingDateOfBirth.fieldErrors.childDateOfBirth, 'Child date of birth is required.');

  const invalidDateOfBirth = app.validateKidsLeadPayload(validKidsPayload({ childDateOfBirth: '06/01/2015' }));
  assert.equal(invalidDateOfBirth.isValid, false);
  assert.equal(invalidDateOfBirth.fieldErrors.childDateOfBirth, 'Child date of birth must use YYYY-MM-DD.');
});

test('validateKidsLeadPayload rejects a batch preference that does not match the center', () => {
  assert.equal(typeof app.validateKidsLeadPayload, 'function');

  const validation = app.validateKidsLeadPayload(validKidsPayload({
    center: 'Supreme Headquarters, Bandra',
    batch: 'Batch A - Monday & Thursday - 11:30 AM - Mon: Simonelle, Thu: Karanvir'
  }));

  assert.equal(validation.isValid, false);
  assert.equal(validation.fieldErrors.batch, 'Choose an available Juniors batch for the selected studio.');
});

test('validateKidsLeadPayload rejects missing consent signature details', () => {
  assert.equal(typeof app.validateKidsLeadPayload, 'function');

  const missingTypedSignature = app.validateKidsLeadPayload(validKidsPayload({ signatureName: '' }));
  assert.equal(missingTypedSignature.isValid, false);
  assert.equal(missingTypedSignature.fieldErrors.signatureName, 'Parent/guardian signature name is required.');

  const missingDrawnSignature = app.validateKidsLeadPayload(validKidsPayload({ signatureRealSignature: '' }));
  assert.equal(missingDrawnSignature.isValid, false);
  assert.equal(missingDrawnSignature.fieldErrors.signatureRealSignature, 'Parent/guardian signature is required.');
});

test('buildMomenceLeadRequestPayload includes kids-specific fields with Momence selectors', () => {
  const previousSourceId = process.env.MOMENCE_SOURCE_ID;
  delete process.env.MOMENCE_SOURCE_ID;

  const payload = app.buildMomenceLeadRequestPayload(
    {
      ...validKidsPayload(),
      id: 'lead_123',
      type: 'Physique 57 - Juniors',
      childName: 'Riya Shah',
      childAge: 10,
      childDateOfBirth: '2015-06-01',
      batch: 'Tuesday & Friday - 4:30 PM - Tue: Simonelle, Fri: Cauveri'
    },
    {
      token: 'token'
    }
  );

  if (previousSourceId === undefined) {
    delete process.env.MOMENCE_SOURCE_ID;
  } else {
    process.env.MOMENCE_SOURCE_ID = previousSourceId;
  }

  assert.equal(payload.sourceId, '212426');
  assert.equal(payload.childName, 'Riya Shah');
  assert.equal(payload.childAge, 10);
  assert.equal(payload.childDateOfBirth, '2015-06-01');
  assert.equal(payload.batch, 'Tuesday & Friday - 4:30 PM - Tue: Simonelle, Fri: Cauveri');
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'batchPreference'), false);
});

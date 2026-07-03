const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  MomencePublicApiClient,
  buildOpenBarreMembershipConfig,
  buildStudioComplimentaryClassMembershipConfig,
  buildMomenceLeadRequestPayload,
  buildRespondIoContactPayload,
  buildInfluencerSubmissionSuccessPayload,
  normalizePhoneDigits,
  processLeadSubmission,
  resolveRespondIoContactIdentifier,
  syncLeadToRespondIo,
  provisionKidsConsent,
  provisionInfluencerMembership,
  resolveScheduleLocationIds,
  buildStudioSchedulePageUrl
} = require('../server');

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

test('ensureMember finds an existing member by email before creating one', async () => {
  const calls = [];
  const client = new MomencePublicApiClient({
    basicAuth: 'Basic test',
    username: 'user@example.com',
    password: 'secret',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/auth/token')) {
        return jsonResponse({ access_token: 'access-token' });
      }

      if (String(url).includes('/host/members?')) {
        return jsonResponse({
          payload: [
            {
              memberId: 123,
              email: 'member@example.com',
              firstName: 'Existing',
              lastName: 'Member',
              phoneNumber: '+91 98765 43210'
            }
          ]
        });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const member = await client.ensureMember({
    firstName: 'New',
    lastName: 'Lead',
    email: 'member@example.com',
    phoneNumber: '+91 98765 43210'
  });

  assert.equal(member.memberId, 123);
  assert.equal(member.action, 'found_existing');
  assert.equal(calls.some((call) => String(call.url).endsWith('/host/members')), false);
});

test('ensureMember creates a member when email and phone lookups miss', async () => {
  const calls = [];
  const client = new MomencePublicApiClient({
    basicAuth: 'Basic test',
    username: 'user@example.com',
    password: 'secret',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/auth/token')) {
        return jsonResponse({ access_token: 'access-token' });
      }

      if (String(url).includes('/host/members?')) {
        return jsonResponse({ payload: [] });
      }

      if (String(url).endsWith('/host/members')) {
        assert.deepEqual(JSON.parse(options.body), {
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'Lead',
          phoneNumber: '+919876543210',
          homeLocationId: 29821
        });
        return jsonResponse({ memberId: 456 });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const member = await client.ensureMember({
    firstName: 'New',
    lastName: 'Lead',
    email: 'new@example.com',
    phoneNumber: '+91 98765 43210'
  });

  assert.equal(member.memberId, 456);
  assert.equal(member.action, 'created_new');
  assert.equal(calls.filter((call) => String(call.url).includes('/host/members?')).length, 2);
});

test('addMembershipToMember performs a free checkout for the Open Barre membership', async () => {
  const client = new MomencePublicApiClient({
    basicAuth: 'Basic test',
    username: 'user@example.com',
    password: 'secret',
    fetchImpl: async (url, options = {}) => {
      if (String(url).endsWith('/auth/token')) {
        return jsonResponse({ access_token: 'access-token' });
      }

      if (String(url).endsWith('/host/checkout')) {
        assert.deepEqual(JSON.parse(options.body), {
          memberId: 123,
          homeLocationId: 29821,
          items: [
            {
              id: 'open-barre-membership',
              type: 'subscription',
              membershipId: 33609,
              attemptedPriceInCurrency: '0'
            }
          ],
          paymentMethods: [
            {
              id: 'open-barre-free',
              type: 'free'
            }
          ]
        });
        return jsonResponse({ purchasedItems: [{ type: 'membership', boughtMembershipId: 789 }] });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const result = await client.addMembershipToMember(123, buildOpenBarreMembershipConfig());

  assert.equal(result.success, true);
  assert.equal(result.memberId, 123);
  assert.equal(result.purchaseId, 789);
});

test('signKidsConsentWaivers uses the Momence dashboard primary API base by default', async () => {
  const calls = [];
  const client = new MomencePublicApiClient({
    dashboardCookies: 'ribbon.connect.sid=session-token',
    hostId: 13752,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url) === 'https://momence.com/_api/primary/host/13752/members/123/waivers') {
        return jsonResponse({
          waivers: [
            {
              type: 'predefined',
              id: 'child-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'child-key'
            }
          ]
        });
      }

      if (String(url) === 'https://momence.com/_api/primary/public/hosts/13752/members/123/waivers/child-waiver/sign?signatureKey=child-key') {
        return jsonResponse({ success: true });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const result = await client.signKidsConsentWaivers(123, '[[12,18,24,30]]', {
    predefinedWaiverIds: ['child-waiver']
  });

  assert.equal(result.signedCount, 1);
  assert.equal(calls.length, 2);
});

test('signKidsConsentWaivers retries waiver lookup when records are not immediately available', async () => {
  const calls = [];
  let waiverLookupCount = 0;
  const client = new MomencePublicApiClient({
    dashboardCookies: 'ribbon.connect.sid=session-token',
    hostId: 13752,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/host/13752/members/123/waivers')) {
        waiverLookupCount += 1;
        if (waiverLookupCount === 1) {
          return jsonResponse({ waivers: [] });
        }
        return jsonResponse({
          waivers: [
            {
              type: 'predefined',
              id: 'child-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'child-key'
            }
          ]
        });
      }

      if (String(url).includes('/public/hosts/13752/members/123/waivers/child-waiver/sign')) {
        return jsonResponse({ success: true });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const result = await client.signKidsConsentWaivers(123, '[[12,18,24,30]]', {
    predefinedWaiverIds: ['child-waiver'],
    waiverLookupAttempts: 2,
    waiverLookupDelayMs: 0
  });

  assert.equal(result.signedCount, 1);
  assert.equal(waiverLookupCount, 2);
  assert.equal(calls.filter((call) => String(call.url).endsWith('/host/13752/members/123/waivers')).length, 2);
});

test('signKidsConsentWaivers signs only the requested predefined waiver ids through the dashboard API', async () => {
  const calls = [];
  const client = new MomencePublicApiClient({
    dashboardBaseUrl: 'https://momence-dashboard.test',
    dashboardCookies: 'csrf_token=csrf-token; session=session-token',
    hostId: 13752,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/host/13752/members/123/waivers')) {
        assert.equal(options.method, 'GET');
        assert.equal(options.headers.Cookie, 'csrf_token=csrf-token; session=session-token');
        assert.equal(options.headers['X-CSRF-Token'], 'csrf-token');
        return jsonResponse({
          waivers: [
            {
              type: 'predefined',
              id: 'child-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'child-key'
            },
            {
              type: 'predefined',
              id: 'membership-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'membership-key'
            },
            {
              type: 'predefined',
              id: 'waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'waiver-key'
            },
            {
              type: 'predefined',
              id: 'privacy-policy',
              signatureStatus: 'unsigned',
              signatureKey: 'privacy-key'
            }
          ]
        });
      }

      if (String(url).includes('/public/hosts/13752/members/123/waivers/')) {
        assert.equal(options.method, 'POST');
        assert.deepEqual(JSON.parse(options.body), {
          realSignature: '[[12,18,24,30]]'
        });
        return jsonResponse({ success: true });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const result = await client.signKidsConsentWaivers(123, '[[12,18,24,30]]', {
    predefinedWaiverIds: ['waiver', 'membership-waiver']
  });

  assert.equal(result.signedCount, 2);
  assert.equal(result.availableCount, 4);
  assert.equal(calls.some((call) => String(call.url).endsWith('/host/checkout')), false);
  assert.deepEqual(
    calls
      .filter((call) => String(call.url).includes('/public/hosts/13752/members/123/waivers/'))
      .map((call) => String(call.url).replace('https://momence-dashboard.test', '')),
    [
      '/public/hosts/13752/members/123/waivers/waiver/sign?signatureKey=waiver-key',
      '/public/hosts/13752/members/123/waivers/membership-waiver/sign?signatureKey=membership-key'
    ]
  );
  assert.equal(
    calls.some((call) => String(call.url).includes('/waivers/waiver/')),
    true
  );
});

test('signKidsConsentWaivers honors explicit kids waiver env ids without replacing waiver', async () => {
  const previousWaiverIds = process.env.MOMENCE_KIDS_CONSENT_PREDEFINED_WAIVER_IDS;
  process.env.MOMENCE_KIDS_CONSENT_PREDEFINED_WAIVER_IDS = 'waiver,membership-waiver';

  const calls = [];
  const client = new MomencePublicApiClient({
    dashboardBaseUrl: 'https://momence-dashboard.test',
    dashboardCookies: 'session=session-token',
    hostId: 13752,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/host/13752/members/123/waivers')) {
        return jsonResponse({
          waivers: [
            {
              type: 'predefined',
              id: 'child-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'child-key'
            },
            {
              type: 'predefined',
              id: 'membership-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'membership-key'
            },
            {
              type: 'predefined',
              id: 'waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'waiver-key'
            }
          ]
        });
      }

      if (String(url).includes('/public/hosts/13752/members/123/waivers/')) {
        return jsonResponse({ success: true });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  try {
    const result = await client.signKidsConsentWaivers(123, '[[12,18,24,30]]');

    assert.equal(result.signedCount, 2);
    assert.equal(calls.some((call) => String(call.url).includes('/child-waiver/')), false);
    assert.equal(calls.some((call) => String(call.url).includes('/membership-waiver/')), true);
    assert.equal(calls.some((call) => String(call.url).includes('/waivers/waiver/')), true);
  } finally {
    if (previousWaiverIds === undefined) {
      delete process.env.MOMENCE_KIDS_CONSENT_PREDEFINED_WAIVER_IDS;
    } else {
      process.env.MOMENCE_KIDS_CONSENT_PREDEFINED_WAIVER_IDS = previousWaiverIds;
    }
  }
});

test('signKidsConsentWaivers refreshes dashboard cookies after an auth failure and retries once', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'momence-cookie-refresh-'));
  const envFilePath = path.join(tempDir, '.env');
  fs.writeFileSync(envFilePath, [
    'MOMENCE_ALL_COOKIES="momence.device.id=old-device; ribbon.connect.sid=old-session"',
    'MOMENCE_LOGIN_EMAIL="parent@example.com"',
    'MOMENCE_LOGIN_PASSWORD="secret"',
    'MOMENCE_TOTP_SECRET="JBSWY3DPEHPK3PXP"',
    ''
  ].join('\n'));

  const calls = [];
  const client = new MomencePublicApiClient({
    dashboardCookies: 'momence.device.id=old-device; ribbon.connect.sid=old-session',
    envFilePath,
    hostId: 13752,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/host/13752/members/123/waivers')) {
        if (options.headers.Cookie.includes('old-session')) {
          return jsonResponse({ error: 'expired session' }, { status: 403 });
        }

        assert.match(options.headers.Cookie, /ribbon\.connect\.sid=fresh-session/);
        return jsonResponse({
          waivers: [
            {
              type: 'predefined',
              id: 'child-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'child-key'
            },
            {
              type: 'predefined',
              id: 'membership-waiver',
              signatureStatus: 'unsigned',
              signatureKey: 'membership-key'
            }
          ]
        });
      }

      if (String(url) === 'https://api.momence.com/auth/login') {
        assert.equal(options.method, 'POST');
        assert.equal(JSON.parse(options.body).email, 'parent@example.com');
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'momence.device.id=fresh-device; Path=/; HttpOnly'
          }
        });
      }

      if (String(url) === 'https://api.momence.com/auth/mfa/totp/verify') {
        assert.equal(options.method, 'POST');
        assert.match(options.headers.Cookie, /momence\.device\.id=fresh-device/);
        assert.match(JSON.parse(options.body).token, /^\d{6}$/);
        return new Response(JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token'
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'ribbon.connect.sid=fresh-session; Path=/; HttpOnly'
          }
        });
      }

      if (String(url).includes('/public/hosts/13752/members/123/waivers/')) {
        assert.match(options.headers.Cookie, /ribbon\.connect\.sid=fresh-session/);
        return jsonResponse({ success: true });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const result = await client.signKidsConsentWaivers(123, '[[12,18,24,30]]');

  assert.equal(result.signedCount, 2);
  assert.equal(calls.filter((call) => String(call.url).endsWith('/host/13752/members/123/waivers')).length, 2);
  assert.equal(calls.filter((call) => String(call.url) === 'https://api.momence.com/auth/login').length, 1);
  assert.equal(calls.filter((call) => String(call.url) === 'https://api.momence.com/auth/mfa/totp/verify').length, 1);
  const updatedEnv = fs.readFileSync(envFilePath, 'utf8');
  assert.match(updatedEnv, /MOMENCE_ALL_COOKIES="momence\.device\.id=fresh-device; ribbon\.connect\.sid=fresh-session"/);
});

test('createChildAccountForMember posts child details with date of birth and captures child member id', async () => {
  const calls = [];
  const client = new MomencePublicApiClient({
    dashboardBaseUrl: 'https://momence-dashboard.test',
    dashboardCookies: 'session=session-token',
    hostId: 13752,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });

      if (String(url).endsWith('/host/13752/customers/123/children')) {
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Referer, 'https://momence.com/dashboard/13752/crm/123');
        assert.equal(options.headers['X-Origin'], 'https://momence.com/dashboard/13752/crm/123');
        assert.deepEqual(JSON.parse(options.body), {
          autoGenerateEmail: true,
          email: '',
          firstName: 'Riya',
          lastName: 'Shah',
          customerFields: [
            {
              id: 6592,
              value: '2015-06-01'
            }
          ]
        });
        return jsonResponse({
          customer: {
            memberId: 456,
            firstName: 'Riya',
            lastName: 'Shah'
          }
        });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const child = await client.createChildAccountForMember(123, {
    childName: 'Riya Shah',
    childDateOfBirth: '2015-06-01'
  });

  assert.equal(child.memberId, 456);
  assert.equal(calls.length, 1);
});

test('createChildAccountForMember accepts customer-wrapped child endpoint responses', async () => {
  const client = new MomencePublicApiClient({
    dashboardBaseUrl: 'https://momence-dashboard.test',
    dashboardCookies: 'session=session-token',
    hostId: 13752,
    fetchImpl: async (url) => {
      if (String(url).endsWith('/host/13752/customers/123/children')) {
        return jsonResponse({
          customers: [
            {
              id: 789,
              firstName: 'Riya',
              lastName: 'Shah'
            }
          ]
        });
      }

      throw new Error(`Unexpected request ${url}`);
    }
  });

  const child = await client.createChildAccountForMember(123, {
    childName: 'Riya Shah',
    childDateOfBirth: '2015-06-01'
  });

  assert.equal(child.memberId, 789);
});

test('provisionKidsConsent creates the child account and records consent for parent and child without adding membership', async () => {
  const calls = [];
  const result = await provisionKidsConsent(
    {
      firstName: 'Asha',
      lastName: 'Shah',
      email: 'asha@example.com',
      phoneNumber: '+91 98765 43210',
      center: 'Supreme Headquarters, Bandra',
      childName: 'Riya Shah',
      childDateOfBirth: '2015-06-01',
      signatureRealSignature: '[[12,18,24,30]]'
    },
    {
      client: {
        async ensureMember(input) {
          calls.push('ensureMember');
          assert.equal(input.firstName, 'Asha');
          assert.equal(input.email, 'asha@example.com');
          return { memberId: 123, action: 'created_new' };
        },
        async createChildAccountForMember(parentMemberId, childInput) {
          calls.push('createChildAccountForMember');
          assert.equal(parentMemberId, 123);
          assert.deepEqual(childInput, {
            childName: 'Riya Shah',
            childDateOfBirth: '2015-06-01',
            parentLastName: 'Shah'
          });
          return { memberId: 456 };
        },
        async signKidsConsentWaivers(memberId, realSignature, consentOptions) {
          calls.push(`signKidsConsentWaivers:${memberId}:${consentOptions.predefinedWaiverIds.join(',')}`);
          assert.equal(realSignature, '[[12,18,24,30]]');
          return {
            signedCount: consentOptions.predefinedWaiverIds.length,
            availableCount: consentOptions.predefinedWaiverIds.length
          };
        },
        async ensureMemberAndAddMembership() {
          throw new Error('Kids consent must not add a membership');
        },
        async addMembershipToMember() {
          throw new Error('Kids consent must not add a membership');
        }
      }
    }
  );

  assert.deepEqual(calls, [
    'ensureMember',
    'createChildAccountForMember',
    'signKidsConsentWaivers:123:waiver,membership-waiver',
    'signKidsConsentWaivers:456:child-waiver'
  ]);
  assert.deepEqual(result, {
    success: true,
    memberId: 123,
    childMemberId: 456,
    customerAction: 'created_new',
    signedCount: 3,
    parentSignedCount: 2,
    childSignedCount: 1,
    availableWaivers: 3,
    parentAvailableWaivers: 2,
    childAvailableWaivers: 1
  });
});

test('buildStudioComplimentaryClassMembershipConfig uses the Studio Complimentary Class package', () => {
  const defaultConfig = buildStudioComplimentaryClassMembershipConfig();
  const overrideConfig = buildStudioComplimentaryClassMembershipConfig({
    id: 55555,
    homeLocationId: 29821
  });

  assert.equal(defaultConfig.id, 97880);
  assert.equal(defaultConfig.name, 'Studio Complimentary Class');
  assert.equal(defaultConfig.price, 0);
  assert.equal(defaultConfig.priceAfterProration, 0);
  assert.equal(overrideConfig.id, 55555);
});

test('normalizePhoneDigits keeps only phone digits for matching', () => {
  assert.equal(normalizePhoneDigits('+91 98765 43210'), '919876543210');
});

test('buildMomenceLeadRequestPayload can override sourceId for influencer leads', () => {
  const payload = buildMomenceLeadRequestPayload(
    {
      firstName: 'Influencer',
      lastName: 'Lead',
      email: 'influencer@example.com',
      phoneNumber: '+91 98765 43210'
    },
    {
      token: 'token',
      sourceId: '201918'
    }
  );

  assert.equal(payload.sourceId, '201918');
  assert.equal(payload.token, 'token');
  assert.equal(payload.email, 'influencer@example.com');
});

test('buildMomenceLeadRequestPayload keeps the env Momence source for kids but uses 8082 for regular and Barre leads', () => {
  const previousSourceId = process.env.MOMENCE_SOURCE_ID;
  const previousRegularSourceId = process.env.MOMENCE_REGULAR_SOURCE_ID;

  process.env.MOMENCE_SOURCE_ID = 'kids-source-only';
  delete process.env.MOMENCE_REGULAR_SOURCE_ID;

  try {
    const regularPayload = buildMomenceLeadRequestPayload({
      firstName: 'Regular',
      lastName: 'Lead',
      email: 'regular@example.com',
      source_form: 'paid-trial-form'
    });

    const barrePayload = buildMomenceLeadRequestPayload({
      firstName: 'Barre',
      lastName: 'Lead',
      email: 'barre@example.com',
      source_form: 'barre-trial-form'
    });

    const kidsPayload = buildMomenceLeadRequestPayload({
      firstName: 'Kids',
      lastName: 'Lead',
      email: 'kids@example.com',
      source_form: 'kids-trial-form'
    });

    assert.equal(regularPayload.sourceId, '8082');
    assert.equal(barrePayload.sourceId, '8082');
    assert.equal(kidsPayload.sourceId, 'kids-source-only');
  } finally {
    if (previousSourceId === undefined) {
      delete process.env.MOMENCE_SOURCE_ID;
    } else {
      process.env.MOMENCE_SOURCE_ID = previousSourceId;
    }

    if (previousRegularSourceId === undefined) {
      delete process.env.MOMENCE_REGULAR_SOURCE_ID;
    } else {
      process.env.MOMENCE_REGULAR_SOURCE_ID = previousRegularSourceId;
    }
  }
});

test('processLeadSubmission only sends Meta after Momence sync succeeds', async () => {
  let metaSendCount = 0;

  const result = await processLeadSubmission(
    {
      id: 'stored_lead_id',
      event_id: 'lead_event_id',
      firstName: 'Meta',
      lastName: 'Mismatch',
      email: 'meta-mismatch@example.com',
      phoneNumber: '+919876543210',
      center: 'Supreme Headquarters, Bandra',
      type: 'Barre 57',
      time: 'Flexible / Needs Recommendation',
      waiverAccepted: 'accepted'
    },
    {
      get: () => 'test-agent',
      headers: {},
      ip: '127.0.0.1'
    },
    {
      storeLeadData: async () => ({ success: true }),
      submitToMomence: async () => {
        throw new Error('Momence rejected lead');
      },
      sendMetaLeadEvent: async () => {
        metaSendCount += 1;
        return { sent: true, eventId: 'lead_event_id' };
      }
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.stored, true);
  assert.equal(result.momenceSynced, false);
  assert.equal(result.event_id, 'lead_event_id');
  assert.equal(metaSendCount, 0);
});

test('Respond.io payload uses lead contact details and submission custom fields', () => {
  const leadData = {
    id: 'lead_123',
    event_id: 'event_123',
    firstName: 'Nia',
    lastName: 'Shah',
    email: 'NIA@EXAMPLE.COM',
    phoneNumber: '98765 43210',
    phoneCountry: 'in',
    source_form: 'barre-trial-form',
    center: 'Supreme Headquarters, Bandra',
    type: 'Barre 57',
    time: 'Flexible / Needs Recommendation',
    utm_source: 'instagram',
    utm_campaign: 'july_trials'
  };

  assert.equal(resolveRespondIoContactIdentifier(leadData), 'email:nia@example.com');
  assert.deepEqual(buildRespondIoContactPayload(leadData), {
    firstName: 'Nia',
    lastName: 'Shah',
    email: 'nia@example.com',
    phone: '+919876543210',
    countryCode: 'IN',
    customFields: [
      { name: 'Lead ID', value: 'lead_123' },
      { name: 'Event ID', value: 'event_123' },
      { name: 'Source Form', value: 'barre-trial-form' },
      { name: 'Studio Location', value: 'Supreme Headquarters, Bandra' },
      { name: 'Class Format', value: 'Barre 57' },
      { name: 'Preferred Time', value: 'Flexible / Needs Recommendation' },
      { name: 'UTM Source', value: 'instagram' },
      { name: 'UTM Campaign', value: 'july_trials' }
    ]
  });
});

test('syncLeadToRespondIo upserts the contact and assigns New Enquiry lifecycle', async () => {
  const previousApiKey = process.env.RESPOND_IO_API_KEY;
  const previousBaseUrl = process.env.RESPOND_IO_BASE_URL;
  const previousLifecycle = process.env.RESPOND_IO_LIFECYCLE_STAGE;
  const previousFetch = global.fetch;
  const calls = [];

  process.env.RESPOND_IO_API_KEY = 'respond-token';
  process.env.RESPOND_IO_BASE_URL = 'https://respond.test/v2/';
  delete process.env.RESPOND_IO_LIFECYCLE_STAGE;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse({ id: 456 });
  };

  try {
    const result = await syncLeadToRespondIo({
      id: 'lead_123',
      event_id: 'event_123',
      firstName: 'Nia',
      lastName: 'Shah',
      email: 'nia@example.com',
      phoneNumber: '+919876543210',
      center: 'Supreme Headquarters, Bandra',
      type: 'Barre 57',
      time: 'Flexible / Needs Recommendation'
    });

    assert.equal(result.sent, true);
    assert.equal(result.identifier, 'email:nia@example.com');
    assert.equal(result.lifecycleStage, '🤍 New Enquiry');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://respond.test/v2/contact/create_or_update/email%3Ania%40example.com');
    assert.equal(calls[1].url, 'https://respond.test/v2/contact/email%3Ania%40example.com/lifecycle/update');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer respond-token');
    assert.deepEqual(JSON.parse(calls[1].options.body), { name: '🤍 New Enquiry' });
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) {
      delete process.env.RESPOND_IO_API_KEY;
    } else {
      process.env.RESPOND_IO_API_KEY = previousApiKey;
    }

    if (previousBaseUrl === undefined) {
      delete process.env.RESPOND_IO_BASE_URL;
    } else {
      process.env.RESPOND_IO_BASE_URL = previousBaseUrl;
    }

    if (previousLifecycle === undefined) {
      delete process.env.RESPOND_IO_LIFECYCLE_STAGE;
    } else {
      process.env.RESPOND_IO_LIFECYCLE_STAGE = previousLifecycle;
    }
  }
});

test('provisionInfluencerMembership falls back to Supabase sync with Studio Complimentary Class when direct checkout fails', async () => {
  const calls = [];
  const result = await provisionInfluencerMembership(
    {
      firstName: 'Fallback',
      lastName: 'Lead',
      email: 'fallback@example.com',
      phoneNumber: '+91 98765 43210',
      center: 'Supreme Headquarters, Bandra'
    },
    {
      client: {
        async ensureMemberAndAddMembership() {
          throw new Error('direct checkout failed');
        }
      },
      syncConfig: {
        functionUrl: 'https://example.test/functions/v1/manual-momence-sync',
        functionKey: 'service-key',
        action: 'create-member-and-purchase-membership',
        membership: buildStudioComplimentaryClassMembershipConfig({ id: 55555 })
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        return jsonResponse({
          success: true,
          memberId: 777,
          purchaseId: 'completed',
          membershipId: 55555
        });
      }
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.memberId, 777);
  assert.equal(result.source, 'supabase-function');
  assert.equal(calls.length, 1);
  const fallbackPayload = JSON.parse(calls[0].options.body);
  assert.equal(fallbackPayload.membership.id, 55555);
  assert.equal(fallbackPayload.membership.name, 'Studio Complimentary Class');
});

test('buildInfluencerSubmissionSuccessPayload stays successful when complimentary class provisioning fails', () => {
  const payload = buildInfluencerSubmissionSuccessPayload({
    leadData: { id: 'lead_123' },
    momenceSyncResult: {
      success: false,
      error: 'Studio Complimentary Class checkout failed'
    },
    schedule: {
      schedulePageUrl: 'https://example.test/schedule',
      groupedSessions: [{ date: '2026-05-13', items: [] }]
    },
    fallbackRedirectUrl: 'https://example.test/fallback'
  });

  assert.equal(payload.success, true);
  assert.equal(payload.id, 'lead_123');
  assert.equal(payload.momence.membershipProvisioned, false);
  assert.equal(payload.momence.openBarreProvisioned, false);
  assert.equal(payload.momence.error, 'Studio Complimentary Class checkout failed');
  assert.equal(payload.redirectUrl, 'https://example.test/schedule');
  assert.equal(payload.schedule.groupedSessions.length, 1);
});

test('buildInfluencerSubmissionSuccessPayload includes complimentary class details when provisioning succeeds', () => {
  const payload = buildInfluencerSubmissionSuccessPayload({
    leadData: { id: 'lead_456' },
    momenceSyncResult: {
      success: true,
      memberId: 777,
      membershipId: 55555,
      membershipName: 'Studio Complimentary Class',
      purchaseId: 'completed',
      customerAction: 'created_new'
    },
    schedule: {
      schedulePageUrl: 'https://example.test/schedule',
      groupedSessions: []
    },
    fallbackRedirectUrl: 'https://example.test/fallback'
  });

  assert.equal(payload.success, true);
  assert.equal(payload.momence.membershipProvisioned, true);
  assert.equal(payload.momence.openBarreProvisioned, true);
  assert.equal(payload.momence.memberId, 777);
  assert.equal(payload.momence.membershipId, 55555);
  assert.equal(payload.momence.membershipName, 'Studio Complimentary Class');
});

test('resolveScheduleLocationIds maps selected studios to Momence schedule locations', () => {
  assert.deepEqual(resolveScheduleLocationIds('Kwality House, Kemps Corner'), ['9030']);
  assert.deepEqual(resolveScheduleLocationIds('Supreme Headquarters, Bandra'), ['29821']);
});

test('buildStudioSchedulePageUrl points to the selected studio schedule route', () => {
  const originalBaseUrl = process.env.FORM_API_BASE_URL;
  delete process.env.FORM_API_BASE_URL;
  const req = {
    get(header) {
      return header === 'host' ? 'localhost:3000' : '';
    },
    protocol: 'http'
  };

  try {
    assert.equal(
      buildStudioSchedulePageUrl(req, 'Supreme Headquarters, Bandra'),
      'http://localhost:3000/schedule-mum?locationId=29821'
    );
  } finally {
    process.env.FORM_API_BASE_URL = originalBaseUrl;
  }
});

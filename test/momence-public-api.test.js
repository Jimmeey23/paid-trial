const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MomencePublicApiClient,
  buildOpenBarreMembershipConfig,
  buildStudioComplimentaryClassMembershipConfig,
  buildMomenceLeadRequestPayload,
  buildInfluencerSubmissionSuccessPayload,
  normalizePhoneDigits,
  processLeadSubmission,
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

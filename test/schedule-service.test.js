const assert = require('node:assert/strict');
const test = require('node:test');

const ScheduleService = require('../scheduleService');

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

test('getSessions reads Momence edge function payload sessions and filters Barre by studio', async () => {
  const originalUrl = process.env.SUPABASE_MOMENCE_SESSIONS_URL;
  process.env.SUPABASE_MOMENCE_SESSIONS_URL = 'https://example.test/momence-sessions';

  const originalFetch = global.fetch;
  global.fetch = async () => jsonResponse({
    payload: [
      {
        id: 134322442,
        name: 'Studio Cardio Barre',
        description: 'Achieve next-level results with more intense strength training variations and higher reps.',
        startsAt: '2026-05-13T02:00:00.000Z',
        endsAt: '2026-05-13T02:57:00.000Z',
        durationInMinutes: 57,
        capacity: 20,
        bookingCount: 3,
        teacher: {
          firstName: 'Simonelle',
          lastName: 'De Vitre'
        },
        inPersonLocation: {
          id: 9030,
          name: 'Kwality House, Kemps Corner'
        }
      },
      {
        id: 134322443,
        name: 'Strength Lab (Pull)',
        startsAt: '2026-05-13T02:00:00.000Z',
        durationInMinutes: 57,
        inPersonLocation: {
          id: 9030,
          name: 'Kwality House, Kemps Corner'
        }
      }
    ]
  });

  try {
    const service = new ScheduleService();
    const result = await service.getSessions({
      startDate: '2026-05-13',
      endDate: '2026-05-14',
      center: 'Kwality House, Kemps Corner',
      type: 'Barre'
    });

    assert.equal(result.meta.totalSessions, 1);
    assert.equal(result.sessions[0].title, 'Studio Cardio Barre');
    assert.equal(result.sessions[0].locationName, 'Kwality House, Kemps Corner');
    assert.equal(result.sessions[0].instructorName, 'Simonelle De Vitre');
    assert.equal(result.sessions[0].durationMinutes, 57);
    assert.equal(result.sessions[0].spotsRemaining, 17);
    assert.equal(result.sessions[0].capacity, 20);
    assert.equal(result.sessions[0].bookingCount, 3);
    assert.match(result.sessions[0].description, /next-level results/);
    assert.equal(result.groupedSessions.length, 1);
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_MOMENCE_SESSIONS_URL = originalUrl;
  }
});

test('getSessions defaults startDate to the local current day', async () => {
  const originalUrl = process.env.SUPABASE_MOMENCE_SESSIONS_URL;
  process.env.SUPABASE_MOMENCE_SESSIONS_URL = 'https://example.test/momence-sessions';

  const originalFetch = global.fetch;
  let requestedUrl = '';
  global.fetch = async (url) => {
    requestedUrl = String(url);
    return jsonResponse({ payload: [] });
  };

  try {
    const service = new ScheduleService();
    await service.getSessions();

    const params = new URL(requestedUrl).searchParams;
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    assert.equal(params.get('startDate'), expected);
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_MOMENCE_SESSIONS_URL = originalUrl;
  }
});

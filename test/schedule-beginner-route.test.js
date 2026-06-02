const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const app = require('../server');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('Express serves the beginner Mumbai schedule route through the client app fallback', () => {
  const routePaths = app._router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.deepEqual(
    routePaths.find((entry) => Array.isArray(entry) && entry.includes('/schedule-mum-begin')),
    ['/schedule-mum-begin', '/schedule-mum-begin/*']
  );
});

test('React app routes /schedule-mum-begin to the host 13752 beginner class schedule', () => {
  const source = readProjectFile('client/src/App.tsx');

  assert.match(source, /currentPath === "\/schedule-mum-begin"/);
  assert.match(source, /scheduleMumBegin/);
  assert.match(source, /const BEGINNER_SCHEDULE_TAG_IDS = \["284832"\]/);
  assert.match(source, /<ScheduleEmbed[\s\S]*hostId="13752"[\s\S]*tagIds=\{BEGINNER_SCHEDULE_TAG_IDS\}[\s\S]*\/>/);
});

test('ScheduleEmbed supports Momence filter attributes used by beginner schedules', () => {
  const source = readProjectFile('client/src/components/schedule-embed.tsx');
  const expectedAttributes = [
    'teacher_ids',
    'tag_ids',
    'session_type',
    'hide_tags',
    'default_filter',
    'locale',
    'lock_timezone'
  ];

  for (const attributeName of expectedAttributes) {
    assert.match(source, new RegExp(`setAttribute\\("${attributeName}"`));
  }
});

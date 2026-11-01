const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const alerts = [];
const window = {alert: message => alerts.push(message)};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../admin/story-identity.js'), 'utf8'), {window});
let handler;
window.registerStoryIdentityGuard({registerEventListener: event => {
  assert.equal(event.name, 'preSave');
  handler = event.handler;
}});
const entry = (slug, title, storyPath = 'content/stories/' + slug + '.json') => {
  const data = {get: key => key === 'title' ? title : undefined};
  return {get: key => ({slug, path: storyPath, data})[key]};
};

test('minor changes to existing article are allowed', () => {
  const e = entry('why-sifnos-became-greeces-quiet-food-island',
    'Why Sifnos Became Greece’s Quiet Food Island: A Culinary Story');
  assert.equal(handler({entry: e}), e.get('data'));
});

test('new unrelated topic cannot overwrite existing story', () => {
  assert.throws(() => handler({entry: entry('why-sifnos-became-greeces-quiet-food-island',
    'Knossos Palace From Heraklion: Bus, Tour or Taxi?')}), /Создай новую запись/);
  assert.ok(alerts.length > 0);
});

test('quiet cruise cannot be replaced by family wine tour', () => {
  assert.throws(() => handler({entry: entry(
    'which-santorini-cruise-should-you-choose-if-you-dislike-loud-music',
    'Can You Join a Santorini Wine Tour With Children?')}), /Создай новую запись/);
});

test('new entry is not blocked before Decap assigns a slug', () => {
  const e = entry('', 'Knossos Palace From Heraklion: Bus, Tour or Taxi?', '');
  assert.equal(handler({entry: e}), e.get('data'));
});

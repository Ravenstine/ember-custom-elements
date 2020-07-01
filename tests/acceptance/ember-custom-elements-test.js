import { module, test } from 'qunit';
import { find, visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | ember custom elements', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /test', async function(assert) {
    await visit('/test');

    assert.equal(currentURL(), '/test');

    const element = find('foo-bar');

    assert.equal(element.textContent.trim(), 'foo bar');
  });
});

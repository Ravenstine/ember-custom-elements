import { module, test } from 'qunit';
import { find, visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | ember custom elements', function(hooks) {
  setupApplicationTest(hooks);

  /**
   * Although this does not appear to be testing anything that
   * isn't tested by our integration tests, it's actually testing
   * the underlying Babel plugin that allows us to evaluate
   * decorated components and define custom elements in an
   * optimized way.
   * 
   * What the plugin does is add a "sigil" to component code that
   * uses the `@customElement` decorator so that we only have to
   * evaluate the code for components that have that decorator.
   * Obviously, we don't want to evaluate modules unnecessarily.
   * 
   * If the custom element in this test renders our component,
   * it means that the Babel plugin and the instance-initializer
   * are working properly.
   */
  test('visiting /test', async function(assert) {
    await visit('/test');

    assert.equal(currentURL(), '/test');

    const element = find('foo-bar');

    assert.equal(element.shadowRoot.textContent.trim(), 'foo bar');
  });
});

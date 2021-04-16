/* eslint-disable ember/no-private-routing-service */
/* eslint-disable ember/no-test-this-render */
import { module, test, } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find,
         render,
         settled
} from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { customElement, EmberOutletElement } from 'ember-custom-elements';
import Route from '@ember/routing/route';
import { setupRouteTest, setupTestRouter, setupNativeElementForTest } from '../helpers/ember-custom-elements';

@customElement('outlet-element')
class OutletElement extends EmberOutletElement {}

module('Integration | Element | outlet-element', function(hooks) {
  setupRenderingTest(hooks);
  setupRouteTest(hooks);

  hooks.beforeEach(function() {
    setupNativeElementForTest(this.owner, OutletElement, 'outlet-element');
  });

  test('it renders', async function(assert) {
    this.owner.register('template:application', hbs`<h2 data-test-heading>Hello World</h2>`);
    this.owner.resolveRegistration('router:main').map(function() {
    });
    setupTestRouter(this.owner, function() {});
    this.owner.lookup('router:main').transitionTo('/');
    await render(hbs`<outlet-element></outlet-element>`);
    
    const element = find('outlet-element');
    assert.equal(element.textContent.trim(), 'Hello World');
  });

  test('it renders a specific route', async function(assert) {
    this.owner.register('template:foo-bar', hbs`<h2 data-test-heading>Hello World</h2>`);
    this.owner.resolveRegistration('router:main').map(function() {
      this.route('foo-bar');
    });
    setupTestRouter(this.owner, function() {});
    this.owner.lookup('router:main').transitionTo('foo-bar');
    await render(hbs`<outlet-element route="foo-bar"></outlet-element>`);
    
    const element = find('outlet-element');
    assert.equal(element.textContent.trim(), 'Hello World');
  });

  test('it renders a named outlet', async function(assert) {
    class FooBarRoute extends Route {
      renderTemplate() {
        this.render('bar', {
          outlet: 'bar'
        });
        super.renderTemplate(...arguments);
      }
    }
    this.owner.register('route:foo-bar', FooBarRoute);
    this.owner.register('template:application', hbs`
      <outlet-element data-test-unnamed-outlet route="foo-bar"></outlet-element>
      <outlet-element data-test-named-outlet route="foo-bar" name="bar"></outlet-element>
    `);
    this.owner.register('template:foo-bar', hbs`foobar`);
    this.owner.register('template:bar', hbs`bar`);
    setupTestRouter(this.owner, function() {
      this.route('foo-bar');
    });
    await this.owner.lookup('router:main').transitionTo('foo-bar');
    await settled();
    const named = find('[data-test-named-outlet]');
    assert.equal(named.textContent.trim(), 'bar');
    const unnamed = find('[data-test-unnamed-outlet]');
    assert.equal(unnamed.textContent.trim(), '');
  });
});

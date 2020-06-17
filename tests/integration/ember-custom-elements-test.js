/* eslint-disable no-unused-vars */
import Ember from 'ember';
import { module, test, } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { set } from '@ember/object';
import { later, scheduleOnce } from '@ember/runloop';
import { find,
         render,
         waitUntil,
         settled
} from '@ember/test-helpers';
import {
  setupComponentForTest,
  setupRouteForTest,
  setupRouteTest,
  setupApplicationForTest,
  setupTestRouter
} from '../helpers/ember-custom-elements';
import hbs from 'htmlbars-inline-precompile';
import EmberComponent from '@ember/component';
import GlimmerComponent from '@glimmer/component';
import DummyApplication from 'dummy/app';
import Route from '@ember/routing/route';
import { customElement, forwarded, getCustomElement } from 'ember-custom-elements';
import { tracked } from '@glimmer/tracking';

module('Integration | Component | ember-custom-elements', function(hooks) {
  setupRenderingTest(hooks);

  const components = [
    { name: 'ember component', klass: EmberComponent },
    { name: 'glimmer component', klass: GlimmerComponent }
  ];

  for (const { name, klass } of components) {
    module(name, function() {
      test('it renders', async function(assert) {
        @customElement('web-component')
        class EmberCustomElement extends klass {}

        const template = hbs`foo bar`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<web-component></web-component>`);
        const element = find('web-component');
        assert.equal(element.textContent.trim(), 'foo bar');
      });

      test('it supports function syntax', async function(assert) {
        const EmberCustomElement = customElement(class extends klass {}, 'web-component');

        const template = hbs`foo bar`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<web-component></web-component>`);
        const element = find('web-component');
        assert.equal(element.textContent.trim(), 'foo bar');
      });

      test('it translates attributes to arguments and updates them', async function(assert) {
        assert.expect(2);

        @customElement('web-component')
        class EmberCustomElement extends klass {}

        const template = hbs`{{@foo}}`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        set(this, 'foo', 'bar');
        await render(hbs`<web-component foo={{foo}}></web-component>`);
        const element = find('web-component');

        assert.equal(element.textContent.trim(), 'bar');

        set(this, 'foo', 'baz');
        await settled();
        assert.equal(element.textContent.trim(), 'baz');
      });

      test('it can translate attributes to camelCase arguments', async function(assert) {
        assert.expect(2);

        @customElement('web-component', { camelizeArgs: true })
        class EmberCustomElement extends klass {}

        const template = hbs`{{@fooBar}}`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        set(this, 'foo', 'bar');
        await render(hbs`<web-component foo-bar={{foo}}></web-component>`);
        const element = find('web-component');

        assert.equal(element.textContent.trim(), 'bar');

        set(this, 'foo', 'baz');
        await settled();
        assert.equal(element.textContent.trim(), 'baz');
      });

      test('it only updates arguments defined by observedAttributes', async function(assert) {
        assert.expect(4);

        @customElement('observed-attributes', { observedAttributes: ['bar'] })
        class EmberCustomElement extends klass {}

        const template = hbs`
          <span data-test-foo>{{@foo}}</span>
          <span data-test-bar>{{@bar}}</span>
        `;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'observed-attributes');

        set(this, 'foo', 'bar');
        set(this, 'bar', 'baz');

        await render(hbs`<observed-attributes foo={{this.foo}} bar={{this.bar}}></observed-attributes>`);

        const element = find('observed-attributes');
        const foo = element.querySelector('[data-test-foo]');
        const bar = element.querySelector('[data-test-bar]');

        assert.equal(foo.textContent.trim(), 'bar');
        assert.equal(bar.textContent.trim(), 'baz');

        set(this, 'foo', 'baz');
        set(this, 'bar', 'qux');

        await settled();

        assert.equal(foo.textContent.trim(), 'bar');
        assert.equal(bar.textContent.trim(), 'qux');
      });

      test('it takes block content', async function(assert) {
        assert.expect(2);

        @customElement('web-component')
        class EmberCustomElement extends klass {}

        const template = hbs`foo {{yield}} baz`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        set(this, 'bar', 'bar');
        await render(hbs`<web-component>{{this.bar}}</web-component>`);
        const element = find('web-component');
        assert.equal(element.textContent.trim(), 'foo bar baz');

        set(this, 'bar', 'baz');
        await settled();
        assert.equal(element.textContent.trim(), 'foo baz baz')
      });

      test('it supports logic with block content', async function(assert) {
        assert.expect(3);

        @customElement('web-component')
        class EmberCustomElement extends klass {}

        const template = hbs`foo{{#if @show-content}} {{yield}}{{/if}} baz`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        set(this, 'bar', 'bar');
        set(this, 'showContent', 'true');
        await render(hbs`<web-component show-content={{this.showContent}}>{{this.bar}}</web-component>`);
        const element = find('web-component');
        assert.equal(element.textContent.trim(), 'foo bar baz');

        set(this, 'showContent', false);
        await settled();
        assert.equal(element.textContent.trim(), 'foo baz');

        set(this, 'bar', 'baz');
        set(this, 'showContent', 'true');
        await settled();
        assert.equal(element.textContent.trim(), 'foo baz baz');
      });

      test('it can render with a shadow root', async function(assert) {
        @customElement('web-component', { useShadowRoot: true })
        class EmberCustomElement extends klass {}

        const template = hbs`foo bar`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<web-component></web-component>`);

        const element = find('web-component');
        assert.equal(element.shadowRoot.textContent.trim(), 'foo bar');
      });

      test('it can define multiple custom elements', async function(assert) {
        // Just adding an options hash here to make sure it doesn't cause an error
        @customElement('foo-component')
        @customElement('bar-component')
        class EmberCustomElement extends klass {}

        const template = hbs`foo bar`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<foo-component></foo-component><bar-component></bar-component>`);

        const foo = find('foo-component');
        assert.equal(foo.textContent.trim(), 'foo bar');

        const bar = find('bar-component');
        assert.equal(bar.textContent.trim(), 'foo bar');
      });

      test('it can access the custom element in the constructor', async function(assert) {
        assert.expect(1);

        @customElement('web-component', { useShadowRoot: false })
        class EmberCustomElement extends klass {
          constructor() {
            super(...arguments);
            const element = getCustomElement(this);
            assert.equal(element.tagName, 'WEB-COMPONENT', 'found the custom element');
          }
        }

        setupComponentForTest(this.owner, EmberCustomElement, hbs``, 'web-component');

        await render(hbs`<web-component></web-component>`);
        await settled();
      });

      test('it can access the custom element in another method', async function(assert) {
        assert.expect(1);

        @customElement('web-component', { useShadowRoot: false })
        class EmberCustomElement extends klass {
          constructor() {
            super(...arguments);
            scheduleOnce('actions', this, 'someMethod');
          }
          someMethod() {
            const element = getCustomElement(this);
            assert.equal(element.tagName, 'WEB-COMPONENT', 'found the custom element');
          }
        }

        setupComponentForTest(this.owner, EmberCustomElement, hbs``, 'web-component');

        await render(hbs`<web-component></web-component>`);
        await settled();
      });

      test('it can interface with custom element properties', async function(assert) {
        @customElement('web-component')
        class EmberCustomElement extends klass {
          @forwarded foo;

          constructor() {
            super(...arguments);
            this.foo = 'bar';
          }
        }

        const template = hbs`foo bar`;
        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<web-component></web-component>`);
        const element = find('web-component');
        assert.equal(element.foo, 'bar', 'sets a property');
      });

      // eslint-disable-next-line ember/new-module-imports
      if (Ember._tracked) {
        test('it can track interfaced custom element properties', async function(assert) {
          @customElement('web-component')
          class EmberCustomElement extends klass {
            @forwarded
            @tracked
            foo;
  
            constructor() {
              super(...arguments);
            }
          }
  
          const template = hbs`{{this.foo}}`;
          setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');
  
          await render(hbs`<web-component></web-component>`);
          const element = find('web-component');
          element.foo = 'bar';
          await settled();
          assert.equal(element.textContent.trim(), 'bar', 'responds to change');
        });
      }

      test('it forwards methods', async function(assert) {
        @customElement('web-component')
        class EmberCustomElement extends klass {
          foo = 'foobar';

          @forwarded
          foobar() {
            return this.foo.toUpperCase();
          }
        }

        const template = hbs`foo bar`;
        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<web-component></web-component>`);
        const element = find('web-component');
        assert.equal(element.foobar(), 'FOOBAR', 'calls method on component');
      });

      test('it throws error when applied to static properties', async function(assert) {
        assert.throws(() => {
          @customElement('web-component')
          class EmberCustomElement extends klass {
            @forwarded
            static foo = 'foobar';
          }
        });
      });

      test('it should still render without a custom element', async function(assert) {
        @customElement('web-component')
        class EmberCustomElement extends klass {}

        const template = hbs`<div data-test-component>foo bar</div>`;

        setupComponentForTest(this.owner, EmberCustomElement, template, 'web-component');

        await render(hbs`<WebComponent />`);
        const element = find('[data-test-component]');
        assert.equal(element.textContent.trim(), 'foo bar');
      });
    });
  }

  module('ember application', function() {
    test('it renders', async function(assert) {
      @customElement('web-component')
      // eslint-disable-next-line no-unused-vars
      class EmberWebApplication extends DummyApplication {
        autoboot = false;
      }
      setupApplicationForTest(this.owner, EmberWebApplication, 'ember-web-application');
      await render(hbs`<web-component></web-component>`);
      const element = find('web-component');
      await settled();
      assert.equal(element.textContent.trim(), 'Welcome to Ember');
    });

    test('it can access the custom element', async function(assert) {
      assert.expect(1);
      @customElement('web-component')
      // eslint-disable-next-line no-unused-vars
      class EmberWebApplication extends DummyApplication {
        autoboot = false;
        constructor() {
          super(...arguments);
          const element = getCustomElement(this);
          assert.equal(element.tagName, 'WEB-COMPONENT', 'found the custom element');
        }
      }
      setupApplicationForTest(this.owner, EmberWebApplication, 'ember-web-application');
      render(hbs`<web-component></web-component>`);
    });
  });

  module('ember routes', function(hooks) {
    setupRouteTest(hooks);

    test('it renders', async function(assert) {
      @customElement('web-component')
      class TestRoute extends Route {

      }
      setupRouteForTest(this.owner, TestRoute, 'test-route');

      this.owner.register('template:application', hbs`<web-component></web-component>`);
      this.owner.register('template:test-route', hbs`<h2 data-test-heading>Hello World</h2>`);

      setupTestRouter(this.owner, function() {
        this.route('test-route', { path: '/' });
      });

      this.owner.lookup('router:main').transitionTo('/');
      await settled();
      const element = find('web-component');
      assert.equal(element.textContent.trim(), 'Hello World');
    });

    test('it can render with a shadow root', async function(assert) {
      @customElement('web-component', { useShadowRoot: true })
      class TestRoute extends Route {

      }
      setupRouteForTest(this.owner, TestRoute, 'test-route');

      this.owner.register('template:application', hbs`<web-component></web-component>`);
      this.owner.register('template:test-route', hbs`<h2 data-test-heading>Hello World</h2>`);

      setupTestRouter(this.owner, function() {
        this.route('test-route', { path: '/' });
      });

      this.owner.lookup('router:main').transitionTo('/');
      await settled();
      const element = find('web-component');
      assert.equal(element.shadowRoot.textContent.trim(), 'Hello World');
    });

    test('it renders loading substate', async function(assert) {
      @customElement('web-component')
      class TestRoute extends Route {
        model() {
          return new Promise(resolve => later(resolve, 100));
        }
      }
      setupRouteForTest(this.owner, TestRoute, 'test-route');
      class TestRouteLoading extends Route {

      }
      setupRouteForTest(this.owner, TestRouteLoading, 'test-route_loading');

      this.owner.register('template:application', hbs`<web-component></web-component>`);
      this.owner.register('template:test-route', hbs`<h2 data-test-heading>Hello World</h2>`);
      this.owner.register('template:test-route_loading', hbs`<h2 data-test-loading>Loading...</h2>`);

      setupTestRouter(this.owner, function() {
        this.route('test-route', { path: '/' });
      });

      this.owner.lookup('router:main').transitionTo('/');
      await waitUntil(() => find('web-component'));
      const element = find('web-component');
      await waitUntil(() => element.querySelector('[data-test-loading]'));
      assert.equal(element.textContent.trim(), 'Loading...', 'renders loading substate');
      await waitUntil(() => element.querySelector('[data-test-heading]'));
      assert.equal(element.textContent.trim(), 'Hello World', 'renders route');
    });

    test('it renders error substate', async function(assert) {
      @customElement('web-component')
      class TestRoute extends Route {
        model() {
          throw new Error();
        }
      }
      setupRouteForTest(this.owner, TestRoute, 'test-route');
      class TestRouteError extends Route {

      }
      setupRouteForTest(this.owner, TestRouteError, 'test-route_error');

      this.owner.register('template:application', hbs`<web-component></web-component>`);
      this.owner.register('template:test-route', hbs`<h2 data-test-heading>Hello World</h2>`);
      this.owner.register('template:test-route_error', hbs`<h2 data-test-error>Whoops!</h2>`);

      setupTestRouter(this.owner, function() {
        this.route('test-route', { path: '/' });
      });

      this.owner.lookup('router:main').transitionTo('/');
      await waitUntil(() => find('web-component'));
      const element = find('web-component');
      await waitUntil(() => element.querySelector('[data-test-error]'));
      assert.equal(element.textContent.trim(), 'Whoops!', 'renders error substate');
    });

    test('it renders routes within routes', async function(assert) {
      @customElement('web-component')
      class FooRoute extends Route {}
      setupRouteForTest(this.owner, FooRoute, 'foo');
      this.owner.register('template:foo', hbs`<h2 data-test-foo>foo</h2> {{outlet}}`);

      class BarRoute extends Route {}
      setupRouteForTest(this.owner, BarRoute, 'foo.bar');
      this.owner.register('template:foo/bar', hbs`<h2 data-test-bar>bar</h2> {{outlet}}`);

      class BazRoute extends Route {}
      setupRouteForTest(this.owner, BazRoute, 'foo.bar.baz');
      this.owner.register('template:foo/bar/baz', hbs`<h2 data-test-baz>baz</h2>`);

      this.owner.register('template:application', hbs`<web-component></web-component>`);

      setupTestRouter(this.owner, function() {
        this.route('foo', function() {
          this.route('bar', function() {
            this.route('baz');
          });
        });
      });

      await this.owner.lookup('router:main').transitionTo('/foo/bar/baz');
      await settled();
      const element = find('web-component');
      assert.equal(element.textContent.trim(), 'foo bar baz', 'renders sub routes');
    });

    test('it transitions between routes', async function(assert) {
      @customElement('web-component')
      class FooRoute extends Route {}
      setupRouteForTest(this.owner, FooRoute, 'foo');
      this.owner.register('template:foo', hbs`<h2 data-test-foo>foo</h2> {{outlet}}`);

      class BarRoute extends Route {}
      setupRouteForTest(this.owner, BarRoute, 'foo.bar');
      this.owner.register('template:foo/bar', hbs`<h2 data-test-bar>bar</h2>`);

      class BazRoute extends Route {}
      setupRouteForTest(this.owner, BazRoute, 'foo.baz');
      this.owner.register('template:foo/baz', hbs`<h2 data-test-baz>baz</h2>`);

      this.owner.register('template:application', hbs`<web-component></web-component>`);

      setupTestRouter(this.owner, function() {
        this.route('foo', { path: '/' }, function() {
          this.route('bar');
          this.route('baz');
        });
      });

      await this.owner.lookup('router:main').transitionTo('/bar');
      await settled();
      const element = find('web-component');
      assert.equal(element.textContent.trim(), 'foo bar', 'renders first route');
      await this.owner.lookup('router:main').transitionTo('/baz');
      await settled();
      assert.equal(element.textContent.trim(), 'foo baz', 'transitions to second route');
    });

    test('it destroys DOM contents when navigating away', async function(assert) {
      @customElement('foo-route')
      class FooRoute extends Route {

      }
      setupRouteForTest(this.owner, FooRoute, 'foo-route');

      @customElement('bar-route')
      class BazRoute extends Route {

      }
      setupRouteForTest(this.owner, BazRoute, 'bar-route');

      this.owner.register('template:application', hbs`<foo-route></foo-route><bar-route></bar-route>`);
      this.owner.register('template:foo-route', hbs`<h2 data-test-foo>foo</h2>`);
      this.owner.register('template:bar-route', hbs`<h2 data-test-bar>bar</h2>`);

      setupTestRouter(this.owner, function() {
        this.route('foo-route', { path: '/foo' });
        this.route('bar-route', { path: '/bar' });
      });

      this.owner.lookup('router:main').transitionTo('/foo');
      await settled();
      this.owner.lookup('router:main').transitionTo('/bar');
      await settled();
      const element = find('foo-route');
      assert.notOk(element.querySelector('[data-test-foo]'), 'it destroys DOM contents');
    });

    test('it can preserve DOM contents when navigating away', async function(assert) {
      @customElement('foo-route', { preserveOutletContent: true })
      class FooRoute extends Route {

      }
      setupRouteForTest(this.owner, FooRoute, 'foo-route');

      @customElement('bar-route')
      class BazRoute extends Route {

      }
      setupRouteForTest(this.owner, BazRoute, 'bar-route');

      this.owner.register('template:application', hbs`<foo-route></foo-route><bar-route></bar-route>`);
      this.owner.register('template:foo-route', hbs`<h2 data-test-foo>foo</h2>`);
      this.owner.register('template:bar-route', hbs`<h2 data-test-bar>bar</h2>`);

      setupTestRouter(this.owner, function() {
        this.route('foo-route', { path: '/foo' });
        this.route('bar-route', { path: '/bar' });
      });

      this.owner.lookup('router:main').transitionTo('/foo');
      await settled();
      this.owner.lookup('router:main').transitionTo('/bar');
      await settled();
      const element = find('foo-route');
      assert.ok(element.querySelector('[data-test-foo]'), 'it preserves DOM contents');
    });
  });

  module('unsupported', function() {
    test('it throws an error for unsupported classes', async function(assert) {
      try {
        @customElement('web-component')
        // eslint-disable-next-line no-unused-vars
        class EmberCustomElement {}
      } catch (error) {
        assert.equal(error.message, 'The target object for custom element `web-component` is not an Ember component, route or application.');
      }
    });
  });

  module('tag name collisions', function() {
    test('it throws an error for a custom element already defined by something else', async function(assert) {
      if (!window.customElements.get('some-other-custom-element')) {
        class SomeOtherCustomElement extends HTMLElement {
          constructor() {
            super(...arguments);
          }
        }
        window.customElements.define('some-other-custom-element', SomeOtherCustomElement);
      }
      try {
        @customElement('some-other-custom-element')
        // eslint-disable-next-line no-unused-vars
        class EmberCustomElement extends EmberComponent {}
      } catch (error) {
        assert.equal(error.message, 'A custom element called `some-other-custom-element` is already defined by something else.');
      }
    });
  });
});

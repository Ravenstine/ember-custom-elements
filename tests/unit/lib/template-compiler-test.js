import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, findAll, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@ember/component';
import { compileTemplate } from 'ember-custom-elements/lib/template-compiler';

module('Unit | Utility | template-compiler', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('component:dummy-component', Component.extend({
      tagName: '',
      layout: hbs`
        <h2>Hello World</h2>
        {{#if (has-block)}}
          <h3>{{yield}}</h3>
        {{/if}}
        <ul>
          {{#each @items as |item|}}
            <li>{{item}}</li>
          {{/each}}
        </ul>
      `
    }));
  })

  test('it renders', async function (assert) {
    const template = compileTemplate('dummy-component', ['items']);
    this.blockContent = 'foo';
    // eslint-disable-next-line ember/no-attrs-in-components
    this._attrs = {
      items: [
        'bar',
        'baz',
        'qux'
      ]
    };
    await render(template);
    assert.equal(find('h2').textContent.trim(), 'Hello World');
    assert.equal(find('h3').textContent.trim(), 'foo');
    assert.equal(findAll('li')[0].textContent.trim(), 'bar');
    assert.equal(findAll('li')[1].textContent.trim(), 'baz');
    assert.equal(findAll('li')[2].textContent.trim(), 'qux');
  });
});
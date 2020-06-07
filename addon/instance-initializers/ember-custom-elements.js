import Component from '@ember/component';
import { getCustomElements } from '../lib/common';
import { warn } from '@ember/debug';
import { setupCustomElementFor } from '../index';

/**
 * Primarily looks up components that use the `@customElement` decorator
 * and evaluates them, allowing their custom elements to be defined.
 *
 * This does not touch custom elements defined for an Ember.Application.
 *
 * @param {Ember.ApplicationInstance} instance
 */
export function initialize(instance) {
  // Get a list of all registered components, find the ones that use the customElement
  // decorator, and set the app instance and component name on them.
  for (const type of ['application', 'component', 'route']) {
    const entityNames = instance.__registry__.fallback.resolver.knownForType(type);
    for (const entityName in entityNames) {
      const parsedName = instance.__registry__.fallback.resolver.parseName(entityName);
      const moduleName = instance.__registry__.fallback.resolver.findModuleName(parsedName);
      const _module = instance.__registry__.fallback.resolver._moduleRegistry._entries[moduleName];
      const code = _module.callback.toString();
      const { 
        emberCustomElements = {}
      } = instance.resolveRegistration('config:environment');
      // Only evaluate the component module if its code contains our sigil.
      // This optimization is ignored in testing so that components can be
      // dynamically created and registered.
      const shouldEvalModule =
        emberCustomElements.deoptimizeModuleEval ||
        /\n\s*"~~EMBER~CUSTOM~ELEMENT~~";\s*\n/.test(code);
      if (!shouldEvalModule) continue;
      const componentClass = instance.resolveRegistration(entityName);
      const customElements = getCustomElements(componentClass);
      const noCustomElements = !customElements.length;
      warn(
        `ember-custom-elements: Custom element expected for \`${entityName}\` but none found.`,
        noCustomElements,
        { id: 'no-custom-elements' }
      );
      if (noCustomElements) continue;
      setupCustomElementFor(instance, entityName);
    }
  }
  // Register a view that can be used to contain state for web component contents
  instance.register('component:-ember-web-component-view', Component.extend({ tagName: '' }));
}

export default {
  initialize
};

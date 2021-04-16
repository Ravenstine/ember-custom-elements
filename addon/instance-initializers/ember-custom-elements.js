/* eslint-disable ember/no-classic-classes */
/* eslint-disable ember/no-classic-components */
import Component from '@ember/component';
import { getCustomElements } from '../lib/common';
import { warn } from '@ember/debug';
import { defer } from 'rsvp';
import { setupCustomElementFor } from '../index';

let INITIALIZATION_DEFERRED = defer();

export function getInitializationPromise() {
  return INITIALIZATION_DEFERRED.promise;
}

/**
 * Primarily looks up components that use the `@customElement` decorator
 * and evaluates them, allowing their custom elements to be defined.
 *
 * This does not touch custom elements defined for an Ember.Application.
 *
 * @param {Ember.ApplicationInstance} instance
 */
export function initialize(instance) {
  INITIALIZATION_DEFERRED = defer();

  // Get a list of all registered components, find the ones that use the customElement
  // decorator, and set the app instance and component name on them.
  for (const type of ['application', 'component', 'route', 'custom-element']) {
    const entityNames = instance.__registry__.fallback.resolver.knownForType(type);
    for (const entityName in entityNames) {
      const parsedName = instance.__registry__.fallback.resolver.parseName(entityName);
      const _moduleName = instance.__registry__.fallback.resolver.findModuleName(parsedName);
      const _module = instance.__registry__.fallback.resolver._moduleRegistry._entries[_moduleName];
      // Only evaluate the component module if it is using our decorator.
      // This optimization is ignored in testing so that components can be
      // dynamically created and registered.
      const shouldEvalModule = determineIfShouldEvalModule(instance, _module);
      if (!shouldEvalModule) continue;
      const componentClass = instance.resolveRegistration(entityName);
      const customElements = getCustomElements(componentClass);
      const hasCustomElements = customElements.length;
      warn(
        `ember-custom-elements: Custom element expected for \`${entityName}\` but none found.`,
        hasCustomElements,
        { id: 'no-custom-elements' }
      );
      if (!hasCustomElements) continue;
      setupCustomElementFor(instance, entityName);
    }
  }

  // Notify custom elements that Ember initialization is complete
  INITIALIZATION_DEFERRED.resolve();

  // Register a view that can be used to contain state for web component contents
  instance.register('component:-ember-web-component-view', Component.extend({ tagName: '' }));
}

export default {
  initialize
};

const DECORATOR_REGEX = /customElement\s*\){0,1}\s*\(/;

function determineIfShouldEvalModule(instance, _module) {
  const {
    emberCustomElements = {}
  } = instance.resolveRegistration('config:environment');
  if (emberCustomElements.deoptimizeModuleEval) return true;
  function _moduleShouldEval(_module) {
    for (const moduleName of _module.deps) {
      // Check if ember-custom-elements is a dependency of the module
      if (moduleName === 'ember-custom-elements') {
        const code = (_module.callback || function() {}).toString();
        // Test if a function named "customElement" is called within the module
        if (DECORATOR_REGEX.test(code)) return true;
      }
      const dep = instance.__registry__.fallback.resolver._moduleRegistry._entries[moduleName];
      if (dep && _moduleShouldEval(dep)) return true;
    }
    return false;
  }
  return _moduleShouldEval(_module);
}

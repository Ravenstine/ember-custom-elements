import Application from '@ember/application';
import Route from '@ember/routing/route';
import EmberComponent from '@ember/component';
import { isGlimmerComponent } from './glimmer-compat';

const EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS = Symbol('EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS');
const EMBER_WEB_COMPONENTS_TARGET_CLASS = Symbol('EMBER_WEB_COMPONENTS_TARGET_CLASS');

/**
 * Sets a custom element class on a component class, and vice versa.
 *
 * @param {Ember.Application|Ember.Component|Glimmer.Component} targetClass
 * @param {Class} customElement
 * @private
 */
export function addCustomElement(targetClass, customElement) {
  targetClass[EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS] = targetClass[EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS] || new Set();
  targetClass[EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS].add(customElement);
  customElement[EMBER_WEB_COMPONENTS_TARGET_CLASS] = targetClass;
}

/**
 * Returns a custom element assigned to a component class or instance, if there is one.
 *
 * @param {Ember.Application|Ember.Component|Glimmer.Component}
 * @private
 */
export function getCustomElements(targetClass) {
  const customElements = targetClass[EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS] || targetClass.constructor && targetClass.constructor[EMBER_WEB_COMPONENTS_CUSTOM_ELEMENTS] || [];
  return Array.from(customElements);
}

/**
 * Returns an Ember class associated with an element.
 *
 * @param {Class} getTargetClass
 * @private
 */
export function getTargetClass(customElement) {
  return customElement[EMBER_WEB_COMPONENTS_TARGET_CLASS];
}

/**
 * Indicates whether a class can be turned into a custom element.
 * @param {Class} targetClass
 * @returns {Boolean}
 */
export function isSupportedClass(targetClass) {
  return isApp(targetClass) ||
         isRoute(targetClass) ||
         isComponent(targetClass) ||
         isGlimmerComponent(targetClass);
}

/**
 * Indicates whether an object is an Ember.Application
 *
 * @param {Class} targetClass
 * @private
 * @returns {Boolean}
 */
export function isApp(targetClass) {
  return isAncestorOf(targetClass, Application);
}

/**
 * Indicates whether an object is an Ember.Route
 *
 * @param {Class} targetClass
 * @private
 * @returns {Boolean}
 */
export function isRoute(targetClass) {
  return isAncestorOf(targetClass, Route);
}

/**
 * Indicates whether an object is an Ember component
 *
 * @param {Class} targetClass
 * @private
 * @returns {Boolean}
 */
export function isComponent(targetClass) {
  return isAncestorOf(targetClass, EmberComponent);
}

function isAncestorOf(a, b) {
  if (!a) return false;

  let ancestor = a;

  while (ancestor) {
    if (ancestor === b) return true;
    ancestor = Object.getPrototypeOf(ancestor);
  }

  return false;
}

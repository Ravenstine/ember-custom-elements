/* global require */

// Import through `require` in case it is not a dependency
const GlimmerComponentModule = require('@glimmer/component');
const GlimmerComponent = GlimmerComponentModule && GlimmerComponentModule.default;

/**
 * Indicates whether a class is a Glimmer component.
 *
 * @param {Class} targetClass
 * @returns {Boolean}
 * @private
 */
export function isGlimmerComponent(targetClass) {
  if (!GlimmerComponent) {
    return false;
  }

  let ancestor = targetClass;

  while (ancestor) {
    if (ancestor === GlimmerComponent) {
      return true;
    }

    ancestor = Object.getPrototypeOf(ancestor);
  }

  return false;
}


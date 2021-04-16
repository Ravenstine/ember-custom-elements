/* eslint-disable ember/new-module-imports */
/* global require */
import { get } from '@ember/object';

const Ember = require('ember').default;

export default Ember;

function emberRequire() {
  try {
    return Ember.__loader.require(...arguments);
  } catch (_) {
    // no-op
  }
}

const destroyable = emberRequire('@ember/destroyable');

/**
 * Someday, Ember may no longer implement objects in a way
 * that adds a `destroy()` method to them by default.  To
 * prepare for that, this first tries to use the newer
 * destroyable API, falling back to the old style `destroy()`
 * method on the object if the destroyable API is not
 * available.
 * 
 * @param {Object} object 
 * @returns 
 */
export function destroy(object) {
  if (destroyable) {
    return destroyable.destroy(object);
  } else if (typeof object.destroy === 'function') {
    return object.destroy();
  }
}

export function registerDestructor(object, callback) {
  if (destroyable) {
    return destroyable.registerDestructor(object, callback);
  } else {
    // Obviously this is nowhere near a 1-to-1
    // replica of registerDestructor, but it 
    // satisfies the current needs of this add-on.
    const ogDestroy = object.destroy;
    if (typeof ogDestroy === 'function') {
      Object.defineProperty(object, 'destroy', {
        value() {
          callback();
          ogDestroy.call(object, ...arguments);
        }
      });
    }
  }
}

export const setComponentTemplate = 
  emberRequire('@ember/runloop').setComponentTemplate || 
  Ember._setComponentTemplate;

const runloop = emberRequire('@ember/runloop');

export const backburner = 
  runloop._backburner ||
  runloop.backburner ||
  get(Ember, 'run.backburner');

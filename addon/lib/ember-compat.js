import Ember from 'ember';

let destroyable;

try {
  destroyable = Ember.__loader.require('@ember/destroyable');
} catch {
  // no-op
}

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

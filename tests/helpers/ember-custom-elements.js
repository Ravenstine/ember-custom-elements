/* eslint-disable ember/new-module-imports */
import Ember from 'ember';
import Router from '@ember/routing/router';
import { setupCustomElementFor } from 'ember-custom-elements';
import { guidFor } from '@ember/object/internals';

export function setupComponentForTest(owner, componentClass, template, registrationName) {
  owner.register(`component:${registrationName}`, componentClass);
  setupCustomElementFor(owner, `component:${registrationName}`);
  if (Ember._setComponentTemplate) {
    return Ember._setComponentTemplate(template, componentClass);
  }
  try {
    owner.unregister(`template:components/${registrationName}`)
  } catch(err) {
    // noop
  }
  owner.register(`template:components/${registrationName}`, template);
}

export function setupApplicationForTest(owner, applicationClass, registrationName) {
  const fullName = `application:${registrationName}`;
  try {
    owner.unregister(fullName);
  } catch(err) {
    // noop
  }
  owner.register(fullName, applicationClass);
  setupCustomElementFor(owner, fullName);
}

export function setupRouteForTest(owner, routeClass, registrationName) {
  const fullName = `route:${registrationName}`;
  try {
    owner.unregister(fullName);
  } catch(err) {
    // noop
  }
  owner.register(fullName, routeClass);
  setupCustomElementFor(owner, fullName);
}

function internalTagNameFor(targetClass) {
  const guid = guidFor(targetClass);
  return `internal-element-${guid}`;
}

export function setupNativeElementForTest(owner, elementClass) {
  const tagName = internalTagNameFor(elementClass);
  const fullName = `custom-element:${tagName}`;
  try {
    owner.unregister(fullName);
  } catch (_) {
    // noop
  }
  owner.register(fullName, elementClass);
  setupCustomElementFor(owner, fullName);
}

export function setupRouteTest(hooks) {
  hooks.beforeEach(function() {
    document.getElementById('ember-testing').classList.remove('ember-application');
    try {
      this.owner.lookup('router:main').destroy();
      this.owner.unregister('router:main');
    } catch (err) {
      // noop
    }
    class TestRouter extends Router {
      location = 'none';
      rootURL = '/';
    }
    this.owner.register('router:main', TestRouter);
    this.owner.lookup('router:main');
    document.getElementById('ember-testing').classList.add('ember-application');
  });
}

export function setupTestRouter(owner, callback) {
  const TestRouter = owner.resolveRegistration('router:main');

  TestRouter.map(callback);

  owner.lookup('router:main').setupRouter();
}
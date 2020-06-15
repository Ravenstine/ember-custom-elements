import EmberCustomElement from './lib/custom-element';
import { 
  getCustomElements,
  addCustomElement,
  getTargetClass,
  isSupportedClass
} from './lib/common';
import { getOwner, setOwner } from '@ember/application';

export { default as EmberOutletElement } from './lib/outlet-element';
export { default as EmberCustomElement } from './lib/custom-element';

// export const ROUTE_CONNECTIONS = new WeakMap();

/**
 * A decorator that allows an Ember or Glimmer component to be instantiated
 * with a custom element.  This means you can define an element tag that
 * your component will be automatically rendered in outside of a template.
 *
 * @param {String} tagName - The tag name that will instantiate your component.  Must contain a hyphen.  See: https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define
 * @param {Object} customElementOptions - Options that will be used for constructing a custom element.
 * @param {String} customElementOptions.extends - A built-in element that your custom element will extend from.  This will be passed to `customElements.define`: https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define#Parameters
 * @param {Boolean=true} customElementOptions.useShadowRoot - Toggles whether a shadow root will be used to contain the body of your component when it is rendered in the custom element.
 * @param {Array<String>} customElementOptions.observedAttributes - An array of attribute names specifying which custom element attributes should be observed.  Observed attributes will update their value to the Ember/Glimmer component when said value changes.
 * @param {Boolean=false} customElementOptions.camelizeArgs - Element attributes must be kabob-case, but if `camelizeArgs` is set to true, these attributes will be exposed to your components in camelCase.
 * @param {String="main"} customElementOptions.outletName - The name of the outlet to render.  This option only applies to Ember.Route.
 * @param {Boolean="true"} customElementOptions.clearsOutletAfterTransition - When set to `false`, this prevents the DOM content inside the element from being cleared when transition away from the route is performed.  This is `true` by default, but you may want to set this to `false` in the case where you need to keep the DOM content around for animation purposes.
 *
 * Basic usage:
 * @example
 *   import { customElement } from 'ember-web-component';
 *
 *   @customElement('my-component')
 *   class MyComponent extends Component {
 *   }
 *
 * With options:
 * @example
 *   @customElement('my-component', { extends: 'p', useShadowRoot: false })
 *   class MyComponent extends Component {
 *   }
 *
 * In your HTML:
 * @example
 *   <my-component></my-component>
 *
 * By default, attributes set on the custom element instance will not be
 * observed, so any changes made to them will not automatically be passed
 * on to your component.  If you expect attributes on your custom element
 * to change, you should set a static property on your component class
 * called `observedAttributes` which is a list of attributes that will
 * be observed and have changes passed down to their respective component.
 *
 * With observed attributes:
 *
 * @example
 *   @customElement('my-component')
 *   class MyComponent extends Component {
 *
 *   }
 */
export function customElement() {
  const {
    targetClass,
    tagName,
    customElementOptions
  } = customElementArgs(...arguments);

  const decorate = function(targetClass) {
    // In case of FastBoot.
    if(!window || !window.customElements) return;

    let element;

    if (!isSupportedClass(targetClass))
      throw new Error(`The target object for custom element \`${tagName}\` is not an Ember component, route or application.`);

    try {
      // Create a custom HTMLElement for our component.
      const customElementClass = customElementOptions.customElementClass ||  EmberCustomElement;
      class Component extends customElementClass {}
      if (customElementOptions.observedAttributes)
        Component.observedAttributes = Array.from(customElementOptions.observedAttributes);
      window.customElements.define(tagName, Component, { extends: customElementOptions.extends });
      element = Component;
    } catch(err) {
      element = window.customElements.get(tagName);
      if (err.name !== 'NotSupportedError' || !element) throw err;
      if (!getTargetClass(element)) throw new Error(`A custom element called \`${tagName}\` is already defined by something else.`);
    }

    // Overwrite the original config on the element
    // const initialize = element.prototype.initialize;
    element.prototype.initialize = function() {
      const ENV = getOwner(this).resolveRegistration('config:environment') || {};
      const { defaultOptions = {} } = ENV.emberCustomElements || {};
      this.options = Object.assign({}, defaultOptions, customElementOptions);
    }

    addCustomElement(targetClass, element);
  };

  if (targetClass) {
    return decorate(targetClass);
  } else {
    return decorate;
  }
}

/**
 * Once an application instance has been booted, the custom element
 * for a component needs to be made aware of said instance as well
 * as know what name its component is registered under.  This will
 * do that, and is used within the instance initializer.  For
 * components not registered with the application until after boot,
 * you will need to use this function to make custom elements work
 * for components.  Most likely, you won't need this.  It's mainly
 * used for testing purposes within this add-on.
 *
 * @function setupCustomElementFor
 * @param {Ember.ApplicationInstance} instance
 * @param {String} registrationName
 */
export function setupCustomElementFor(instance, registrationName) {
  const parsedName = instance.__registry__.fallback.resolver.parseName(registrationName);
  const componentClass = instance.resolveRegistration(registrationName);
  const customElements = getCustomElements(componentClass);
  for (const customElement of customElements) {
    const initialize = customElement.prototype.initialize;
    customElement.prototype.initialize = function() {
      setOwner(this, instance);
      this.parsedName = parsedName;
      if (initialize) initialize.apply(this);
    };
  }
}

function customElementArgs() {
  if (typeof arguments[0] === 'function' && typeof arguments[1] === 'string') {
    return {
      targetClass: arguments[0],
      tagName: arguments[1],
      customElementOptions: arguments[2] || {}
    }
  } else if (typeof arguments[0] === 'string') {
    return {
      targetClass: null,
      tagName: arguments[0],
      customElementOptions: arguments[1] || {}
    }
  } else {
    throw new Error('customElement should be passed a tagName string but found none.');
  }
}
import { notifyPropertyChange, set } from '@ember/object';
import { schedule, scheduleOnce } from '@ember/runloop';
import { getOwner, setOwner } from '@ember/application';
import { camelize } from '@ember/string';
import { getInitializationPromise } from '../instance-initializers/ember-custom-elements';
import { compileTemplate } from './template-compiler';
import OutletElement, { getPreserveOutletContent, OUTLET_VIEWS } from './outlet-element';
import BlockContent from './block-content';
import { getMeta, setMeta } from '../index';
import { getTargetClass, isApp } from './common';
import { defer } from 'rsvp';
import { destroy } from './ember-compat';

const APPS = new WeakMap();
const APP_INSTANCES = new WeakMap();
const COMPONENT_VIEWS = new WeakMap();
const ATTRIBUTES_OBSERVERS = new WeakMap();
const BLOCK_CONTENT = Symbol('BLOCK_CONTENT');

export const CURRENT_CUSTOM_ELEMENT = { element: null };
export const CUSTOM_ELEMENT_OPTIONS = new WeakMap();
export const INITIALIZERS = new WeakMap();
export const TARGET_AVAILABLE = Symbol('TARGET_AVAILABLE');

/**
 * The custom element that wraps an actual Ember component.
 *
 * @class EmberCustomElement
 * @extends HTMLElement
 */
export default class EmberCustomElement extends HTMLElement {
  static [TARGET_AVAILABLE] = defer();

  /**
   * Private properties don't appear to be accessible in
   * functions that we bind to the instance, which is why
   * this uses a symbol instead.
   */
  [BLOCK_CONTENT] = new BlockContent();

  constructor() {
    super(...arguments);
    
    initialize(this);
  }

  /**
   * Sets up the component instance on element insertion and creates an
   * observer to update the component with attribute changes.
   *
   * Also calls `didReceiveAttrs` on the component because this otherwise
   * won't be called by virtue of the way we're instantiating the component
   * outside of a template.
   */
  async connectedCallback() {
    // connectedCallback may be called once your element is no longer connected, use Node.isConnected to make sure.
    // https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
    if (!this.isConnected) return;

    // If the related Ember app code has not been evaluated by
    // the browser yet, wait for the target class to be decorated
    // and associated with the custom element class before continuing.
    await this.constructor[TARGET_AVAILABLE].promise;

    let targetClass = getTargetClass(this);

    // Apps may have an owner they're registered to, but that is
    // not the expectation most of the time, so we have to
    // detect that and handle it differently.
    if (isApp(targetClass)) return connectApplication.call(this);

    await getInitializationPromise();

    const { type } = getMeta(this).parsedName;
    if (type === 'component') return connectComponent.call(this);
    if (type === 'route') return connectRoute.call(this);
  }

  /**
   * Reflects element attribute changes to component properties.
   *
   * @param {String} attrName
   */
  attributeChangedCallback(attrName) {
    if (!this._attributeObserverEnabled) return;
    this.changedAttributes.add(attrName);
    scheduleOnce('render', this, updateComponentArgs);
  }

  /**
   * Destroys the component upon element removal.
   */
  async disconnectedCallback() {
    const app = APPS.get(this);
    if (app) await destroy(app);
    // ☝️ Calling that seems to cause a rendering error
    // in tests that is difficult to address.
    const instance = APP_INSTANCES.get(this);
    if (instance) await destroy(instance);
    const componentView = COMPONENT_VIEWS.get(this);
    if (componentView) await destroy(componentView);
    const attributesObserver = ATTRIBUTES_OBSERVERS.get(this);
    if (attributesObserver) attributesObserver.disconnect();
    const outletView = OUTLET_VIEWS.get(this);
    if (outletView) await OutletElement.prototype.destroyOutlet.call(this);
    const { type } = getMeta(this).parsedName;
    if (type === 'route' && !getPreserveOutletContent(this)) this.innerHTML = '';
  }

  removeChild() {
    const { type } = (getMeta(this).parsedName || {});
    if (type === 'component' || type === 'custom-element') {
      this[BLOCK_CONTENT].removeChild(...arguments);
    } else {
      super.removeChild(...arguments);
    }
  }

  insertBefore() {
    const { type } = (getMeta(this).parsedName || {});
    if (type === 'component' || type === 'custom-element') {
      this[BLOCK_CONTENT].insertBefore(...arguments);
    } else {
      super.insertBefore(...arguments);
    }
  }
}

/**
 * @private
 */
function updateComponentArgs() {
  const changes = Array.from(this.changedAttributes);
  if (changes.size < 1) return;
  set(this, '_attributeObserverEnabled', false);
  try {
    const view = COMPONENT_VIEWS.get(this);
    if (!view) return;
    const options = getOptions(this);
    const attrs = { ...view._attrs };
    set(view, '_attrs', attrs);
    for (const attr of changes) {
      const attrName = options.camelizeArgs ? camelize(attr) : attr;
      attrs[attrName] = this.getAttribute(attr);
      notifyPropertyChange(view, `_attrs.${attrName}`);
    }
  } finally {
    set(this, '_attributeObserverEnabled', true);
    this.changedAttributes.clear();
  }
}

/**
 * Sets up a component to be rendered in the element.
 * @private
 */
async function connectComponent() {
  // https://stackoverflow.com/questions/48498581/textcontent-empty-in-connectedcallback-of-a-custom-htmlelement
  await new Promise(resolve => schedule('afterRender', this, resolve));
  Object.defineProperties(this, {
    changedAttributes: {
      value: new Set(),
      configurable: false,
      enumerable: false,
      writable: false
    }
  });
  this._attributeObserverEnabled = true;
  // Capture block content and replace
  this[BLOCK_CONTENT].from(this.childNodes);
  const options = getOptions(this);
  const useShadowRoot = Boolean(options.useShadowRoot);
  if (useShadowRoot) this.attachShadow({mode: 'open'});
  const target = this.shadowRoot ? this.shadowRoot : this;
  if (target === this) this.innerHTML = '';
  // Setup attributes and attribute observer
  const attrs = {};
  for (const attr of this.getAttributeNames()) {
    const attrName = options.camelizeArgs ? camelize(attr) : attr;
    attrs[attrName] = this.getAttribute(attr);
  }
  const observedAttributes = this.constructor.observedAttributes;
  if (observedAttributes) {
    // This allows any attributes that aren't initially present
    // to be tracked if they become present later and set to be observed.
    // eslint-disable-next-line no-prototype-builtins
    for (const attr of observedAttributes) if (!attrs.hasOwnProperty(attr)) {
      const attrName = options.camelizeArgs ? camelize(attr) : attr;
      attrs[attrName] = null;
    }
  } else if (observedAttributes !== false) {
    const attributesObserver = new MutationObserver(mutations => {
      for (const { type, attributeName } of mutations) {
        if (type !== 'attributes') continue;
        this.attributeChangedCallback(attributeName);
      }
    });
    ATTRIBUTES_OBSERVERS.set(this, attributesObserver);
    attributesObserver.observe(this, { attributes: true });
  }
  const owner = getOwner(this);
  const view = owner.factoryFor('component:-ember-web-component-view').create({
    layout: compileTemplate(getMeta(this).parsedName.name, Object.keys(attrs)),
    _attrs: attrs,
    blockContent: null,
  });
  COMPONENT_VIEWS.set(this, view);
  // This allows the component to consume the custom element node
  // in the constructor and anywhere else.  It works because the
  // instantiation of the component is always synchronous,
  // constructors are always synchronous, and we have overridden
  // the constructor so that it stores the node and deletes this
  // property.
  CURRENT_CUSTOM_ELEMENT.element = this;
  // This bypasses a check that happens in view.appendTo
  // that prevents us from attaching the component
  const proxy = document.createDocumentFragment();
  proxy.removeChild = child => child.remove();
  proxy.insertBefore = (node, reference) => {
    const parent = (reference || {}).parentNode || proxy;
    DocumentFragment.prototype.insertBefore.apply(parent, [node, reference]);
  };
  view.renderer.appendTo(view, proxy);
  target.append(proxy);
  set(view, 'blockContent', this[BLOCK_CONTENT].fragment);
}

/**
 * Sets up a route to be rendered in the element
 * @private
 */
async function connectRoute() {
  const options = getOptions(this);
  const useShadowRoot = options.useShadowRoot;
  if (useShadowRoot) this.attachShadow({ mode: 'open' });
  CURRENT_CUSTOM_ELEMENT.element = this;
  OutletElement.prototype.connectedCallback.call(this);
}
/**
 * Sets up an application to be rendered in the element.
 *
 * Here, we are actually booting the app into a detached
 * element and then relying on `connectRoute` to render
 * the application route for the app instance.
 *
 * There are a few advantages to this.  This allows the
 * rendered content to be less "deep", meaning that we
 * don't need two useless elements, which the app
 * instance is expecting, to be present in the DOM.  The
 * second advantage is that this prevents problems
 * rendering apps within other apps in a way that doesn't
 * require the use of a shadowRoot.
 *
 * @private
 */
async function connectApplication() {
  const parentElement = document.createElement('div');
  const rootElement = document.createElement('div');
  parentElement.append(rootElement);
  CURRENT_CUSTOM_ELEMENT.element = this;
  const owner = getOwner(this);
  let app;
  // If the app is owned, use a factory to instantiate
  // the app instead of using the constructor directly.
  const config = {
    rootElement,
    autoboot: false,
  };
  if (owner) {
    app = owner.factoryFor(getMeta(this).parsedName.fullName).create(config);
  } else {
    const App = getTargetClass(this);
    app = App.create(config);
  }
  APPS.set(this, app);
  await app.boot();
  const instance = app.buildInstance();
  APP_INSTANCES.set(this, instance);
  await instance.boot({ rootElement });
  await instance.startRouting();
  setOwner(this, instance);
  if (!owner) {
    await getInitializationPromise();
    // The outlet-element methods expect the element
    // to have resolver meta data associated with it.
    const meta = instance.__registry__.fallback.resolver.parseName('application:main');
    setMeta(this, meta);
  }
  connectRoute.call(this);
}

export function getOptions(element) {
  const customElementOptions = CUSTOM_ELEMENT_OPTIONS.get(element.constructor);
  const ENV = getOwner(element).resolveRegistration('config:environment') || {};
  const { defaultOptions = {} } = ENV.emberCustomElements || {};
  return Object.assign({}, defaultOptions, customElementOptions);
}

export function initialize(customElement) {
  const initializer = INITIALIZERS.get(customElement.constructor);
  if (initializer) initializer.call(customElement);
}

EmberCustomElement.prototype.updateOutletState = OutletElement.prototype.updateOutletState;
EmberCustomElement.prototype.scheduleUpdateOutletState = OutletElement.prototype.scheduleUpdateOutletState;

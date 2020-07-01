import { notifyPropertyChange, set } from '@ember/object';
import { schedule, scheduleOnce } from '@ember/runloop';
import { getOwner, setOwner } from '@ember/application';
import { camelize } from '@ember/string';
import { getInitializationPromise } from '../instance-initializers/ember-custom-elements';
import { compileTemplate } from './template-compiler';
import OutletElement, { OUTLET_VIEWS } from './outlet-element';
import BlockContent from './block-content';

export const CURRENT_CUSTOM_ELEMENT = { element: null };
export const CUSTOM_ELEMENT_OPTIONS = new WeakMap();
export const INITIALIZERS = new WeakMap();

const APPS = new WeakMap();
const APP_INSTANCES = new WeakMap();
const COMPONENT_VIEWS = new WeakMap();
const BLOCK_CONTENTS = new WeakMap();
const ATTRIBUTES_OBSERVERS = new WeakMap();

/**
 * The custom element that wraps an actual Ember component.
 *
 * @class EmberCustomElement
 * @extends HTMLElement
 */
export default class EmberCustomElement extends HTMLElement {
  /**
   * If the referenced class is a route, returns the name of the route.
   *
   * @returns {String|null}
   */
  get route() {
    const { type, fullNameWithoutType } = this.parsedName;
    if (type === 'route') {
      return fullNameWithoutType.replace('/', '.');
    } else if (type === 'application') {
      return 'application';
    } else {
      return null;
    }
  }
  /**
   * If the referenced class is a route, returns the name of a specified outlet.
   *
   * @returns {String|null}
   */
  get outlet() {
    const options = getOptions(this);
    return options.outletName || 'main';
  }
  /**
   * If the referenced class is a route, and this is set to `true`, the DOM tree
   * inside the element will not be cleared when the route is transitioned away
   * until the element itself is destroyed.
   *
   * This only applies to routes.  No behavior changes when applied to components
   * or applications.
   *
   * @returns {Boolean=false}
   */
  get preserveOutletContent() {
    const options = getOptions(this);
    return options.preserveOutletContent;
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

    await getInitializationPromise();

    const initializer = INITIALIZERS.get(this.constructor);
    initializer.call(this);

    const { type } = this.parsedName;
    if (type === 'component') return connectComponent.call(this);
    if (type === 'route') return connectRoute.call(this);
    if (type === 'application') return connectApplication.call(this);
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
    if (app) await app.destroy();
    const instance = APP_INSTANCES.get(this);
    if (instance) await instance.destroy();
    const componentView = COMPONENT_VIEWS.get(this);
    if (componentView) {
      await componentView.destroy();
      const blockContent = BLOCK_CONTENTS.get(this);
      if (blockContent) await blockContent.destroy();
      const attributesObserver = ATTRIBUTES_OBSERVERS.get(this);
      if (attributesObserver) attributesObserver.disconnect();
    }
    const outletView = OUTLET_VIEWS.get(this);
    if (outletView) await OutletElement.prototype.destroyOutlet.call(this);
    const { type } = this.parsedName;
    if (type === 'route' && !this.preserveOutletContent) this.innerHTML = '';
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
    const attrs = { ...view.attrs };
    set(view, 'attrs', attrs);
    for (const attr of changes) {
      const attrName = options.camelizeArgs ? camelize(attr) : attr;
      attrs[attrName] = this.getAttribute(attr);
      notifyPropertyChange(view, `attrs.${attrName}`);
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
  const blockContent = BlockContent.from(this.childNodes);
  BLOCK_CONTENTS.set(this, blockContent);
  const options = getOptions(this);
  const useShadowRoot = !!options.useShadowRoot;
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
    this.attributesObserver = new MutationObserver(mutations => {
      for (const { type, attributeName } of mutations) {
        if (type !== 'attributes') continue;
        this.attributeChangedCallback(attributeName);
      }
    });
    this.attributesObserver.observe(this, { attributes: true });
  }
  const owner = getOwner(this);
  const view = owner.factoryFor('component:-ember-web-component-view').create({
    layout: compileTemplate(this.parsedName.name, Object.keys(attrs)),
    attrs,
    blockContent: null
  });
  COMPONENT_VIEWS.set(this, view);
  // Track block content presence and push a DocumentFragment when content
  // is no longer in the DOM due to logic in the component
  blockContent.onTracked = fragment => {
    if (view && view.isDestroyed) return;
    set(view, 'blockContent', fragment);
  };
  blockContent.track();
  // This allows the component to consume the custom element node
  // in the constructor and anywhere else.  It works because the
  // instantiation of the component is always synchronous,
  // constructors are always synchronous, and we have overridden
  // the constructor so that it stores the node and deletes this
  // property.
  CURRENT_CUSTOM_ELEMENT.element = this;
  // This bypasses a check that happens in view.appendTo
  // that prevents us from attaching the component
  view.renderer.appendTo(view, target);
}
/**
 * Sets up a route to be rendered in the element
 * @private
 */
async function connectRoute() {
  const options = getOptions(this);
  const useShadowRoot = options.useShadowRoot;
  if (useShadowRoot) {
    this.attachShadow({ mode: 'open' });
  }
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
  const app = getOwner(this).factoryFor(this.parsedName.fullName).create({});
  APPS.set(this, app);
  await app.boot();
  const instance = app.buildInstance();
  APP_INSTANCES.set(this, instance);
  await instance.boot({ rootElement });
  await instance.startRouting();
  setOwner(this, instance);
  connectRoute.call(this);
}

function getOptions(element) {
  const customElementOptions = CUSTOM_ELEMENT_OPTIONS.get(element.constructor);
  const ENV = getOwner(element).resolveRegistration('config:environment') || {};
  const { defaultOptions = {} } = ENV.emberCustomElements || {};
  return Object.assign({}, defaultOptions, customElementOptions);
}

EmberCustomElement.prototype.updateOutletState = OutletElement.prototype.updateOutletState;
EmberCustomElement.prototype.scheduleUpdateOutletState = OutletElement.prototype.scheduleUpdateOutletState;
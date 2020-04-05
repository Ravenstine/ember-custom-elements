import { notifyPropertyChange, set } from '@ember/object';
import { schedule, scheduleOnce } from '@ember/runloop';
import { getOwner } from '@ember/application';
import { camelize } from '@ember/string';
import { compileTemplate } from './template-compiler';
import OutletElement from './outlet-element';
import BlockContent from './block-content';

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
    return this.options.outletName;
  }

  constructor() {
    super(...arguments);
    this.initialize();
  }
  /**
   * This is overriden during setup in order to add
   * runtime properties to element instances.
   *
   * @method initialize
   * @override
   * @private
   */
  initialize() {
    // override this
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
    const { type } = this.parsedName;
    if (type === 'component') this.connectComponent();
    if (type === 'route') this.connectRoute();
    if (type === 'application') this.connectApplication();
  }
  /**
   * Sets up a component to be rendered in the element.
   */
  async connectComponent() {
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
    this._blockContent = null;
    // Capture block content and replace
    const blockContent = BlockContent.from(this.childNodes);
    this._blockContent = blockContent;
    const useShadowRoot = this.options.useShadowRoot === false ? false : true;
    if (useShadowRoot) this.attachShadow({mode: 'open'});
    const target = this.shadowRoot ? this.shadowRoot : this;
    if (target === this) this.innerHTML = '';
    // Setup attributes and attribute observer
    const attrs = {};
    for (const attr of this.getAttributeNames()) {
      const attrName = this.options.camelizeArgs ? camelize(attr) : attr;
      attrs[attrName] = this.getAttribute(attr);
    }
    const observedAttributes = this.constructor.observedAttributes;
    if (observedAttributes) {
      // This allows any attributes that aren't initially present
      // to be tracked if they become present later and set to be observed.
      // eslint-disable-next-line no-prototype-builtins
      for (const attr of observedAttributes) if (!attrs.hasOwnProperty(attr)) {
        const attrName = this.options.camelizeArgs ? camelize(attr) : attr;
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
    this.view = owner.factoryFor('component:-ember-web-component-view').create({
      layout: compileTemplate(this.parsedName.name, Object.keys(attrs)),
      attrs,
      blockContent: null
    });
    // Track block content presence and push a DocumentFragment when content
    // is no longer in the DOM due to logic in the component
    blockContent.onTracked = fragment => {
      if (this.view && this.view.isDestroyed) return;
      set(this, 'view.blockContent', fragment)
    };
    blockContent.track();
    // This bypasses a check that happens in this.view.appendTo
    // that prevents us from attaching the component
    this.view.renderer.appendTo(this.view, target);
  }
  /**
   * Sets up a route to be rendered in the element
   */
  async connectRoute() {
    this.scheduleUpdateOutletState = this.scheduleUpdateOutletState.bind(this);
    const useShadowRoot = this.options.useShadowRoot === false ? false : true;
    if (useShadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.connectOutlet();
  }
  /**
   * Sets up an application to be rendered in the element.
   */
  async connectApplication() {
    const useShadowRoot = this.options.useShadowRoot === false ? false : true;
    const target = useShadowRoot ? this.attachShadow({ mode: 'open' }) : this;
    const parentElement = document.createElement('div');
    const rootElement = document.createElement('div');
    parentElement.append(rootElement);
    target.append(parentElement);
    const app = getOwner(this).application;
    await app.boot();
    this.view = app.buildInstance();
    await this.view.boot({ rootElement });
    this.view.startRouting();
  }
  /**
   * Reflects element attribute changes to component properties.
   *
   * @param {String} attrName
   * @private
   */
  attributeChangedCallback(attrName) {
    if (!this._attributeObserverEnabled) return;
    this.changedAttributes.add(attrName);
    scheduleOnce('render', this, updateComponentArgs);
  }
  /**
   * Destroys the component upon element removal.
   */
  disconnectedCallback() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    if (this._blockContent) this._blockContent.destroy();
    if (this.attributesObserver) this.attributesObserver.disconnect();
    const { type } = this.parsedName;
    if (type === 'route') this.innerHTML = '';
  }
}

function updateComponentArgs() {
  const changes = Array.from(this.changedAttributes);
  if (changes.size < 1) return;
  set(this, '_attributeObserverEnabled', false);
  try {
    if (!this.view) return;
    const attrs = { ...this.view.attrs };
    set(this.view, 'attrs', attrs);
    for (const attr of changes) {
      const attrName = this.options.camelizeArgs ? camelize(attr) : attr;
      attrs[attrName] = this.getAttribute(attr);
      notifyPropertyChange(this.view, `attrs.${attrName}`);
    }
  } finally {
    set(this, '_attributeObserverEnabled', true);
    this.changedAttributes.clear();
  }
}

EmberCustomElement.prototype.connectOutlet = OutletElement.prototype.connectedCallback;
EmberCustomElement.prototype.updateOutletState = OutletElement.prototype.updateOutletState;
EmberCustomElement.prototype.scheduleUpdateOutletState = OutletElement.prototype.scheduleUpdateOutletState;
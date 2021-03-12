import { getOwner } from '@ember/application';
import { scheduleOnce } from '@ember/runloop';
import { getOptions } from './custom-element';
import ROUTE_CONNECTIONS from './route-connections';

export const OUTLET_VIEWS = new WeakMap();

/**
 * A custom element that can render an outlet from an Ember app.
 *
 * @argument {String} route - The dot-delimited name of a route.
 * @argument {String='main'} name - The name of an outlet.
 * @argument {String='true'} preserveContent - Prevents outlet contents from being cleared when transitioning out of the route or when the element is disconnected.
 */
export default class EmberWebOutlet extends HTMLElement {
  constructor() {
    super(...arguments);
    this.initialize();
  }

  /**
   * @override
   */
  initialize() {}

  connectedCallback() {
    const target = this.shadowRoot || this;
    const owner = getOwner(this);
    const router = owner.lookup('router:main');
    const OutletView = owner.factoryFor('view:-outlet');
    const view = OutletView.create();
    view.appendTo(target);
    OUTLET_VIEWS.set(this, view);
    this.scheduleUpdateOutletState = this.scheduleUpdateOutletState.bind(this);
    router.on('routeWillChange', this.scheduleUpdateOutletState);
    router.on('routeDidChange', this.scheduleUpdateOutletState);
    this.updateOutletState();
  }

  scheduleUpdateOutletState(transition) {
    if (transition.to.name !== getRoute(this) && getPreserveOutletContent(this)) return;
    scheduleOnce('render', this, 'updateOutletState')
  }

  /**
   * Looks up the outlet on the top-level view and updates the state of our outlet view.
   */
  updateOutletState() {
    if (!this.isConnected) return;
    const router = getOwner(this).lookup('router:main');
    if (!router._toplevelView) return;
    let routeName;
    const loadingName = `${getRoute(this)}_loading`;
    const errorName = `${getRoute(this)}_error`;
    if (router.isActive(loadingName)) {
      routeName = loadingName;
    } else if (router.isActive(errorName)) {
      routeName = errorName;
    } else {
      routeName = getRoute(this);
    }
    const stateObj = (() => {
      if (typeof router._toplevelView.ref.compute === 'function') {
        return router._toplevelView.ref.compute();
      } else {
        return router._toplevelView.ref.outletState
      }
    })();
    const outletState = lookupOutlet(stateObj, routeName, getOutletName(this)) || {};
    const view = OUTLET_VIEWS.get(this);
    view.setOutletState(outletState);
  }

  disconnectedCallback() {
    const owner = getOwner(this);
    const router = owner.lookup('router:main');
    router.off('routeWillChange', this.scheduleUpdateOutletState);
    router.off('routeDidChange', this.scheduleUpdateOutletState);
    this.destroyOutlet();
  }

  async destroyOutlet() {
    const view = OUTLET_VIEWS.get(this);
    if (view) await view.destroy();
    const target = this.shadowRoot || this;
    if (this.preserveOutletContent !== 'true') target.innerHTML = '';
  }
}

/**
 * Given an outlet state, returns a descendent outlet state that matches
 * the route name and the outlet name provided.
 *
 * @param {Object} outletState
 * @param {String} routeName
 * @param {String=} outletName
 */
function lookupOutlet(outletState, routeName, outletName) {
  const route = outletState.render.owner.lookup(`route:${routeName}`);
  if (!route) return Object.create(null);
  const routeConnections = (() => {
    if (route.connections) return route.connections;
    if (ROUTE_CONNECTIONS && ROUTE_CONNECTIONS.get) return ROUTE_CONNECTIONS.get(route);
  })();
  if (!routeConnections) return null;
  const outletRender = routeConnections.find(outletState => outletState.outlet === outletName);
  function _lookupOutlet(outletState) {
    if (outletState.render === outletRender) return outletState;
    const outlets = Object.values(outletState.outlets);
    for (const outlet of outlets) {
      const foundOutlet = _lookupOutlet(outlet);
      if (foundOutlet) return foundOutlet;
    }
    return Object.create(null);
  }
  return _lookupOutlet(outletState);
}

/**
 * If the referenced class is a route, returns the name of the route.
 *
 * @private
 * @param {HTMLElement|EmberCustomElement} element
 * @returns {String|null}
 */
function getRoute(element) {
  if (element.parsedName) {
    const { type, fullNameWithoutType } = element.parsedName;
    if (type === 'route') {
      return fullNameWithoutType.replace('/', '.');
    } else if (type === 'application') {
      return 'application';
    } else {
      return null;
    }
  }
  const attr = element.getAttribute('route');
  const routeName = attr ? attr.trim() : null;
  return routeName && routeName.length ? routeName : 'application';
}

/**
 * If the referenced class is a route, returns the name of a specified outlet.
 *
 * @param {HTMLElement|EmberCustomElement} element
 * @returns {String|null}
 */
function getOutletName(element) {
  const options = getOptions(element);
  return options?.outletName || element.getAttribute('name') || 'main';
}

/**
 * If the referenced class is a route, and this is set to `true`, the DOM tree
 * inside the element will not be cleared when the route is transitioned away
 * until the element itself is destroyed.
 *
 * This only applies to routes.  No behavior changes when applied to components
 * or applications.
 *
 * @param {HTMLElement|EmberCustomElement} element
 * @returns {Boolean}
 */
export function getPreserveOutletContent(element) {
  const options = getOptions(element);
  return options?.preserveOutletContent || element.getAttribute('preserve-content') === 'true' || false;
}

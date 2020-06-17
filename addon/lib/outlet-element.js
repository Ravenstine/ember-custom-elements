import { getOwner } from '@ember/application';
import { scheduleOnce } from '@ember/runloop';
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
  get route() {
    const attr = this.getAttribute('route');
    const routeName = attr ? attr.trim() : null;
    return routeName && routeName.length ? routeName : 'application';
  }

  get outlet() {
    return this.getAttribute('name') || 'main';
  }

  get preserveOutletContent() {
    return this.getAttribute('preserve-content') === 'true' || false;
  }

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
    if (transition.to.name !== this.route && this.preserveOutletContent) return;
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
    const loadingName = `${this.route}_loading`;
    const errorName = `${this.route}_error`;
    if (router.isActive(loadingName)) {
      routeName = loadingName;
    } else if (router.isActive(errorName)) {
      routeName = errorName;
    } else {
      routeName = this.route;
    }
    const outletState = lookupOutlet(router._toplevelView.ref.outletState, routeName, this.outlet) || {};
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

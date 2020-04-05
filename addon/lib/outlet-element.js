import { getOwner } from '@ember/application';
import { scheduleOnce } from '@ember/runloop';

/**
 * A custom element that can render an outlet from an Ember app.
 *
 * @argument {String} route - The dot-delimited name of a route.
 * @argument {String='main'} name - The name of an outlet.
 */
export default class EmberWebOutlet extends HTMLElement {
  get route() {
    return this.getAttribute('route');
  }

  get outlet() {
    return this.getAttribute('name') || 'main';
  }

  constructor() {
    super(...arguments);
    this.initialize();
    this.scheduleUpdateOutletState = this.scheduleUpdateOutletState.bind(this);
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
    this.view = view;
    // router.on('willTransition', this.scheduleUpdateOutletState);
    // router.on('didTransition', this.scheduleUpdateOutletState);
    router.on('routeWillChange', this.scheduleUpdateOutletState);
    router.on('routeDidChange', this.scheduleUpdateOutletState);
    this.updateOutletState();
  }

  scheduleUpdateOutletState() {
    scheduleOnce('render', this, 'updateOutletState')
  }

  /**
   * Looks up the outlet on the top-level view and updates the state of our outlet view.
   */
  updateOutletState() {
    const router = getOwner(this).lookup('router:main');
    const outletState = lookupOutlet(router._toplevelView.ref.outletState, this.route, this.outlet) || {};
    this.view.setOutletState(outletState);
  }

  disconnectedCallback() {
    const owner = getOwner(this);
    const router = owner.lookup('router:main');
    router.off('willTransition', this.scheduleUpdateOutletState);
    router.off('didTransition', this.scheduleUpdateOutletState);
    this.destroyOutlet();
  }

  destroyOutlet() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    const target = this.shadowRoot || this;
    target.innerHTML = '';
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
  const routeMatched = [routeName, `${routeName}_loading`, `${routeName}_error`].includes(outletState.render.name);
  if (routeMatched) {
    if (outletName) {
      if (outletName === outletState.render.outlet) {
        return outletState;
      }
    } else {
      return outletState
    }
  }
  const outlets = Object.values(outletState.outlets);
  for (const outlet of outlets) {
    const foundOutlet = lookupOutlet(outlet, routeName);
    if (foundOutlet) return foundOutlet;
  }
}

import Ember from './ember-compat'

/**
 * This file is a bit of a hack.  What it does is expose access to a
 * private value in the Ember internals which allows us to consistently
 * map route instances to outlet states.  Otherwise, there isn't a way
 * to identify whether an outlet state matches a route other than
 * matching by template name, which may be totally different from the
 * route name if the route is rendering different templates into
 * named routes.
 *
 * Fortunately, the internal module for Ember.Route exports its WeakMap
 * for keeping track of what routes are connected to which outlet states.
 */

Ember.__loader.define(
  'ember-custom-elements/route-connections',
  ['exports', '@ember/routing/route'],
  function (_exports, _route) {
    'use strict'
    Object.defineProperty(_exports, '__esModule', {
      value: true
    })
    _exports.default = _route.ROUTE_CONNECTIONS
  }
)
const { default: ROUTE_CONNECTIONS } = Ember.__loader.require(
  'ember-custom-elements/route-connections'
)

export default ROUTE_CONNECTIONS

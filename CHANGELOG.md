Ember Web Components Changelog
==============================

## v2.1.0

- Add support for unwrapped dynamic block content, removing the requirement to place dynamic block content within another element
- Add support for using the `@customElement` decorator on descendent of HTMLElement
- Make non-standard custom element properties private
- Fix serious bug with non-owned apps failing to render

## v2.0.4

- Fix rendering failure for Ember >= 3.20.0

## v2.0.3

- Fix support for use of the decorator within add-ons
- Fix Glimmer component check for production

## v2.0.2

- Ensure `connectedCallback` runs after Ember initializer

## v2.0.1

- Decorated components shouldn't break when not being invoked from a custom element.

## v2.0.0

- Replace `this.args.customElement` with the `getCustomElement` helper function.
- Implement `forwarded` decorator to provide a way for creating interfaces between components and custom elements.

## v1.0.0

- Change `useShadowRoot` to be false by default, making shadow roots opt-in.  This is to avoid extra complexity when rendering components that depend on global styles, which is almost always the expectation.
- Change the rendering behavior for applications to rely on route/outlet rendering for better portability and more shallow HTML.
- Fix faulty outlet state identification logic which was breaking for outlets rendering a different template than the default one for a given route.

## v0.4.0

- Expose the custom element node via the `customElement` component arg.
- Fix misfiring log warning

## v0.3.0

- Add global default options inside `config/environment.js` under `ENV.emberCustomElements.defaultOptions`.
- Add private `deoptimizeModuleEval` option.

## v0.2.1

- Fixed bug with conditional logic surrounding block content, which was causing an infinite render loop.

## v0.2.0

- Added `preserveOutletContent` option, which can be used to keep outlet DOM contents from being cleared when navigating away from a route.
- Fixed a bug in the Outlet element where router event listeners were not being removed, causing the outlet to try and update even after the outlet view has been destroyed.

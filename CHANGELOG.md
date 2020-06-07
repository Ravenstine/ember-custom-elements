Ember Web Components Changelog
==============================

## v0.3.0

- Add global default options inside `config/environment.js` under `ENV.emberCustomElements.defaultOptions`.
- Add private `deoptimizeModuleEval` option.

## v0.2.1

- Fixed bug with conditional logic surrounding block content, which was causing an infinite render loop.

## v0.2.0

- Added `preserveOutletContent` option, which can be used to keep outlet DOM contents from being cleared when navigating away from a route.
- Fixed a bug in the Outlet element where router event listeners were not being removed, causing the outlet to try and update even after the outlet view has been destroyed. 

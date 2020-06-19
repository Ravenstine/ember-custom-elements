[![Build Status](https://travis-ci.com/Ravenstine/ember-custom-elements.svg?branch=master)](https://travis-ci.com/Ravenstine/ember-custom-elements)
[![npm version](https://badge.fury.io/js/ember-custom-elements.svg)](https://badge.fury.io/js/ember-custom-elements)

Ember Custom Elements
=====================

The most flexible way to render parts of your Ember application using custom elements!


## Demos

- [Tic Tac Toe game using Ember and React](https://ember-twiddle.com/8fa62cb81a790a3afb6713fd9f2480b5) (based on the [React.js tutorial](https://reactjs.org/tutorial/tutorial.html))
- [Super Rentals w/ animated route transitions](https://ember-twiddle.com/aa7bd7a7d36641dd5daa5ad6b6eebb5a) (combines custom elements for routes with [Ionic Framework](https://ionicframework.com/)'s animated nav)


## Table of Contents

* [Compatibility](#compatibility)
* [Installation](#installation)
* [Usage](#usage)
  * [Components](#components)
    * [Attributes and Arguments](#attributes-and-arguments)
    * [Block Content](#block-content)
  * [Routes](#routes)
    * [Named Outlets](#named-outlets)
    * [Outlet Element](#outlet-element)
  * [Applications](#applications)
  * [Options](#options)
  * [Accessing a Custom Element](#accessing-a-custom-element)
  * [Forwarding Component Properties](#forwarding-component-properties)
* [Notes](#notes)
  * [Elements](#elements)
  * [Runloop](#runloop)
* [Contributing](#contributing)
* [License](#license)
  


## Compatibility

* Ember.js v3.6 or above
* Ember CLI v2.13 or above
* Node.js v10 or above

This add-on almost certainly won't work with versions of `ember-source` prior to `3.6.0`.  I will not be trying to get this to work with earlier versions, but I'm open to any pull requests that improve backward compatibility.


## Installation

```
ember install ember-custom-elements
```

If you are targeting older browsers, you may want to use a [polyfill for custom elements](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements).  Other features of web components are also available as [polyfills](https://github.com/webcomponents/polyfills).


## Usage



### Components

All you have to do is use the `customElement` decorator in your component file:

```javascript
import Component from '@glimmer/component';
import { customElement } from 'ember-custom-elements';

@customElement('my-component')
export default MyComponent extends Component {

}
```

Now you can use your component _anywhere_ inside the window that your app was instantiated within by using your custom element:

```handlebars
<my-component></my-component>
```

In the case that you can't use TC39's proposed decorator syntax, you can call customElement as a function and pass the target class as the first argument:

```javascript
export default customElement(MyComponent, 'my-component');
```

However, it's recommended that you upgrade to a recent version of [ember-cli-babel](https://github.com/babel/ember-cli-babel) so you can use decorator syntax out of the box, or manually install [babel-plugin-proposal-decorators](https://babeljs.io/docs/en/babel-plugin-proposal-decorators).




#### Attributes and Arguments

Attributes instances of your custom element are translated to arguments to your component:

```handlebars
<my-component some-message="hello world"></my-component>
```

To use the attribute in your component template, you would use it like any other argument:

```handlebars
{{!-- my-component.hbs --}}
{{@some-message}}
```

Changes to attributes are observed, and so argument values are updated automatically.




#### Block Content

Block content inside your custom element instances can be treated just like block content within a precompiled template.  If your component contains a `{{yield}}` statement, that's where the block content will end up.

```handlebars
{{!-- my-component.hbs --}}
<span>foo {{yield}} baz</span>
```

```handlebars
<my-component>bar</my-component>
```

When the component is rendered, we get this:

```handlebars
<span>foo bar baz</span>
```

Block content can be dynamic, so if for whatever reason your block content is bound to another component, the content will behave as expected.



### Routes

The `@customElement` decorator can define a custom element that renders an active route, much like the `{{outlet}}` helper does.  In fact, this is achieved by creating an outlet view that renders the main outlet for the route.

Just like with components, you can use it directly on your route class:

```javascript
/* app/routes/posts.js */

import Route from '@ember/routing/route';
import { customElement } from 'ember-custom-elements';

@customElement('test-route')
export default class PostsRoute extends Route {
  model() {
    ...
  }
}
```

In this case, the `<test-route>` element will render your route when it has been entered in your application.




#### Named Outlets

If your route renders to [named outlets](https://api.emberjs.com/ember/release/classes/Route/methods/renderTemplate?anchor=renderTemplate), you can define custom elements for each outlet with the `outletName` option:

```javascript
/* app/routes/posts.js */

import Route from '@ember/routing/route';
import { customElement } from 'ember-custom-elements';

@customElement('test-route')
@customElement('test-route-sidebar', { outletName: 'sidebar' })
export default class PostsRoute extends Route {
  model() {
    ...
  }

  renderTemplate() {
    this.render();
    this.render('posts/sidebar', {
      outlet: 'sidebar'
    });
  }
}
```

In this example, the `<test-route-sidebar>` element exhibits the same behavior as `{{outlet "sidebar"}}` would inside the parent route of the `posts` route.  Notice that the `outletName` option reflects the name of the outlet specified in the call to the `render()` method.




#### Outlet Element

This add-on comes with a primitive custom element called `<ember-outlet>` which can allow you to dynamically render outlets, but with a few differences from the `{{outlet}}` helper due to technical limitations from rendering outside of a route hierarchy.




##### Usage

The outlet element will not be defined by default.  You must do this yourself somewhere in your code.  Here is an example of an instance-initializer you can add to your application that will set up the outlet element:

```javascript
import { setOwner } from '@ember/application';
import { EmberOutletElement } from 'ember-custom-elements';

const TAG_NAME = 'my-outlet-element';

export function initialize(instance) {
  if (window.customElements.get(TAG_NAME)) {
    return;
  }
  class OutletElement extends EmberOutletElement {
    initialize() {
      setOwner(this, instance);
    }
  }
  window.customElements.define(TAG_NAME, OutletElement);
}

export default {
  initialize
};
```

This will allow you to render an outlet like this:

```handlebars
<ember-outlet></ember-outlet>
```

By default, the `<ember-outlet>` will render the main outlet for the `application` route.  This can be useful for rendering an already initialized Ember app within other contexts.

To render another route, you must specify it using the `route=` attribute:

```handlebars
<ember-outlet route="posts.index"></ember-outlet>
```

If your route specifies named routes, you can also specify route names:

```handlebars
<ember-outlet route="posts.index" name="sidebar"></ember-outlet>
<ember-outlet route="posts.index" name="content"></ember-outlet>
```

Since an `<ember-outlet>` can be used outside of an Ember route, the route attribute is required except if you want to render the application route.  You cannot just provide the `name=` attribute and expect it to work.

In the unusual circumstance where you would be loading two or more Ember apps that use the `ember-outlet` element on the same page, you can extend your own custom element off the `ember-outlet` in order to resolve the naming conflict between the two apps.



### Applications

You can use the same `@customElement` decorator on your Ember application.  This will allow an entire Ember app to be instantiated and rendered within a custom element as soon as that element is connected to a DOM.

Presumably, you will only want your Ember app to be instantiated by your custom element, so you should define `autoboot = false;` in when defining your app class, like so:

```javascript
/* app/app.js */

import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';
import { customElement } from 'ember-custom-elements';

@customElement('ember-app')
export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
  autoboot = false;
}

loadInitializers(App, config.modulePrefix);
```

Once your app has been created, every creation of a custom element for it will only create new application instances, meaning that your instance-initializers will run again but your initializers won't perform again.  Custom elements for your app are tied directly to your existing app.



### Options

At present, there are a few options you can pass when creating custom elements:

- **extends**: A string representing the name of a native element your custom element should extend from.  This is the same thing as the `extends` option passed to [window.customElements.define()](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#High-level_view).
- **useShadowRoot**: By default, application content rendered in your custom elements will be placed directly into the main DOM.  If you set this option to `true`, a shadow root will be used.
- **observedAttributes**: A whitelist of which element attributes to observe.  This sets the native `observedAttributes` static property on [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).  It's suggested that you only use this option if you know what you are doing, as once the `observedAttributes` are set on a defined custom element, it cannot be changed after the fact(remember that custom elements can be only defined once).  The most common reason to define `observedAttributes` would be for performance reasons, as making calls to JavaScript every time any attribute changes is more expensive than if only some attribute changes should call JavaScript.  All that said, you probably don't need this, as ember-custom-elements observes all attribute changes by default.  Does nothing for custom elements that instantiate Ember apps.
- **customElementClass**: In the extreme edge case that you need to redefine the behavior of the custom element class itself, you can `import { EmberCustomElement } from 'ember-custom-elements';`, extend it into a subclass, and pass that subclass to the `customElementClass` option.  This is definitely an expert tool and, even if you think you need this, you probably don't need it.  This is made available only for the desperate.  The `EmberCustomElement` class should be considered a private entity.
- **camelizeArgs**: Element attributes must be kabob-case, but if `camelizeArgs` is set to true, these attributes will be exposed to your components in camelCase.
- **outletName**: (routes only) The name of an outlet you wish to render for a route.  Defaults to 'main'.  The section on [named outlets][#named-outlets] goes into further detail.
- **preserveOutletContent**: (routes only) When set to `true`, this prevents the DOM content inside the element from being cleared when transition away from the route is performed.  This is `false` by default, but you may want to set this to `true` in the case where you need to keep the DOM content around for animation purposes.




#### Options Example

```javascript
@customElement('my-component', { extends: 'p', useShadowRoot: true })
export default MyComponent extends Component {

}
```




#### Global Default Options

In the case where you want to apply an option to all uses of the `customElement` decorator, you can set the option as a global default in the `config/environment.js` of your Ember project.

For example, if you want `preserveOutletContent` to be applied to all route elements, you can add this option to `ENV.emberCustomElements.defaultOptions`:

```javascript
module.exports = function(environment) {
  ...
  emberCustomElements: {
    defaultOptions: {
      preserveOutletContent: true
    }
  },
  ...
}
```



### Accessing a Custom Element

The custom element node that's invoking a component can be accessed using the `getCustomElement` function.

Simply pass the context of a component; if the component was invoked with a custom element, the node will be returned:

```javascript
import Component from '@glimmer/component';
import { customElement, getCustomElement } from 'ember-custom-elements';

@customElement('foo-bar')
export default class FooBar extends Component {
  constructor() {
    super(...arguments);
    const element = getCustomElement(this);
    // Do something with your element
    this.foo = element.getAttribute('foo');
  }
}
```

### Forwarding Component Properties

HTML attributes can only be strings which, while they work well enough for many purposes, can be limiting.

If you need to share state between your component and the outside world, you can create an interface to your custom element using the `forwarded` decorator.  Properties and methods upon which the decorator is used will become accessible on the custom element node.  If an outside force sets one of these properties on a custom element, the value will be set on the component.  Likewise, a forwarded method that's called on a custom element will be called with the context of the component.

```javascript
import Component from '@glimmer/component';
import { customElement, forwarded } from 'ember-custom-elements';

@customElement('foo-bar')
export default class FooBar extends Component {
  @forwarded
  bar = 'foobar';

  @forwarded
  fooBar() {
    return this.bar.toUpperCase();
  }
}
```

When rendered, you can do this:

```javascript
const element = document.querySelector('foo-bar');
element.bar; // 'foobar'
element.fooBar(); // 'FOOBAR"
```

If you are using `tracked` from `@glimmer/tracking`, you can use it in tandem with the `forwarded` decorator on properties.


## Notes



### Elements

Once a custom element is defined using `window.customElements.define`, it cannot be redefined.

This add-on works around that issue by reusing the same custom element class and changing the configuration associated with it.  It's necessary in order for application and integration tests to work without encountering errors.  This behavior will only be applied to custom elements defined using this add-on.  If you try to define an application component on a custom element defined outside of this add-on, an error will be thrown.



### Runloop

Because element attributes must be observed, the argument updates to your components occur asynchronously.  Thus, if you are changing your custom element attributes dynamically, your tests will need to use `await settled()`.


## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).

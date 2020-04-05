import { createTemplateFactory } from '@ember/template-factory';
const BASE_TEMPLATE = '~~BASE~TEMPLATE~~';
const BREAK = Symbol('break');

/**
 * Because the `ember-template-compiler.js` file is so large,
 * this module is a sort of hack to extract only the part of
 * the template compilation process that we need to consistently
 * render components in arbitrary locations, while supporting
 * all the expected behavior of the component lifecycle, which
 * is hard to achieve when instantiating a component class
 * outside of Ember's rendering system.
 *
 * There is a Broccoli plugin in this add-on that replaces the
 * `BASE_TEMPLATE` sigil above with a precompiled "base" template
 * for a component.  This gives us a template structure we can
 * build a component template off of.  The reason we need to do
 * this is that the template structure changes for different
 * versions of Ember, as well as the opcodes, so this allows us
 * to build templates for the version of Ember being used, whilst
 * not having to include hundreds of kilobytes from
 * `ember-template-compiler.js` on the frontend.
 */

/**
 * Given a component name and a list of element attributes,
 * compiles a template that renders a component with those
 * element attributes mapped to arguments.
 *
 * This will only work for component instantiation.  It's not
 * designed to compile any other kind of template.
 *
 * @param {String} componentName - This should be kabob-case.
 * @param {Array<String>} attributeNames - A list of element attribute names.
 */
export function compileTemplate(componentName, attributeNames=[]) {
  const template = JSON.parse(JSON.stringify(BASE_TEMPLATE));
  const block = JSON.parse(template.block);
  const statement = block.statements[0];
  // Replace the placeholder component name with the actual one.
  crawl(statement, ({ object }) => {
    if (object === 'component-name') return componentName;
  });
  let argumentNames;
  let argumentIdentifiers;
  // Identify the argument names array
  crawl(statement, ({ object, next }) => {
    if (!object || object[0] !== '@attributeName') return;
    object.pop();
    argumentNames = object;
    argumentIdentifiers = next;
    return BREAK;
  });
  // Now that we have the argument names array,
  // erase the placeholder within in
  argumentNames.length = 0;
  const baseValue = argumentIdentifiers[0];
  argumentIdentifiers.length = 0;
  // https://github.com/glimmerjs/glimmer-vm/blob/319f3e391c547544129e4dab0746b059b665880e/packages/%40glimmer/compiler/lib/allocate-symbols.ts#L113
  for (const name of attributeNames) {
    argumentNames.push(`@${name}`);
    // https://github.com/glimmerjs/glimmer-vm/blob/319f3e391c547544129e4dab0746b059b665880e/packages/%40glimmer/compiler/lib/allocate-symbols.ts#L130
    const value = JSON.parse(JSON.stringify(baseValue));
    crawl(value, ({ object }) => {
      if (object === 'valueName') return `attrs.${name}`;
    });
    argumentIdentifiers.push(value);
  }
  template.id = componentName;
  template.block = JSON.stringify(block);
  return createTemplateFactory(template);
}

/**
 * Given an object and a callback, will crawl the object
 * until the callback returns a truthy value, in which case
 * the current value being crawled will be replaced by
 * the return value of the callback.  If `BREAK` is returned
 * by the callback, the crawl will be cancelled.
 *
 * @param {Object|Array|Function} obj
 * @param {Function} callback
 */
function crawl(obj, callback) {
  const ctx = {
    parent: null,
    previous: null,
    next: null,
    index: null,
    object: obj
  };
  const _crawl = (ctx) => {
    const callbackResult = callback({ ...ctx });
    if (typeof callbackResult !== 'undefined') return callbackResult;
    const obj = ctx.object;
    if (typeof obj !== 'object') return null;
    for (const i in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (!obj.hasOwnProperty(i)) continue;
      const crawlResult = _crawl({
        parent: obj,
        object: obj[i],
        next: Array.isArray(obj) ? obj[parseInt(i) + 1] : null,
        previous: Array.isArray(obj) ? obj[parseInt(i) - 1] : null,
        index: i
      });
      if (crawlResult === BREAK) break;
      if (crawlResult) obj[i] = crawlResult;
    }
    return null;
  }
  return _crawl(ctx);
}
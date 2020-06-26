const { hasPlugin, addPlugin } = require('ember-cli-babel-plugin-helpers');
const plugin = require.resolve('./lib/babel-plugin-ember-custom-elements');
// eslint-disable-next-line node/no-unpublished-require
const { precompile } = require('ember-source/dist/ember-template-compiler');
const replace = require('broccoli-string-replace');

'use strict';

const BASE_TEMPLATE_STRING = '<ComponentName @attributeName={{this.valueName}}>{{this.blockContent}}</ComponentName>';

module.exports = {
  name: require('./package').name,
  included(parent) {
    // eslint-disable-next-line prefer-rest-params
    this._super.included.apply(this, arguments);

    const target = parent;

    if (!hasPlugin(target, plugin)) {
      addPlugin(target, plugin);
    }

    for (const addon of this.addons) {
      if (hasPlugin(addon, plugin)) continue;
      addPlugin(addon, plugin);
    }
  },
  treeForAddon(tree) {
    let outputTree = replace(tree, {
      files: ['lib/template-compiler.js'],
      pattern: {
        match: /'~~BASE~TEMPLATE~~'/,
        replacement: precompile(BASE_TEMPLATE_STRING)
      }
    });
    return this._super(outputTree);
  }
};

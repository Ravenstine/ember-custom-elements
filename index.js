// eslint-disable-next-line node/no-unpublished-require
const { precompile } = require('ember-source/dist/ember-template-compiler');
const replace = require('broccoli-string-replace');

'use strict';

const BASE_TEMPLATE_STRING = '<ComponentName @argName={{this._attrs.valueName}}>{{this.blockContent}}</ComponentName>';

module.exports = {
  name: require('./package').name,
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

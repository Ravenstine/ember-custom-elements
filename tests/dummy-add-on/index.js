/* eslint-disable node/no-extraneous-require */
'use strict';

const funnel = require('broccoli-funnel');

module.exports = {
  name: require('./package').name,
  isDevelopingAddon() {
    return true;
  },
  treeForAddon() {
    const tree = this._super(...arguments);
    if (!this.parent || !this.parent.app) {
      return tree;
    } else {
      return funnel(tree, {
        exclude: [/.*/]
      });
    }
  }
};

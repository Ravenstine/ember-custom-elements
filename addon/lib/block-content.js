import Ember from 'ember';
import { scheduleOnce } from '@ember/runloop';

/**
 * Tracks changes to block content after it's been captured
 * and passed to the template.  The purpose of this is to
 * cache the block content after each render, detect whether
 * the block content has been removed from the rendered template,
 * in which case the cached content will be placed into a
 * DocumentFragment so that dynamic content from components
 * in that context will continue to work and render properly.
 * If the component rendered in the element template tries to
 * render the block content again, it will use the DocumentFragment
 * and the process will repeat.
 *
 * TL;DR this allows us to safely invoke Ember components
 * from within the block of a custom element.
 *
 * @class BlockContent
 * @private
 */
export default class BlockContent {
  static from(nodes) {
    return new this(nodes);
  }

  constructor(nodes) {
    this.captureAfterRender = this.captureAfterRender.bind(this);
    this._isTracking = true;
    this.startBoundary = document.createComment(' ');
    this.endBoundary = document.createComment(' ');
    const childNodes = Array.from(nodes);
    const fragment = new DocumentFragment();
    fragment.append(this.startBoundary);
    const blockContent = childNodes.reduce((fragment, node) => {
      fragment.append(node);
      return fragment;
    }, fragment);
    blockContent.append(this.endBoundary);
    this.populateCache();
  }

  populateCache() {
    const nodes = [];
    let current = this.startBoundary.nextSibling;
    while (current !== this.endBoundary) {
      if (current === this.endBoundary) break;
      nodes.push(current);
      current = current.nextSibling;
    }
    this._blockContentCache = nodes;
  }

  toFragment() {
    const fragment = new DocumentFragment();
    fragment.append(this.startBoundary);
    const blockContent = this._blockContentCache.reduce((fragment, node) => {
      fragment.append(node);
      return fragment;
    }, fragment);
    blockContent.append(this.endBoundary);
    return fragment;
  }

  track() {
    // Capture initially on this tick
    this.captureAfterRender();
    // eslint-disable-next-line ember/new-module-imports
    Ember.run.backburner.on('begin', this.captureAfterRender);
  }

  captureAfterRender() {
    scheduleOnce('actions', this, this.capture);
  }

  capture() {
    if (!this._isTracking) return;
    if (this.startBoundary.isConnected) {
      this.populateCache();
    } else {
      const fragment = this.toFragment();
      this.onTracked(fragment);
    }
  }

  /**
   * @method onTracked
   * @returns {DocumentFragment|Null}
   */
  onTracked() {
    // override this
    return null;
  }

  destroy() {
    this._isTracking = false;
    // eslint-disable-next-line ember/new-module-imports
    Ember.run.backburner.off('begin', this.captureAfterRender);
  }
}
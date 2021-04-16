import { scheduleOnce } from '@ember/runloop';
import { backburner } from './ember-compat';

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
  constructor() {
    this.startBoundary = document.createComment(' start ');
    this.endBoundary = document.createComment(' end ');
    this.fragment = document.createDocumentFragment();
    this.fragment.append(this.startBoundary);
    this.fragment.append(this.endBoundary);
    const cache = [];
    backburner.on('begin', () => {
      // eslint-disable-next-line ember/no-incorrect-calls-with-inline-anonymous-functions
      scheduleOnce('actions', this, () => {
        if (this.startBoundary.isConnected) {
          cache.length = 0;
          let currentNode = this.startBoundary;
          while (currentNode) {
            if (!currentNode) return;
            cache.push(currentNode);
            if (currentNode === this.endBoundary) break;
            currentNode = currentNode.nextSibling;
          }
        } else {
          // eslint-disable-next-line ember/no-incorrect-calls-with-inline-anonymous-functions
          scheduleOnce('afterRender', this, () => {
            for (const node of cache) {
              this.fragment.append(node);
            }
            cache.length = 0;
          });
        }
      });
    });
  }

  from(nodes) {
    for (const node of Array.from(nodes)) this.append(node);
  }

  insertBefore(child) {
    this.endBoundary.parentNode.insertBefore(child, this.endBoundary);
  }

  removeChild(child) {
    let currentNode = this.startBoundary;
    while (currentNode) {
      if (!currentNode || currentNode === this.endBoundary) return;
      if (
        currentNode !== this.startBoundary &&
        currentNode !== this.endBoundary &&
        currentNode === child
      ) {
        child.remove();
        return
      }
      currentNode = currentNode.nextSibling;
    }
  }

  append(node) {
    this.insertBefore(node);
  }

  appendTo(node) {
    node.append(this.fragment);
  }
}

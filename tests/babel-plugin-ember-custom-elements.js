/* global module */

const SIGIL = '~~EMBER~CUSTOM~ELEMENT~~';

/**
 * A Babel transform that adds a "sigil" to components that use the
 * `customElements` decorator from ember-custom-elements.  We do this
 * so that we only evaluate modules that are needed to define custom
 * elements before an application instance finished booting. In
 * other words, this is what allows us to define custom elements in
 * our component code without having to do so manually in an
 * initializer.
 */
module.exports = function ({ types: t }) {
	return {
    name: 'babel-plugin-ember-custom-elements',
		visitor: {
      Program(path) {
        let isEmberCustomElement = false;
        path.traverse({
          ImportDeclaration({ node: importDeclaration }) {
            // If `ember-custom-elements` isn't imported, we don't need to
            // keep traversing the module.
            if (!importDeclaration.source.value.match('ember-custom-elements')) return;
            // Keep track of the name of the import so we can detect if
            // it is actually used somewhere in the code.
            const { specifiers: [{ local: { name: importName } }]} = importDeclaration;
            path.traverse({
              ClassDeclaration({ node: classDeclaration }) {
                const decorators = classDeclaration.decorators || [];
                for (const { expression: { callee: { name: decoratorName } } } of decorators) {
                  if (decoratorName !== importName) continue;
                  // The decorator was used on a class
                  isEmberCustomElement = true;
                  return;
                }
              }
            });
          }
        });
        if (!isEmberCustomElement) return;
        // Looks like our decorator was used, so insert the sigil into the code.
        path.unshiftContainer('body', t.expressionStatement(t.stringLiteral(SIGIL)));
      }
    }
  };
}
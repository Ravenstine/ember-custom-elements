import { setComponentTemplate as _setComponentTemplate } from 'ember-custom-elements/lib/ember-compat';

export async function setComponentTemplate(template, component, owner, registrationName) {
  if (_setComponentTemplate) {
    return _setComponentTemplate(component, template);
  }
  component.prototype.layout = template;
  try {
    owner.unregister(`template:components/${registrationName}`)
  } catch(err) {
    // noop
  }
  owner.register(`template:components/${registrationName}`, template);
}

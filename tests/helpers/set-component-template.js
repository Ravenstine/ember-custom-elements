/* eslint-disable ember/new-module-imports */
import Ember from 'ember';

export async function setComponentTemplate(template, component, owner, registrationName) {
  if (Ember._setComponentTemplate) {
    return Ember._setComponentTemplate(component, template);
  }
  component.prototype.layout = template;
  try {
    owner.unregister(`template:components/${registrationName}`)
  } catch(err) {
    // noop
  }
  owner.register(`template:components/${registrationName}`, template);
}
import { TGasPropertiesSchema, TGasPropertiesSchemaKeys } from '../consts/configs';

// GENERAL =====================================================================

export function checkIfisGASEnvironment() {
  return typeof Calendar !== 'undefined';
}

// PROPERTIES ==================================================================

export function listAllGASProperties(): TGasPropertiesSchemaKeys[] {
  const allProperties = PropertiesService.getScriptProperties().getProperties() as unknown as TGasPropertiesSchemaKeys[];
  return allProperties;
}

export function deleteGASProperty(property: TGasPropertiesSchemaKeys) {
  PropertiesService.getScriptProperties().deleteProperty(property);
}

export function getGASProperty<TProperty extends TGasPropertiesSchemaKeys>(property: TProperty): TGasPropertiesSchema[TProperty] {
  const value = PropertiesService.getScriptProperties().getProperty(property);
  let parsedValue;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }

  return parsedValue;
}

export function updateGASProperty<TProperty extends TGasPropertiesSchemaKeys>(property: TProperty, value: TGasPropertiesSchema[TProperty]) {
  const parsedValue = typeof value === 'string' ? value : JSON.stringify(value);
  PropertiesService.getScriptProperties().setProperty(property, parsedValue);
}

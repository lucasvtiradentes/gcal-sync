import { TGasPropertiesSchema, TGasPropertiesSchemaKeys } from '../consts/configs';
export declare function checkIfisGASEnvironment(): boolean;
export declare function listAllGASProperties(): TGasPropertiesSchemaKeys[];
export declare function deleteGASProperty(property: TGasPropertiesSchemaKeys): void;
export declare function getGASProperty<TProperty extends TGasPropertiesSchemaKeys>(property: TProperty): TGasPropertiesSchema[TProperty];
export declare function updateGASProperty<TProperty extends TGasPropertiesSchemaKeys>(property: TProperty, value: TGasPropertiesSchema[TProperty]): void;

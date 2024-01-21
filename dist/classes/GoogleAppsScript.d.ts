/// <reference types="google-apps-script" />
import { TGasPropertiesSchema, TGasPropertiesSchemaKeys } from '../consts/configs';
export declare function isRunningOnGAS(): boolean;
export declare function listAllGASProperties(): TGasPropertiesSchemaKeys[];
export declare function getGASProperty<TProperty extends TGasPropertiesSchemaKeys>(property: TProperty): TGasPropertiesSchema[TProperty]['initialValue'];
export declare function updateGASProperty<TProperty extends TGasPropertiesSchemaKeys>(property: TProperty, value: TGasPropertiesSchema[TProperty]['initialValue']): void;
export declare function deleteGASProperty(property: TGasPropertiesSchemaKeys): void;
export declare function getAppsScriptsTriggers(): GoogleAppsScript.Script.Trigger[];
export declare function addAppsScriptsTrigger(functionName: string, minutesLoop: number): void;
export declare function removeAppsScriptsTrigger(functionName: string): void;

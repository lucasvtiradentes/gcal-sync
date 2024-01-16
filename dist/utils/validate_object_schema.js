import { logger } from './logger';
import { isObject } from './object_utils';
function validateNestedObject(obj, requiredConfigs) {
    if (!isObject(obj)) {
        return false;
    }
    for (const key in requiredConfigs) {
        if (!(key in obj)) {
            logger.error(`Missing key: ${key}`);
            return false;
        }
        const requiredType = typeof requiredConfigs[key];
        const objType = typeof obj[key];
        if (isObject(requiredConfigs[key])) {
            if (!isObject(obj[key]) || !validateNestedObject(obj[key], requiredConfigs[key])) {
                logger.error(`Invalid nested structure or type mismatch at key: ${key}`);
                return false;
            }
        }
        else if (requiredType !== objType) {
            logger.error(`Type mismatch at key: ${key}. Expected ${requiredType}, found ${objType}`);
            return false;
        }
    }
    return true;
}
export function validateObjectSchema(configToValidate, requiredConfigs) {
    return validateNestedObject(configToValidate, requiredConfigs);
}

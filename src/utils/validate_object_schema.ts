import { logger } from './abstractions/logger';
import { isObject } from './javascript/object_utils';

function validateNestedObject(obj: unknown, requiredConfigs: Record<string, unknown>): boolean {
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
      if (!isObject(obj[key]) || !validateNestedObject(obj[key], requiredConfigs[key] as Record<string, unknown>)) {
        logger.error(`Invalid nested structure or type mismatch at key: ${key}`);
        return false;
      }
    } else if (requiredType !== objType) {
      logger.error(`Type mismatch at key: ${key}. Expected ${requiredType}, found ${objType}`);
      return false;
    }
  }

  return true;
}

export function validateObjectSchema<TRequiredShape extends Record<string, unknown>>(configToValidate: unknown, requiredConfigs: TRequiredShape): configToValidate is TRequiredShape {
  return validateNestedObject(configToValidate, requiredConfigs);
}

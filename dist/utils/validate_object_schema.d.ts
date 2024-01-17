export declare function validateObjectSchema<TRequiredShape extends Record<string, unknown>>(configToValidate: unknown, requiredConfigs: TRequiredShape): configToValidate is TRequiredShape;

export type TConvertArrayToObject<TArray extends ReadonlyArray<Record<TKey | TValue, any>>, TKey extends keyof TArray[number], TValue extends keyof TArray[number]> = {
  [P in TArray[number][TKey]]: Extract<TArray[number], Record<TKey, P>>[TValue];
};

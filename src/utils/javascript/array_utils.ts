export const mergeArraysOfArrays = <T>(arr: T[][]): T[] => arr.reduce((acc, val) => acc.concat(val), []);

export function getUniqueElementsOnArrays(arrayA: string[], arrayB: string[]): string[] {
  const uniqueInA = arrayA.filter((item) => !arrayB.includes(item));
  const uniqueInB = arrayB.filter((item) => !arrayA.includes(item));
  return uniqueInA.concat(uniqueInB);
}

export const asConstArrayToObject = <T extends ReadonlyArray<Record<K | V, any>>, K extends keyof T[number], V extends keyof T[number]>(array: T, keyField: K, valueField: V) => {
  type TPropertiesMapper = {
    [P in T[number][K]]: Extract<T[number], Record<K, P>>[V];
  };

  return array.reduce((acc, item) => {
    const key = item[keyField];
    const value = item[valueField];
    acc[key as keyof TPropertiesMapper] = value as TPropertiesMapper[keyof TPropertiesMapper];
    return acc;
  }, {} as TPropertiesMapper);
};

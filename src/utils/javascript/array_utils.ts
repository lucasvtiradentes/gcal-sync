export const mergeArraysOfArrays = <T>(arr: T[][]): T[] => arr.reduce((acc, val) => acc.concat(val), []);

export function getUniqueElementsOnArrays(arrayA: string[], arrayB: string[]): string[] {
  const uniqueInA = arrayA.filter((item) => !arrayB.includes(item));
  const uniqueInB = arrayB.filter((item) => !arrayA.includes(item));
  return uniqueInA.concat(uniqueInB);
}

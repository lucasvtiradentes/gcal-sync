export const mergeArraysOfArrays = <T>(arr: T[][]): T[] => arr.reduce((acc, val) => acc.concat(val), []);

export function stringToArray(arrStr: string) {
  return arrStr.split('\n').filter((item) => item.length > 0);
}

export const getStrBetween = (str: string, substr1: string, substr2: string) => {
  const newStr = str.slice(str.search(substr1)).replace(substr1, '');
  return newStr.slice(0, newStr.search(substr2));
};

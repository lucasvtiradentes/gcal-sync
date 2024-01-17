export function getDateFixedByTimezone(timeZoneIndex: number) {
  const date = new Date();
  date.setHours(date.getHours() + timeZoneIndex);
  return date;
}

export function getParsedTimeStamp(stamp: string) {
  const splitArr = stamp.split('T');

  const year = splitArr[0].substring(0, 4);
  const month = splitArr[0].substring(4, 6);
  const day = splitArr[0].substring(6, 8);
  const hours = splitArr[1] ? splitArr[1].substring(0, 2) : '00';
  const minutes = splitArr[1] ? splitArr[1].substring(2, 4) : '00';
  const seconds = splitArr[1] ? splitArr[1].substring(4, 6) : '00';

  return { year, month, day, hours, minutes, seconds };
}
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

export function isCurrentTimeAfter(timeToCompare: string, timezone: number) {
  const dateFixedByTimezone = getDateFixedByTimezone(timezone);
  const curStamp = Number(dateFixedByTimezone.getHours()) * 60 + Number(dateFixedByTimezone.getMinutes());

  const timeArr = timeToCompare.split(':');
  const specifiedStamp = Number(timeArr[0]) * 60 + Number(timeArr[1]);

  return curStamp >= specifiedStamp;
}

export function getCurrentDateInSpecifiedTimezone(timeZone: string) {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find((part) => part.type === type).value;

  const isoDate = `${findPart('year')}-${findPart('month')}-${findPart('day')}T${findPart('hour')}:${findPart('minute')}:${findPart('second')}.000`;
  return isoDate;
}

export function getTimezoneOffset(timezone: string) {
  const date = new Date();
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

  const offset = (Number(tzDate) - Number(utcDate)) / (1000 * 60 * 60);
  return offset;
}

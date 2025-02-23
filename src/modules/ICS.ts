import { getParsedTimeStamp } from '../utils/javascript/date_utils';

export type TDate = { date: string } | { dateTime: string; timeZone: string };

export function getParsedIcsDatetimes(dtstart: string, dtend: string, timezone: string, timezone_offset: number) {
  let finalDtstart: TDate | string = dtstart;
  let finalDtend: TDate | string = dtend;

  finalDtstart = finalDtstart.slice(finalDtstart.search(':') + 1);
  finalDtend = finalDtend.slice(finalDtend.search(':') + 1);

  if (finalDtend === '') {
    const startDateObj = getParsedTimeStamp(finalDtstart);
    const nextDate = new Date(Date.UTC(Number(startDateObj.year), Number(startDateObj.month) - 1, Number(startDateObj.day), 0, 0, 0));
    nextDate.setDate(nextDate.getDate() + 1);
    finalDtend = { date: nextDate.toISOString().split('T')[0] };
    finalDtstart = { date: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}` };
  } else {
    const startDateObj = getParsedTimeStamp(finalDtstart);
    const endDateObj = getParsedTimeStamp(finalDtend);

    const getTimeZoneFixedString = (fixer: number) => {
      if (fixer === 0) {
        return '';
      }
      return `${fixer < 0 ? '-' : '+'}${String(Math.abs(fixer)).padStart(2, '0')}:00`;
    };
    const timezoneFixedString = getTimeZoneFixedString(timezone_offset);

    finalDtstart = {
      dateTime: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}T${startDateObj.hours}:${startDateObj.minutes}:${startDateObj.seconds}${timezoneFixedString}`,
      timeZone: timezone
    };
    finalDtend = {
      dateTime: `${endDateObj.year}-${endDateObj.month}-${endDateObj.day}T${endDateObj.hours}:${endDateObj.minutes}:${endDateObj.seconds}${timezoneFixedString}`,
      timeZone: timezone
    };
  }

  return {
    finalDtstart,
    finalDtend
  };
}

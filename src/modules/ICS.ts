import { ERRORS } from '../consts/errors';
import { TIcsCalendar } from '../consts/types';
import { getParsedTimeStamp } from '../utils/javascript/date_utils';
import { getStrBetween } from '../utils/javascript/string_utils';

export type TParsedTicktickTask = {
  id: string;
  name: string;
  description: string;
  tzid: string;
  start: TDate;
  end: TDate;
};

export type TExtendedParsedTicktickTask = TParsedTicktickTask & TIcsCalendar;

export type TDate = { date: string } | { dateTime: string; timeZone: string };

export const getIcsCalendarTasks = (icsLink: string, timezoneCorrection: number) => {
  const parsedLink = icsLink.replace('webcal://', 'https://');
  const urlResponse = UrlFetchApp.fetch(parsedLink, { validateHttpsCertificates: false, muteHttpExceptions: true });
  const data = urlResponse.getContentText() || '';

  if (urlResponse.getResponseCode() !== 200) {
    throw new Error(ERRORS.invalid_ics_calendar_link + parsedLink);
  }

  if (data.search('BEGIN:VCALENDAR') === -1) {
    throw new Error(ERRORS.incorrect_ics_calendar);
  }

  const eventsArr = data.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);

  // prettier-ignore
  const allEventsArr = data.search('SUMMARY:No task.') > 0 ? [] : eventsArr.reduce((acc, cur) => {
    const alarmArr = cur.split('BEGIN:VALARM\r\n');
    const eventObj = {
      CALNAME: getStrBetween(data, 'X-WR-CALNAME:', '\r\n'),
      DSTAMP: getStrBetween(cur, 'DTSTAMP:', '\r\n'),
      DTSTART: getStrBetween(cur, 'DTSTART;', '\r\n'),
      DTEND: getStrBetween(cur, 'DTEND;', '\r\n'),
      SUMMARY: getStrBetween(cur, 'SUMMARY:', '\r\n'),
      UID: getStrBetween(cur, 'UID:', '\r\n'),
      DESCRIPTION: getStrBetween(cur, 'DESCRIPTION:', '\r\n'),
      SEQUENCE: getStrBetween(cur, 'SEQUENCE:', '\r\n'),
      TZID: getStrBetween(cur, 'TZID:', '\r\n'),
      ALARM_TRIGGER: alarmArr.length === 1 ? '' : getStrBetween(alarmArr[1], 'TRIGGER:', '\r\n'),
      ALARM_ACTION: alarmArr.length === 1 ? '' : getStrBetween(alarmArr[1], 'ACTION:', '\r\n'),
      ALARM_DESCRIPTION: alarmArr.length === 1 ? '' : getStrBetween(alarmArr[1], 'DESCRIPTION:', '\r\n')
    };
    return [...acc, eventObj];
  }, []);

  const allEventsParsedArr = allEventsArr.map((item) => {
    const parsedDateTime = getParsedIcsDatetimes(item.DTSTART, item.DTEND, item.TZID, timezoneCorrection);
    return {
      id: item.UID,
      name: item.SUMMARY,
      description: item.DESCRIPTION,
      tzid: item.TZID,
      start: parsedDateTime.finalDtstart,
      end: parsedDateTime.finalDtend
    };
  });

  return allEventsParsedArr as TParsedTicktickTask[];
};

export function getParsedIcsDatetimes(dtstart: string, dtend: string, timezone: string, timezoneCorrection: number) {
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
    const timezoneFixedString = getTimeZoneFixedString(timezoneCorrection);

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

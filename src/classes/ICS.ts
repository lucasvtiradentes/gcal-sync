import { ERRORS } from '../consts/errors';
import { TIcsCalendar } from '../schemas/configs.schema';
import { mergeArraysOfArrays } from '../utils/array_utils';
import { getParsedTimeStamp } from '../utils/date_utils';
import { TGcalPrivateTicktick, TGoogleCalendar, TGoogleEvent, TParsedGoogleEvent, addEventToCalendar } from './GoogleCalendar';

export type TParsedTicktickTask = {
  id: string;
  name: string;
  description: string;
  tzid: string;
  start: TDate;
  end: TDate;
};

export type TExtendedParsedTicktickTask = TParsedTicktickTask & Pick<TIcsCalendar, 'gcal' | 'gcal_done' | 'color' | 'tag' | 'ignoredTags'>;

type TDate = { date: string } | { dateTime: string; timeZone: string };

export const getIcsCalendarTasks = async (icsLink: string, timezoneCorrection: number) => {
  const parsedLink = icsLink.replace('webcal://', 'https://');
  const urlResponse = UrlFetchApp.fetch(parsedLink, { validateHttpsCertificates: false, muteHttpExceptions: true });
  const data = urlResponse.getContentText() || '';

  if (urlResponse.getResponseCode() !== 200) {
    throw new Error(ERRORS.httpsError + parsedLink);
  }

  if (data.search('BEGIN:VCALENDAR') === -1) {
    throw new Error('RESPOSTA INVALIDA PRA UM ICS');
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

const getStrBetween = (str: string, substr1: string, substr2: string) => {
  const newStr = str.slice(str.search(substr1)).replace(substr1, '');
  return newStr.slice(0, newStr.search(substr2));
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

export const getFixedTaskName = (str: string) => {
  let fixedName = str;
  fixedName = fixedName.replace(/\\,/g, ',');
  fixedName = fixedName.replace(/\\;/g, ';');
  fixedName = fixedName.replace(/\\"/g, '"');
  fixedName = fixedName.replace(/\\\\/g, '\\');
  return fixedName;
};

async function convertTicktickTaskToGcal(ticktickTask: TExtendedParsedTicktickTask) {
  const properties: TGcalPrivateTicktick = {
    private: {
      calendar: ticktickTask.gcal,
      completedCalendar: ticktickTask.gcal_done,
      tickTaskId: ticktickTask.id
    }
  };

  const customColor = ticktickTask?.color ? { colorId: ticktickTask.color.toString() } : {};

  const generateGcalDescription = (curIcsTask: TExtendedParsedTicktickTask) => `task: https://ticktick.com/webapp/#q/all/tasks/${curIcsTask.id.split('@')[0]}${curIcsTask.description ? '\n\n' + curIcsTask.description.replace(/\\n/g, '\n') : ''}`;

  const taskEvent: TGoogleEvent = {
    summary: getFixedTaskName(ticktickTask.name),
    description: generateGcalDescription(ticktickTask),
    start: ticktickTask.start,
    end: ticktickTask.end,
    reminders: {
      useDefault: true
    },
    extendedProperties: properties,
    ...customColor
  };

  return taskEvent;
}

export async function addTicktickTaskToGcal(gcal: TGoogleCalendar, ticktickTask: TExtendedParsedTicktickTask) {
  const taskEvent = await convertTicktickTaskToGcal(ticktickTask);

  try {
    return addEventToCalendar(gcal, taskEvent);
  } catch (e: any) {
    if (e.message.search('API call to calendar.events.insert failed with error: Required') > -1) {
      throw new Error(ERRORS.abusiveGoogleCalendarApiUse);
    } else {
      throw new Error(e.message);
    }
  }
}

export async function checkIfTicktickTaskInfoWasChanged(ticktickTask: TExtendedParsedTicktickTask, taskOnGcal: TParsedGoogleEvent) {
  const changedTaskName = getFixedTaskName(ticktickTask.name) !== taskOnGcal.summary;
  const changedDateFormat = Object.keys(ticktickTask.start).length !== Object.keys(taskOnGcal.start).length;
  const changedIntialDate = ticktickTask.start['date'] !== taskOnGcal.start['date'] || ticktickTask.start['dateTime'] !== taskOnGcal.start['dateTime'];
  const changedFinalDate = ticktickTask.end['date'] !== taskOnGcal.end['date'] || ticktickTask.end['dateTime'] !== taskOnGcal.end['dateTime'];

  const changedColor = (() => {
    let tmpResult = false;
    if (ticktickTask?.color === undefined) {
      tmpResult = taskOnGcal.colorId !== undefined;
    } else {
      tmpResult = ticktickTask.color.toString() !== taskOnGcal.colorId;
    }
    return tmpResult;
  })();

  const resultArr = [
    { hasChanged: changedTaskName, field: 'name' },
    { hasChanged: changedDateFormat, field: 'date format' },
    { hasChanged: changedIntialDate, field: 'initial date' },
    { hasChanged: changedFinalDate, field: 'final date' },
    { hasChanged: changedColor, field: 'color' }
  ];

  return resultArr.filter((item) => item.hasChanged).map((item) => item.field);
}

export async function getTicktickTasks(icsCalendarsArr: TIcsCalendar[], timezoneCorrection: number) {
  return mergeArraysOfArrays(
    await Promise.all(
      icsCalendarsArr.map(async (icsCal) => {
        const tasks = await getIcsCalendarTasks(icsCal.link, timezoneCorrection);
        const extendedTasks = tasks.map((item) => ({
          ...item,
          gcal: icsCal.gcal,
          gcal_done: icsCal.gcal_done,
          ...(icsCal.color ? { color: icsCal.color } : {}),
          ...(icsCal.tag ? { tag: icsCal.tag } : {}),
          ...(icsCal.ignoredTags ? { ignoredTags: icsCal.ignoredTags } : {})
        })) as TExtendedParsedTicktickTask[];
        return extendedTasks;
      })
    )
  );
}

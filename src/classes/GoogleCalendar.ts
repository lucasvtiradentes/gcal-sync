import { logger } from '../utils/logger';
import { sleep } from '../utils/sleep';

export const createMissingCalendars = (allGcalendarsNames: string[]) => {
  let createdCalendar = false;

  allGcalendarsNames.forEach((calName: string) => {
    if (!checkIfCalendarExists(calName)) {
      createCalendar(calName);
      logger.info(`created google calendar: [${calName}]`);
      createdCalendar = true;
    }
  });

  if (createdCalendar) {
    sleep(2000);
  }
};

export const getAllCalendars = () => {
  const calendars = Calendar.CalendarList!.list({ showHidden: true }).items ?? [];
  return calendars;
};

export const checkIfCalendarExists = (calendarName: string) => {
  const allCalendars = getAllCalendars();
  const calendar = allCalendars.find((cal) => cal.summary === calendarName);
  return calendar;
};

export const createCalendar = (calName: string) => {
  const calendarObj = Calendar;
  const owenedCalendars = calendarObj.CalendarList!.list({ showHidden: true }).items!.filter((cal) => cal.accessRole === 'owner');
  const doesCalendarExists = owenedCalendars.map((cal) => cal.summary).includes(calName);

  if (doesCalendarExists) {
    throw new Error(`calendar ${calName} already exists!`);
  }

  const tmpCalendar = calendarObj.newCalendar();
  tmpCalendar.summary = calName;
  tmpCalendar.timeZone = calendarObj.Settings!.get('timezone').value;

  const calendar = calendarObj.Calendars!.insert(tmpCalendar);
  return calendar;
};

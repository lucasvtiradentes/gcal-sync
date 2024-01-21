import { TGcalPrivateTicktick, TGoogleCalendar, TGoogleEvent, TParsedGoogleEvent, addEventToCalendar, getCalendarByName, getTasksFromGoogleCalendars, moveEventToOtherCalendar } from '../classes/GoogleCalendar';
import { TExtendedParsedTicktickTask, getIcsCalendarTasks } from '../classes/ICS';
import { ERRORS } from '../consts/errors';
import { TConfigs, TIcsCalendar, ticktickConfigsKey } from '../consts/types';
import { mergeArraysOfArrays } from '../utils/javascript/array_utils';

type TInfo = {
  ticktickTasks: TExtendedParsedTicktickTask[];
  ticktickGcalTasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
};

export type TTicktickSyncResultInfo = {
  added_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
  updated_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
  completed_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
};

export async function syncTicktick(configs: TConfigs) {
  const icsCalendarsConfigs = configs[ticktickConfigsKey].ics_calendars;

  const info: TInfo = {
    ticktickTasks: await getAllTicktickTasks(icsCalendarsConfigs, configs.settings.timezone_correction),
    ticktickGcalTasks: getTasksFromGoogleCalendars([...new Set(icsCalendarsConfigs.map((item) => item.gcal))])
  };

  const resultInfo: TTicktickSyncResultInfo = {
    ...(await addAndUpdateTasksOnGcal(info)),
    ...(await moveCompletedTasksToDoneGcal(info))
  };

  return resultInfo;
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
      throw new Error(ERRORS.abusive_google_calendar_api_use);
    } else {
      throw new Error(e.message);
    }
  }
}

export async function checkIfTicktickTaskInfoWasChanged(ticktickTask: TExtendedParsedTicktickTask, taskOnGcal: TParsedGoogleEvent<TGcalPrivateTicktick>) {
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
          ...icsCal
        })) as TExtendedParsedTicktickTask[];
        return extendedTasks;
      })
    )
  );
}

export async function getAllTicktickTasks(icsCalendars: TIcsCalendar[], timezoneCorrection: number) {
  const taggedTasks = await getTicktickTasks(
    icsCalendars.filter((icsCal) => icsCal.tag),
    timezoneCorrection
  );
  const ignoredTaggedTasks = (
    await getTicktickTasks(
      icsCalendars.filter((icsCal) => icsCal.ignoredTags),
      timezoneCorrection
    )
  ).filter((item) => {
    const ignoredTasks = taggedTasks.map((it) => `${it.tag}${it.id}`);
    const shouldIgnoreTask = item.ignoredTags.some((ignoredTag) => ignoredTasks.includes(`${ignoredTag}${item.id}`));
    return shouldIgnoreTask === false;
  });
  const commonTasks = await getTicktickTasks(
    icsCalendars.filter((icsCal) => !icsCal.tag && !icsCal.ignoredTags),
    timezoneCorrection
  );

  return [...taggedTasks, ...ignoredTaggedTasks, ...commonTasks];
}

export async function addAndUpdateTasksOnGcal({ ticktickGcalTasks, ticktickTasks }: TInfo) {
  const result = {
    added_tasks: [] as TParsedGoogleEvent<TGcalPrivateTicktick>[],
    updated_tasks: [] as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  };

  for (const ticktickTask of ticktickTasks) {
    const taskOnGcal = ticktickGcalTasks.find((item) => item.extendedProperties.private.tickTaskId === ticktickTask.id);
    const correspondingCalendar = getCalendarByName(ticktickTask.gcal);

    if (!taskOnGcal) {
      const addedTask = (await addTicktickTaskToGcal(correspondingCalendar, ticktickTask)) as TParsedGoogleEvent<TGcalPrivateTicktick>;
      result.added_tasks.push(addedTask);
    } else {
      const hasChangedCalendar = correspondingCalendar.summary !== taskOnGcal.extendedProperties.private.calendar;
      const changedTicktickFields = await checkIfTicktickTaskInfoWasChanged(ticktickTask, taskOnGcal);
      const taskDoneCalendar = getCalendarByName(ticktickTask.gcal_done);

      if (hasChangedCalendar) {
        const movedTask = moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, { ...taskOnGcal, colorId: undefined }) as TParsedGoogleEvent<TGcalPrivateTicktick>;
        result.updated_tasks.push(movedTask);
      } else if (changedTicktickFields.length > 0) {
        const movedTask = moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, { ...taskOnGcal, colorId: undefined }) as TParsedGoogleEvent<TGcalPrivateTicktick>;
        result.updated_tasks.push(movedTask);
      }
    }
  }

  return result;
}

export async function moveCompletedTasksToDoneGcal({ ticktickGcalTasks, ticktickTasks }: TInfo) {
  const result = {
    completed_tasks: [] as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  };

  const ticktickTasksOnGcal = ticktickGcalTasks.filter((item) => item.extendedProperties?.private?.tickTaskId);

  for (const gcalTicktickTask of ticktickTasksOnGcal) {
    const isTaskStillOnTicktick = ticktickTasks.map((item) => item.id).includes(gcalTicktickTask.extendedProperties.private.tickTaskId);

    if (!isTaskStillOnTicktick) {
      const taskCalendar = getCalendarByName(gcalTicktickTask.extendedProperties.private.calendar);
      const taskDoneCalendar = getCalendarByName(gcalTicktickTask.extendedProperties.private.completedCalendar);
      const gcalEvent = moveEventToOtherCalendar(taskCalendar, taskDoneCalendar, { ...gcalTicktickTask, colorId: undefined }) as TParsedGoogleEvent<TGcalPrivateTicktick>;
      result.completed_tasks.push(gcalEvent);
    }
  }

  return result;
}

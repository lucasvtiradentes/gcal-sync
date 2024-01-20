import { checkIfisGASEnvironment } from './classes/GAS';
import { getAllGithubCommits } from './classes/Github';
import { TParsedGoogleEvent, createMissingCalendars, getCalendarByName, getTasksFromGoogleCalendars } from './classes/GoogleCalendar';
import { TExtendedParsedTicktickTask, addTicktickTaskToGcal, getFixedTaskName, getIcsCalendarTasks } from './classes/ICS';
import { APP_INFO } from './consts/app_info';
import { TConfigs, TIcsCalendar, githubConfigsKey, ticktickConfigsKey } from './schemas/configs.schema';
import { validateConfigs } from './schemas/validate_configs';
import { mergeArraysOfArrays } from './utils/array_utils';
import { getDateFixedByTimezone } from './utils/date_utils';
import { logger } from './utils/logger';

class GcalSync {
  today_date: string;
  isGASEnvironment: boolean = checkIfisGASEnvironment();

  constructor(private configs: TConfigs) {
    if (!validateConfigs(configs)) {
      throw new Error('schema invalid');
    }

    this.today_date = getDateFixedByTimezone(this.configs.settings.timezone_correction).toISOString().split('T')[0];
    logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
  }

  // ===========================================================================

  async sync() {
    const shouldSyncGithub = this.configs[githubConfigsKey];
    const shouldSyncTicktick = this.configs[ticktickConfigsKey];

    if (!shouldSyncGithub && !shouldSyncTicktick) {
      logger.info('nothing to sync');
      return;
    }

    // prettier-ignore
    const allGoogleCalendars: string[] = [... new Set([]
      .concat(shouldSyncGithub ? [this.configs[githubConfigsKey].commits_configs.commits_calendar, this.configs[githubConfigsKey].issues_configs.issues_calendar] : [])
      .concat(shouldSyncTicktick ? [...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
    ]
    createMissingCalendars(allGoogleCalendars);

    if (shouldSyncTicktick) {
      await this.syncTicktick();
    }

    if (shouldSyncGithub) {
      await this.syncGithub();
    }
  }

  async syncTicktick() {
    const info = {
      ticktickTasks: [] as TExtendedParsedTicktickTask[],
      ticktickGcalTasks: [] as TParsedGoogleEvent[]
    };

    const icsCalendarsConfigs = this.configs[ticktickConfigsKey].ics_calendars;
    info.ticktickGcalTasks = getTasksFromGoogleCalendars([...new Set(icsCalendarsConfigs.map((item) => item.gcal))]);

    const taggedTasks = await this.getTicktickTasks(icsCalendarsConfigs.filter((icsCal) => icsCal.tag));
    const ignoredTaggedTasks = (await this.getTicktickTasks(icsCalendarsConfigs.filter((icsCal) => icsCal.ignoredTags))).filter((item) => {
      const ignoredTasks = taggedTasks.map((it) => `${it.tag}${it.id}`);
      const shouldIgnoreTask = item.ignoredTags.some((ignoredTag) => ignoredTasks.includes(`${ignoredTag}${item.id}`));
      return shouldIgnoreTask === false;
    });
    const commonTasks = await this.getTicktickTasks(icsCalendarsConfigs.filter((icsCal) => !icsCal.tag && !icsCal.ignoredTags));

    info.ticktickTasks = [...taggedTasks, ...ignoredTaggedTasks, ...commonTasks];

    for (const ticktickTask of info.ticktickTasks) {
      const taskOnGcal = info.ticktickGcalTasks.find((item) => item.extendedProperties.private.tickTaskId === ticktickTask.id);
      const correspondingCalendar = getCalendarByName(ticktickTask.gcal);
      let taskAction = '';

      if (!taskOnGcal) {
        await addTicktickTaskToGcal(correspondingCalendar, ticktickTask);
        taskAction = 'added to gcal';
      } else {
        const hasChangedCalendar = correspondingCalendar.summary !== taskOnGcal.extendedProperties.private.calendar;
        const changedTicktickFields = await this.checkIfTicktickTaskInfoWasChanged(ticktickTask, taskOnGcal);

        if (hasChangedCalendar) {
          taskAction = 'moved to another google calendar';
        } else if (changedTicktickFields.length > 0) {
          taskAction = `gcal event was updated due changes on ticktick task: ${changedTicktickFields.join(', ')}`;
        } else {
          taskAction = 'nothing, all synced';
        }
      }

      logger.info(`${ticktickTask.name} - ${taskAction}`);
    }
  }

  async checkIfTicktickTaskInfoWasChanged(ticktickTask: TExtendedParsedTicktickTask, taskOnGcal: TParsedGoogleEvent) {
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

  async getTicktickTasks(icsCalendarsArr: TIcsCalendar[]) {
    return mergeArraysOfArrays(
      await Promise.all(
        icsCalendarsArr.map(async (icsCal) => {
          const tasks = await getIcsCalendarTasks(icsCal.link, this.configs.settings.timezone_correction);
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

  async syncGithub() {
    const info = {
      githubCommits: [],
      githubGcalCommits: []
    };

    if (this.configs[githubConfigsKey].commits_configs) {
      info.githubCommits = await getAllGithubCommits(this.configs[githubConfigsKey].username, this.configs[githubConfigsKey].personal_token);
    }
  }
}

export default GcalSync;

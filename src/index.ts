import { checkIfisGASEnvironment } from './classes/GAS';
import { getAllGithubCommits } from './classes/Github';
import { TGoogleEvent, TParsedGoogleEvent, createMissingCalendars, getCalendarByName, getTasksFromGoogleCalendars, moveEventToOtherCalendar } from './classes/GoogleCalendar';
import { TExtendedParsedTicktickTask, addTicktickTaskToGcal, checkIfTicktickTaskInfoWasChanged, getTicktickTasks } from './classes/ICS';
import { APP_INFO } from './consts/app_info';
import { TConfigs, TIcsCalendar, githubConfigsKey, ticktickConfigsKey } from './schemas/configs.schema';
import { validateConfigs } from './schemas/validate_configs';
import { getDateFixedByTimezone } from './utils/date_utils';
import { logger } from './utils/logger';

type TInfo = {
  ticktickTasks: TExtendedParsedTicktickTask[];
  ticktickGcalTasks: TParsedGoogleEvent[];
};

type TResultInfo = {
  added_tasks: TGoogleEvent[];
  updated_tasks: TGoogleEvent[];
  completed_tasks: TGoogleEvent[];
};

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

  async getAllTicktickTasks(icsCalendars: TIcsCalendar[], timezoneCorrection: number) {
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

  async addAndUpdateTasksOnGcal({ ticktickGcalTasks, ticktickTasks }: TInfo) {
    const result = {
      added_tasks: [] as TGoogleEvent[],
      updated_tasks: [] as TGoogleEvent[]
    };

    for (const ticktickTask of ticktickTasks) {
      const taskOnGcal = ticktickGcalTasks.find((item) => item.extendedProperties.private.tickTaskId === ticktickTask.id);
      const correspondingCalendar = getCalendarByName(ticktickTask.gcal);

      if (!taskOnGcal) {
        result.added_tasks.push(await addTicktickTaskToGcal(correspondingCalendar, ticktickTask));
      } else {
        const hasChangedCalendar = correspondingCalendar.summary !== taskOnGcal.extendedProperties.private.calendar;
        const changedTicktickFields = await checkIfTicktickTaskInfoWasChanged(ticktickTask, taskOnGcal);
        const taskDoneCalendar = getCalendarByName(ticktickTask.gcal_done);

        if (hasChangedCalendar) {
          result.updated_tasks.push(moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, { ...taskOnGcal, colorId: undefined }));
        } else if (changedTicktickFields.length > 0) {
          logger.info(`gcal event was updated due changes on ticktick task: ${changedTicktickFields.join(', ')}`);
          result.updated_tasks.push(moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, { ...taskOnGcal, colorId: undefined }));
        }
      }
    }

    return result;
  }

  async moveCompletedTasksToDoneGcal({ ticktickGcalTasks, ticktickTasks }: TInfo) {
    const result = {
      completed_tasks: [] as TGoogleEvent[]
    };

    const ticktickTasksOnGcal = ticktickGcalTasks.filter((item) => item.extendedProperties?.private?.tickTaskId);

    for (const gcalTicktickTask of ticktickTasksOnGcal) {
      const isTaskStillOnTicktick = ticktickTasks.map((item) => item.id).includes(gcalTicktickTask.extendedProperties.private.tickTaskId);

      if (!isTaskStillOnTicktick) {
        const taskCalendar = getCalendarByName(gcalTicktickTask.extendedProperties.private.calendar);
        const taskDoneCalendar = getCalendarByName(gcalTicktickTask.extendedProperties.private.completedCalendar);
        const gcalEvent = moveEventToOtherCalendar(taskCalendar, taskDoneCalendar, { ...gcalTicktickTask, colorId: undefined });
        result.completed_tasks.push(gcalEvent);
        logger.info(`movendo tarefa para done ${gcalTicktickTask.summary}`);
      }
    }

    return result;
  }

  async syncTicktick() {
    const icsCalendarsConfigs = this.configs[ticktickConfigsKey].ics_calendars;

    const info: TInfo = {
      ticktickTasks: await this.getAllTicktickTasks(icsCalendarsConfigs, this.configs.settings.timezone_correction),
      ticktickGcalTasks: getTasksFromGoogleCalendars([...new Set(icsCalendarsConfigs.map((item) => item.gcal))])
    };

    console.log({ info });

    const resultInfo: TResultInfo = {
      ...(await this.addAndUpdateTasksOnGcal(info)),
      ...(await this.moveCompletedTasksToDoneGcal(info))
    };

    console.log({ resultInfo });
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

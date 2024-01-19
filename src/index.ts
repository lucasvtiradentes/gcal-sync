import { checkIfisGASEnvironment } from './classes/GAS';
import { getAllGithubCommits } from './classes/Github';
import { createMissingCalendars, getTasksFromGoogleCalendars } from './classes/GoogleCalendar';
import { getIcsCalendarTasks } from './classes/ICS';
import { APP_INFO } from './consts/app_info';
import { TConfigs, githubConfigsKey, ticktickConfigsKey } from './schemas/configs.schema';
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

  async sync() {
    const shouldSyncGithub = this.configs[githubConfigsKey];
    const shouldSyncTicktick = this.configs[ticktickConfigsKey];

    if (!shouldSyncGithub && !shouldSyncTicktick) {
      logger.info('nothing to sync');
      return;
    }

    const info = {
      githubCommits: [],

      ticktickTasks: [],
      ticktickGcalTasks: [],

      allIcsLinks: [],
      allGcalTasks: []
    };

    // prettier-ignore
    const allGoogleCalendars: string[] = [... new Set([]
      .concat(shouldSyncGithub ? [this.configs[githubConfigsKey].commits_configs.commits_calendar, this.configs[githubConfigsKey].issues_configs.issues_calendar] : [])
      .concat(shouldSyncTicktick ? [...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.dcal_done)] : []))
    ]
    createMissingCalendars(allGoogleCalendars);

    info.allGcalTasks = getTasksFromGoogleCalendars(allGoogleCalendars);

    if (shouldSyncTicktick) {
      const icsCalendarsConfigs = this.configs[ticktickConfigsKey].ics_calendars;
      info.allIcsLinks = icsCalendarsConfigs.map((item) => item.link);
      info.ticktickGcalTasks = getTasksFromGoogleCalendars([...new Set(icsCalendarsConfigs.map((item) => item.gcal))]);

      info.ticktickTasks = mergeArraysOfArrays(
        await Promise.all(
          info.allIcsLinks.map(async (ics) => {
            const tasks = await getIcsCalendarTasks(ics, this.configs.settings.timezone_correction);
            return tasks;
          })
        )
      );
    }

    if (shouldSyncGithub) {
      info.githubCommits = await getAllGithubCommits(this.configs[githubConfigsKey].username, this.configs[githubConfigsKey].personal_token);
    }

    console.log(info);
  }
}

export default GcalSync;

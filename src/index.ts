import { addAppsScriptsTrigger, deleteGASProperty, getGASProperty, isRunningOnGAS, listAllGASProperties, removeAppsScriptsTrigger, updateGASProperty } from './classes/GoogleAppsScript';
import { createMissingCalendars } from './classes/GoogleCalendar';
import { getUserEmail, sendEmail } from './classes/GoogleEmail';
import { APP_INFO } from './consts/app_info';
import { GAS_PROPERTIES, TGasPropertiesSchemaKeys } from './consts/configs';
import { ERRORS } from './consts/errors';
import { TConfigs, githubConfigsKey, ticktickConfigsKey } from './consts/types';
import { getDailySummaryEmail, getNewReleaseEmail, getSessionEmail } from './methods/generate_emails';
import { TGithubSyncResultInfo, syncGithub } from './methods/sync_github';
import { TTicktickSyncResultInfo, syncTicktick } from './methods/sync_ticktick';
import { validateConfigs } from './methods/validate_configs';
import { logger } from './utils/abstractions/logger';
import { getDateFixedByTimezone, isCurrentTimeAfter } from './utils/javascript/date_utils';

export type TSessionStats = TTicktickSyncResultInfo & Omit<TGithubSyncResultInfo, 'commits_tracked_to_be_added' | 'commits_tracked_to_be_deleted'>;

class GcalSync {
  private today_date: string;

  constructor(private configs: TConfigs) {
    if (!validateConfigs(configs)) {
      throw new Error(ERRORS.invalid_configs);
    }

    if (!isRunningOnGAS()) {
      throw new Error(ERRORS.production_only);
    }

    this.today_date = getDateFixedByTimezone(this.configs.settings.timezone_correction).toISOString().split('T')[0];
    logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
  }

  // ===========================================================================

  async install() {
    removeAppsScriptsTrigger(this.configs.settings.sync_function);
    addAppsScriptsTrigger(this.configs.settings.sync_function, this.configs.settings.update_frequency);

    Object.keys(GAS_PROPERTIES).forEach((key: TGasPropertiesSchemaKeys) => {
      const doesPropertyExist = listAllGASProperties().includes(key);
      if (!doesPropertyExist) {
        updateGASProperty(GAS_PROPERTIES[key].key, '');
      }
    });

    logger.info(`${APP_INFO.name} was set to run function "${this.configs.settings.sync_function}" every ${this.configs.settings.update_frequency} minutes`);
  }

  async uninstall() {
    removeAppsScriptsTrigger(this.configs.settings.sync_function);

    Object.keys(GAS_PROPERTIES).forEach((key: TGasPropertiesSchemaKeys) => {
      deleteGASProperty(GAS_PROPERTIES[key].key);
    });

    logger.info(`${APP_INFO.name} automation was removed from appscript!`);
  }

  // ===========================================================================

  clearTodayEvents() {
    updateGASProperty(GAS_PROPERTIES.today_github_added_commits.key, []);
    updateGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key, []);
    updateGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key, []);
    updateGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key, []);
    updateGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key, []);

    logger.info(`${this.today_date} stats were reseted!`);
  }

  getTodayEvents() {
    const TODAY_SESSION: TSessionStats = {
      added_tasks: getGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key),
      updated_tasks: getGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key),
      completed_tasks: getGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key),
      commits_added: getGASProperty(GAS_PROPERTIES.today_github_added_commits.key),
      commits_deleted: getGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key)
    };
    return TODAY_SESSION;
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
      .concat(shouldSyncGithub ? [this.configs[githubConfigsKey].commits_configs.commits_calendar] : [])
      .concat(shouldSyncTicktick ? [...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
    ]
    createMissingCalendars(allGoogleCalendars);

    const emptySessionData: TSessionStats = {
      added_tasks: [],
      updated_tasks: [],
      completed_tasks: [],

      commits_added: [],
      commits_deleted: []
    };

    const sessionData: TSessionStats = {
      ...emptySessionData,
      ...(shouldSyncTicktick && (await syncTicktick(this.configs))),
      ...(shouldSyncGithub && (await syncGithub(this.configs)))
    };

    this.handleSessionData(sessionData);
  }

  private async handleSessionData(sessionData: TSessionStats) {
    const shouldSyncTicktick = this.configs[ticktickConfigsKey];
    const shouldSyncGithub = this.configs[githubConfigsKey];

    const ticktickNewItems = sessionData.added_tasks.length + sessionData.updated_tasks.length + sessionData.completed_tasks.length;
    if (shouldSyncTicktick && ticktickNewItems > 0) {
      const todayAddedTasks = getGASProperty('today_ticktick_added_tasks');
      const todayUpdatedTasks = getGASProperty('today_ticktick_updated_tasks');
      const todayCompletedTasks = getGASProperty('today_ticktick_completed_tasks');

      updateGASProperty('today_ticktick_added_tasks', [...todayAddedTasks, ...sessionData.added_tasks]);
      updateGASProperty('today_ticktick_updated_tasks', [...todayUpdatedTasks, ...sessionData.updated_tasks]);
      updateGASProperty('today_ticktick_completed_tasks', [...todayCompletedTasks, ...sessionData.completed_tasks]);

      logger.info(`added ${ticktickNewItems} new ticktick items to today's stats`);
    }

    const githubNewItems = sessionData.commits_added.length + sessionData.commits_deleted.length;
    if (shouldSyncGithub && githubNewItems > 0) {
      const todayAddedCommits = getGASProperty('today_github_added_commits');
      const todayDeletedCommits = getGASProperty('today_github_deleted_commits');

      updateGASProperty('today_github_added_commits', [...todayAddedCommits, ...sessionData.commits_added]);
      updateGASProperty('today_github_deleted_commits', [...todayDeletedCommits, ...sessionData.commits_deleted]);

      logger.info(`added ${ticktickNewItems} new github items to today's stats`);
    }

    const totalSessionNewItems = ticktickNewItems + githubNewItems;
    if (this.configs.options.email_session && totalSessionNewItems > 0) {
      const sessionEmail = getSessionEmail(getUserEmail(), sessionData);
      sendEmail(sessionEmail);
    }

    const alreadySentTodayEmails = this.today_date === getGASProperty('last_daily_email_sent_date');

    if (isCurrentTimeAfter(this.configs.options.daily_summary_email_time, this.configs.settings.timezone_correction) && !alreadySentTodayEmails) {
      updateGASProperty('last_daily_email_sent_date', this.today_date);

      if (this.configs.options.email_daily_summary) {
        const dailySummaryEmail = getDailySummaryEmail(getUserEmail(), sessionData, this.today_date);
        sendEmail(dailySummaryEmail);
        this.clearTodayEvents();
      }

      if (this.configs.options.email_new_gcal_sync_release) {
        const parseGcalVersion = (v: string) => {
          return Number(v.replace('v', '').split('.').join(''));
        };

        const getLatestGcalSyncRelease = () => {
          const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${APP_INFO.github_repository}/releases?per_page=1`);
          const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? {};

          if (Object.keys(lastReleaseObj).length === 0) {
            return; // no releases were found
          }

          return lastReleaseObj;
        };

        const latestRelease = getLatestGcalSyncRelease();
        const latestVersion = parseGcalVersion(latestRelease.tag_name);
        const currentVersion = parseGcalVersion(APP_INFO.version);
        const lastAlertedVersion = getGASProperty('last_released_version_alerted') ?? '';

        if (latestVersion > currentVersion && latestVersion.toString() != lastAlertedVersion) {
          const newReleaseEmail = getNewReleaseEmail(getUserEmail(), sessionData);
          sendEmail(newReleaseEmail);
          updateGASProperty('last_released_version_alerted', latestVersion.toString());
        }
      }
    }
  }
}

export default GcalSync;

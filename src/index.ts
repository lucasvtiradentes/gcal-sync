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

  private createMissingGASProperties() {
    const allProperties = listAllGASProperties();
    Object.keys(GAS_PROPERTIES).forEach((key: TGasPropertiesSchemaKeys) => {
      const doesPropertyExist = Object.keys(allProperties).includes(key);
      if (!doesPropertyExist) {
        updateGASProperty(GAS_PROPERTIES[key].key, GAS_PROPERTIES[key].initialValue);
      }
    });
  }

  private createMissingGcalCalendars() {
    const shouldSyncGithub = this.configs[githubConfigsKey];
    const shouldSyncTicktick = this.configs[ticktickConfigsKey];

    // prettier-ignore
    const allGoogleCalendars: string[] = [... new Set([]
      .concat(shouldSyncGithub ? [this.configs[githubConfigsKey].commits_configs.commits_calendar] : [])
      .concat(shouldSyncTicktick ? [...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
    ]

    createMissingCalendars(allGoogleCalendars);
  }

  // ===========================================================================

  async install() {
    removeAppsScriptsTrigger(this.configs.settings.sync_function);
    addAppsScriptsTrigger(this.configs.settings.sync_function, this.configs.settings.update_frequency);
    this.createMissingGASProperties();

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

  private getTodayStats() {
    const todayStats: TSessionStats = {
      added_tasks: getGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key),
      updated_tasks: getGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key),
      completed_tasks: getGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key),
      commits_added: getGASProperty(GAS_PROPERTIES.today_github_added_commits.key),
      commits_deleted: getGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key)
    };
    return todayStats;
  }

  showTodayStats() {
    logger.info(this.getTodayStats());
  }

  clearTodayEvents() {
    updateGASProperty(GAS_PROPERTIES.today_github_added_commits.key, []);
    updateGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key, []);
    updateGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key, []);
    updateGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key, []);
    updateGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key, []);

    logger.info(`${this.today_date} stats were reseted!`);
  }

  // ===========================================================================

  async sync() {
    const shouldSyncGithub = this.configs[githubConfigsKey];
    const shouldSyncTicktick = this.configs[ticktickConfigsKey];

    if (!shouldSyncGithub && !shouldSyncTicktick) {
      logger.info('nothing to sync');
      return;
    }

    this.createMissingGcalCalendars();
    this.createMissingGASProperties();

    const emptySessionData: TSessionStats = {
      added_tasks: [],
      updated_tasks: [],
      completed_tasks: [],

      commits_added: [],
      commits_deleted: []
    };

    const ticktickSync = await syncTicktick(this.configs);
    const githubSync = await syncGithub(this.configs);

    const sessionData: TSessionStats = {
      ...emptySessionData,
      ...(shouldSyncTicktick && ticktickSync),
      ...(shouldSyncGithub && githubSync)
    };

    await this.handleSessionData(sessionData);
  }

  private async handleSessionData(sessionData: TSessionStats) {
    const shouldSyncTicktick = this.configs[ticktickConfigsKey];
    const shouldSyncGithub = this.configs[githubConfigsKey];

    const ticktickNewItems = sessionData.added_tasks.length + sessionData.updated_tasks.length + sessionData.completed_tasks.length;
    if (shouldSyncTicktick && ticktickNewItems > 0) {
      const todayAddedTasks = getGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key);
      const todayUpdatedTasks = getGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key);
      const todayCompletedTasks = getGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key);

      updateGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key, [...todayAddedTasks, ...sessionData.added_tasks]);
      updateGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key, [...todayUpdatedTasks, ...sessionData.updated_tasks]);
      updateGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key, [...todayCompletedTasks, ...sessionData.completed_tasks]);

      logger.info(`added ${ticktickNewItems} new ticktick items to today's stats`);
    }

    const githubNewItems = sessionData.commits_added.length + sessionData.commits_deleted.length;
    if (shouldSyncGithub && githubNewItems > 0) {
      const todayAddedCommits = getGASProperty(GAS_PROPERTIES.today_github_added_commits.key);
      const todayDeletedCommits = getGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key);

      updateGASProperty(GAS_PROPERTIES.today_github_added_commits.key, [...todayAddedCommits, ...sessionData.commits_added]);
      updateGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key, [...todayDeletedCommits, ...sessionData.commits_deleted]);

      logger.info(`added ${githubNewItems} new github items to today's stats`);
    }

    const totalSessionNewItems = ticktickNewItems + githubNewItems;

    // =========================================================================

    const userEmail = getUserEmail();

    if (this.configs.options.email_session && totalSessionNewItems > 0) {
      const sessionEmail = getSessionEmail(userEmail, sessionData);
      sendEmail(sessionEmail);
    }

    const isNowTimeAfterDailyEmails = isCurrentTimeAfter(this.configs.options.daily_summary_email_time, this.configs.settings.timezone_correction);

    const alreadySentTodaySummaryEmail = this.today_date === getGASProperty(GAS_PROPERTIES.last_daily_email_sent_date.key);
    if (isNowTimeAfterDailyEmails && this.configs.options.email_daily_summary && !alreadySentTodaySummaryEmail) {
      updateGASProperty(GAS_PROPERTIES.last_daily_email_sent_date.key, this.today_date);
      const dailySummaryEmail = getDailySummaryEmail(userEmail, this.getTodayStats(), this.today_date);
      sendEmail(dailySummaryEmail);
      this.clearTodayEvents();
    }

    const alreadySentTodayNewReleaseEmail = this.today_date === getGASProperty(GAS_PROPERTIES.last_released_version_sent_date.key);

    const parseGcalVersion = (v: string) => {
      return Number(v.replace('v', '').split('.').join(''));
    };

    const getLatestGcalSyncRelease = () => {
      const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${APP_INFO.github_repository}/releases?per_page=1`);
      const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? { tag_name: APP_INFO.version };
      return lastReleaseObj;
    };

    if (isNowTimeAfterDailyEmails && this.configs.options.email_new_gcal_sync_release && !alreadySentTodayNewReleaseEmail) {
      updateGASProperty(GAS_PROPERTIES.last_released_version_sent_date.key, this.today_date);

      const latestRelease = getLatestGcalSyncRelease();
      const latestVersion = parseGcalVersion(latestRelease.tag_name);
      const currentVersion = parseGcalVersion(APP_INFO.version);
      const lastAlertedVersion = getGASProperty(GAS_PROPERTIES.last_released_version_alerted.key) ?? '';

      if (latestVersion > currentVersion && latestVersion.toString() != lastAlertedVersion) {
        const newReleaseEmail = getNewReleaseEmail(userEmail, latestRelease);
        sendEmail(newReleaseEmail);
        updateGASProperty(GAS_PROPERTIES.last_released_version_alerted.key, latestVersion.toString());
      }
    }

    logger.info({ sessionData });
  }
}

export default GcalSync;

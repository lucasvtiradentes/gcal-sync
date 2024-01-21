import { addAppsScriptsTrigger, deleteGASProperty, getGASProperty, isRunningOnGAS, listAllGASProperties, removeAppsScriptsTrigger, updateGASProperty } from './classes/GoogleAppsScript';
import { createMissingCalendars } from './classes/GoogleCalendar';
import { APP_INFO } from './consts/app_info';
import { GAS_PROPERTIES, TGasPropertiesSchemaKeys } from './consts/configs';
import { TConfigs, TSessionStats, githubConfigsKey, ticktickConfigsKey } from './consts/types';
import { syncGithub } from './methods/sync_github';
import { syncTicktick } from './methods/sync_ticktick';
import { validateConfigs } from './methods/validate_configs';
import { logger } from './utils/abstractions/logger';
import { getDateFixedByTimezone } from './utils/javascript/date_utils';

class GcalSync {
  private today_date: string;
  private is_gas_environment: boolean;

  constructor(private configs: TConfigs) {
    if (!validateConfigs(configs)) {
      throw new Error('schema invalid');
    }

    this.is_gas_environment = isRunningOnGAS();
    this.today_date = getDateFixedByTimezone(this.configs.settings.timezone_correction).toISOString().split('T')[0];
    logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
  }

  // ===========================================================================

  private parseGcalVersion(v: string) {
    return Number(v.replace('v', '').split('.').join(''));
  }

  private getLatestGcalSyncRelease() {
    const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${APP_INFO.github_repository}/releases?per_page=1`);
    const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? {};

    if (Object.keys(lastReleaseObj).length === 0) {
      return; // no releases were found
    }

    return lastReleaseObj;
  }

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
      addedGithubCommits: getGASProperty(GAS_PROPERTIES.today_github_added_commits.key),
      addedTicktickTasks: getGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key),
      completedTicktickTasks: getGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key),
      deletedGithubCommits: getGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key),
      updatedTicktickTasks: getGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key)
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
      .concat(shouldSyncGithub ? [this.configs[githubConfigsKey].commits_configs.commits_calendar, this.configs[githubConfigsKey].issues_configs.issues_calendar] : [])
      .concat(shouldSyncTicktick ? [...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
    ]
    createMissingCalendars(allGoogleCalendars);

    const {
      added_tasks,
      completed_tasks,
      updated_tasks,

      commitsAdded,
      commitsDeleted,
      commitsTrackedToBeAdded,
      commitsTrackedToBeDelete
    } = {
      ...(shouldSyncTicktick && (await syncTicktick(this.configs))),
      ...(shouldSyncGithub && (await syncGithub(this.configs)))
    };

    console.log({
      added_tasks: added_tasks.length,
      completed_tasks: completed_tasks.length,
      updated_tasks: updated_tasks.length,

      commitsAdded: commitsAdded.length,
      commitsDeleted: commitsDeleted.length,
      commitsTrackedToBeAdded: commitsTrackedToBeAdded.length,
      commitsTrackedToBeDelete: commitsTrackedToBeDelete.length
    });
  }
}

export default GcalSync;

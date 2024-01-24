import { APP_INFO } from './consts/app_info';
import { GAS_PROPERTIES_ENUM, GAS_PROPERTIES_INITIAL_VALUE_ENUM, TGasPropertiesSchemaKeys } from './consts/configs';
import { ERRORS } from './consts/errors';
import { TConfigs, TExtendedConfigs, TExtendedSessionStats, TSessionStats, githubConfigsKey, ticktickConfigsKey } from './consts/types';
import { handleSessionData } from './methods/handle_session_data';
import { syncGithub } from './methods/sync_github';
import { syncTicktick } from './methods/sync_ticktick';
import { validateConfigs } from './methods/validate_configs';
import { addAppsScriptsTrigger, deleteGASProperty, isRunningOnGAS, listAllGASProperties, removeAppsScriptsTrigger, updateGASProperty } from './modules/GoogleAppsScript';
import { createMissingCalendars } from './modules/GoogleCalendar';
import { getUserEmail } from './modules/GoogleEmail';
import { logger } from './utils/abstractions/logger';
import { checkIfShouldSync } from './utils/check_if_should_sync';
import { getDateFixedByTimezone } from './utils/javascript/date_utils';

class GcalSync {
  private extended_configs: TExtendedConfigs = {
    today_date: '',
    user_email: '',
    configs: {} as TConfigs
  };

  constructor(configs: TConfigs) {
    if (!validateConfigs(configs)) {
      throw new Error(ERRORS.invalid_configs);
    }

    if (!isRunningOnGAS()) {
      throw new Error(ERRORS.production_only);
    }

    this.extended_configs.user_email = getUserEmail();
    this.extended_configs.today_date = getDateFixedByTimezone(configs.settings.timezone_correction).toISOString().split('T')[0];
    this.extended_configs.configs = configs;
    logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
  }

  // ===========================================================================

  private createMissingGASProperties() {
    const allProperties = listAllGASProperties();
    Object.keys(GAS_PROPERTIES_ENUM).forEach((key: TGasPropertiesSchemaKeys) => {
      const doesPropertyExist = Object.keys(allProperties).includes(key);
      if (!doesPropertyExist) {
        updateGASProperty(GAS_PROPERTIES_ENUM[key], GAS_PROPERTIES_INITIAL_VALUE_ENUM[key]);
      }
    });
  }

  private createMissingGcalCalendars() {
    const { shouldSyncGithub, shouldSyncTicktick } = checkIfShouldSync(this.extended_configs);

    // prettier-ignore
    const allGoogleCalendars: string[] = [... new Set([]
      .concat(shouldSyncGithub ? [this.extended_configs.configs[githubConfigsKey].commits_configs.commits_calendar] : [])
      .concat(shouldSyncTicktick ? [...this.extended_configs.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.extended_configs.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
    ]

    createMissingCalendars(allGoogleCalendars);
  }

  // ===========================================================================

  async install() {
    removeAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function);
    addAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function, this.extended_configs.configs.settings.update_frequency);
    this.createMissingGASProperties();

    logger.info(`${APP_INFO.name} was set to run function "${this.extended_configs.configs.settings.sync_function}" every ${this.extended_configs.configs.settings.update_frequency} minutes`);
  }

  async uninstall() {
    removeAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function);

    Object.keys(GAS_PROPERTIES_ENUM).forEach((key) => {
      deleteGASProperty(GAS_PROPERTIES_ENUM[key]);
    });

    logger.info(`${APP_INFO.name} automation was removed from appscript!`);
  }

  // ===========================================================================

  async sync() {
    const { shouldSyncGithub, shouldSyncTicktick } = checkIfShouldSync(this.extended_configs);

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

    const ticktickSync = await syncTicktick(this.extended_configs.configs);
    const githubSync = await syncGithub(this.extended_configs.configs);

    const sessionData: TExtendedSessionStats = {
      ...emptySessionData,
      ...(shouldSyncTicktick && ticktickSync),
      ...(shouldSyncGithub && githubSync)
    };

    await handleSessionData(this.extended_configs, sessionData);
  }
}

export default GcalSync;

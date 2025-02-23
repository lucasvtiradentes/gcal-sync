import { APP_INFO } from './consts/app_info';
import { GAS_PROPERTIES_ENUM, GAS_PROPERTIES_INITIAL_VALUE_ENUM, TGasPropertiesSchemaKeys } from './consts/configs';
import { ERRORS } from './consts/errors';
import { TConfigs, TExtendedConfigs, TExtendedSessionStats, githubConfigsKey } from './consts/types';
import { getErrorEmail } from './methods/generate_emails';
import { handleSessionData } from './methods/handle_session_data';
import { getFilterGithubRepos, syncGithub } from './methods/sync_github';
import { validateConfigs } from './methods/validate_configs';
import { getAllGithubCommits } from './modules/Github';
import { addAppsScriptsTrigger, deleteGASProperty, isRunningOnGAS, listAllGASProperties, removeAppsScriptsTrigger, updateGASProperty } from './modules/GoogleAppsScript';
import { createMissingCalendars, getCurrentTimezoneFromGoogleCalendar, getTasksFromGoogleCalendars } from './modules/GoogleCalendar';
import { getUserEmail, sendEmail } from './modules/GoogleEmail';
import { logger } from './utils/abstractions/logger';
import { checkIfShouldSync } from './utils/check_if_should_sync';
import { getCurrentDateInSpecifiedTimezone, getTimezoneOffset } from './utils/javascript/date_utils';

class GcalSync {
  private extended_configs: TExtendedConfigs = {
    timezone: '',
    timezone_offset: 0,
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

    const timezone = getCurrentTimezoneFromGoogleCalendar();
    this.extended_configs.timezone = timezone;
    this.extended_configs.timezone_offset = getTimezoneOffset(timezone) + configs.settings.timezone_offset_correction * -1;

    const todayFixedByTimezone = getCurrentDateInSpecifiedTimezone(timezone);
    this.extended_configs.today_date = todayFixedByTimezone.split('T')[0];
    this.extended_configs.user_email = getUserEmail();
    this.extended_configs.configs = configs;

    logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
  }

  // setup methods =============================================================

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
    const { shouldSyncGithub } = checkIfShouldSync(this.extended_configs);

    const allGoogleCalendars: string[] = [...new Set([].concat(shouldSyncGithub ? [this.extended_configs.configs[githubConfigsKey].commits_configs.commits_calendar] : []))];

    createMissingCalendars(allGoogleCalendars);
  }

  // api methods ===============================================================

  handleError(error: unknown) {
    if (this.extended_configs.configs.settings.per_sync_emails.email_errors) {
      const parsedError = typeof error === 'string' ? error : error instanceof Error ? error.message : JSON.stringify(error);
      const errorEmail = getErrorEmail(this.extended_configs.user_email, parsedError);
      sendEmail(errorEmail);
    } else {
      logger.error(error);
    }
  }

  getSessionLogs() {
    return logger.logs;
  }

  getGithubCommits() {
    const githubCommits = getAllGithubCommits(this.extended_configs.configs[githubConfigsKey].username, this.extended_configs.configs[githubConfigsKey].personal_token);
    return getFilterGithubRepos(this.extended_configs.configs, githubCommits);
  }

  // main methods ==============================================================

  install() {
    removeAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function);
    addAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function, this.extended_configs.configs.settings.update_frequency);
    this.createMissingGASProperties();

    logger.info(`${APP_INFO.name} was set to run function "${this.extended_configs.configs.settings.sync_function}" every ${this.extended_configs.configs.settings.update_frequency} minutes`);
  }

  uninstall() {
    removeAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function);

    Object.keys(GAS_PROPERTIES_ENUM).forEach((key) => {
      deleteGASProperty(GAS_PROPERTIES_ENUM[key]);
    });

    logger.info(`${APP_INFO.name} automation was removed from appscript!`);
  }

  sync() {
    if (this.extended_configs.configs.settings.skip_mode) {
      logger.info('skip_mode is set to true, skipping sync');
      return {};
    }

    const { shouldSyncGithub } = checkIfShouldSync(this.extended_configs);

    if (!shouldSyncGithub) {
      logger.info('nothing to sync');
      return {};
    }

    this.createMissingGcalCalendars();
    this.createMissingGASProperties();

    const emptySessionData: TExtendedSessionStats = {
      commits_added: [],
      commits_deleted: [],
      commits_tracked_to_be_added: [],
      commits_tracked_to_be_deleted: []
    };

    const sessionData: TExtendedSessionStats = {
      ...emptySessionData,
      ...(shouldSyncGithub && syncGithub(this.extended_configs.configs))
    };

    const parsedSessionData = handleSessionData(this.extended_configs, sessionData);
    return parsedSessionData;
  }
}

export default GcalSync;

import { checkIfShouldSync } from '../utils/check_if_should_sync';
import { APP_INFO } from '../consts/app_info';
import { GAS_PROPERTIES_ENUM } from '../consts/configs';
import { TExtendedConfigs, TExtendedSessionStats, TSessionStats } from '../consts/types';
import { getGASProperty, updateGASProperty } from '../modules/GoogleAppsScript';
import { sendEmail } from '../modules/GoogleEmail';
import { logger } from '../utils/abstractions/logger';
import { isCurrentTimeAfter } from '../utils/javascript/date_utils';
import { getDailySummaryEmail, getNewReleaseEmail, getSessionEmail } from './generate_emails';

function getTodayStats() {
  const todayStats: TSessionStats = {
    commits_added: getGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits),
    commits_deleted: getGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits)
  };
  return todayStats;
}

function clearTodayEvents() {
  updateGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits, []);
  updateGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits, []);

  logger.info(`today stats were reseted!`);
}

export function handleSessionData(extendedConfigs: TExtendedConfigs, sessionData: TExtendedSessionStats) {
  const { shouldSyncGithub } = checkIfShouldSync(extendedConfigs);

  const githubNewItems = sessionData.commits_added.length + sessionData.commits_deleted.length;
  if (shouldSyncGithub && githubNewItems > 0) {
    const todayAddedCommits = getGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits);
    const todayDeletedCommits = getGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits);

    updateGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits, [...todayAddedCommits, ...sessionData.commits_added]);
    updateGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits, [...todayDeletedCommits, ...sessionData.commits_deleted]);

    logger.info(`added ${githubNewItems} new github items to today's stats`);
  }

  // =========================================================================

  const totalSessionNewItems = githubNewItems;
  sendSessionEmails(extendedConfigs, sessionData, totalSessionNewItems);

  // =========================================================================

  const { commits_added, commits_deleted, commits_tracked_to_be_added, commits_tracked_to_be_deleted } = sessionData;
  return {
    commits_added: commits_added.length,
    commits_deleted: commits_deleted.length,
    commits_tracked_to_be_added: commits_tracked_to_be_added.length,
    commits_tracked_to_be_deleted: commits_tracked_to_be_deleted.length
  };
}

function sendSessionEmails(extendedConfigs: TExtendedConfigs, sessionData: TExtendedSessionStats, totalSessionNewItems: number) {
  const userEmail = extendedConfigs.user_email;

  if (extendedConfigs.configs.settings.per_sync_emails.email_session && totalSessionNewItems > 0) {
    const sessionEmail = getSessionEmail(userEmail, sessionData);
    sendEmail(sessionEmail);
  }

  const isNowTimeAfterDailyEmails = isCurrentTimeAfter(extendedConfigs.configs.settings.per_day_emails.time_to_send, extendedConfigs.timezone_offset);

  const alreadySentTodaySummaryEmail = extendedConfigs.today_date === getGASProperty(GAS_PROPERTIES_ENUM.last_daily_email_sent_date);
  if (isNowTimeAfterDailyEmails && extendedConfigs.configs.settings.per_day_emails.email_daily_summary && !alreadySentTodaySummaryEmail) {
    updateGASProperty(GAS_PROPERTIES_ENUM.last_daily_email_sent_date, extendedConfigs.today_date);
    const dailySummaryEmail = getDailySummaryEmail(userEmail, getTodayStats(), extendedConfigs.today_date);
    sendEmail(dailySummaryEmail);
    clearTodayEvents();
  }

  const alreadySentTodayNewReleaseEmail = extendedConfigs.today_date === getGASProperty(GAS_PROPERTIES_ENUM.last_released_version_sent_date);

  const parseGcalVersion = (v: string) => {
    return Number(v.replace('v', '').split('.').join(''));
  };

  const getLatestGcalSyncRelease = () => {
    const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${APP_INFO.github_repository}/releases?per_page=1`);
    const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? { tag_name: APP_INFO.version };
    return lastReleaseObj;
  };

  if (isNowTimeAfterDailyEmails && extendedConfigs.configs.settings.per_day_emails.email_new_gcal_sync_release && !alreadySentTodayNewReleaseEmail) {
    updateGASProperty(GAS_PROPERTIES_ENUM.last_released_version_sent_date, extendedConfigs.today_date);

    const latestRelease = getLatestGcalSyncRelease();
    const latestVersion = parseGcalVersion(latestRelease.tag_name);
    const currentVersion = parseGcalVersion(APP_INFO.version);
    const lastAlertedVersion = getGASProperty(GAS_PROPERTIES_ENUM.last_released_version_alerted) ?? '';

    if (latestVersion > currentVersion && latestVersion.toString() != lastAlertedVersion) {
      const newReleaseEmail = getNewReleaseEmail(userEmail, latestRelease);
      sendEmail(newReleaseEmail);
      updateGASProperty(GAS_PROPERTIES_ENUM.last_released_version_alerted, latestVersion.toString());
    }
  }
}

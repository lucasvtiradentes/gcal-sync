import { getGASProperty, updateGASProperty } from '../classes/GoogleAppsScript';
import { TEmail, sendEmail } from '../classes/GoogleEmail';
import { APP_INFO } from '../consts/app_info';
import { CONFIGS, GAS_PROPERTIES } from '../consts/configs';
import { TConfigs, TSessionStats } from '../consts/types';
import { isCurrentTimeAfter } from '../utils/javascript/date_utils';
import { stringToArray } from '../utils/javascript/string_utils';

export function getNewReleaseEmail(sendToEmail: string, lastReleaseObj: any) {
  const message = `Hi!
    <br/><br/>
    a new <a href="https://github.com/${APP_INFO.github_repository}">${APP_INFO.name}</a> version is available: <br/>
    <ul>
      <li>new version: ${lastReleaseObj.tag_name}</li>
      <li>published at: ${lastReleaseObj.published_at}</li>
      <li>details: <a href="https://github.com/${APP_INFO.github_repository}/releases">here</a></li>
    </ul>
    to update, replace the old version number in your apps scripts <a href="https://script.google.com/">gcal sync project</a> to the new version: ${lastReleaseObj.tag_name.replace('v', '')}<br/>
    and also check if you need to change the setup code in the <a href='https://github.com/${APP_INFO.github_repository}#installation'>installation section</a>.
    <br /><br />
    Regards,
    your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot
  `;

  const emailObj: TEmail = {
    to: sendToEmail,
    name: `${APP_INFO.name}`,
    subject: `new version [${lastReleaseObj.tag_name}] was released - ${APP_INFO.name}`,
    htmlBody: message
  };

  return emailObj;
}

export function getSessionEmail(sendToEmail: string, sessionStats: TSessionStats) {
  const content = generateReportEmailContent(sessionStats);

  const emailObj: TEmail = {
    to: sendToEmail,
    name: `${APP_INFO.name}`,
    subject: `session report - ${getTotalSessionEvents(sessionStats)} modifications - ${APP_INFO.name}`,
    htmlBody: content
  };

  return emailObj;
}

export function getDailySummaryEmail(sendToEmail: string, todaySession: TSessionStats) {
  const content = generateReportEmailContent(todaySession);

  const emailObj: TEmail = {
    to: sendToEmail,
    name: `${APP_INFO.name}`,
    subject: `daily report for ${this.TODAY_DATE} - ${getTotalSessionEvents(todaySession)} modifications - ${APP_INFO.name}`,
    htmlBody: content
  };

  return emailObj;
}

export function getErrorEmail(sendToEmail: string, errorMessage: string) {
  const content = `Hi!
    <br/><br/>
    an error recently occurred: <br/><br/>
    <b>${errorMessage}</b>
    <br /><br />
    Regards,
    your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot
  `;

  const emailObj: TEmail = {
    to: sendToEmail,
    name: `${APP_INFO.name}`,
    subject: `an error occurred - ${APP_INFO.name}`,
    htmlBody: content
  };

  return emailObj;
}

// =============================================================================

function getTotalSessionEvents(session: TSessionStats) {
  const todayEventsCount = stringToArray(session.addedTicktickTasks).length + stringToArray(session.updatedTicktickTasks).length + stringToArray(session.completedTicktickTasks).length + stringToArray(session.addedGithubCommits).length + stringToArray(session.deletedGithubCommits).length;
  return todayEventsCount;
}

export function generateReportEmailContent(session: TSessionStats) {
  const addedTicktickTasks = stringToArray(session.addedTicktickTasks);
  const updatedTicktickTasks = stringToArray(session.updatedTicktickTasks);
  const completedTicktickTasks = stringToArray(session.completedTicktickTasks);
  const addedGithubCommits = stringToArray(session.addedGithubCommits);
  const removedGithubCommits = stringToArray(session.deletedGithubCommits);

  const todayEventsCount = getTotalSessionEvents(session);

  if (todayEventsCount === 0) {
    return;
  }

  const tableStyle = `style="border: 1px solid #333; width: 90%"`;
  const tableRowStyle = `style="width: 100%"`;
  const tableRowColumnStyle = `style="border: 1px solid #333"`;

  const getTableBodyItemsHtml = (itemsArr: any[]) => {
    if (!itemsArr || itemsArr.length === 0) {
      return ``;
    }

    const arr = itemsArr.map((item) => item.split(CONFIGS.EVENTS_DIVIDER));
    const arrSortedByDate = arr.sort((a, b) => Number(new Date(a[0])) - Number(new Date(b[0])));

    // prettier-ignore
    const tableItems = arrSortedByDate.map((item: any[]) => {
      const [date, category, message, link] = item;
      const itemHtmlRow = [date, category, `<a href="${link}">${message}</a>`].map(it => `<td ${tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n')
      return `<tr ${tableRowStyle}">\n${itemHtmlRow}\n</tr>`
    }).join('\n');

    return `${tableItems}`;
  };

  const ticktickTableHeader = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="80px">date</th><th ${tableRowColumnStyle} width="130px">calendar</th><th ${tableRowColumnStyle} width="auto">task</th>\n</tr>`;
  const githubTableHeader = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="80px">date</th><th ${tableRowColumnStyle} width="130px">repository</th><th ${tableRowColumnStyle} width="auto">commit</th>\n</tr>`;

  let content = '';
  content = `Hi!<br/><br/>there were ${todayEventsCount} changes made to your google calendar:<br/>\n`;

  content += addedTicktickTasks.length > 0 ? `<br/>added ticktick events    : ${addedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(addedTicktickTasks)}\n</table>\n</center>\n` : '';
  content += updatedTicktickTasks.length > 0 ? `<br/>updated ticktick events  : ${updatedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(updatedTicktickTasks)}\n</table>\n</center>\n` : '';
  content += completedTicktickTasks.length > 0 ? `<br/>completed ticktick events: ${completedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(completedTicktickTasks)}\n</table>\n</center>\n` : '';
  content += addedGithubCommits.length > 0 ? `<br/>added commits events     : ${addedGithubCommits.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${githubTableHeader}\n${getTableBodyItemsHtml(addedGithubCommits)}\n</table>\n</center>\n` : '';
  content += removedGithubCommits.length > 0 ? `<br/>removed commits events   : ${removedGithubCommits.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${githubTableHeader}\n${getTableBodyItemsHtml(removedGithubCommits)}\n</table>\n</center>\n` : '';

  content += `<br/>Regards,<br/>your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot`;
  return content;
}

// =============================================================================

export function sendAfterSyncEmails(configs: TConfigs, curSession: TSessionStats) {
  if (configs.options.email_session) {
    const sessionEmail = getSessionEmail('', curSession);
    sendEmail(sessionEmail);
  }

  const alreadySentTodayEmails = this.TODAY_DATE === getGASProperty(GAS_PROPERTIES.lastDailyEmailSentDate.key);

  if (isCurrentTimeAfter(configs.options.daily_summary_email_time, configs.settings.timezone_correction) && !alreadySentTodayEmails) {
    updateGASProperty(GAS_PROPERTIES.lastDailyEmailSentDate.key, this.TODAY_DATE);

    if (configs.options.email_daily_summary) {
      const dailySummaryEmail = getDailySummaryEmail('', this.getTodayEvents());
      sendEmail(dailySummaryEmail);
      this.cleanTodayEventsStats();
    }

    if (configs.options.email_new_gcal_sync_release) {
      const latestRelease = this.getLatestGcalSyncRelease();
      const latestVersion = this.parseGcalVersion(latestRelease.tag_name);
      const currentVersion = this.parseGcalVersion(this.VERSION);
      const lastAlertedVersion = this.getAppsScriptsProperty(GAS_PROPERTIES.lastReleasedVersionAlerted.key) ?? '';

      if (latestVersion > currentVersion && latestVersion.toString() != lastAlertedVersion) {
        this.sendNewReleaseEmail(latestRelease);
        this.updateAppsScriptsProperty(GAS_PROPERTIES.lastReleasedVersionAlerted.key, latestVersion.toString());
      }
    }
  }
}

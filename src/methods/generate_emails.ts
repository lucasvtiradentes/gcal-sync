import { TSessionStats } from '..';
import { TGcalPrivateGithub, TGcalPrivateTicktick, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TEmail } from '../classes/GoogleEmail';
import { TDate } from '../classes/ICS';
import { APP_INFO } from '../consts/app_info';

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

export function getDailySummaryEmail(sendToEmail: string, todaySession: TSessionStats, todayDate: string) {
  const content = generateReportEmailContent(todaySession);

  const emailObj: TEmail = {
    to: sendToEmail,
    name: `${APP_INFO.name}`,
    subject: `daily report for ${todayDate} - ${getTotalSessionEvents(todaySession)} modifications - ${APP_INFO.name}`,
    htmlBody: content
  };

  return emailObj;
}

export function getNewReleaseEmail(sendToEmail: string, lastReleaseObj: { tag_name: string; published_at: string }) {
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

const TABLE_STYLES = {
  tableStyle: `style="border: 1px solid #333; width: 90%"`,
  tableRowStyle: `style="width: 100%"`,
  tableRowColumnStyle: `style="border: 1px solid #333"`
};

export const getParsedDateTime = (str: TDate) => ('date' in str ? str.date : str.dateTime);

function getTotalSessionEvents(session: TSessionStats) {
  const todayEventsCount = session.added_tasks.length + session.updated_tasks.length + session.completed_tasks.length + session.commits_added.length + session.commits_deleted.length;
  return todayEventsCount;
}

function getTicktickEmailContant(session: TSessionStats) {
  const addedTicktickTasks = session.added_tasks;
  const updatedTicktickTasks = session.updated_tasks;
  const completedTicktickTasks = session.completed_tasks;

  const getTicktickBodyItemsHtml = (items: TParsedGoogleEvent<TGcalPrivateTicktick>[]) => {
    if (items.length === 0) return '';

    // prettier-ignore
    const tableItems = items.map((gcalItem) => {
      const parsedDate = getParsedDateTime(gcalItem.start as TDate).split('T')[0]
      const itemHtmlRow = [parsedDate, gcalItem.extendedProperties.private.calendar, `<a href="${gcalItem.htmlLink}">${gcalItem.summary}</a>`].map(it => `<td ${TABLE_STYLES.tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n')
      return `<tr ${TABLE_STYLES.tableRowStyle}">\n${itemHtmlRow}\n</tr>`
    }).join('\n');

    return `${tableItems}`;
  };

  const ticktickTableHeader = `<tr ${TABLE_STYLES.tableRowStyle}">\n<th ${TABLE_STYLES.tableRowColumnStyle} width="80px">date</th><th ${TABLE_STYLES.tableRowColumnStyle} width="130px">calendar</th><th ${TABLE_STYLES.tableRowColumnStyle} width="auto">task</th>\n</tr>`;

  let content = '';
  content += addedTicktickTasks.length > 0 ? `<br/>added ticktick events    : ${addedTicktickTasks.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${ticktickTableHeader}\n${getTicktickBodyItemsHtml(addedTicktickTasks)}\n</table>\n</center>\n` : '';
  content += updatedTicktickTasks.length > 0 ? `<br/>updated ticktick events  : ${updatedTicktickTasks.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${ticktickTableHeader}\n${getTicktickBodyItemsHtml(updatedTicktickTasks)}\n</table>\n</center>\n` : '';
  content += completedTicktickTasks.length > 0 ? `<br/>completed ticktick events: ${completedTicktickTasks.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${ticktickTableHeader}\n${getTicktickBodyItemsHtml(completedTicktickTasks)}\n</table>\n</center>\n` : '';
  return content;
}

function getGithubEmailContant(session: TSessionStats) {
  const addedGithubCommits = session.commits_added;
  const removedGithubCommits = session.commits_deleted;

  const getGithubBodyItemsHtml = (items: TParsedGoogleEvent<TGcalPrivateGithub>[]) => {
    if (items.length === 0) return '';

    // prettier-ignore
    const tableItems = items.map((gcalItem) => {
      const parsedDate = getParsedDateTime(gcalItem.start as TDate).split('T')[0]
      const itemHtmlRow = [parsedDate, gcalItem.extendedProperties.private.repositoryName, `<a href="${gcalItem.htmlLink}">${gcalItem.extendedProperties.private.commitMessage}</a>`].map(it => `<td ${TABLE_STYLES.tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n')
      return `<tr ${TABLE_STYLES.tableRowStyle}">\n${itemHtmlRow}\n</tr>`
    }).join('\n');

    return `${tableItems}`;
  };

  const githubTableHeader = `<tr ${TABLE_STYLES.tableRowStyle}">\n<th ${TABLE_STYLES.tableRowColumnStyle} width="80px">date</th><th ${TABLE_STYLES.tableRowColumnStyle} width="130px">repository</th><th ${TABLE_STYLES.tableRowColumnStyle} width="auto">commit</th>\n</tr>`;

  let content = '';
  content += addedGithubCommits.length > 0 ? `<br/>added commits events     : ${addedGithubCommits.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${githubTableHeader}\n${getGithubBodyItemsHtml(addedGithubCommits)}\n</table>\n</center>\n` : '';
  content += removedGithubCommits.length > 0 ? `<br/>removed commits events   : ${removedGithubCommits.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${githubTableHeader}\n${getGithubBodyItemsHtml(removedGithubCommits)}\n</table>\n</center>\n` : '';
  return content;
}

function generateReportEmailContent(session: TSessionStats) {
  const todayEventsCount = getTotalSessionEvents(session);

  let content = '';
  content = `Hi!<br/><br/>there were ${todayEventsCount} changes made to your google calendar:<br/>\n`;
  content += getTicktickEmailContant(session);
  content += getGithubEmailContant(session);
  content += `<br/>Regards,<br/>your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot`;
  return content;
}

function getGcalSyncDev(){
    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    const APP_INFO = {
        name: 'gcal-sync',
        github_repository: 'lucasvtiradentes/gcal-sync',
        version: '1.8.1',
        build_date_time: '24/01/2024 20:45:33'
    };

    const mergeArraysOfArrays = (arr) => arr.reduce((acc, val) => acc.concat(val), []);
    function getUniqueElementsOnArrays(arrayA, arrayB) {
        const uniqueInA = arrayA.filter((item) => !arrayB.includes(item));
        const uniqueInB = arrayB.filter((item) => !arrayA.includes(item));
        return uniqueInA.concat(uniqueInB);
    }
    const asConstArrayToObject = (array, keyField, valueField) => {
        return array.reduce((acc, item) => {
            const key = item[keyField];
            const value = item[valueField];
            acc[key] = value;
            return acc;
        }, {});
    };

    var _a;
    const CONFIGS = {
        DEBUG_MODE: true,
        MAX_GCAL_TASKS: 2500,
        REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
        IS_TEST_ENVIRONMENT: typeof process !== 'object' ? false : (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.NODE_ENV
    };
    const GAS_PROPERTIES = [
        {
            key: 'today_ticktick_added_tasks',
            initial_value: []
        },
        {
            key: 'today_ticktick_updated_tasks',
            initial_value: []
        },
        {
            key: 'today_ticktick_completed_tasks',
            initial_value: []
        },
        {
            key: 'today_github_added_commits',
            initial_value: []
        },
        {
            key: 'today_github_deleted_commits',
            initial_value: []
        },
        {
            key: 'last_released_version_alerted',
            initial_value: ''
        },
        {
            key: 'last_released_version_sent_date',
            initial_value: ''
        },
        {
            key: 'last_daily_email_sent_date',
            initial_value: ''
        },
        {
            key: 'github_commits_tracked_to_be_added',
            initial_value: []
        },
        {
            key: 'github_commits_tracked_to_be_deleted',
            initial_value: []
        },
        {
            key: 'github_commit_changes_count',
            initial_value: ''
        }
    ];
    const GAS_PROPERTIES_INITIAL_VALUE_ENUM = asConstArrayToObject(GAS_PROPERTIES, 'key', 'initial_value');
    const GAS_PROPERTIES_ENUM = asConstArrayToObject(GAS_PROPERTIES, 'key', 'key');

    const ERRORS = {
        invalid_configs: 'schema invalid',
        production_only: 'This method cannot run in non-production environments',
        incorrect_ics_calendar: 'The link you provided is not a valid ICS calendar: ',
        abusive_google_calendar_api_use: 'Due to the numerous operations in the last few hours, the google api is not responding.',
        invalid_ics_calendar_link: 'You provided an invalid ICS calendar link: ',
        invalid_github_token: 'You provided an invalid github token',
        invalid_github_username: 'You provided an invalid github username'
    };

    const ticktickConfigsKey = 'ticktick_sync';
    const githubConfigsKey = 'github_sync';

    function getSessionEmail(sendToEmail, sessionStats) {
        const content = generateReportEmailContent(sessionStats);
        const emailObj = {
            to: sendToEmail,
            name: `${APP_INFO.name}`,
            subject: `session report - ${getTotalSessionEvents(sessionStats)} modifications - ${APP_INFO.name}`,
            htmlBody: content
        };
        return emailObj;
    }
    function getDailySummaryEmail(sendToEmail, todaySession, todayDate) {
        const content = generateReportEmailContent(todaySession);
        const emailObj = {
            to: sendToEmail,
            name: `${APP_INFO.name}`,
            subject: `daily report for ${todayDate} - ${getTotalSessionEvents(todaySession)} modifications - ${APP_INFO.name}`,
            htmlBody: content
        };
        return emailObj;
    }
    function getNewReleaseEmail(sendToEmail, lastReleaseObj) {
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
        const emailObj = {
            to: sendToEmail,
            name: `${APP_INFO.name}`,
            subject: `new version [${lastReleaseObj.tag_name}] was released - ${APP_INFO.name}`,
            htmlBody: message
        };
        return emailObj;
    }
    function getErrorEmail(sendToEmail, errorMessage) {
        const content = `Hi!
    <br/><br/>
    an error recently occurred: <br/><br/>
    <b>${errorMessage}</b>
    <br /><br />
    Regards,
    your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot
  `;
        const emailObj = {
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
    const getParsedDateTime = (str) => ('date' in str ? str.date : str.dateTime);
    function getTotalSessionEvents(session) {
        const todayEventsCount = session.added_tasks.length + session.updated_tasks.length + session.completed_tasks.length + session.commits_added.length + session.commits_deleted.length;
        return todayEventsCount;
    }
    function getTicktickEmailContant(session) {
        const addedTicktickTasks = session.added_tasks;
        const updatedTicktickTasks = session.updated_tasks;
        const completedTicktickTasks = session.completed_tasks;
        const getTicktickBodyItemsHtml = (items) => {
            if (items.length === 0)
                return '';
            // prettier-ignore
            const tableItems = items.map((gcalItem) => {
                const parsedDate = getParsedDateTime(gcalItem.start).split('T')[0];
                const itemHtmlRow = [parsedDate, gcalItem.extendedProperties.private.calendar, `<a href="${gcalItem.htmlLink}">${gcalItem.summary}</a>`].map(it => `<td ${TABLE_STYLES.tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n');
                return `<tr ${TABLE_STYLES.tableRowStyle}">\n${itemHtmlRow}\n</tr>`;
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
    function getGithubEmailContant(session) {
        const addedGithubCommits = session.commits_added;
        const removedGithubCommits = session.commits_deleted;
        const getGithubBodyItemsHtml = (items) => {
            if (items.length === 0)
                return '';
            // prettier-ignore
            const tableItems = items.map((gcalItem) => {
                const { repositoryLink, commitMessage, repositoryName } = gcalItem.extendedProperties.private;
                const parsedDate = getParsedDateTime(gcalItem.start).split('T')[0];
                const itemHtmlRow = [parsedDate, `<a href="${repositoryLink}">${repositoryName}</a>`, `<a href="${gcalItem.htmlLink}">${commitMessage}</a>`].map(it => `<td ${TABLE_STYLES.tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n');
                return `<tr ${TABLE_STYLES.tableRowStyle}">\n${itemHtmlRow}\n</tr>`;
            }).join('\n');
            return `${tableItems}`;
        };
        const githubTableHeader = `<tr ${TABLE_STYLES.tableRowStyle}">\n<th ${TABLE_STYLES.tableRowColumnStyle} width="80px">date</th><th ${TABLE_STYLES.tableRowColumnStyle} width="130px">repository</th><th ${TABLE_STYLES.tableRowColumnStyle} width="auto">commit</th>\n</tr>`;
        let content = '';
        content += addedGithubCommits.length > 0 ? `<br/>added commits events     : ${addedGithubCommits.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${githubTableHeader}\n${getGithubBodyItemsHtml(addedGithubCommits)}\n</table>\n</center>\n` : '';
        content += removedGithubCommits.length > 0 ? `<br/>removed commits events   : ${removedGithubCommits.length}<br/><br/> \n <center>\n<table ${TABLE_STYLES.tableStyle}>\n${githubTableHeader}\n${getGithubBodyItemsHtml(removedGithubCommits)}\n</table>\n</center>\n` : '';
        return content;
    }
    function generateReportEmailContent(session) {
        const todayEventsCount = getTotalSessionEvents(session);
        let content = '';
        content = `Hi!<br/><br/>there were ${todayEventsCount} changes made to your google calendar:<br/>\n`;
        content += getTicktickEmailContant(session);
        content += getGithubEmailContant(session);
        content += `<br/>Regards,<br/>your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot`;
        return content;
    }

    function checkIfShouldSync(extendedConfigs) {
        const shouldSyncGithub = extendedConfigs.configs[githubConfigsKey].commits_configs.should_sync;
        const shouldSyncTicktick = extendedConfigs.configs[ticktickConfigsKey].should_sync;
        return {
            shouldSyncGithub,
            shouldSyncTicktick
        };
    }

    // GENERAL =====================================================================
    function isRunningOnGAS() {
        return typeof Calendar !== 'undefined';
    }
    // PROPERTIES ==================================================================
    function listAllGASProperties() {
        const allProperties = PropertiesService.getScriptProperties().getProperties();
        return allProperties;
    }
    function getGASProperty(property) {
        const value = PropertiesService.getScriptProperties().getProperty(property);
        let parsedValue;
        try {
            parsedValue = JSON.parse(value);
        }
        catch (_a) {
            parsedValue = value;
        }
        return parsedValue;
    }
    function updateGASProperty(property, value) {
        const parsedValue = typeof value === 'string' ? value : JSON.stringify(value);
        PropertiesService.getScriptProperties().setProperty(property, parsedValue);
    }
    function deleteGASProperty(property) {
        PropertiesService.getScriptProperties().deleteProperty(property);
    }
    // TRIGGERS ====================================================================
    function getAppsScriptsTriggers() {
        return ScriptApp.getProjectTriggers();
    }
    function addAppsScriptsTrigger(functionName, minutesLoop) {
        ScriptApp.newTrigger(functionName).timeBased().everyMinutes(minutesLoop).create();
    }
    function removeAppsScriptsTrigger(functionName) {
        const allAppsScriptTriggers = getAppsScriptsTriggers();
        const tickSyncTrigger = allAppsScriptTriggers.find((item) => item.getHandlerFunction() === functionName);
        if (tickSyncTrigger) {
            ScriptApp.deleteTrigger(tickSyncTrigger);
        }
    }

    function getUserEmail() {
        return Session.getActiveUser().getEmail();
    }
    function sendEmail(emailObj) {
        MailApp.sendEmail(emailObj);
    }

    class Logger {
        constructor() {
            this.logs = [];
        }
        info(message, ...optionalParams) {
            if (!CONFIGS.IS_TEST_ENVIRONMENT) {
                console.log(message, ...optionalParams);
                this.logs.push(message);
            }
        }
        error(message, ...optionalParams) {
            if (!CONFIGS.IS_TEST_ENVIRONMENT) {
                console.error(message, ...optionalParams);
                this.logs.push(message);
            }
        }
    }
    const logger = new Logger();

    function getDateFixedByTimezone(timeZoneIndex) {
        const date = new Date();
        date.setHours(date.getHours() + timeZoneIndex);
        return date;
    }
    function getParsedTimeStamp(stamp) {
        const splitArr = stamp.split('T');
        const year = splitArr[0].substring(0, 4);
        const month = splitArr[0].substring(4, 6);
        const day = splitArr[0].substring(6, 8);
        const hours = splitArr[1] ? splitArr[1].substring(0, 2) : '00';
        const minutes = splitArr[1] ? splitArr[1].substring(2, 4) : '00';
        const seconds = splitArr[1] ? splitArr[1].substring(4, 6) : '00';
        return { year, month, day, hours, minutes, seconds };
    }
    function isCurrentTimeAfter(timeToCompare, timezone) {
        const dateFixedByTimezone = getDateFixedByTimezone(timezone);
        const curStamp = Number(dateFixedByTimezone.getHours()) * 60 + Number(dateFixedByTimezone.getMinutes());
        const timeArr = timeToCompare.split(':');
        const specifiedStamp = Number(timeArr[0]) * 60 + Number(timeArr[1]);
        return curStamp >= specifiedStamp;
    }

    function getTodayStats() {
        const todayStats = {
            added_tasks: getGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_added_tasks),
            updated_tasks: getGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_updated_tasks),
            completed_tasks: getGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_completed_tasks),
            commits_added: getGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits),
            commits_deleted: getGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits)
        };
        return todayStats;
    }
    function clearTodayEvents() {
        updateGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits, []);
        updateGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits, []);
        updateGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_added_tasks, []);
        updateGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_completed_tasks, []);
        updateGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_updated_tasks, []);
        logger.info(`today stats were reseted!`);
    }
    function handleSessionData(extendedConfigs, sessionData) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { shouldSyncGithub, shouldSyncTicktick } = checkIfShouldSync(extendedConfigs);
            const ticktickNewItems = sessionData.added_tasks.length + sessionData.updated_tasks.length + sessionData.completed_tasks.length;
            if (shouldSyncTicktick && ticktickNewItems > 0) {
                const todayAddedTasks = getGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_added_tasks);
                const todayUpdatedTasks = getGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_updated_tasks);
                const todayCompletedTasks = getGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_completed_tasks);
                updateGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_added_tasks, [...todayAddedTasks, ...sessionData.added_tasks]);
                updateGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_updated_tasks, [...todayUpdatedTasks, ...sessionData.updated_tasks]);
                updateGASProperty(GAS_PROPERTIES_ENUM.today_ticktick_completed_tasks, [...todayCompletedTasks, ...sessionData.completed_tasks]);
                logger.info(`added ${ticktickNewItems} new ticktick items to today's stats`);
            }
            const githubNewItems = sessionData.commits_added.length + sessionData.commits_deleted.length;
            if (shouldSyncGithub && githubNewItems > 0) {
                const todayAddedCommits = getGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits);
                const todayDeletedCommits = getGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits);
                updateGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits, [...todayAddedCommits, ...sessionData.commits_added]);
                updateGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits, [...todayDeletedCommits, ...sessionData.commits_deleted]);
                logger.info(`added ${githubNewItems} new github items to today's stats`);
            }
            const totalSessionNewItems = ticktickNewItems + githubNewItems;
            // =========================================================================
            const userEmail = extendedConfigs.user_email;
            if (extendedConfigs.configs.settings.per_sync_emails.email_session && totalSessionNewItems > 0) {
                const sessionEmail = getSessionEmail(userEmail, sessionData);
                sendEmail(sessionEmail);
            }
            const isNowTimeAfterDailyEmails = isCurrentTimeAfter(extendedConfigs.configs.settings.per_day_emails.time_to_send, extendedConfigs.configs.settings.timezone_correction);
            const alreadySentTodaySummaryEmail = extendedConfigs.today_date === getGASProperty(GAS_PROPERTIES_ENUM.last_daily_email_sent_date);
            if (isNowTimeAfterDailyEmails && extendedConfigs.configs.settings.per_day_emails.email_daily_summary && !alreadySentTodaySummaryEmail) {
                updateGASProperty(GAS_PROPERTIES_ENUM.last_daily_email_sent_date, extendedConfigs.today_date);
                const dailySummaryEmail = getDailySummaryEmail(userEmail, getTodayStats(), extendedConfigs.today_date);
                sendEmail(dailySummaryEmail);
                clearTodayEvents();
            }
            const alreadySentTodayNewReleaseEmail = extendedConfigs.today_date === getGASProperty(GAS_PROPERTIES_ENUM.last_released_version_sent_date);
            const parseGcalVersion = (v) => {
                return Number(v.replace('v', '').split('.').join(''));
            };
            const getLatestGcalSyncRelease = () => {
                var _a;
                const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${APP_INFO.github_repository}/releases?per_page=1`);
                const lastReleaseObj = (_a = JSON.parse(json_encoded.getContentText())[0]) !== null && _a !== void 0 ? _a : { tag_name: APP_INFO.version };
                return lastReleaseObj;
            };
            if (isNowTimeAfterDailyEmails && extendedConfigs.configs.settings.per_day_emails.email_new_gcal_sync_release && !alreadySentTodayNewReleaseEmail) {
                updateGASProperty(GAS_PROPERTIES_ENUM.last_released_version_sent_date, extendedConfigs.today_date);
                const latestRelease = getLatestGcalSyncRelease();
                const latestVersion = parseGcalVersion(latestRelease.tag_name);
                const currentVersion = parseGcalVersion(APP_INFO.version);
                const lastAlertedVersion = (_a = getGASProperty(GAS_PROPERTIES_ENUM.last_released_version_alerted)) !== null && _a !== void 0 ? _a : '';
                if (latestVersion > currentVersion && latestVersion.toString() != lastAlertedVersion) {
                    const newReleaseEmail = getNewReleaseEmail(userEmail, latestRelease);
                    sendEmail(newReleaseEmail);
                    updateGASProperty(GAS_PROPERTIES_ENUM.last_released_version_alerted, latestVersion.toString());
                }
            }
            const { added_tasks, updated_tasks, completed_tasks, commits_added, commits_deleted, commits_tracked_to_be_added, commits_tracked_to_be_deleted } = sessionData;
            logger.info({
                added_tasks: added_tasks.length,
                updated_tasks: updated_tasks.length,
                completed_tasks: completed_tasks.length,
                commits_added: commits_added.length,
                commits_deleted: commits_deleted.length,
                commits_tracked_to_be_added: commits_tracked_to_be_added.length,
                commits_tracked_to_be_deleted: commits_tracked_to_be_deleted.length
            });
        });
    }

    function getAllGithubCommits(username, personalToken) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const allCommitsArr = [];
            let pageNumber = 1;
            let shouldBreak = false;
            while (shouldBreak === false) {
                const url = `https://api.github.com/search/commits?q=author:${username}&page=${pageNumber}&sort=committer-date&per_page=100`;
                let response;
                if (personalToken !== '') {
                    response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Authorization: `Bearer ${personalToken}` } });
                }
                else {
                    response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
                }
                const data = (_a = JSON.parse(response.getContentText())) !== null && _a !== void 0 ? _a : {};
                if (response.getResponseCode() !== 200) {
                    if (data.message === 'Validation Failed') {
                        throw new Error(ERRORS.invalid_github_username);
                    }
                    if (data.message === 'Bad credentials') {
                        throw new Error(ERRORS.invalid_github_token);
                    }
                    throw new Error(data.message);
                }
                const commits = data.items;
                if (commits.length === 0) {
                    shouldBreak = true;
                    break;
                }
                allCommitsArr.push(...commits);
                pageNumber++;
                if (pageNumber > 10) {
                    shouldBreak = true;
                    break;
                }
            }
            const parsedCommits = allCommitsArr.map((it) => {
                const commitObj = {
                    commitDate: it.commit.author.date,
                    commitMessage: it.commit.message.split('\n')[0],
                    commitId: it.html_url.split('commit/')[1],
                    commitUrl: it.html_url,
                    repository: it.repository.full_name,
                    repositoryLink: `https://github.com/${it.repository.full_name}`,
                    repositoryId: it.repository.id,
                    repositoryName: it.repository.name,
                    repositoryOwner: it.repository.owner.login,
                    repositoryDescription: it.repository.description,
                    isRepositoryPrivate: it.repository.private,
                    isRepositoryFork: it.repository.fork
                };
                return commitObj;
            });
            return parsedCommits;
        });
    }
    function parseGithubEmojisString(str) {
        const gitmojiObj = {
            ':art:': '🎨',
            ':zap:': '⚡️',
            ':fire:': '🔥',
            ':bug:': '🐛',
            ':ambulance:': '🚑️',
            ':sparkles:': '✨',
            ':memo:': '📝',
            ':rocket:': '🚀',
            ':lipstick:': '💄',
            ':tada:': '🎉',
            ':white_check_mark:': '✅',
            ':lock:': '🔒️',
            ':closed_lock_with_key:': '🔐',
            ':bookmark:': '🔖',
            ':rotating_light:': '🚨',
            ':construction:': '🚧',
            ':green_heart:': '💚',
            ':arrow_down:': '⬇️',
            ':arrow_up:': '⬆️',
            ':pushpin:': '📌',
            ':construction_worker:': '👷',
            ':chart_with_upwards_trend:': '📈',
            ':recycle:': '♻️',
            ':heavy_plus_sign:': '➕',
            ':heavy_minus_sign:': '➖',
            ':wrench:': '🔧',
            ':hammer:': '🔨',
            ':globe_with_meridians:': '🌐',
            ':pencil2:': '✏️',
            ':poop:': '💩',
            ':rewind:': '⏪️',
            ':twisted_rightwards_arrows:': '🔀',
            ':package:': '📦️',
            ':alien:': '👽️',
            ':truck:': '🚚',
            ':page_facing_up:': '📄',
            ':boom:': '💥',
            ':bento:': '🍱',
            ':wheelchair:': '♿️',
            ':bulb:': '💡',
            ':beers:': '🍻',
            ':speech_balloon:': '💬',
            ':card_file_box:': '🗃️',
            ':loud_sound:': '🔊',
            ':mute:': '🔇',
            ':busts_in_silhouette:': '👥',
            ':children_crossing:': '🚸',
            ':building_construction:': '🏗️',
            ':iphone:': '📱',
            ':clown_face:': '🤡',
            ':egg:': '🥚',
            ':see_no_evil:': '🙈',
            ':camera_flash:': '📸',
            ':alembic:': '⚗️',
            ':mag:': '🔍️',
            ':label:': '🏷️',
            ':seedling:': '🌱',
            ':triangular_flag_on_post:': '🚩',
            ':goal_net:': '🥅',
            ':dizzy:': '💫',
            ':wastebasket:': '🗑️',
            ':passport_control:': '🛂',
            ':adhesive_bandage:': '🩹',
            ':monocle_face:': '🧐',
            ':coffin:': '⚰️',
            ':test_tube:': '🧪',
            ':necktie:': '👔',
            ':stethoscope:': '🩺',
            ':bricks:': '🧱',
            ':technologist:': '🧑‍💻',
            ':money_with_wings:': '💸',
            ':thread:': '🧵',
            ':safety_vest:': '🦺'
        };
        let curString = str;
        for (const [key, value] of Object.entries(gitmojiObj)) {
            curString = curString.replace(key, value);
        }
        return curString;
    }

    // =============================================================================
    const createMissingCalendars = (allGcalendarsNames) => {
        let createdCalendar = false;
        allGcalendarsNames.forEach((calName) => {
            if (!checkIfCalendarExists(calName)) {
                createCalendar(calName);
                logger.info(`created google calendar: [${calName}]`);
                createdCalendar = true;
            }
        });
        if (createdCalendar) {
            Utilities.sleep(2000);
        }
    };
    const getAllCalendars = () => {
        var _a;
        const calendars = (_a = Calendar.CalendarList.list({ showHidden: true }).items) !== null && _a !== void 0 ? _a : [];
        return calendars;
    };
    const checkIfCalendarExists = (calendarName) => {
        const allCalendars = getAllCalendars();
        const calendar = allCalendars.find((cal) => cal.summary === calendarName);
        return calendar;
    };
    const createCalendar = (calName) => {
        const calendarObj = Calendar;
        const owenedCalendars = calendarObj.CalendarList.list({ showHidden: true }).items.filter((cal) => cal.accessRole === 'owner');
        const doesCalendarExists = owenedCalendars.map((cal) => cal.summary).includes(calName);
        if (doesCalendarExists) {
            throw new Error(`calendar ${calName} already exists!`);
        }
        const tmpCalendar = calendarObj.newCalendar();
        tmpCalendar.summary = calName;
        tmpCalendar.timeZone = calendarObj.Settings.get('timezone').value;
        const calendar = calendarObj.Calendars.insert(tmpCalendar);
        return calendar;
    };
    function getCalendarByName(calName) {
        const calendar = getAllCalendars().find((cal) => cal.summary === calName);
        return calendar;
    }
    function parseGoogleEvent(ev) {
        var _a, _b, _c, _d, _e;
        const parsedGoogleEvent = {
            id: ev.id,
            summary: ev.summary,
            description: (_a = ev.description) !== null && _a !== void 0 ? _a : '',
            htmlLink: ev.htmlLink,
            attendees: (_b = ev.attendees) !== null && _b !== void 0 ? _b : [],
            reminders: (_c = ev.reminders) !== null && _c !== void 0 ? _c : {},
            visibility: (_d = ev.visibility) !== null && _d !== void 0 ? _d : 'default',
            start: ev.start,
            end: ev.end,
            created: ev.created,
            updated: ev.updated,
            colorId: ev.colorId,
            extendedProperties: ((_e = ev.extendedProperties) !== null && _e !== void 0 ? _e : {})
        };
        return parsedGoogleEvent;
    }
    function getEventsFromCalendar(calendar) {
        const allEvents = Calendar.Events.list(calendar.id, { maxResults: CONFIGS.MAX_GCAL_TASKS }).items;
        const parsedEventsArr = allEvents.map((ev) => parseGoogleEvent(ev));
        return parsedEventsArr;
    }
    function getTasksFromGoogleCalendars(allCalendars) {
        const tasks = allCalendars.reduce((acc, cur) => {
            const taskCalendar = cur;
            const calendar = getCalendarByName(taskCalendar);
            const tasksArray = getEventsFromCalendar(calendar);
            return [...acc, ...tasksArray];
        }, []);
        return tasks;
    }
    function addEventToCalendar(calendar, event) {
        const eventFinal = Calendar.Events.insert(event, calendar.id);
        return eventFinal;
    }
    function moveEventToOtherCalendar(calendar, newCalendar, event) {
        removeCalendarEvent(calendar, event);
        Utilities.sleep(2000);
        const newEvent = addEventToCalendar(newCalendar, event);
        return newEvent;
    }
    function removeCalendarEvent(calendar, event) {
        Calendar.Events.remove(calendar.id, event.id);
    }

    function resetGithubSyncProperties() {
        updateGASProperty('github_commit_changes_count', '0');
        updateGASProperty('github_commits_tracked_to_be_added', []);
        updateGASProperty('github_commits_tracked_to_be_deleted', []);
    }
    function syncGithub(configs) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = {
                githubCommits: yield getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token),
                githubGcalCommits: getTasksFromGoogleCalendars([configs[githubConfigsKey].commits_configs.commits_calendar])
            };
            const oldGithubSyncIndex = getGASProperty('github_commit_changes_count');
            const currentGithubSyncIndex = Number(oldGithubSyncIndex) + 1;
            if (oldGithubSyncIndex === null) {
                resetGithubSyncProperties();
            }
            updateGASProperty('github_commit_changes_count', currentGithubSyncIndex.toString());
            if (currentGithubSyncIndex === 1) {
                logger.info(`checking commit changes: ${currentGithubSyncIndex}/${CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT}`);
            }
            else if (currentGithubSyncIndex > 1 && currentGithubSyncIndex < CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT) {
                logger.info(`confirming commit changes: ${currentGithubSyncIndex}/${CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT}`);
            }
            else if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT) {
                logger.info(`making commit changes if succeed: ${currentGithubSyncIndex}/${CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT}`);
            }
            const githubCalendar = getCalendarByName(configs[githubConfigsKey].commits_configs.commits_calendar);
            const commitsSortedByDate = info.githubCommits.sort((a, b) => Number(new Date(b.commitDate)) - Number(new Date(a.commitDate)));
            const onlyCommitsOnUserRepositories = commitsSortedByDate.filter((item) => item.repository.includes(configs[githubConfigsKey].username));
            const onlyCommitsFromValidRepositories = onlyCommitsOnUserRepositories.filter((item) => configs[githubConfigsKey].commits_configs.ignored_repos.includes(item.repositoryName) === false);
            const result = Object.assign(Object.assign({}, (yield syncGithubCommitsToAdd({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, onlyCommitsFromValidRepositories, parseCommitEmojis: configs[githubConfigsKey].commits_configs.parse_commit_emojis }))), (yield syncGithubCommitsToDelete({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, onlyCommitsFromValidRepositories })));
            if (result.commits_tracked_to_be_added.length === 0 && result.commits_tracked_to_be_deleted.length === 0) {
                logger.info(`reset github commit properties due found no commits tracked`);
                resetGithubSyncProperties();
            }
            return result;
        });
    }
    function syncGithubCommitsToAdd({ onlyCommitsFromValidRepositories, currentGithubSyncIndex, githubCalendar, githubGcalCommits, parseCommitEmojis }) {
        return __awaiter(this, void 0, void 0, function* () {
            const githubSessionStats = {
                commits_tracked_to_be_added: [],
                commits_added: []
            };
            for (const githubCommitItem of onlyCommitsFromValidRepositories) {
                const sameRepoCommits = githubGcalCommits.filter((gcalItem) => gcalItem.extendedProperties.private.repository === githubCommitItem.repository);
                const hasEquivalentGcalTask = sameRepoCommits.find((gcalItem) => gcalItem.extendedProperties.private.commitDate === githubCommitItem.commitDate && parseGithubEmojisString(gcalItem.extendedProperties.private.commitMessage) === parseGithubEmojisString(githubCommitItem.commitMessage));
                if (!hasEquivalentGcalTask) {
                    const commitMessage = parseCommitEmojis ? parseGithubEmojisString(githubCommitItem.commitMessage) : githubCommitItem.commitMessage;
                    const extendProps = {
                        private: {
                            commitMessage,
                            commitDate: githubCommitItem.commitDate,
                            repository: githubCommitItem.repository,
                            repositoryName: githubCommitItem.repositoryName,
                            repositoryLink: githubCommitItem.repositoryLink,
                            commitId: githubCommitItem.commitId
                        }
                    };
                    const taskEvent = {
                        summary: `${githubCommitItem.repositoryName} - ${commitMessage}`,
                        description: `repository: https://github.com/${githubCommitItem.repository}\ncommit: ${githubCommitItem.commitUrl}`,
                        start: { dateTime: githubCommitItem.commitDate },
                        end: { dateTime: githubCommitItem.commitDate },
                        reminders: {
                            useDefault: false,
                            overrides: []
                        },
                        extendedProperties: extendProps
                    };
                    githubSessionStats.commits_tracked_to_be_added.push(taskEvent);
                }
            }
            if (currentGithubSyncIndex === 1) {
                updateGASProperty('github_commits_tracked_to_be_added', githubSessionStats.commits_tracked_to_be_added.map((item) => item));
                return githubSessionStats;
            }
            const lastAddedCommits = getGASProperty('github_commits_tracked_to_be_added');
            const lastAddedCommitsIds = lastAddedCommits.map((item) => item.extendedProperties.private.commitId);
            const currentIterationCommitsIds = githubSessionStats.commits_tracked_to_be_added.map((item) => item.extendedProperties.private.commitId);
            const remainingCommits = getUniqueElementsOnArrays(lastAddedCommitsIds, currentIterationCommitsIds);
            if (remainingCommits.length > 0) {
                logger.info(`reset github commit properties due differences in added commits`);
                resetGithubSyncProperties();
                return githubSessionStats;
            }
            if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commits_tracked_to_be_added.length > 0) {
                logger.info(`adding ${githubSessionStats.commits_tracked_to_be_added.length} commits to gcal`);
                for (let x = 0; x < githubSessionStats.commits_tracked_to_be_added.length; x++) {
                    try {
                        const item = githubSessionStats.commits_tracked_to_be_added[x];
                        const commitGcalEvent = addEventToCalendar(githubCalendar, item);
                        githubSessionStats.commits_added.push(commitGcalEvent);
                        logger.info(`${x + 1}/${githubSessionStats.commits_tracked_to_be_added.length} add new commit to gcal: ${item.extendedProperties.private.commitDate} - ${commitGcalEvent.extendedProperties.private.repositoryName} - ${commitGcalEvent.extendedProperties.private.commitMessage}`);
                    }
                    catch (e) {
                        throw new Error(e.message);
                    }
                    finally {
                        resetGithubSyncProperties();
                    }
                }
            }
            return githubSessionStats;
        });
    }
    function syncGithubCommitsToDelete({ githubGcalCommits, githubCalendar, currentGithubSyncIndex, onlyCommitsFromValidRepositories }) {
        return __awaiter(this, void 0, void 0, function* () {
            const githubSessionStats = {
                commits_deleted: [],
                commits_tracked_to_be_deleted: []
            };
            githubGcalCommits.forEach((gcalItem) => {
                const gcalProperties = gcalItem.extendedProperties.private;
                const onlySameRepoCommits = onlyCommitsFromValidRepositories.filter((item) => item.repository === gcalProperties.repository);
                const commitStillExistsOnGithub = onlySameRepoCommits.find((item) => item.commitDate === gcalProperties.commitDate && parseGithubEmojisString(item.commitMessage) === parseGithubEmojisString(gcalProperties.commitMessage));
                if (!commitStillExistsOnGithub) {
                    githubSessionStats.commits_tracked_to_be_deleted.push(gcalItem);
                }
            });
            if (currentGithubSyncIndex === 1) {
                updateGASProperty('github_commits_tracked_to_be_deleted', githubSessionStats.commits_tracked_to_be_deleted);
                return githubSessionStats;
            }
            const lastDeletedCommits = getGASProperty('github_commits_tracked_to_be_deleted');
            const lastDeletedCommitsIds = lastDeletedCommits.map((item) => item.extendedProperties.private.commitId);
            const currentIterationDeletedCommitsIds = githubSessionStats.commits_tracked_to_be_deleted.map((item) => item.extendedProperties.private.commitId);
            const remainingDeletedCommits = getUniqueElementsOnArrays(lastDeletedCommitsIds, currentIterationDeletedCommitsIds);
            if (remainingDeletedCommits.length > 0) {
                logger.info(`reset github commit properties due differences in deleted commits`);
                resetGithubSyncProperties();
                return githubSessionStats;
            }
            if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commits_tracked_to_be_deleted.length > 0) {
                logger.info(`deleting ${githubSessionStats.commits_tracked_to_be_deleted.length} commits on gcal`);
                for (let x = 0; x < githubSessionStats.commits_tracked_to_be_deleted.length; x++) {
                    try {
                        const item = githubSessionStats.commits_tracked_to_be_deleted[x];
                        removeCalendarEvent(githubCalendar, item);
                        githubSessionStats.commits_deleted.push(item);
                        logger.info(`${x + 1}/${githubSessionStats.commits_tracked_to_be_deleted.length} deleted commit on gcal: ${item.extendedProperties.private.commitDate} - ${item.extendedProperties.private.repositoryName} - ${item.extendedProperties.private.commitMessage}`);
                    }
                    catch (e) {
                        throw new Error(e.message);
                    }
                    finally {
                        resetGithubSyncProperties();
                    }
                }
            }
            return githubSessionStats;
        });
    }

    const getStrBetween = (str, substr1, substr2) => {
        const newStr = str.slice(str.search(substr1)).replace(substr1, '');
        return newStr.slice(0, newStr.search(substr2));
    };

    const getIcsCalendarTasks = (icsLink, timezoneCorrection) => __awaiter(void 0, void 0, void 0, function* () {
        const parsedLink = icsLink.replace('webcal://', 'https://');
        const urlResponse = UrlFetchApp.fetch(parsedLink, { validateHttpsCertificates: false, muteHttpExceptions: true });
        const data = urlResponse.getContentText() || '';
        if (urlResponse.getResponseCode() !== 200) {
            throw new Error(ERRORS.invalid_ics_calendar_link + parsedLink);
        }
        if (data.search('BEGIN:VCALENDAR') === -1) {
            throw new Error(ERRORS.incorrect_ics_calendar);
        }
        const eventsArr = data.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);
        // prettier-ignore
        const allEventsArr = data.search('SUMMARY:No task.') > 0 ? [] : eventsArr.reduce((acc, cur) => {
            const alarmArr = cur.split('BEGIN:VALARM\r\n');
            const eventObj = {
                CALNAME: getStrBetween(data, 'X-WR-CALNAME:', '\r\n'),
                DSTAMP: getStrBetween(cur, 'DTSTAMP:', '\r\n'),
                DTSTART: getStrBetween(cur, 'DTSTART;', '\r\n'),
                DTEND: getStrBetween(cur, 'DTEND;', '\r\n'),
                SUMMARY: getStrBetween(cur, 'SUMMARY:', '\r\n'),
                UID: getStrBetween(cur, 'UID:', '\r\n'),
                DESCRIPTION: getStrBetween(cur, 'DESCRIPTION:', '\r\n'),
                SEQUENCE: getStrBetween(cur, 'SEQUENCE:', '\r\n'),
                TZID: getStrBetween(cur, 'TZID:', '\r\n'),
                ALARM_TRIGGER: alarmArr.length === 1 ? '' : getStrBetween(alarmArr[1], 'TRIGGER:', '\r\n'),
                ALARM_ACTION: alarmArr.length === 1 ? '' : getStrBetween(alarmArr[1], 'ACTION:', '\r\n'),
                ALARM_DESCRIPTION: alarmArr.length === 1 ? '' : getStrBetween(alarmArr[1], 'DESCRIPTION:', '\r\n')
            };
            return [...acc, eventObj];
        }, []);
        const allEventsParsedArr = allEventsArr.map((item) => {
            const parsedDateTime = getParsedIcsDatetimes(item.DTSTART, item.DTEND, item.TZID, timezoneCorrection);
            return {
                id: item.UID,
                name: item.SUMMARY,
                description: item.DESCRIPTION,
                tzid: item.TZID,
                start: parsedDateTime.finalDtstart,
                end: parsedDateTime.finalDtend
            };
        });
        return allEventsParsedArr;
    });
    function getParsedIcsDatetimes(dtstart, dtend, timezone, timezoneCorrection) {
        let finalDtstart = dtstart;
        let finalDtend = dtend;
        finalDtstart = finalDtstart.slice(finalDtstart.search(':') + 1);
        finalDtend = finalDtend.slice(finalDtend.search(':') + 1);
        if (finalDtend === '') {
            const startDateObj = getParsedTimeStamp(finalDtstart);
            const nextDate = new Date(Date.UTC(Number(startDateObj.year), Number(startDateObj.month) - 1, Number(startDateObj.day), 0, 0, 0));
            nextDate.setDate(nextDate.getDate() + 1);
            finalDtend = { date: nextDate.toISOString().split('T')[0] };
            finalDtstart = { date: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}` };
        }
        else {
            const startDateObj = getParsedTimeStamp(finalDtstart);
            const endDateObj = getParsedTimeStamp(finalDtend);
            const getTimeZoneFixedString = (fixer) => {
                if (fixer === 0) {
                    return '';
                }
                return `${fixer < 0 ? '-' : '+'}${String(Math.abs(fixer)).padStart(2, '0')}:00`;
            };
            const timezoneFixedString = getTimeZoneFixedString(timezoneCorrection);
            finalDtstart = {
                dateTime: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}T${startDateObj.hours}:${startDateObj.minutes}:${startDateObj.seconds}${timezoneFixedString}`,
                timeZone: timezone
            };
            finalDtend = {
                dateTime: `${endDateObj.year}-${endDateObj.month}-${endDateObj.day}T${endDateObj.hours}:${endDateObj.minutes}:${endDateObj.seconds}${timezoneFixedString}`,
                timeZone: timezone
            };
        }
        return {
            finalDtstart,
            finalDtend
        };
    }

    function syncTicktick(configs) {
        return __awaiter(this, void 0, void 0, function* () {
            const icsCalendarsConfigs = configs[ticktickConfigsKey].ics_calendars;
            const info = {
                ticktickTasks: yield getAllTicktickTasks(icsCalendarsConfigs, configs.settings.timezone_correction),
                ticktickGcalTasks: getTasksFromGoogleCalendars([...new Set(icsCalendarsConfigs.map((item) => item.gcal))])
            };
            const resultInfo = Object.assign(Object.assign({}, (yield addAndUpdateTasksOnGcal(info))), (yield moveCompletedTasksToDoneGcal(info)));
            return resultInfo;
        });
    }
    const getFixedTaskName = (str) => {
        let fixedName = str;
        fixedName = fixedName.replace(/\\,/g, ',');
        fixedName = fixedName.replace(/\\;/g, ';');
        fixedName = fixedName.replace(/\\"/g, '"');
        fixedName = fixedName.replace(/\\\\/g, '\\');
        return fixedName;
    };
    function convertTicktickTaskToGcal(ticktickTask) {
        return __awaiter(this, void 0, void 0, function* () {
            const properties = {
                private: {
                    calendar: ticktickTask.gcal,
                    completedCalendar: ticktickTask.gcal_done,
                    tickTaskId: ticktickTask.id
                }
            };
            const customColor = (ticktickTask === null || ticktickTask === void 0 ? void 0 : ticktickTask.color) ? { colorId: ticktickTask.color.toString() } : {};
            const generateGcalDescription = (curIcsTask) => `task: https://ticktick.com/webapp/#q/all/tasks/${curIcsTask.id.split('@')[0]}${curIcsTask.description ? '\n\n' + curIcsTask.description.replace(/\\n/g, '\n') : ''}`;
            const taskEvent = Object.assign({ summary: getFixedTaskName(ticktickTask.name), description: generateGcalDescription(ticktickTask), start: ticktickTask.start, end: ticktickTask.end, reminders: {
                    useDefault: true
                }, extendedProperties: properties }, customColor);
            return taskEvent;
        });
    }
    function addTicktickTaskToGcal(gcal, ticktickTask) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskEvent = yield convertTicktickTaskToGcal(ticktickTask);
            try {
                return addEventToCalendar(gcal, taskEvent);
            }
            catch (e) {
                if (e.message.search('API call to calendar.events.insert failed with error: Required') > -1) {
                    throw new Error(ERRORS.abusive_google_calendar_api_use);
                }
                else {
                    throw new Error(e.message);
                }
            }
        });
    }
    function checkIfTicktickTaskInfoWasChanged(ticktickTask, taskOnGcal) {
        return __awaiter(this, void 0, void 0, function* () {
            const changedTaskName = getFixedTaskName(ticktickTask.name) !== taskOnGcal.summary;
            const changedDateFormat = Object.keys(ticktickTask.start).length !== Object.keys(taskOnGcal.start).length;
            const changedIntialDate = ticktickTask.start['date'] !== taskOnGcal.start['date'] || ticktickTask.start['dateTime'] !== taskOnGcal.start['dateTime'];
            const changedFinalDate = ticktickTask.end['date'] !== taskOnGcal.end['date'] || ticktickTask.end['dateTime'] !== taskOnGcal.end['dateTime'];
            const changedColor = (() => {
                let tmpResult = false;
                if ((ticktickTask === null || ticktickTask === void 0 ? void 0 : ticktickTask.color) === undefined) {
                    tmpResult = taskOnGcal.colorId !== undefined;
                }
                else {
                    tmpResult = ticktickTask.color.toString() !== taskOnGcal.colorId;
                }
                return tmpResult;
            })();
            const resultArr = [
                { hasChanged: changedTaskName, field: 'name' },
                { hasChanged: changedDateFormat, field: 'date format' },
                { hasChanged: changedIntialDate, field: 'initial date' },
                { hasChanged: changedFinalDate, field: 'final date' },
                { hasChanged: changedColor, field: 'color' }
            ];
            return resultArr.filter((item) => item.hasChanged).map((item) => item.field);
        });
    }
    function getTicktickTasks(icsCalendarsArr, timezoneCorrection) {
        return __awaiter(this, void 0, void 0, function* () {
            return mergeArraysOfArrays(yield Promise.all(icsCalendarsArr.map((icsCal) => __awaiter(this, void 0, void 0, function* () {
                const tasks = yield getIcsCalendarTasks(icsCal.link, timezoneCorrection);
                const extendedTasks = tasks.map((item) => (Object.assign(Object.assign({}, item), icsCal)));
                return extendedTasks;
            }))));
        });
    }
    function getAllTicktickTasks(icsCalendars, timezoneCorrection) {
        return __awaiter(this, void 0, void 0, function* () {
            const taggedTasks = yield getTicktickTasks(icsCalendars.filter((icsCal) => icsCal.tag), timezoneCorrection);
            const ignoredTaggedTasks = (yield getTicktickTasks(icsCalendars.filter((icsCal) => icsCal.ignoredTags), timezoneCorrection)).filter((item) => {
                const ignoredTasks = taggedTasks.map((it) => `${it.tag}${it.id}`);
                const shouldIgnoreTask = item.ignoredTags.some((ignoredTag) => ignoredTasks.includes(`${ignoredTag}${item.id}`));
                return shouldIgnoreTask === false;
            });
            const commonTasks = yield getTicktickTasks(icsCalendars.filter((icsCal) => !icsCal.tag && !icsCal.ignoredTags), timezoneCorrection);
            return [...taggedTasks, ...ignoredTaggedTasks, ...commonTasks];
        });
    }
    function addAndUpdateTasksOnGcal({ ticktickGcalTasks, ticktickTasks }) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = {
                added_tasks: [],
                updated_tasks: []
            };
            for (const ticktickTask of ticktickTasks) {
                const taskOnGcal = ticktickGcalTasks.find((item) => item.extendedProperties.private.tickTaskId === ticktickTask.id);
                const correspondingCalendar = getCalendarByName(ticktickTask.gcal);
                if (!taskOnGcal) {
                    const addedTask = (yield addTicktickTaskToGcal(correspondingCalendar, ticktickTask));
                    result.added_tasks.push(addedTask);
                }
                else {
                    const hasChangedCalendar = correspondingCalendar.summary !== taskOnGcal.extendedProperties.private.calendar;
                    const changedTicktickFields = yield checkIfTicktickTaskInfoWasChanged(ticktickTask, taskOnGcal);
                    const taskDoneCalendar = getCalendarByName(ticktickTask.gcal_done);
                    if (hasChangedCalendar) {
                        const movedTask = moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, Object.assign(Object.assign({}, taskOnGcal), { colorId: undefined }));
                        result.updated_tasks.push(movedTask);
                    }
                    else if (changedTicktickFields.length > 0) {
                        const movedTask = moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, Object.assign(Object.assign({}, taskOnGcal), { colorId: undefined }));
                        result.updated_tasks.push(movedTask);
                    }
                }
            }
            return result;
        });
    }
    function moveCompletedTasksToDoneGcal({ ticktickGcalTasks, ticktickTasks }) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = {
                completed_tasks: []
            };
            const ticktickTasksOnGcal = ticktickGcalTasks.filter((item) => { var _a, _b; return (_b = (_a = item.extendedProperties) === null || _a === void 0 ? void 0 : _a.private) === null || _b === void 0 ? void 0 : _b.tickTaskId; });
            for (const gcalTicktickTask of ticktickTasksOnGcal) {
                const isTaskStillOnTicktick = ticktickTasks.map((item) => item.id).includes(gcalTicktickTask.extendedProperties.private.tickTaskId);
                if (!isTaskStillOnTicktick) {
                    const taskCalendar = getCalendarByName(gcalTicktickTask.extendedProperties.private.calendar);
                    const taskDoneCalendar = getCalendarByName(gcalTicktickTask.extendedProperties.private.completedCalendar);
                    const gcalEvent = moveEventToOtherCalendar(taskCalendar, taskDoneCalendar, Object.assign(Object.assign({}, gcalTicktickTask), { colorId: undefined }));
                    result.completed_tasks.push(gcalEvent);
                }
            }
            return result;
        });
    }

    function isObject(obj) {
        return typeof obj === 'object' && obj !== null;
    }

    function validateNestedObject(obj, requiredConfigs) {
        if (!isObject(obj)) {
            return false;
        }
        for (const key in requiredConfigs) {
            if (!(key in obj)) {
                logger.error(`Missing key: ${key}`);
                return false;
            }
            const requiredType = typeof requiredConfigs[key];
            const objType = typeof obj[key];
            if (isObject(requiredConfigs[key])) {
                if (!isObject(obj[key]) || !validateNestedObject(obj[key], requiredConfigs[key])) {
                    logger.error(`Invalid nested structure or type mismatch at key: ${key}`);
                    return false;
                }
            }
            else if (requiredType !== objType) {
                logger.error(`Type mismatch at key: ${key}. Expected ${requiredType}, found ${objType}`);
                return false;
            }
        }
        return true;
    }
    function validateObjectSchema(configToValidate, requiredConfigs) {
        return validateNestedObject(configToValidate, requiredConfigs);
    }

    const basicRequiredObjectShape = {
        settings: {
            sync_function: '',
            timezone_correction: -3,
            update_frequency: 4,
            per_day_emails: {
                time_to_send: '15:00',
                email_new_gcal_sync_release: false,
                email_daily_summary: false
            },
            per_sync_emails: {
                email_errors: false,
                email_session: false
            }
        }
    };
    const ticktickCalItemObjectShape = {
        gcal: '',
        gcal_done: '',
        link: ''
    };
    const ticktickRequiredObjectShape = {
        should_sync: false,
        ics_calendars: []
    };
    const githubRequiredObjectShape = {
        username: '',
        commits_configs: {
            should_sync: false,
            commits_calendar: '',
            ignored_repos: [],
            parse_commit_emojis: false
        },
        personal_token: ''
    };
    function validateConfigs(configs) {
        if (!isObject(configs))
            return false;
        const isValid = {
            basic: true,
            ticktick: true,
            ticktickIcsItems: true,
            github: true,
            githubIgnoredRepos: true
        };
        isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
        isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);
        isValid.ticktick = validateObjectSchema(configs[ticktickConfigsKey], ticktickRequiredObjectShape);
        if (typeof configs[ticktickConfigsKey] === 'object' && 'ics_calendars' in configs[ticktickConfigsKey] && Array.isArray(configs[ticktickConfigsKey].ics_calendars)) {
            const itemsValidationArr = configs[ticktickConfigsKey].ics_calendars.map((item) => validateObjectSchema(item, ticktickCalItemObjectShape));
            isValid.ticktickIcsItems = itemsValidationArr.every((item) => item === true);
        }
        if (typeof configs[githubConfigsKey] === 'object' && 'ignored_repos' in configs[githubConfigsKey] && Array.isArray(configs[githubConfigsKey].ignored_repos)) {
            const itemsValidationArr = configs[githubConfigsKey].ignored_repos.map((item) => typeof item === 'string');
            isValid.githubIgnoredRepos = itemsValidationArr.every((item) => item === true);
        }
        return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
    }

    class GcalSync {
        constructor(configs) {
            this.extended_configs = {
                today_date: '',
                user_email: '',
                configs: {}
            };
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
        createMissingGASProperties() {
            const allProperties = listAllGASProperties();
            Object.keys(GAS_PROPERTIES_ENUM).forEach((key) => {
                const doesPropertyExist = Object.keys(allProperties).includes(key);
                if (!doesPropertyExist) {
                    updateGASProperty(GAS_PROPERTIES_ENUM[key], GAS_PROPERTIES_INITIAL_VALUE_ENUM[key]);
                }
            });
        }
        createMissingGcalCalendars() {
            const { shouldSyncGithub, shouldSyncTicktick } = checkIfShouldSync(this.extended_configs);
            // prettier-ignore
            const allGoogleCalendars = [...new Set([]
                    .concat(shouldSyncGithub ? [this.extended_configs.configs[githubConfigsKey].commits_configs.commits_calendar] : [])
                    .concat(shouldSyncTicktick ? [...this.extended_configs.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.extended_configs.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
            ];
            createMissingCalendars(allGoogleCalendars);
        }
        // ===========================================================================
        install() {
            return __awaiter(this, void 0, void 0, function* () {
                removeAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function);
                addAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function, this.extended_configs.configs.settings.update_frequency);
                this.createMissingGASProperties();
                logger.info(`${APP_INFO.name} was set to run function "${this.extended_configs.configs.settings.sync_function}" every ${this.extended_configs.configs.settings.update_frequency} minutes`);
            });
        }
        uninstall() {
            return __awaiter(this, void 0, void 0, function* () {
                removeAppsScriptsTrigger(this.extended_configs.configs.settings.sync_function);
                Object.keys(GAS_PROPERTIES_ENUM).forEach((key) => {
                    deleteGASProperty(GAS_PROPERTIES_ENUM[key]);
                });
                logger.info(`${APP_INFO.name} automation was removed from appscript!`);
            });
        }
        // ===========================================================================
        sync() {
            return __awaiter(this, void 0, void 0, function* () {
                const { shouldSyncGithub, shouldSyncTicktick } = checkIfShouldSync(this.extended_configs);
                if (!shouldSyncGithub && !shouldSyncTicktick) {
                    logger.info('nothing to sync');
                    return;
                }
                this.createMissingGcalCalendars();
                this.createMissingGASProperties();
                const emptySessionData = {
                    added_tasks: [],
                    updated_tasks: [],
                    completed_tasks: [],
                    commits_added: [],
                    commits_deleted: []
                };
                const ticktickSync = yield syncTicktick(this.extended_configs.configs);
                const githubSync = yield syncGithub(this.extended_configs.configs);
                const sessionData = Object.assign(Object.assign(Object.assign({}, emptySessionData), (shouldSyncTicktick && ticktickSync)), (shouldSyncGithub && githubSync));
                yield handleSessionData(this.extended_configs, sessionData);
            });
        }
        sendErrorEmail(errorMessage) {
            return __awaiter(this, void 0, void 0, function* () {
                const errorEmail = getErrorEmail(this.extended_configs.user_email, errorMessage);
                sendEmail(errorEmail);
            });
        }
    }

    return GcalSync;

}
function getGcalSyncDev(){

    const APP_INFO = {
        name: 'gcal-sync',
        github_repository: 'lucasvtiradentes/gcal-sync',
        version: '2.0.0'};

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
        MAX_GCAL_TASKS: 2500,
        REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
        BATCH_SIZE: 15,
        BATCH_DELAY_MS: 2000,
        GITHUB_MAX_PAGES_PER_RANGE: 10,
        GITHUB_MONTHS_TO_FETCH: 6,
        GITHUB_DELAY_BETWEEN_PAGES_MS: 2100,
        GITHUB_DELAY_BETWEEN_RANGES_MS: 1000,
        IS_TEST_ENVIRONMENT: typeof process !== 'object' ? false : (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.NODE_ENV
    };
    const GAS_PROPERTIES = [
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
            key: 'github_commits_tracked_to_be_added_hash',
            initial_value: ''
        },
        {
            key: 'github_commits_tracked_to_be_deleted_hash',
            initial_value: ''
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
        production_only: 'This method cannot run in non-production environments'};

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
        const todayEventsCount = session.commits_added.length + session.commits_deleted.length;
        return todayEventsCount;
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
        content += getGithubEmailContant(session);
        content += `<br/>Regards,<br/>your <a href='https://github.com/${APP_INFO.github_repository}'>${APP_INFO.name}</a> bot`;
        return content;
    }

    function checkIfShouldSync(extendedConfigs) {
        const shouldSyncGithub = extendedConfigs.configs[githubConfigsKey].commits_configs.should_sync;
        return {
            shouldSyncGithub
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
        const sizeInBytes = parsedValue.length;
        console.log(`updating property "${property}" with size: ${sizeInBytes} chars`);
        try {
            PropertiesService.getScriptProperties().setProperty(property, parsedValue);
        }
        catch (e) {
            console.log(`error updating property "${property}": ${e}`);
            throw e;
        }
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
        const gcalSyncTrigger = allAppsScriptTriggers.find((item) => item.getHandlerFunction() === functionName);
        if (gcalSyncTrigger) {
            ScriptApp.deleteTrigger(gcalSyncTrigger);
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
    function isCurrentTimeAfter(timeToCompare, timezone) {
        const dateFixedByTimezone = getDateFixedByTimezone(timezone);
        const curStamp = Number(dateFixedByTimezone.getHours()) * 60 + Number(dateFixedByTimezone.getMinutes());
        const timeArr = timeToCompare.split(':');
        const specifiedStamp = Number(timeArr[0]) * 60 + Number(timeArr[1]);
        return curStamp >= specifiedStamp;
    }
    function getCurrentDateInSpecifiedTimezone(timeZone) {
        const date = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(date);
        const findPart = (type) => parts.find((part) => part.type === type).value;
        const isoDate = `${findPart('year')}-${findPart('month')}-${findPart('day')}T${findPart('hour')}:${findPart('minute')}:${findPart('second')}.000`;
        return isoDate;
    }
    function getTimezoneOffset(timezone) {
        const date = new Date();
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
        const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        const offset = (Number(tzDate) - Number(utcDate)) / (1000 * 60 * 60);
        return offset;
    }

    function toMinimalCommit(commit) {
        return {
            htmlLink: commit.htmlLink,
            start: commit.start,
            extendedProperties: {
                private: {
                    repositoryLink: commit.extendedProperties.private.repositoryLink,
                    repositoryName: commit.extendedProperties.private.repositoryName,
                    commitMessage: commit.extendedProperties.private.commitMessage
                }
            }
        };
    }
    function getTodayStats() {
        const todayStats = {
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
    function handleSessionData(extendedConfigs, sessionData) {
        const { shouldSyncGithub } = checkIfShouldSync(extendedConfigs);
        const githubNewItems = sessionData.commits_added.length + sessionData.commits_deleted.length;
        if (shouldSyncGithub && githubNewItems > 0) {
            const todayAddedCommits = getGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits);
            const todayDeletedCommits = getGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits);
            const minimalAdded = sessionData.commits_added.map(toMinimalCommit);
            const minimalDeleted = sessionData.commits_deleted.map(toMinimalCommit);
            updateGASProperty(GAS_PROPERTIES_ENUM.today_github_added_commits, [...todayAddedCommits, ...minimalAdded]);
            updateGASProperty(GAS_PROPERTIES_ENUM.today_github_deleted_commits, [...todayDeletedCommits, ...minimalDeleted]);
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
    function sendSessionEmails(extendedConfigs, sessionData, totalSessionNewItems) {
        var _a;
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
    }

    function getDateRanges(monthsBack = CONFIGS.GITHUB_MONTHS_TO_FETCH) {
        const ranges = [];
        const now = new Date();
        for (let i = 0; i < monthsBack; i++) {
            const end = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
            ranges.push({
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            });
        }
        return ranges;
    }
    function fetchCommitsForDateRange(username, personalToken, startDate, endDate) {
        var _a, _b, _c;
        const commits = [];
        let pageNumber = 1;
        while (pageNumber <= CONFIGS.GITHUB_MAX_PAGES_PER_RANGE) {
            const query = `author:${username}+committer-date:${startDate}..${endDate}`;
            const url = `https://api.github.com/search/commits?q=${query}&page=${pageNumber}&sort=committer-date&per_page=100`;
            const options = {
                muteHttpExceptions: true,
                headers: personalToken ? { Authorization: `Bearer ${personalToken}` } : {}
            };
            let response;
            try {
                response = UrlFetchApp.fetch(url, options);
            }
            catch (e) {
                console.log(`network error during ${startDate}..${endDate} page ${pageNumber}, returning partial results`);
                break;
            }
            const data = (_a = JSON.parse(response.getContentText())) !== null && _a !== void 0 ? _a : {};
            if (response.getResponseCode() !== 200) {
                if (response.getResponseCode() === 403 && ((_b = data.message) === null || _b === void 0 ? void 0 : _b.includes('rate limit'))) {
                    console.log(`GitHub rate limit hit during ${startDate}..${endDate}`);
                    break;
                }
                break;
            }
            const items = (_c = data.items) !== null && _c !== void 0 ? _c : [];
            if (items.length === 0)
                break;
            commits.push(...items);
            if (items.length < 100)
                break;
            Utilities.sleep(CONFIGS.GITHUB_DELAY_BETWEEN_PAGES_MS);
            pageNumber++;
        }
        return commits;
    }
    function getAllGithubCommits(username, personalToken) {
        const allCommitsArr = [];
        const dateRanges = getDateRanges();
        console.log(`fetching commits for ${dateRanges.length} date ranges (${CONFIGS.GITHUB_MONTHS_TO_FETCH} months)`);
        for (const range of dateRanges) {
            const commits = fetchCommitsForDateRange(username, personalToken, range.start, range.end);
            if (commits.length > 0) {
                allCommitsArr.push(...commits);
                console.log(`${range.start}..${range.end}: ${commits.length} commits (total: ${allCommitsArr.length})`);
            }
            Utilities.sleep(CONFIGS.GITHUB_DELAY_BETWEEN_RANGES_MS);
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
    const getCurrentTimezoneFromGoogleCalendar = () => {
        return CalendarApp.getDefaultCalendar().getTimeZone();
    };
    const createMissingCalendars = (allGcalendarsNames) => {
        let createdCalendar = false;
        logger.info(`checking calendars to create: ${JSON.stringify(allGcalendarsNames)}`);
        allGcalendarsNames.forEach((calName) => {
            const exists = checkIfCalendarExists(calName);
            logger.info(`calendar "${calName}" exists: ${!!exists}`);
            if (!exists) {
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
    function addEventsToCalendarBatch(calendar, events) {
        if (events.length === 0)
            return [];
        const token = ScriptApp.getOAuthToken();
        const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`;
        const requests = events.map((event) => ({
            url: baseUrl,
            method: 'post',
            contentType: 'application/json',
            headers: { Authorization: `Bearer ${token}` },
            payload: JSON.stringify(event),
            muteHttpExceptions: true
        }));
        const responses = UrlFetchApp.fetchAll(requests);
        const results = responses.map((response, index) => {
            if (response.getResponseCode() === 200) {
                return JSON.parse(response.getContentText());
            }
            else {
                logger.info(`failed to add event ${index}: ${response.getContentText()}`);
                return null;
            }
        });
        return results.filter((r) => r !== null);
    }
    function removeCalendarEvent(calendar, event) {
        Calendar.Events.remove(calendar.id, event.id);
    }

    function computeHash(ids) {
        const sorted = [...ids].sort().join(',');
        const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sorted);
        return digest.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
    }
    function resetGithubSyncProperties() {
        updateGASProperty('github_commit_changes_count', '0');
        updateGASProperty('github_commits_tracked_to_be_added_hash', '');
        updateGASProperty('github_commits_tracked_to_be_deleted_hash', '');
    }
    function getFilterGithubRepos(configs, commits) {
        const commitsSortedByDate = commits.sort((a, b) => Number(new Date(b.commitDate)) - Number(new Date(a.commitDate)));
        const onlyCommitsOnUserRepositories = commitsSortedByDate.filter((item) => item.repository.includes(configs[githubConfigsKey].username));
        const filteredRepos = onlyCommitsOnUserRepositories.filter((item) => configs[githubConfigsKey].commits_configs.ignored_repos.includes(item.repositoryName) === false);
        return filteredRepos;
    }
    function syncGithub(configs) {
        var _a;
        logger.info(`syncing github commits`);
        const info = {
            githubCommits: getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token),
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
        const filteredRepos = getFilterGithubRepos(configs, info.githubCommits);
        logger.info(`found ${filteredRepos.length} commits after filtering`);
        const githubCalendar = getCalendarByName(configs[githubConfigsKey].commits_configs.commits_calendar);
        logger.info(`github calendar "${configs[githubConfigsKey].commits_configs.commits_calendar}" found: ${!!githubCalendar}, id: ${(_a = githubCalendar === null || githubCalendar === void 0 ? void 0 : githubCalendar.id) !== null && _a !== void 0 ? _a : 'N/A'}`);
        const result = Object.assign(Object.assign({}, syncGithubCommitsToAdd({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, filteredRepos: filteredRepos, parseCommitEmojis: configs[githubConfigsKey].commits_configs.parse_commit_emojis })), syncGithubCommitsToDelete({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, filteredRepos: filteredRepos }));
        if (result.commits_tracked_to_be_added.length === 0 && result.commits_tracked_to_be_deleted.length === 0) {
            logger.info(`reset github commit properties due found no commits tracked`);
            resetGithubSyncProperties();
        }
        return result;
    }
    function syncGithubCommitsToAdd({ filteredRepos, currentGithubSyncIndex, githubCalendar, githubGcalCommits, parseCommitEmojis }) {
        const githubSessionStats = {
            commits_tracked_to_be_added: [],
            commits_added: []
        };
        for (const githubCommitItem of filteredRepos) {
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
        const commitIdsToAdd = githubSessionStats.commits_tracked_to_be_added.map((item) => item.extendedProperties.private.commitId);
        const currentHash = computeHash(commitIdsToAdd);
        if (currentGithubSyncIndex === 1) {
            logger.info(`storing hash for ${commitIdsToAdd.length} commits to track for addition`);
            updateGASProperty('github_commits_tracked_to_be_added_hash', currentHash);
            return githubSessionStats;
        }
        const lastHash = getGASProperty('github_commits_tracked_to_be_added_hash');
        if (!lastHash) {
            logger.info(`no stored hash found, resetting to step 1`);
            resetGithubSyncProperties();
            updateGASProperty('github_commits_tracked_to_be_added_hash', currentHash);
            return githubSessionStats;
        }
        logger.info(`comparing hashes: stored=${lastHash.slice(0, 8)}... current=${currentHash.slice(0, 8)}...`);
        if (lastHash !== currentHash) {
            logger.info(`reset github commit properties due hash mismatch in added commits`);
            resetGithubSyncProperties();
            return githubSessionStats;
        }
        if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commits_tracked_to_be_added.length > 0) {
            const totalCommits = githubSessionStats.commits_tracked_to_be_added.length;
            const totalBatches = Math.ceil(totalCommits / CONFIGS.BATCH_SIZE);
            logger.info(`adding ${totalCommits} commits to gcal in ${totalBatches} batches of ${CONFIGS.BATCH_SIZE}`);
            for (let i = 0; i < totalCommits; i += CONFIGS.BATCH_SIZE) {
                const batch = githubSessionStats.commits_tracked_to_be_added.slice(i, i + CONFIGS.BATCH_SIZE);
                const addedEvents = addEventsToCalendarBatch(githubCalendar, batch);
                githubSessionStats.commits_added.push(...addedEvents);
                logger.info(`batch ${Math.floor(i / CONFIGS.BATCH_SIZE) + 1}/${totalBatches}: added ${addedEvents.length} commits`);
                if (i + CONFIGS.BATCH_SIZE < totalCommits) {
                    Utilities.sleep(CONFIGS.BATCH_DELAY_MS);
                }
            }
            resetGithubSyncProperties();
        }
        return githubSessionStats;
    }
    function syncGithubCommitsToDelete({ githubGcalCommits, githubCalendar, currentGithubSyncIndex, filteredRepos }) {
        const githubSessionStats = {
            commits_deleted: [],
            commits_tracked_to_be_deleted: []
        };
        githubGcalCommits.forEach((gcalItem) => {
            const gcalProperties = gcalItem.extendedProperties.private;
            const onlySameRepoCommits = filteredRepos.filter((item) => item.repository === gcalProperties.repository);
            const commitStillExistsOnGithub = onlySameRepoCommits.find((item) => item.commitDate === gcalProperties.commitDate && parseGithubEmojisString(item.commitMessage) === parseGithubEmojisString(gcalProperties.commitMessage));
            if (!commitStillExistsOnGithub) {
                githubSessionStats.commits_tracked_to_be_deleted.push(gcalItem);
            }
        });
        const commitIdsToDelete = githubSessionStats.commits_tracked_to_be_deleted.map((item) => item.extendedProperties.private.commitId);
        const currentHash = computeHash(commitIdsToDelete);
        if (currentGithubSyncIndex === 1) {
            logger.info(`storing hash for ${commitIdsToDelete.length} commits to track for deletion`);
            updateGASProperty('github_commits_tracked_to_be_deleted_hash', currentHash);
            return githubSessionStats;
        }
        const lastHash = getGASProperty('github_commits_tracked_to_be_deleted_hash');
        if (!lastHash) {
            logger.info(`no stored delete hash found, resetting to step 1`);
            resetGithubSyncProperties();
            updateGASProperty('github_commits_tracked_to_be_deleted_hash', currentHash);
            return githubSessionStats;
        }
        logger.info(`comparing delete hashes: stored=${lastHash.slice(0, 8)}... current=${currentHash.slice(0, 8)}...`);
        if (lastHash !== currentHash) {
            logger.info(`reset github commit properties due hash mismatch in deleted commits`);
            resetGithubSyncProperties();
            return githubSessionStats;
        }
        if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commits_tracked_to_be_deleted.length > 0) {
            logger.info(`deleting ${githubSessionStats.commits_tracked_to_be_deleted.length} commits on gcal`);
            for (let x = 0; x < githubSessionStats.commits_tracked_to_be_deleted.length; x++) {
                const item = githubSessionStats.commits_tracked_to_be_deleted[x];
                removeCalendarEvent(githubCalendar, item);
                githubSessionStats.commits_deleted.push(item);
                if (x % 50 === 0 || x === githubSessionStats.commits_tracked_to_be_deleted.length - 1) {
                    logger.info(`${x + 1}/${githubSessionStats.commits_tracked_to_be_deleted.length} commits deleted from gcal`);
                }
            }
            resetGithubSyncProperties();
        }
        return githubSessionStats;
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
            skip_mode: false,
            timezone_offset_correction: 0,
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
            github: true,
            githubIgnoredRepos: true
        };
        isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
        isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);
        if (typeof configs[githubConfigsKey] === 'object' && 'ignored_repos' in configs[githubConfigsKey] && Array.isArray(configs[githubConfigsKey].ignored_repos)) {
            const itemsValidationArr = configs[githubConfigsKey].ignored_repos.map((item) => typeof item === 'string');
            isValid.githubIgnoredRepos = itemsValidationArr.every((item) => item === true);
        }
        return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
    }

    class GcalSync {
        constructor(configs) {
            this.extended_configs = {
                timezone: '',
                timezone_offset: 0,
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
            const { shouldSyncGithub } = checkIfShouldSync(this.extended_configs);
            const allGoogleCalendars = [...new Set([].concat(shouldSyncGithub ? [this.extended_configs.configs[githubConfigsKey].commits_configs.commits_calendar] : []))];
            createMissingCalendars(allGoogleCalendars);
        }
        // api methods ===============================================================
        handleError(error) {
            if (this.extended_configs.configs.settings.per_sync_emails.email_errors) {
                const parsedError = typeof error === 'string' ? error : error instanceof Error ? error.message : JSON.stringify(error);
                const errorEmail = getErrorEmail(this.extended_configs.user_email, parsedError);
                sendEmail(errorEmail);
            }
            else {
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
            const emptySessionData = {
                commits_added: [],
                commits_deleted: [],
                commits_tracked_to_be_added: [],
                commits_tracked_to_be_deleted: []
            };
            const sessionData = Object.assign(Object.assign({}, emptySessionData), (shouldSyncGithub && syncGithub(this.extended_configs.configs)));
            const parsedSessionData = handleSessionData(this.extended_configs, sessionData);
            return parsedSessionData;
        }
    }

    return GcalSync;

}
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.GcalSync = factory());
})(this, (function () { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol */


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

    const CONFIGS = {
        DEBUG_MODE: true,
        MAX_GCAL_TASKS: 2500,
        REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
        EVENTS_DIVIDER: ' | '
    };
    const GAS_PROPERTIES = {
        today_ticktick_added_tasks: {
            key: 'today_ticktick_added_tasks',
            schema: {}
        },
        today_ticktick_updated_tasks: {
            key: 'today_ticktick_updated_tasks',
            schema: {}
        },
        today_ticktick_completed_tasks: {
            key: 'today_ticktick_completed_tasks',
            schema: {}
        },
        today_github_added_commits: {
            key: 'today_github_added_commits',
            schema: {}
        },
        today_github_deleted_commits: {
            key: 'today_github_deleted_commits',
            schema: {}
        },
        last_released_version_alerted: {
            key: 'last_released_version_alerted',
            schema: {}
        },
        last_daily_email_sent_date: {
            key: 'last_daily_email_sent_date',
            schema: {}
        },
        github_last_added_commits: {
            key: 'github_last_added_commits',
            schema: {}
        },
        github_last_deleted_commits: {
            key: 'github_last_deleted_commits',
            schema: {}
        },
        github_commit_changes_count: {
            key: 'github_commit_changes_count',
            schema: {}
        }
    };

    const logger = {
        info: (message, ...optionalParams) => {
            {
                console.log(message, ...optionalParams);
            }
        },
        error: (message, ...optionalParams) => {
            {
                console.error(message, ...optionalParams);
            }
        }
    };

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
        try {
            const eventFinal = Calendar.Events.insert(event, calendar.id);
            return eventFinal;
        }
        catch (e) {
            logger.info(`error when adding event [${event.summary}] to gcal: ${e.message}`);
            return event;
        }
    }
    function moveEventToOtherCalendar(calendar, newCalendar, event) {
        removeCalendarEvent(calendar, event);
        Utilities.sleep(2000);
        const newEvent = addEventToCalendar(newCalendar, event);
        return newEvent;
    }
    function removeCalendarEvent(calendar, event) {
        try {
            Calendar.Events.remove(calendar.id, event.id);
        }
        catch (e) {
            logger.info(`error when deleting event [${event.summary}] to gcal: ${e.message}`);
        }
    }

    const APP_INFO = {
        name: 'gcal-sync',
        version: '2.0.0',
        github_repository: 'lucasvtiradentes/gcal-sync'
    };

    const ticktickConfigsKey = 'ticktick_sync';
    const githubConfigsKey = 'github_sync';

    const ERRORS = {
        productionOnly: 'This method cannot run in non-production environments',
        incorrectIcsCalendar: 'The link you provided is not a valid ICS calendar: ',
        mustSpecifyConfig: 'You must specify the settings when starting the class',
        httpsError: 'You provided an invalid ICS calendar link: ',
        invalidGithubToken: 'You provided an invalid github token',
        invalidGithubUsername: 'You provided an invalid github username',
        abusiveGoogleCalendarApiUse: 'Due to the numerous operations in the last few hours, the google api is not responding.'
    };

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
                        throw new Error(ERRORS.invalidGithubUsername);
                    }
                    if (data.message === 'Bad credentials') {
                        throw new Error(ERRORS.invalidGithubToken);
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
                    commitDate: it.commit.committer.date,
                    commitMessage: it.commit.message.split('\n')[0],
                    commitId: it.html_url.split('commit/')[1],
                    commitUrl: it.html_url,
                    repository: it.repository.full_name,
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

    const mergeArraysOfArrays = (arr) => arr.reduce((acc, val) => acc.concat(val), []);
    function getUniqueElementsOnArrays(arrayA, arrayB) {
        const uniqueInA = arrayA.filter((item) => !arrayB.includes(item));
        const uniqueInB = arrayB.filter((item) => !arrayA.includes(item));
        return uniqueInA.concat(uniqueInB);
    }

    function resetGithubSyncProperties() {
        updateGASProperty('github_commit_changes_count', '0');
        updateGASProperty('github_last_added_commits', []);
        updateGASProperty('github_last_deleted_commits', []);
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
            if (result.commitsTrackedToBeAdded.length === 0 && result.commitsTrackedToBeDelete.length === 0) {
                logger.info(`reset github commit properties due found no commits tracked`);
                resetGithubSyncProperties();
            }
            return result;
        });
    }
    function syncGithubCommitsToAdd({ onlyCommitsFromValidRepositories, currentGithubSyncIndex, githubCalendar, githubGcalCommits, parseCommitEmojis }) {
        return __awaiter(this, void 0, void 0, function* () {
            const githubSessionStats = {
                commitsTrackedToBeAdded: [],
                commitsAdded: []
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
                    githubSessionStats.commitsTrackedToBeAdded.push(taskEvent);
                }
            }
            if (currentGithubSyncIndex === 1) {
                updateGASProperty('github_last_added_commits', githubSessionStats.commitsTrackedToBeAdded.map((item) => item));
                return githubSessionStats;
            }
            const lastAddedCommits = getGASProperty('github_last_added_commits');
            const lastAddedCommitsIds = lastAddedCommits.map((item) => item.extendedProperties.private.commitId);
            const currentIterationCommitsIds = githubSessionStats.commitsTrackedToBeAdded.map((item) => item.extendedProperties.private.commitId);
            const remainingCommits = getUniqueElementsOnArrays(lastAddedCommitsIds, currentIterationCommitsIds);
            if (remainingCommits.length > 0) {
                logger.info(`reset github commit properties due differences in added commits`);
                resetGithubSyncProperties();
                return githubSessionStats;
            }
            if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commitsTrackedToBeAdded.length > 0) {
                logger.info(`adding ${githubSessionStats.commitsTrackedToBeAdded.length} commits to gcal`);
                for (let x = 0; x < githubSessionStats.commitsTrackedToBeAdded.length; x++) {
                    try {
                        const item = githubSessionStats.commitsTrackedToBeAdded[x];
                        const commitGcalEvent = addEventToCalendar(githubCalendar, item);
                        githubSessionStats.commitsAdded.push(item);
                        logger.info(`${x + 1}/${githubSessionStats.commitsTrackedToBeAdded.length} add new commit to gcal: ${item.extendedProperties.private.commitDate} - ${commitGcalEvent.extendedProperties.private.repositoryName} - ${commitGcalEvent.extendedProperties.private.commitMessage}`);
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
                commitsDeleted: [],
                commitsTrackedToBeDelete: []
            };
            githubGcalCommits.forEach((gcalItem) => {
                const gcalProperties = gcalItem.extendedProperties.private;
                const onlySameRepoCommits = onlyCommitsFromValidRepositories.filter((item) => item.repository === gcalProperties.repository);
                const commitStillExistsOnGithub = onlySameRepoCommits.find((item) => item.commitDate === gcalProperties.commitDate && parseGithubEmojisString(item.commitMessage) === parseGithubEmojisString(gcalProperties.commitMessage));
                if (!commitStillExistsOnGithub) {
                    githubSessionStats.commitsTrackedToBeDelete.push(gcalItem);
                }
            });
            if (currentGithubSyncIndex === 1) {
                updateGASProperty('github_last_deleted_commits', githubSessionStats.commitsTrackedToBeDelete);
                return githubSessionStats;
            }
            const lastDeletedCommits = getGASProperty('github_last_deleted_commits');
            const lastDeletedCommitsIds = lastDeletedCommits.map((item) => item.extendedProperties.private.commitId);
            const currentIterationDeletedCommitsIds = githubSessionStats.commitsTrackedToBeDelete.map((item) => item.extendedProperties.private.commitId);
            const remainingDeletedCommits = getUniqueElementsOnArrays(lastDeletedCommitsIds, currentIterationDeletedCommitsIds);
            if (remainingDeletedCommits.length > 0) {
                logger.info(`reset github commit properties due differences in deleted commits`);
                resetGithubSyncProperties();
                return githubSessionStats;
            }
            if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commitsTrackedToBeDelete.length > 0) {
                logger.info(`deleting ${githubSessionStats.commitsTrackedToBeDelete.length} commits on gcal`);
                for (let x = 0; x < githubSessionStats.commitsTrackedToBeDelete.length; x++) {
                    try {
                        const item = githubSessionStats.commitsTrackedToBeDelete[x];
                        removeCalendarEvent(githubCalendar, item);
                        githubSessionStats.commitsDeleted.push(item);
                        logger.info(`${x + 1}/${githubSessionStats.commitsTrackedToBeDelete.length} deleted commit on gcal: ${item.extendedProperties.private.commitDate} - ${item.extendedProperties.private.repositoryName} - ${item.extendedProperties.private.commitMessage}`);
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

    const getStrBetween = (str, substr1, substr2) => {
        const newStr = str.slice(str.search(substr1)).replace(substr1, '');
        return newStr.slice(0, newStr.search(substr2));
    };

    const getIcsCalendarTasks = (icsLink, timezoneCorrection) => __awaiter(void 0, void 0, void 0, function* () {
        const parsedLink = icsLink.replace('webcal://', 'https://');
        const urlResponse = UrlFetchApp.fetch(parsedLink, { validateHttpsCertificates: false, muteHttpExceptions: true });
        const data = urlResponse.getContentText() || '';
        if (urlResponse.getResponseCode() !== 200) {
            throw new Error(ERRORS.httpsError + parsedLink);
        }
        if (data.search('BEGIN:VCALENDAR') === -1) {
            throw new Error('RESPOSTA INVALIDA PRA UM ICS');
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
                    throw new Error(ERRORS.abusiveGoogleCalendarApiUse);
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
                const extendedTasks = tasks.map((item) => (Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, item), { gcal: icsCal.gcal, gcal_done: icsCal.gcal_done }), (icsCal.color ? { color: icsCal.color } : {})), (icsCal.tag ? { tag: icsCal.tag } : {})), (icsCal.ignoredTags ? { ignoredTags: icsCal.ignoredTags } : {}))));
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
                    result.added_tasks.push(yield addTicktickTaskToGcal(correspondingCalendar, ticktickTask));
                }
                else {
                    const hasChangedCalendar = correspondingCalendar.summary !== taskOnGcal.extendedProperties.private.calendar;
                    const changedTicktickFields = yield checkIfTicktickTaskInfoWasChanged(ticktickTask, taskOnGcal);
                    const taskDoneCalendar = getCalendarByName(ticktickTask.gcal_done);
                    if (hasChangedCalendar) {
                        result.updated_tasks.push(moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, Object.assign(Object.assign({}, taskOnGcal), { colorId: undefined })));
                    }
                    else if (changedTicktickFields.length > 0) {
                        result.updated_tasks.push(moveEventToOtherCalendar(correspondingCalendar, taskDoneCalendar, Object.assign(Object.assign({}, taskOnGcal), { colorId: undefined })));
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
            update_frequency: 4
        },
        options: {
            daily_summary_email_time: '15:00',
            email_daily_summary: false,
            email_errors: false,
            email_new_gcal_sync_release: false,
            email_session: false,
            maintenance_mode: false,
            show_logs: false
        }
    };
    const ticktickRequiredObjectShape = {
        ics_calendars: []
    };
    const githubRequiredObjectShape = {
        username: '',
        commits_configs: {
            commits_calendar: '',
            ignored_repos: [],
            parse_commit_emojis: false
        },
        issues_configs: {
            issues_calendar: ''
        },
        personal_token: ''
    };
    function validateConfigs(configs) {
        if (!isObject(configs))
            return false;
        const isValid = {
            basic: true,
            ticktick: true,
            github: true
        };
        isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
        if (ticktickConfigsKey in configs) {
            isValid.ticktick = validateObjectSchema(configs[ticktickConfigsKey], ticktickRequiredObjectShape);
        }
        if (githubConfigsKey in configs) {
            isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);
        }
        return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
    }

    class GcalSync {
        constructor(configs) {
            this.configs = configs;
            if (!validateConfigs(configs)) {
                throw new Error('schema invalid');
            }
            this.is_gas_environment = isRunningOnGAS();
            this.today_date = getDateFixedByTimezone(this.configs.settings.timezone_correction).toISOString().split('T')[0];
            logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
        }
        // ===========================================================================
        parseGcalVersion(v) {
            return Number(v.replace('v', '').split('.').join(''));
        }
        getLatestGcalSyncRelease() {
            var _a;
            const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${APP_INFO.github_repository}/releases?per_page=1`);
            const lastReleaseObj = (_a = JSON.parse(json_encoded.getContentText())[0]) !== null && _a !== void 0 ? _a : {};
            if (Object.keys(lastReleaseObj).length === 0) {
                return; // no releases were found
            }
            return lastReleaseObj;
        }
        install() {
            return __awaiter(this, void 0, void 0, function* () {
                removeAppsScriptsTrigger(this.configs.settings.sync_function);
                addAppsScriptsTrigger(this.configs.settings.sync_function, this.configs.settings.update_frequency);
                Object.keys(GAS_PROPERTIES).forEach((key) => {
                    const doesPropertyExist = listAllGASProperties().includes(key);
                    if (!doesPropertyExist) {
                        updateGASProperty(GAS_PROPERTIES[key].key, '');
                    }
                });
                logger.info(`${APP_INFO.name} was set to run function "${this.configs.settings.sync_function}" every ${this.configs.settings.update_frequency} minutes`);
            });
        }
        uninstall() {
            return __awaiter(this, void 0, void 0, function* () {
                removeAppsScriptsTrigger(this.configs.settings.sync_function);
                Object.keys(GAS_PROPERTIES).forEach((key) => {
                    deleteGASProperty(GAS_PROPERTIES[key].key);
                });
                logger.info(`${APP_INFO.name} automation was removed from appscript!`);
            });
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
            const TODAY_SESSION = {
                addedGithubCommits: getGASProperty(GAS_PROPERTIES.today_github_added_commits.key),
                addedTicktickTasks: getGASProperty(GAS_PROPERTIES.today_ticktick_added_tasks.key),
                completedTicktickTasks: getGASProperty(GAS_PROPERTIES.today_ticktick_completed_tasks.key),
                deletedGithubCommits: getGASProperty(GAS_PROPERTIES.today_github_deleted_commits.key),
                updatedTicktickTasks: getGASProperty(GAS_PROPERTIES.today_ticktick_updated_tasks.key)
            };
            return TODAY_SESSION;
        }
        // ===========================================================================
        sync() {
            return __awaiter(this, void 0, void 0, function* () {
                const shouldSyncGithub = this.configs[githubConfigsKey];
                const shouldSyncTicktick = this.configs[ticktickConfigsKey];
                if (!shouldSyncGithub && !shouldSyncTicktick) {
                    logger.info('nothing to sync');
                    return;
                }
                // prettier-ignore
                const allGoogleCalendars = [...new Set([]
                        .concat(shouldSyncGithub ? [this.configs[githubConfigsKey].commits_configs.commits_calendar, this.configs[githubConfigsKey].issues_configs.issues_calendar] : [])
                        .concat(shouldSyncTicktick ? [...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal), ...this.configs[ticktickConfigsKey].ics_calendars.map((item) => item.gcal_done)] : []))
                ];
                createMissingCalendars(allGoogleCalendars);
                const result = Object.assign(Object.assign({}, (shouldSyncTicktick && (yield syncTicktick(this.configs)))), (shouldSyncGithub && (yield syncGithub(this.configs))));
                logger.info({
                    added_tasks: result.added_tasks.length,
                    completed_tasks: result.completed_tasks.length,
                    updated_tasks: result.updated_tasks.length,
                    commitsAdded: result.commitsAdded.length,
                    commitsDeleted: result.commitsDeleted.length,
                    commitsTrackedToBeAdded: result.commitsTrackedToBeAdded.length,
                    commitsTrackedToBeDelete: result.commitsTrackedToBeDelete.length
                });
            });
        }
    }

    return GcalSync;

}));

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
        todayTicktickAddedTasks: {
            key: 'todayTicktickAddedTasks',
            schema: {}
        },
        todayTicktickUpdateTasks: {
            key: 'todayTicktickUpdateTasks',
            schema: {}
        },
        todayTicktickCompletedTasks: {
            key: 'todayTicktickCompletedTasks',
            schema: {}
        },
        todayGithubAddedCommits: {
            key: 'todayGithubAddedCommits',
            schema: {}
        },
        todayGithubDeletedCommits: {
            key: 'todayGithubDeletedCommits',
            schema: {}
        },
        lastReleasedVersionAlerted: {
            key: 'lastReleasedVersionAlerted',
            schema: {}
        },
        lastDailyEmailSentDate: {
            key: 'lastDailyEmailSentDate',
            schema: {}
        },
        githubLastAddedCommits: {
            key: 'githubLastAddedCommits',
            schema: {}
        },
        githubLastDeletedCommits: {
            key: 'githubLastDeletedCommits',
            schema: {}
        },
        githubCommitChangesCount: {
            key: 'githubCommitChangesCount',
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
                    commitDate: it.commit.author.date,
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

    function syncGithub(configs) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = {
                githubCommits: yield getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token),
                githubGcalCommits: getTasksFromGoogleCalendars([configs[githubConfigsKey].commits_configs.commits_calendar])
            };
            console.log(info.githubCommits.length);
            const sortedCommits = info.githubCommits.sort((a, b) => Number(new Date(b.commitDate)) - Number(new Date(a.commitDate)));
            const onlyCommitsOnUserRepositories = sortedCommits.filter((item) => item.repository.includes(configs[githubConfigsKey].username));
            const onlyCommitsFromValidRepositories = onlyCommitsOnUserRepositories.filter((item) => configs[githubConfigsKey].commits_configs.ignored_repos.includes(item.repositoryName) === false);
            console.log({ onlyCommitsFromValidRepositories });
            for (const githubCommitItem of onlyCommitsFromValidRepositories) {
                console.log(githubCommitItem);
                const sameRepoCommits = info.githubGcalCommits.filter((gcalItem) => gcalItem.extendedProperties.private.repository === githubCommitItem.repository);
                const hasEquivalentGcalTask = sameRepoCommits.find((gcalItem) => gcalItem.extendedProperties.private.commitDate === githubCommitItem.commitDate && parseGithubEmojisString(gcalItem.extendedProperties.private.commitMessage) === parseGithubEmojisString(githubCommitItem.commitMessage));
                if (!hasEquivalentGcalTask) {
                    const commitMessage = configs[githubConfigsKey].commits_configs.parse_commit_emojis ? parseGithubEmojisString(githubCommitItem.commitMessage) : githubCommitItem.commitMessage;
                    const extendProps = {
                        private: {
                            commitDate: githubCommitItem.commitDate,
                            commitMessage: commitMessage,
                            repository: githubCommitItem.repository
                        }
                    };
                    ({
                        summary: `${githubCommitItem.repositoryName} - ${commitMessage}`,
                        description: `repository: https://github.com/${githubCommitItem.repository}\ncommit: ${githubCommitItem.commitUrl}`,
                        start: { dateTime: githubCommitItem.commitDate },
                        end: { dateTime: githubCommitItem.commitDate },
                        reminders: {
                            useDefault: false,
                            overrides: []
                        },
                        extendedProperties: extendProps
                    });
                    console.log(`add commit to gcal: ${githubCommitItem.repositoryName}`);
                }
            }
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

    function getDateFixedByTimezone(timeZoneIndex) {
        const date = new Date();
        date.setHours(date.getHours() + timeZoneIndex);
        return date;
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
            updateGASProperty(GAS_PROPERTIES.todayGithubAddedCommits.key, '');
            updateGASProperty(GAS_PROPERTIES.todayGithubDeletedCommits.key, '');
            updateGASProperty(GAS_PROPERTIES.todayTicktickAddedTasks.key, '');
            updateGASProperty(GAS_PROPERTIES.todayTicktickCompletedTasks.key, '');
            updateGASProperty(GAS_PROPERTIES.todayTicktickUpdateTasks.key, '');
            logger.info(`${this.today_date} stats were reseted!`);
        }
        getTodayEvents() {
            const TODAY_SESSION = {
                addedGithubCommits: getGASProperty(GAS_PROPERTIES.todayGithubAddedCommits.key),
                addedTicktickTasks: getGASProperty(GAS_PROPERTIES.todayTicktickAddedTasks.key),
                completedTicktickTasks: getGASProperty(GAS_PROPERTIES.todayTicktickCompletedTasks.key),
                deletedGithubCommits: getGASProperty(GAS_PROPERTIES.todayGithubDeletedCommits.key),
                updatedTicktickTasks: getGASProperty(GAS_PROPERTIES.todayTicktickUpdateTasks.key)
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
                // if (shouldSyncTicktick) {
                //   await syncTicktick(this.configs);
                // }
                if (shouldSyncGithub) {
                    yield syncGithub(this.configs);
                }
            });
        }
    }

    return GcalSync;

}));

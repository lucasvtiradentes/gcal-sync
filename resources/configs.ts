import { TConfigs } from '../src/consts/types';

export const configs: TConfigs = {
  settings: {
    sync_function: 'sync',
    timezone_correction: -3,
    update_frequency: 4
  },
  options: {
    daily_summary_email_time: '22:00',
    email_daily_summary: false,
    email_errors: false,
    email_new_gcal_sync_release: false,
    email_session: false
  },
  github_sync: {
    username: 'lucasvtiradentes',
    personal_token: '',
    commits_configs: {
      commits_calendar: 'gh_commits',
      ignored_repos: ['github-assets'],
      parse_commit_emojis: true
    }
  },
  ticktick_sync: {
    ics_calendars: [
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/frnl8al7cjlu/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done',
        color: 11,
        tag: 'IMP'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/8aruggvi1svr/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_PLANNING',
        color: 5,
        tag: 'PLA'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/4z4s5kkj4eyg/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_RESTING',
        color: 8,
        tag: 'RES'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/0fq1uf36y7ne/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_RELATIONSHIPS',
        color: 4,
        tag: 'REL'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/vyysfgcyi0fs/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_WORK',
        color: 1,
        tag: 'WOR'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/hhafxppb9jkm/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_WEALTH',
        color: 9,
        tag: 'WEA'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/6uszbh0es8qv/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_HEALTH',
        color: 2,
        tag: 'HEL'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/z0b1l06k65bm/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done_JOY',
        color: 3,
        tag: 'JOY'
      },
      {
        link: 'webcal://ticktick.com/pub/calendar/feeds/vvl0cw34vamw/basic.ics',
        gcal: 'tasks',
        gcal_done: 'done',
        ignoredTags: ['IMP', 'PLA', 'RES', 'REL', 'WOR', 'WEA', 'HEL', 'JOY']
      }
    ]
  }
};

// {
//   ticktickSync: {
//     icsCalendars: [
//       ['webcal://icscal1.ics', 'gcal_1', 'gcal_completed'],                             // everything will be synced
//       ['webcal://icscal2.ics', 'gcal_2', 'gcal_completed', { tag: '#FUN' }],            // everything will be synced, but marks all tasks with a label
//       ['webcal://icscal3.ics', 'gcal_3', 'gcal_completed', { tag: '#IMP', color: 2 }],  // everything will be synced, but marks all tasks with a label amd changes the color of the gcal events [colors go from 1 to 12]
//       ['webcal://icscal4.ics', 'gcal_all', 'gcal_completed', { ignoredTags: ['#FUN'] }] // everything will be synced, excepts tasks with the specifieds labels
//     ] as any
//   },
//   githubSync: {
//     username: "githubusername",   // github username
//     googleCalendar: "gh_commits", // google calendar to insert commits as events
//     personalToken: '',            // github token, required if you want to sync private repo commits
//     ignoredRepos: [],             // ignored repositories string array: ['repo1', 'repo2']
//     parseGithubEmojis: true       // parse string emojis (:tada:) to emojis (✨)
//   },
//   datetime: {
//     dailyEmailsTime: '23:30',     // time to email the summary
//     timeZoneCorrection: -3        // hour difference from your timezone to utc timezone | https://www.utctime.net/
//   },
//   options: {
//     syncTicktick: true,           // option to sync ticktick tasks
//     syncGithub: true,             // option to sync github commits
//     emailErrors: false,           // email runtime errors
//     emailSession: false,          // email sessions with modifications
//     emailDailySummary: true,      // email daily summary at a specified time
//     emailNewRelease: true,        // email if there is a new version available
//     showLogs: true,               // development option, dont need to change
//     maintanceMode: false          // development option, dont need to change
//   },
//   settings: {
//     syncFunction: 'sync',         // function name to run every x minutes
//     updateFrequency: 5            // wait time between sync checks (must be multiple of 5: 10, 15, etc)
//   }
// }

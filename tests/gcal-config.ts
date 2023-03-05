export const gcalSyncConfig = {
  ticktickSync: {
    icsCalendars: [
      ['webcal://ticktick.com/123/basic.ics', 'tick_fun', 'tick_done', { tag: '#FUN' }],
      ['webcal://ticktick.com/321/basic.ics', 'tick_imp', 'tick_done', { tag: '#IMP' }],
      ['webcal://ticktick.com/132/basic.ics', 'tick_tasks', 'tick_done', { ignoredTags: ['#FUN', '#IMP'] }]
    ],
    syncTicktick: true
  },
  githubSync: {
    username: 'yourgithubusername',
    googleCalendar: 'gh_commits',
    personalToken: '',
    ignoredRepos: [],
    parseGithubEmojis: true,
    syncGithub: true
  },
  notifications: {
    email: 'youremail@gmail.com',
    dailyEmailsTime: '23:00',
    timeZoneCorrection: -3,
    emailDailySummary: true,
    emailNewRelease: true,
    emailSession: true
  },
  options: {
    syncFunction: 'sync',
    updateFrequency: 5,
    showLogs: true,
    maintanceMode: false
  }
};

export const gcalSyncConfig = {
  ticktickSync: {
    icsCalendars: [
      ['webcal://ticktick.com/5bm/basic.ics', 'tick_fun', 'tick_done', { tag: '#LAZER' }],
      ['webcal://ticktick.com/jlu/basic.ics', 'tick_imp', 'tick_done', { tag: '#IMP' }],
      ['webcal://ticktick.com/amw/basic.ics', 'tick_tasks', 'tick_done', { ignoredTags: ['#LAZER', '#IMP'] }]
    ],
    syncTicktick: true
  },
  githubSync: {
    username: 'lucasvtiradentes',
    googleCalendar: 'gh_commits',
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

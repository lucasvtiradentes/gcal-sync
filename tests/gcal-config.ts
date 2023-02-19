export const gcalSyncConfig = {
  synchronization: {
    icsCalendars: [
      ['webcal://ticktick.com/pub/calendar/feeds/z0b1l06k65bm/basic.ics', 'tick_fun', 'tick_done', { tag: '#LAZER' }],
      ['webcal://ticktick.com/pub/calendar/feeds/frnl8al7cjlu/basic.ics', 'tick_imp', 'tick_done', { tag: '#IMP' }],
      ['webcal://ticktick.com/pub/calendar/feeds/vvl0cw34vamw/basic.ics', 'tick_tasks', 'tick_done', { ignoredTags: ['#LAZER', '#IMP'] }]
    ],
    syncFunction: 'sync',
    updateFrequency: 5
  },
  notifications: {
    email: 'lucasvtiradentes@gmail.com',
    timeToEmail: '19:00',
    timeZoneCorrection: -3,
    emailDailySummary: true,
    emailNewRelease: true,
    emailSession: true
  },
  options: {
    showLogs: true,
    maintanceMode: false
  }
};

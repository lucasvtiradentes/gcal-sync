<pre>
function getConfigs() {
  const configs = {
    ticktickSync: {
      icsCalendars: [
        ['webcal://icscal1.ics', 'gcal_1', 'gcal_completed'],                             // everything will be synced
        ['webcal://icscal2.ics', 'gcal_2', 'gcal_completed', { tag: '#FUN' }],            // everything will be synced, but marks all tasks with a label
        ['webcal://icscal3.ics', 'gcal_all', 'gcal_completed', { ignoredTags: ['#FUN'] }] // everything will be synced, excepts tasks with the specifieds labels
      ] 
    },
    githubSync: {
      username: "githubusername",   // github username
      googleCalendar: "gh_commits", // google calendar to isnert commits as events
      personalToken: '',            // github token, required if you want to sync private repo commits
      ignoredRepos: [],             // ignored repositories string array: ['repo1', 'repo2']
      parseGithubEmojis: true       // parse string emojis to emojis
    },
    datetime: {
      dailyEmailsTime: '23:30',     // time to email the summary
      timeZoneCorrection: -3        // difference from utc time
    },
    options: {
      syncTicktick: true,           // option to sync ticktick tasks
      syncGithub: true,             // option to sync github commits
      emailErrors: false,           // email runtime errors
      emailSession: false,          // email sessions with modifications
      emailDailySummary: true,      // email daily summary at a specified time
      emailNewRelease: true,        // email if there is a new version available
      showLogs: true,               // show runtime information
      maintanceMode: false          // option to not create, delete, update anything
    },
    settings: {
      syncFunction: 'sync',         // function name to run every x minutes
      updateFrequency: 5            // wait time between sync checks
    }
  }
  return configs
}

function getGcalSync(){
  const version = "1.7.1"
  const gcalSyncContent = UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/gcal-sync@${version}`).getContentText();
  eval(gcalSyncContent)
  const configs = getConfigs()
  const gcalSync = new GcalSync(configs);
  return gcalSync;
}

function setup() {
  const gcalSync = getGcalSync();
  gcalSync.installGcalSync();
}

function uninstall() {
  const gcalSync = getGcalSync();
  gcalSync.uninstallGcalSync();
}

function sync(){
  let gcalSync;
  try{
    gcalSync = getGcalSync()
    gcalSync.sync()
  } catch(e){
    if (gcalSync){
      gcalSync.sendErrorEmail(e.message)
    }
  }
}

function doGet(e) {
  let response = {}
  try{
    const gcalSync = getGcalSync()
    const content = gcalSync.sync()
    const logs = gcalSync.SESSION_LOGS
    response = {...content, logs}
  } catch(e){
    response = {error: e.message}
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)
}
</pre>
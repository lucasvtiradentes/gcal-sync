function getConfigs() {
  const configs = {
    settings: {
      sync_function: 'sync',              // function name to run every x minutes
      timezone_correction: -3,            // hour difference from your timezone to utc timezone | https://www.utctime.net/
      update_frequency: 5                 // wait time between sync checks (must be multiple of 5: 10, 15, etc)
    },
    options: {
      daily_summary_email_time: '22:00',  // time to email the summary
      email_daily_summary: false,         // email all the actions done in the day on the above time
      email_new_gcal_sync_release: false, // check one time per day and email when a new gcal-sync version is released on the above time
  
      email_errors: false,                // email when some error occurs
      email_session: false                // email when any item was added, updated or removed from your gcal
    },
    github_sync: {
      username: 'lucasvtiradentes',       // github username
      personal_token: '',                 // github token, required if you want to sync private repo commits
      commits_configs: {
        commits_calendar: 'gh_commits',   // google calendar to insert commits as events
        ignored_repos: ['github-assets'], // ignored repositories string array: ['repo1', 'repo2']
        parse_commit_emojis: true         // parse string emojis (:tada:) to emojis (✨)
      }
    },
    ticktick_sync: {
      ics_calendars: [
        {
          link: 'webcal://link_A',        // all items from ticktick will be added to 'tasks' cal and, when completed, moved to 'done'
          gcal: 'tasks',
          gcal_done: 'done',
        },
        {
          link: 'webcal://link_B',        // all items from ticktick will be added to 'tasks' cal and, when completed, moved to 'done_healthy'
          gcal: 'tasks',
          gcal_done: 'done_healthy',
          tag: "HEALTHY"                  // this is a flag where we can "mark" tasks from this config to be ignored on other ics_calendars
        },
        {
          link: 'webcal://link_C',        // all items from ticktick, except the tasks marked with HEALTHY, will be added to 'tasks' cal and,  when completed, moved to 'done'
          gcal: 'tasks',
          gcal_done: 'done',
          ignoredTags: ['HEALTHY']
        }
      ]
    }
  };
  return configs
}

function getGcalSync(){
  const version = "1.8.0"
  const gcalSyncContent = UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/gcal-sync@${version}`).getContentText();
  eval(gcalSyncContent)
  const configs = getConfigs()
  const gcalSync = new GcalSync(configs);
  return gcalSync;
}

function install() {
  const gcalSync = getGcalSync();
  gcalSync.install();
}

function uninstall() {
  const gcalSync = getGcalSync();
  gcalSync.uninstall();
}

function sync(){
  try{
    const gcalSync = getGcalSync()
    gcalSync.sync()
  } catch(e){
    console.log(e);
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
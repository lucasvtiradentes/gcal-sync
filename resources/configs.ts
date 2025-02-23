import { TConfigs } from '../src/consts/types';

// prettier-ignore
export const configs: TConfigs = {
  settings: {
    sync_function: 'sync',                // function name to run every x minutes
    timezone_offset_correction: 0,        // hour correction to match maybe a daylight saving difference (if you want the events 1 hour "before", then put -1)
    update_frequency: 5,                  // wait time between sync checks (must be multiple of 5: 10, 15, etc)
    skip_mode: false,                     // if set to true, it will skip every sync (useful for not messing up your data if any bug occurs repeatedly)
    per_day_emails: {
      time_to_send: '22:00',              // time to email the summary
      email_daily_summary: false,         // email all the actions done in the day on the above time
      email_new_gcal_sync_release: false, // check one time per day and email when a new gcal-sync version is released on the above time
    },
    per_sync_emails: {
      email_errors: false,                // email when some error occurs
      email_session: false                // email when any item was added, updated or removed from your gcal
    }
  },
  github_sync: {
    username: 'lucasvtiradentes',         // github username
    personal_token: '',                   // github token, required if you want to sync private repo commits
    commits_configs: {
      should_sync: true,                  // controls if the github commits sync should be done
      commits_calendar: 'gh_commits',     // google calendar to insert commits as events
      ignored_repos: ['github-assets'],   // ignored repositories string array: ['repo1', 'repo2']
      parse_commit_emojis: true           // parse string emojis (:tada:) to emojis (✨)
    }
  }
};

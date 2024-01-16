import { checkIfisGASEnvironment } from './classes/GAS';
import { APP_INFO } from './consts/app_info';
import { TConfigs } from './schemas/configs.schema';
import { validateConfigs } from './schemas/validate_configs';
import { getDateFixedByTimezone } from './utils/date_utils';
import { logger } from './utils/logger';

export default class GcalSync {
  today_date: string;
  isGASEnvironment: boolean = checkIfisGASEnvironment();

  constructor(private configs: TConfigs) {
    if (!validateConfigs(configs)) {
      throw new Error('schema invalid');
    }

    this.today_date = getDateFixedByTimezone(this.configs.settings.timezone_correction).toISOString().split('T')[0];
    logger.info(`${APP_INFO.name} is running at version ${APP_INFO.version}!`);
  }

  showConfigs() {
    console.log(this.configs);
  }
}

const gcalSync = new GcalSync({
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
});

gcalSync.showConfigs();

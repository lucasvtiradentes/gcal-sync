class TickSync {
  constructor(configs) {
    this.#validateConfigs(configs);
    this.configs = configs;
    this.startUpdateTime = this.configs.options.getOnlyFutureEvents ? new ICAL.Time.fromJSDate(new Date()) : '';
  }

  #validateConfigs(configs) {
    const CONFIG_KEYS = ['email', 'githubUsername', 'icsTasksCalendars', 'gcalCompletedTasksCalendar', 'options'];
    const OPTIONS_KEYS = ['getOnlyFutureEvents'];

    CONFIG_KEYS.forEach((key) => {
      if (Object.keys(configs).findIndex((configKey) => configKey === key) === -1) {
        throw new Error(`missing config key: [${key}]`);
      }
    });

    const options = configs['options'];
    OPTIONS_KEYS.forEach((key) => {
      if (Object.keys(options).findIndex((optionKey) => optionKey === key) === -1) {
        throw new Error(`missing option key: [${key}]`);
      }
    });
  }

  #condenseCalendarMap(calendarMap) {
    let result = [];

    for (let mapping of calendarMap) {
      let index = -1;

      for (let i = 0; i < result.length; i++) {
        if (result[i][0] == mapping[1]) {
          index = i;
          break;
        }
      }

      if (index > -1) {
        result[index][1].push([mapping[0], mapping[2]]);
      } else {
        result.push([mapping[1], [[mapping[0], mapping[2]]]]);
      }
    }

    return result;
  }

  sync() {
    const finalSourceCalendars = this.#condenseCalendarMap(this.configs.icsTasksCalendars);
    console.log(finalSourceCalendars);
  }
}

this.TickSync = TickSync;

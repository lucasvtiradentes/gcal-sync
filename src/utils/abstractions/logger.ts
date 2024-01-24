import { CONFIGS } from '../../consts/configs';

class Logger {
  logs = [];

  info(message: any, ...optionalParams: any[]) {
    if (CONFIGS.DEBUG_MODE && !CONFIGS.IS_TEST_ENVIRONMENT) {
      console.log(message, ...optionalParams);
      this.logs.push(message);
    }
  }

  error(message: any, ...optionalParams: any[]) {
    if (CONFIGS.DEBUG_MODE && !CONFIGS.IS_TEST_ENVIRONMENT) {
      console.error(message, ...optionalParams);
      this.logs.push(message);
    }
  }
}

export const logger = new Logger();

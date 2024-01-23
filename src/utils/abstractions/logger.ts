import { CONFIGS } from '../../consts/configs';

export const logger = {
  info: (message: any, ...optionalParams: any[]) => {
    if (CONFIGS.DEBUG_MODE && !CONFIGS.IS_TEST_ENVIRONMENT) {
      console.log(message, ...optionalParams);
    }
  },
  error: (message: any, ...optionalParams: any[]) => {
    if (CONFIGS.DEBUG_MODE && !CONFIGS.IS_TEST_ENVIRONMENT) {
      console.error(message, ...optionalParams);
    }
  }
};

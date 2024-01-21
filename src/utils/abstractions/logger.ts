import { CONFIGS } from '../../consts/configs';

export const logger = {
  info: (message: any, ...optionalParams: any[]) => {
    if (CONFIGS.DEBUG_MODE) {
      console.log(message, ...optionalParams);
    }
  },
  error: (message: any, ...optionalParams: any[]) => {
    if (CONFIGS.DEBUG_MODE) {
      console.error(message, ...optionalParams);
    }
  }
};

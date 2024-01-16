import { CONFIGS } from '../consts/configs';
export const logger = {
    info: (message, ...optionalParams) => {
        if (CONFIGS.DEBUG_MODE) {
            console.log(message, ...optionalParams);
        }
    },
    error: (message, ...optionalParams) => {
        if (CONFIGS.DEBUG_MODE) {
            console.trace(message, ...optionalParams);
        }
    }
};

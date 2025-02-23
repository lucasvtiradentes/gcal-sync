import { TExtendedConfigs, githubConfigsKey } from '../consts/types';

export function checkIfShouldSync(extendedConfigs: TExtendedConfigs) {
  const shouldSyncGithub = extendedConfigs.configs[githubConfigsKey].commits_configs.should_sync;

  return {
    shouldSyncGithub
  };
}

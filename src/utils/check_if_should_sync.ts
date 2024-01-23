import { TExtendedConfigs, githubConfigsKey, ticktickConfigsKey } from '../consts/types';

export function checkIfShouldSync(extendedConfigs: TExtendedConfigs) {
  const shouldSyncGithub = extendedConfigs.configs[githubConfigsKey].commits_configs.should_sync;
  const shouldSyncTicktick = extendedConfigs.configs[ticktickConfigsKey].should_sync;

  return {
    shouldSyncGithub,
    shouldSyncTicktick
  };
}

import { getAllGithubCommits } from '../classes/Github';
import { TConfigs, githubConfigsKey } from '../consts/types';

export async function syncGithub(configs: TConfigs) {
  const info = {
    githubCommits: [],
    githubGcalCommits: []
  };

  if (configs[githubConfigsKey].commits_configs) {
    info.githubCommits = await getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token);
  }
}

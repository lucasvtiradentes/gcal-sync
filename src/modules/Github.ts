import { ERRORS } from '../consts/errors';

export type TParsedGithubCommit = {
  commitDate: string;
  commitMessage: string;
  commitId: string;
  commitUrl: string;
  repository: string;
  repositoryId: string;
  repositoryName: string;
  repositoryLink: string;
  repositoryOwner: string;
  repositoryDescription: string;
  isRepositoryPrivate: boolean;
  isRepositoryFork: boolean;
};

export function getAllGithubCommits(username: string, personalToken: string) {
  const allCommitsArr = [];

  let pageNumber = 1;
  let shouldBreak = false;

  while (shouldBreak === false) {
    const url = `https://api.github.com/search/commits?q=author:${username}&page=${pageNumber}&sort=committer-date&per_page=100`;

    let response: GoogleAppsScript.URL_Fetch.HTTPResponse;

    if (personalToken !== '') {
      response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Authorization: `Bearer ${personalToken}` } });
    } else {
      response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    }

    const data = JSON.parse(response.getContentText()) ?? {};

    if (response.getResponseCode() !== 200) {
      if (data.message === 'Validation Failed') {
        throw new Error(ERRORS.invalid_github_username);
      }

      if (data.message === 'Bad credentials') {
        throw new Error(ERRORS.invalid_github_token);
      }

      throw new Error(data.message);
    }

    const commits = data.items;

    if (commits.length === 0) {
      shouldBreak = true;
      break;
    }

    allCommitsArr.push(...commits);
    pageNumber++;

    if (pageNumber > 10) {
      shouldBreak = true;
      break;
    }
  }

  const parsedCommits = allCommitsArr.map((it) => {
    const commitObj: TParsedGithubCommit = {
      commitDate: it.commit.author.date,
      commitMessage: it.commit.message.split('\n')[0],
      commitId: it.html_url.split('commit/')[1],
      commitUrl: it.html_url,
      repository: it.repository.full_name,
      repositoryLink: `https://github.com/${it.repository.full_name}`,
      repositoryId: it.repository.id,
      repositoryName: it.repository.name,
      repositoryOwner: it.repository.owner.login,
      repositoryDescription: it.repository.description,
      isRepositoryPrivate: it.repository.private,
      isRepositoryFork: it.repository.fork
    };

    return commitObj;
  });

  return parsedCommits;
}

export function parseGithubEmojisString(str: string) {
  const gitmojiObj = {
    ':art:': '🎨',
    ':zap:': '⚡️',
    ':fire:': '🔥',
    ':bug:': '🐛',
    ':ambulance:': '🚑️',
    ':sparkles:': '✨',
    ':memo:': '📝',
    ':rocket:': '🚀',
    ':lipstick:': '💄',
    ':tada:': '🎉',
    ':white_check_mark:': '✅',
    ':lock:': '🔒️',
    ':closed_lock_with_key:': '🔐',
    ':bookmark:': '🔖',
    ':rotating_light:': '🚨',
    ':construction:': '🚧',
    ':green_heart:': '💚',
    ':arrow_down:': '⬇️',
    ':arrow_up:': '⬆️',
    ':pushpin:': '📌',
    ':construction_worker:': '👷',
    ':chart_with_upwards_trend:': '📈',
    ':recycle:': '♻️',
    ':heavy_plus_sign:': '➕',
    ':heavy_minus_sign:': '➖',
    ':wrench:': '🔧',
    ':hammer:': '🔨',
    ':globe_with_meridians:': '🌐',
    ':pencil2:': '✏️',
    ':poop:': '💩',
    ':rewind:': '⏪️',
    ':twisted_rightwards_arrows:': '🔀',
    ':package:': '📦️',
    ':alien:': '👽️',
    ':truck:': '🚚',
    ':page_facing_up:': '📄',
    ':boom:': '💥',
    ':bento:': '🍱',
    ':wheelchair:': '♿️',
    ':bulb:': '💡',
    ':beers:': '🍻',
    ':speech_balloon:': '💬',
    ':card_file_box:': '🗃️',
    ':loud_sound:': '🔊',
    ':mute:': '🔇',
    ':busts_in_silhouette:': '👥',
    ':children_crossing:': '🚸',
    ':building_construction:': '🏗️',
    ':iphone:': '📱',
    ':clown_face:': '🤡',
    ':egg:': '🥚',
    ':see_no_evil:': '🙈',
    ':camera_flash:': '📸',
    ':alembic:': '⚗️',
    ':mag:': '🔍️',
    ':label:': '🏷️',
    ':seedling:': '🌱',
    ':triangular_flag_on_post:': '🚩',
    ':goal_net:': '🥅',
    ':dizzy:': '💫',
    ':wastebasket:': '🗑️',
    ':passport_control:': '🛂',
    ':adhesive_bandage:': '🩹',
    ':monocle_face:': '🧐',
    ':coffin:': '⚰️',
    ':test_tube:': '🧪',
    ':necktie:': '👔',
    ':stethoscope:': '🩺',
    ':bricks:': '🧱',
    ':technologist:': '🧑‍💻',
    ':money_with_wings:': '💸',
    ':thread:': '🧵',
    ':safety_vest:': '🦺'
  };

  let curString = str;
  for (const [key, value] of Object.entries(gitmojiObj)) {
    curString = curString.replace(key, value);
  }

  return curString;
}

import { CONFIGS } from '../consts/configs';
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

function getDateRanges(monthsBack: number = CONFIGS.GITHUB_MONTHS_TO_FETCH): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  const now = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);

    ranges.push({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }

  return ranges;
}

export function getGithubDateRange() {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startDate = new Date(now.getFullYear(), now.getMonth() - CONFIGS.GITHUB_MONTHS_TO_FETCH, 1);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

function fetchCommitsForDateRange(username: string, personalToken: string, startDate: string, endDate: string) {
  const commits: any[] = [];
  let pageNumber = 1;

  while (pageNumber <= CONFIGS.GITHUB_MAX_PAGES_PER_RANGE) {
    const query = `author:${username}+committer-date:${startDate}..${endDate}`;
    const url = `https://api.github.com/search/commits?q=${query}&page=${pageNumber}&sort=committer-date&per_page=100`;

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      muteHttpExceptions: true,
      headers: personalToken ? { Authorization: `Bearer ${personalToken}` } : {}
    };

    let response: GoogleAppsScript.URL_Fetch.HTTPResponse;
    try {
      response = UrlFetchApp.fetch(url, options);
    } catch (e) {
      console.log(`network error during ${startDate}..${endDate} page ${pageNumber}, returning partial results`);
      break;
    }

    const data = JSON.parse(response.getContentText()) ?? {};

    if (response.getResponseCode() !== 200) {
      if (response.getResponseCode() === 403 && data.message?.includes('rate limit')) {
        console.log(`GitHub rate limit hit during ${startDate}..${endDate}`);
        break;
      }
      break;
    }

    const items = data.items ?? [];
    if (items.length === 0) break;

    commits.push(...items);

    if (items.length < 100) break;

    Utilities.sleep(CONFIGS.GITHUB_DELAY_BETWEEN_PAGES_MS);
    pageNumber++;
  }

  return commits;
}

export function getAllGithubCommits(username: string, personalToken: string) {
  const allCommitsArr: any[] = [];
  const dateRanges = getDateRanges();

  console.log(`fetching commits for ${dateRanges.length} date ranges (${CONFIGS.GITHUB_MONTHS_TO_FETCH} months)`);

  for (const range of dateRanges) {
    const commits = fetchCommitsForDateRange(username, personalToken, range.start, range.end);
    if (commits.length > 0) {
      allCommitsArr.push(...commits);
      console.log(`${range.start}..${range.end}: ${commits.length} commits (total: ${allCommitsArr.length})`);
    }

    Utilities.sleep(CONFIGS.GITHUB_DELAY_BETWEEN_RANGES_MS);
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

// Utility for updating gitmoji commits in these tools: commitzen, commitlint and semantic-release.

const ALL_GITMOJI_ARR = [...getEmojiCommitTypesArr()] as const;
type IEmojiCommitTypes = (typeof ALL_GITMOJI_ARR)[number]['type'];

class GitmojiUtils {
  private allgitmojiArr: typeof ALL_GITMOJI_ARR;
  private usedCommits: IEmojiCommitTypes[] = [];

  constructor(allGitmojiArr: typeof ALL_GITMOJI_ARR) {
    this.allgitmojiArr = allGitmojiArr;
  }

  setupUsedTypes(usedCommits: IEmojiCommitTypes[]) {
    this.usedCommits = [...new Set(usedCommits)];
  }

  private getSpecifiedTypesArray() {
    const validCommits = [...this.usedCommits].filter((type) => this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type) !== null);
    return validCommits;
  }

  getOnlySpecifiedTypesItems() {
    const usedCommits = this.usedCommits
      .map((item) => {
        return [...this.allgitmojiArr].find((it) => it.type === item);
      })
      .filter((item) => (item ? true : false));

    return usedCommits.map((item) => ({ emoji: item?.emoji, type: item?.type, description: item?.description }));
  }

  getOnlyRemainingTypesItems() {
    const remainingCommits = [...this.allgitmojiArr].filter((item) => {
      const usedCommits = this.usedCommits as string[];
      const curCommitType = item.type as string;
      return item.type !== null && usedCommits.includes(curCommitType) === false;
    });

    return remainingCommits.map((item) => ({ emoji: item.emoji, type: item.type, description: item.description }));
  }

  /* ======================================================================== */

  private getCommitlintTypesArray() {
    return [...this.getSpecifiedTypesArray()].map((type) => {
      const gitmojiItem = this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type);
      return {
        type: gitmojiItem?.type,
        code: gitmojiItem?.code
      };
    });
  }

  private getCommitzenTypesArray() {
    return [...this.getSpecifiedTypesArray()].map((type) => {
      const gitmojiItem = this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type);
      return {
        name: gitmojiItem?.type,
        description: gitmojiItem?.description,
        code: gitmojiItem?.code,
        emoji: gitmojiItem?.emoji
      };
    });
  }

  private getSemanicReleaseCommitAnalyzerTypesArray() {
    return [...this.getSpecifiedTypesArray()]
      .filter((type) => {
        const gitmojiItem = this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type);
        return gitmojiItem?.semver !== null;
      })
      .map((type) => {
        const gitmojiItem = this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type);
        return {
          type: gitmojiItem?.type,
          release: gitmojiItem?.semver
        };
      });
  }

  private getSemanicReleaseChangelogTypesArray() {
    return [...this.getSpecifiedTypesArray()]
      .filter((type) => {
        const gitmojiItem = this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type);
        return gitmojiItem?.semver !== null;
      })
      .map((type) => {
        const gitmojiItem = this.allgitmojiArr.find((gitMojiItem) => gitMojiItem.type === type);
        return {
          type: gitmojiItem?.type,
          section: `${gitmojiItem?.emoji} ${gitmojiItem?.type}:`,
          hidden: !gitmojiItem?.showChangelog
        };
      });
  }

  exportConfigs(to: 'specified' | 'commitzen' | 'commitlint' | 'semantic-release-commit-analyzer' | 'semantic-release-changelog', jsonFormat?: true) {
    let resultArr: any[] = [];

    if (to === 'commitlint') {
      resultArr = this.getCommitlintTypesArray();
    } else if (to === 'commitzen') {
      resultArr = this.getCommitzenTypesArray();
    } else if (to === 'semantic-release-commit-analyzer') {
      resultArr = this.getSemanicReleaseCommitAnalyzerTypesArray();
    } else if (to === 'semantic-release-changelog') {
      resultArr = this.getSemanicReleaseChangelogTypesArray();
    }

    return jsonFormat ? JSON.stringify(resultArr, null, 2) : resultArr;
  }
}

/* ########################################################################## */

const gitmoji = new GitmojiUtils(ALL_GITMOJI_ARR);

gitmoji.setupUsedTypes(['init', 'feature', 'tests', 'docs', 'types', 'config', 'devscripts', 'binary', 'assets', 'ui', 'i18n', 'bugfix', 'hotfix', 'fix', 'detect', 'arch', 'codestyle', 'refactor', 'deploy', 'ci', 'fixci', 'revert', 'merge', 'breaking', 'tags']);

console.log(gitmoji.exportConfigs('commitzen', true));
console.log(gitmoji.exportConfigs('commitlint', true));
console.log(gitmoji.exportConfigs('semantic-release-commit-analyzer'));
console.log(gitmoji.exportConfigs('semantic-release-changelog'));

// console.table(gitmoji.getOnlyRemainingTypesItems());
// console.table(gitmoji.getOnlySpecifiedTypesItems());

/* ########################################################################## */

function getEmojiCommitTypesArr() {
  const result = [
    {
      emoji: '🎨',
      entity: '&#x1f3a8;',
      code: ':art:',
      description: 'Improve structure / format of the code.',
      name: 'art',
      semver: null,
      showChangelog: false,
      type: 'codestyle'
    },
    {
      emoji: '⚡️',
      entity: '&#x26a1;',
      code: ':zap:',
      description: 'Improve performance.',
      name: 'zap',
      semver: 'patch',
      showChangelog: false,
      type: 'perf'
    },
    {
      emoji: '🔥',
      entity: '&#x1f525;',
      code: ':fire:',
      description: 'Remove code or files.',
      name: 'fire',
      semver: null,
      showChangelog: false,
      type: 'prune'
    },
    {
      emoji: '🐛',
      entity: '&#x1f41b;',
      code: ':bug:',
      description: 'Fix a bug.',
      name: 'bug',
      semver: 'patch',
      showChangelog: true,
      type: 'bugfix'
    },
    {
      emoji: '🚑️',
      entity: '&#128657;',
      code: ':ambulance:',
      description: 'Critical hotfix.',
      name: 'ambulance',
      semver: 'patch',
      showChangelog: false,
      type: 'hotfix'
    },
    {
      emoji: '✨',
      entity: '&#x2728;',
      code: ':sparkles:',
      description: 'Introduce new features.',
      name: 'sparkles',
      semver: 'minor',
      showChangelog: true,
      type: 'feature'
    },
    {
      emoji: '📝',
      entity: '&#x1f4dd;',
      code: ':memo:',
      description: 'Add or update documentation.',
      name: 'memo',
      semver: 'patch',
      showChangelog: false,
      type: 'docs'
    },
    {
      emoji: '🚀',
      entity: '&#x1f680;',
      code: ':rocket:',
      description: 'Deploy stuff.',
      name: 'rocket',
      semver: null,
      showChangelog: false,
      type: 'deploy'
    },
    {
      emoji: '💄',
      entity: '&#ff99cc;',
      code: ':lipstick:',
      description: 'Add or update the UI and style files.',
      name: 'lipstick',
      semver: 'patch',
      showChangelog: false,
      type: 'ui'
    },
    {
      emoji: '🎉',
      entity: '&#127881;',
      code: ':tada:',
      description: 'Begin a project.',
      name: 'tada',
      semver: null,
      showChangelog: false,
      type: 'init'
    },
    {
      emoji: '✅',
      entity: '&#x2705;',
      code: ':white_check_mark:',
      description: 'Add, update, or pass tests.',
      name: 'white-check-mark',
      semver: 'patch',
      showChangelog: true,
      type: 'tests'
    },
    {
      emoji: '🔒️',
      entity: '&#x1f512;',
      code: ':lock:',
      description: 'Fix security issues.',
      name: 'lock',
      semver: 'patch',
      showChangelog: false,
      type: 'security'
    },
    {
      emoji: '🔐',
      entity: '&#x1f510;',
      code: ':closed_lock_with_key:',
      description: 'Add or update secrets.',
      name: 'closed-lock-with-key',
      semver: null,
      showChangelog: false,
      type: null
    },
    {
      emoji: '🔖',
      entity: '&#x1f516;',
      code: ':bookmark:',
      description: 'Release / Version tags.',
      name: 'bookmark',
      semver: null,
      showChangelog: false,
      type: 'tags'
    },
    {
      emoji: '🚨',
      entity: '&#x1f6a8;',
      code: ':rotating_light:',
      description: 'Fix compiler / linter warnings.',
      name: 'rotating-light',
      semver: null,
      showChangelog: false,
      type: 'lint'
    },
    {
      emoji: '🚧',
      entity: '&#x1f6a7;',
      code: ':construction:',
      description: 'Work in progress.',
      name: 'construction',
      semver: null,
      showChangelog: false,
      type: 'wip'
    },
    {
      emoji: '💚',
      entity: '&#x1f49a;',
      code: ':green_heart:',
      description: 'Fix CI Build.',
      name: 'green-heart',
      semver: null,
      showChangelog: false,
      type: 'fixci'
    },
    {
      emoji: '⬇️',
      entity: '⬇️',
      code: ':arrow_down:',
      description: 'Downgrade dependencies.',
      name: 'arrow-down',
      semver: 'patch',
      showChangelog: false,
      type: 'downgrade'
    },
    {
      emoji: '⬆️',
      entity: '⬆️',
      code: ':arrow_up:',
      description: 'Upgrade dependencies.',
      name: 'arrow-up',
      semver: 'patch',
      showChangelog: false,
      type: 'upgrade'
    },
    {
      emoji: '📌',
      entity: '&#x1F4CC;',
      code: ':pushpin:',
      description: 'Pin dependencies to specific versions.',
      name: 'pushpin',
      semver: 'patch',
      showChangelog: false,
      type: 'depver'
    },
    {
      emoji: '👷',
      entity: '&#x1f477;',
      code: ':construction_worker:',
      description: 'Add or update CI build system.',
      name: 'construction-worker',
      semver: null,
      showChangelog: false,
      type: 'ci'
    },
    {
      emoji: '📈',
      entity: '&#x1F4C8;',
      code: ':chart_with_upwards_trend:',
      description: 'Add or update analytics or track code.',
      name: 'chart-with-upwards-trend',
      semver: 'patch',
      showChangelog: false,
      type: 'analytics'
    },
    {
      emoji: '♻️',
      entity: '&#x267b;',
      code: ':recycle:',
      description: 'Refactor code.',
      name: 'recycle',
      semver: null,
      showChangelog: false,
      type: 'refactor'
    },
    {
      emoji: '➕',
      entity: '&#10133;',
      code: ':heavy_plus_sign:',
      description: 'Add a dependency.',
      name: 'heavy-plus-sign',
      semver: 'patch',
      showChangelog: false,
      type: 'depadd'
    },
    {
      emoji: '➖',
      entity: '&#10134;',
      code: ':heavy_minus_sign:',
      description: 'Remove a dependency.',
      name: 'heavy-minus-sign',
      semver: 'patch',
      showChangelog: false,
      type: 'deprm'
    },
    {
      emoji: '🔧',
      entity: '&#x1f527;',
      code: ':wrench:',
      description: 'Add or update configuration files.',
      name: 'wrench',
      semver: 'patch',
      showChangelog: false,
      type: 'config'
    },
    {
      emoji: '🔨',
      entity: '&#128296;',
      code: ':hammer:',
      description: 'Add or update development scripts.',
      name: 'hammer',
      semver: null,
      showChangelog: false,
      type: 'devscripts'
    },
    {
      emoji: '🌐',
      entity: '&#127760;',
      code: ':globe_with_meridians:',
      description: 'Internationalization and localization.',
      name: 'globe-with-meridians',
      semver: 'patch',
      showChangelog: false,
      type: 'i18n'
    },
    {
      emoji: '✏️',
      entity: '&#59161;',
      code: ':pencil2:',
      description: 'Fix typos.',
      name: 'pencil2',
      semver: 'patch',
      showChangelog: false,
      type: 'typo'
    },
    {
      emoji: '💩',
      entity: '&#58613;',
      code: ':poop:',
      description: 'Write bad code that needs to be improved.',
      name: 'poop',
      semver: null,
      showChangelog: false,
      type: 'flaky'
    },
    {
      emoji: '⏪️',
      entity: '&#9194;',
      code: ':rewind:',
      description: 'Revert changes.',
      name: 'rewind',
      semver: 'patch',
      showChangelog: false,
      type: 'revert'
    },
    {
      emoji: '🔀',
      entity: '&#128256;',
      code: ':twisted_rightwards_arrows:',
      description: 'Merge branches.',
      name: 'twisted-rightwards-arrows',
      semver: null,
      showChangelog: false,
      type: 'merge'
    },
    {
      emoji: '📦️',
      entity: '&#1F4E6;',
      code: ':package:',
      description: 'Add or update compiled files or packages.',
      name: 'package',
      semver: 'patch',
      showChangelog: false,
      type: 'binary'
    },
    {
      emoji: '👽️',
      entity: '&#1F47D;',
      code: ':alien:',
      description: 'Update code due to external API changes.',
      name: 'alien',
      semver: 'patch',
      showChangelog: false,
      type: 'contract'
    },
    {
      emoji: '🚚',
      entity: '&#1F69A;',
      code: ':truck:',
      description: 'Move or rename resources (e.g.: files, paths, routes).',
      name: 'truck',
      semver: null,
      showChangelog: false,
      type: 'relocate'
    },
    {
      emoji: '📄',
      entity: '&#1F4C4;',
      code: ':page_facing_up:',
      description: 'Add or update license.',
      name: 'page-facing-up',
      semver: null,
      showChangelog: false,
      type: 'license'
    },
    {
      emoji: '💥',
      entity: '&#x1f4a5;',
      code: ':boom:',
      description: 'Introduce breaking changes.',
      name: 'boom',
      semver: 'major',
      showChangelog: true,
      type: 'breaking'
    },
    {
      emoji: '🍱',
      entity: '&#1F371',
      code: ':bento:',
      description: 'Add or update assets.',
      name: 'bento',
      semver: 'patch',
      showChangelog: false,
      type: 'assets'
    },
    {
      emoji: '♿️',
      entity: '&#9855;',
      code: ':wheelchair:',
      description: 'Improve accessibility.',
      name: 'wheelchair',
      semver: 'patch',
      showChangelog: false,
      type: 'a11y'
    },
    {
      emoji: '💡',
      entity: '&#128161;',
      code: ':bulb:',
      description: 'Add or update comments in source code.',
      name: 'bulb',
      semver: null,
      showChangelog: false,
      type: 'comment'
    },
    {
      emoji: '🍻',
      entity: '&#x1f37b;',
      code: ':beers:',
      description: 'Write code drunkenly.',
      name: 'beers',
      semver: null,
      showChangelog: false,
      type: 'gibberish'
    },
    {
      emoji: '💬',
      entity: '&#128172;',
      code: ':speech_balloon:',
      description: 'Add or update text and literals.',
      name: 'speech-balloon',
      semver: 'patch',
      showChangelog: false,
      type: 'text'
    },
    {
      emoji: '🗃️',
      entity: '&#128451;',
      code: ':card_file_box:',
      description: 'Perform database related changes.',
      name: 'card-file-box',
      semver: 'patch',
      showChangelog: false,
      type: 'db'
    },
    {
      emoji: '🔊',
      entity: '&#128266;',
      code: ':loud_sound:',
      description: 'Add or update logs.',
      name: 'loud-sound',
      semver: null,
      showChangelog: false,
      type: 'addlogs'
    },
    {
      emoji: '🔇',
      entity: '&#128263;',
      code: ':mute:',
      description: 'Remove logs.',
      name: 'mute',
      semver: null,
      showChangelog: false,
      type: 'rmlogs'
    },
    {
      emoji: '👥',
      entity: '&#128101;',
      code: ':busts_in_silhouette:',
      description: 'Add or update contributor(s).',
      name: 'busts-in-silhouette',
      semver: null,
      showChangelog: false,
      type: 'contrib'
    },
    {
      emoji: '🚸',
      entity: '&#128696;',
      code: ':children_crossing:',
      description: 'Improve user experience / usability.',
      name: 'children-crossing',
      semver: 'patch',
      showChangelog: false,
      type: 'ux'
    },
    {
      emoji: '🏗️',
      entity: '&#1f3d7;',
      code: ':building_construction:',
      description: 'Make architectural changes.',
      name: 'building-construction',
      semver: null,
      showChangelog: false,
      type: 'arch'
    },
    {
      emoji: '📱',
      entity: '&#128241;',
      code: ':iphone:',
      description: 'Work on responsive design.',
      name: 'iphone',
      semver: 'patch',
      showChangelog: false,
      type: 'responsive'
    },
    {
      emoji: '🤡',
      entity: '&#129313;',
      code: ':clown_face:',
      description: 'Mock things.',
      name: 'clown-face',
      semver: null,
      showChangelog: false,
      type: 'mock'
    },
    {
      emoji: '🥚',
      entity: '&#129370;',
      code: ':egg:',
      description: 'Add or update an easter egg.',
      name: 'egg',
      semver: 'patch',
      showChangelog: false,
      type: 'joke'
    },
    {
      emoji: '🙈',
      entity: '&#8bdfe7;',
      code: ':see_no_evil:',
      description: 'Add or update a .gitignore file.',
      name: 'see-no-evil',
      semver: null,
      showChangelog: false,
      type: 'gitignore'
    },
    {
      emoji: '📸',
      entity: '&#128248;',
      code: ':camera_flash:',
      description: 'Add or update snapshots.',
      name: 'camera-flash',
      semver: null,
      showChangelog: false,
      type: 'snapshots'
    },
    {
      emoji: '⚗️',
      entity: '&#128248;',
      code: ':alembic:',
      description: 'Perform experiments.',
      name: 'alembic',
      semver: 'patch',
      showChangelog: false,
      type: 'poc'
    },
    {
      emoji: '🔍️',
      entity: '&#128269;',
      code: ':mag:',
      description: 'Improve SEO.',
      name: 'mag',
      semver: 'patch',
      showChangelog: false,
      type: 'seo'
    },
    {
      emoji: '🏷️',
      entity: '&#127991;',
      code: ':label:',
      description: 'Add or update types.',
      name: 'label',
      semver: 'patch',
      showChangelog: false,
      type: 'types'
    },
    {
      emoji: '🌱',
      entity: '&#127793;',
      code: ':seedling:',
      description: 'Add or update seed files.',
      name: 'seedling',
      semver: null,
      showChangelog: false,
      type: 'seed'
    },
    {
      emoji: '🚩',
      entity: '&#x1F6A9;',
      code: ':triangular_flag_on_post:',
      description: 'Add, update, or remove feature flags.',
      name: 'triangular-flag-on-post',
      semver: 'patch',
      showChangelog: false,
      type: 'flags'
    },
    {
      emoji: '🥅',
      entity: '&#x1F945;',
      code: ':goal_net:',
      description: 'Catch errors.',
      name: 'goal-net',
      semver: 'patch',
      showChangelog: false,
      type: 'detect'
    },
    {
      emoji: '💫',
      entity: '&#x1f4ab;',
      code: ':dizzy:',
      description: 'Add or update animations and transitions.',
      name: 'animation',
      semver: 'patch',
      showChangelog: false,
      type: 'animation'
    },
    {
      emoji: '🗑️',
      entity: '&#x1F5D1;',
      code: ':wastebasket:',
      description: 'Deprecate code that needs to be cleaned up.',
      name: 'wastebasket',
      semver: 'patch',
      showChangelog: false,
      type: 'deprecate'
    },
    {
      emoji: '🛂',
      entity: '&#x1F6C2;',
      code: ':passport_control:',
      description: 'Work on code related to authorization, roles and permissions.',
      name: 'passport-control',
      semver: 'patch',
      showChangelog: false,
      type: 'auth'
    },
    {
      emoji: '🩹',
      entity: '&#x1FA79;',
      code: ':adhesive_bandage:',
      description: 'Simple fix for a non-critical issue.',
      name: 'adhesive-bandage',
      semver: 'patch',
      showChangelog: false,
      type: 'fix'
    },
    {
      emoji: '🧐',
      entity: '&#x1F9D0;',
      code: ':monocle_face:',
      description: 'Data exploration/inspection.',
      name: 'monocle-face',
      semver: null,
      showChangelog: false,
      type: 'explore'
    },
    {
      emoji: '⚰️',
      entity: '&#x26B0;',
      code: ':coffin:',
      description: 'Remove dead code.',
      name: 'coffin',
      semver: null,
      showChangelog: false,
      type: 'clean'
    },
    {
      emoji: '🧪',
      entity: '&#x1F9EA;',
      code: ':test_tube:',
      description: 'Add a failing test.',
      name: 'test-tube',
      semver: null,
      showChangelog: false,
      type: 'fall'
    },
    {
      emoji: '👔',
      entity: '&#128084;',
      code: ':necktie:',
      description: 'Add or update business logic.',
      name: 'necktie',
      semver: 'patch',
      showChangelog: false,
      type: null
    },
    {
      emoji: '🩺',
      entity: '&#x1FA7A;',
      code: ':stethoscope:',
      description: 'Add or update healthcheck.',
      name: 'stethoscope',
      semver: null,
      showChangelog: false,
      type: null
    },
    {
      emoji: '🧱',
      entity: '&#x1f9f1;',
      code: ':bricks:',
      description: 'Infrastructure related changes.',
      name: 'bricks',
      semver: null,
      showChangelog: false,
      type: null
    },
    {
      emoji: '🧑‍💻',
      entity: '&#129489;&#8205;&#128187;',
      code: ':technologist:',
      description: 'Improve developer experience.',
      name: 'technologist',
      semver: null,
      showChangelog: false,
      type: null
    },
    {
      emoji: '💸',
      entity: '&#x1F4B8;',
      code: ':money_with_wings:',
      description: 'Add sponsorships or money related infrastructure.',
      name: 'money-with-wings',
      semver: null,
      showChangelog: false,
      type: null
    },
    {
      emoji: '🧵',
      entity: '&#x1F9F5;',
      code: ':thread:',
      description: 'Add or update code related to multithreading or concurrency.',
      name: 'thread',
      semver: null,
      showChangelog: false,
      type: null
    },
    {
      emoji: '🦺',
      entity: '&#x1F9BA;',
      code: ':safety_vest:',
      description: 'Add or update code related to validation.',
      name: 'safety-vest',
      semver: null,
      showChangelog: false,
      type: null
    }
  ] as const;
  return result;
}

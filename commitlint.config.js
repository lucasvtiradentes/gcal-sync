// RULES: https://commitlint.js.org/#/reference-rules

const VALID_COMMIT_MESSAGE = ':tada: init: initial commit (#1)';
const VALID_COMMIT_TYPES = getValidCommitTypes().map((commit) => commit.type);
const VALID_EMOJI_TYPES = getValidCommitTypes().reduce((acc, cur) => {
  acc[cur.type] = cur.code;
  return acc;
}, {});

module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern: /^(:\w*:)\s?(\w*)(?:\((.*)\))?!?:\s(.*)$/,
      headerCorrespondence: ['emoji', 'type', 'scope', 'subject']
    }
  },
  plugins: [
    {
      rules: {
        'gitmoji-workflow': (parsed) => {
          const { emoji, type, subject } = parsed;

          if (emoji === null) {
            return [false, `header must specify an emoji like -> ${VALID_COMMIT_MESSAGE}`];
          }
          if (type === null) {
            return [false, `header must specify an type like -> ${VALID_COMMIT_MESSAGE}`];
          }
          if (VALID_EMOJI_TYPES[type] !== emoji) {
            return [false, `the speficied emoji does not match its type as it should -> ${VALID_EMOJI_TYPES[type]} !== ${emoji}`];
          }
          if (subject === null) {
            return [false, `header must specify an subject like -> ${VALID_COMMIT_MESSAGE}`];
          }

          return [true, ''];
        }
      }
    }
  ],
  rules: {
    'gitmoji-workflow': [2, 'always'],
    'type-enum': [2, 'always', VALID_COMMIT_TYPES],
    'header-max-length': [2, 'always', 70]
  }
};

function getValidCommitTypes() {
  return [
    {
      type: 'init',
      code: ':tada:'
    },
    {
      type: 'feature',
      code: ':sparkles:'
    },
    {
      type: 'tests',
      code: ':white_check_mark:'
    },
    {
      type: 'docs',
      code: ':memo:'
    },
    {
      type: 'types',
      code: ':label:'
    },
    {
      type: 'config',
      code: ':wrench:'
    },
    {
      type: 'devscripts',
      code: ':hammer:'
    },
    {
      type: 'binary',
      code: ':package:'
    },
    {
      type: 'assets',
      code: ':bento:'
    },
    {
      type: 'ui',
      code: ':lipstick:'
    },
    {
      type: 'i18n',
      code: ':globe_with_meridians:'
    },
    {
      type: 'bugfix',
      code: ':bug:'
    },
    {
      type: 'hotfix',
      code: ':ambulance:'
    },
    {
      type: 'fix',
      code: ':adhesive_bandage:'
    },
    {
      type: 'detect',
      code: ':goal_net:'
    },
    {
      type: 'arch',
      code: ':building_construction:'
    },
    {
      type: 'codestyle',
      code: ':art:'
    },
    {
      type: 'refactor',
      code: ':recycle:'
    },
    {
      type: 'deploy',
      code: ':rocket:'
    },
    {
      type: 'fixci',
      code: ':green_heart:'
    },
    {
      type: 'revert',
      code: ':rewind:'
    },
    {
      type: 'merge',
      code: ':twisted_rightwards_arrows:'
    },
    {
      type: 'breaking',
      code: ':boom:'
    }
  ];
}

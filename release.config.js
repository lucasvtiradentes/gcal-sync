module.exports = {
  branches: ['main'],
  repository: 'https://github.com/lucasvtiradentes/gcal-sync',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        releaseRules: [
          { type: 'feature', release: 'minor' },
          { type: 'tests', release: 'patch' },
          { type: 'docs', release: 'patch' },
          { type: 'types', release: 'patch' },
          { type: 'config', release: 'patch' },
          { type: 'binary', release: 'patch' },
          { type: 'assets', release: 'patch' },
          { type: 'ui', release: 'patch' },
          { type: 'i18n', release: 'patch' },
          { type: 'bugfix', release: 'patch' },
          { type: 'hotfix', release: 'patch' },
          { type: 'fix', release: 'patch' },
          { type: 'detect', release: 'patch' },
          { type: 'revert', release: 'patch' },
          { type: 'breaking', release: 'major' }
        ],
        parserOpts: {
          headerPattern: /^(:\w*:)\s?(\w*)(?:\((.*)\))?!?:\s(.*)$/,
          headerCorrespondence: ['emoji', 'type', 'scope', 'subject'],
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
        }
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'docs/CHANGELOG.MD',
        changelogTitle: '# CHANGELOG HISTORY'
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        parserOpts: {
          headerPattern: /^(:\w*:)\s?(\w*)(?:\((.*)\))?!?:\s(.*)$/,
          headerCorrespondence: ['emoji', 'type', 'scope', 'subject'],
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
        },
        presetConfig: {
          types: [
            { type: 'feature', section: '✨ feature:', hidden: false },
            { type: 'tests', section: '✅ tests:', hidden: false },
            { type: 'docs', section: '📝 docs:', hidden: false },
            { type: 'types', section: '🏷️ types:', hidden: false },
            { type: 'config', section: '🔧 config:', hidden: false },
            { type: 'binary', section: '📦️ binary:', hidden: false },
            { type: 'assets', section: '🍱 assets:', hidden: false },
            { type: 'ui', section: '💄 ui:', hidden: false },
            { type: 'i18n', section: '🌐 i18n:', hidden: false },
            { type: 'bugfix', section: '🐛 bugfix:', hidden: false },
            { type: 'hotfix', section: '🚑️ hotfix:', hidden: false },
            { type: 'fix', section: '🩹 fix:', hidden: false },
            { type: 'detect', section: '🥅 detect:', hidden: false },
            { type: 'revert', section: '⏪️ revert:', hidden: false },
            { type: 'breaking', section: '💥 breaking:', hidden: false }
          ]
        }
      }
    ],
    '@semantic-release/github',
    '@semantic-release/npm',
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'README.md', 'docs/CHANGELOG.MD', 'dist/index.js', 'dist/index.min.js', 'dist/setup/gcalsync_dev.js'],
        message: ':bookmark: tags: new version release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};

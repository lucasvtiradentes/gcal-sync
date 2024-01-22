module.exports = {
  branches: ['master'],
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
            { type: 'docs', section: '📝 docs:', hidden: true },
            { type: 'types', section: '🏷️ types:', hidden: true },
            { type: 'config', section: '🔧 config:', hidden: true },
            { type: 'binary', section: '📦️ binary:', hidden: true },
            { type: 'assets', section: '🍱 assets:', hidden: true },
            { type: 'ui', section: '💄 ui:', hidden: true },
            { type: 'i18n', section: '🌐 i18n:', hidden: true },
            { type: 'bugfix', section: '🐛 bugfix:', hidden: false },
            { type: 'hotfix', section: '🚑️ hotfix:', hidden: true },
            { type: 'fix', section: '🩹 fix:', hidden: true },
            { type: 'detect', section: '🥅 detect:', hidden: true },
            { type: 'revert', section: '⏪️ revert:', hidden: true },
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
        assets: ['package.json', 'README.md', 'docs/CHANGELOG.MD', 'dist/index.min.js', 'dist/setup/GAS_gcalsync_dev.js'],
        message: ':bookmark: tags: new version release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};

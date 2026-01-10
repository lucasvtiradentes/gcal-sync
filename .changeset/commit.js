const { execSync } = require('node:child_process');

function log(message) {
  console.log(`[changeset-commit] ${message}`);
}

function buildAndStageDistFiles() {
  try {
    log('Running build...');
    execSync('pnpm run build', { stdio: 'inherit' });

    log('Staging dist files and README...');
    execSync('git add dist/index.js dist/index.min.js dist/setup/gcalsync_dev.js dist/setup/setup.js README.md', {
      stdio: 'inherit'
    });

    log('Added dist files and README to git staging');
  } catch (error) {
    log(`Error during build/stage: ${error.message}`);
  }
}

async function getVersionMessage() {
  log('Running getVersionMessage hook');
  buildAndStageDistFiles();
  return 'chore: version packages';
}

module.exports = {
  getVersionMessage
};

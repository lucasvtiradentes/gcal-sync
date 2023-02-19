import * as minify from 'minify'; // just ignore if an error appers
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

(async () => {
  const DIST_FILE = `./dist/GcalSync.js`;

  const packageJson = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));
  const distFileContent = readFileSync(DIST_FILE, { encoding: 'utf8' });
  const distFileWithVersion = distFileContent.replace(`VERSION = ''; // version`, `VERSION = '${packageJson.version}'; // version`);
  writeFileSync(DIST_FILE, distFileWithVersion);

  await minifyFile(DIST_FILE);
  unlinkSync(DIST_FILE);
})();

/* ========================================================================== */

async function minifyFile(filePath: string) {
  const minifiedContent = await minify(filePath);
  writeFileSync(filePath.replace(`js`, `min.js`), minifiedContent);
}

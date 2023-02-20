import * as minify from 'minify'; // just ignore if an error appers
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

(async () => {
  const DIST_FILE = `./dist/GcalSync.js`;

  const packageJson = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));

  replaceFileContent(DIST_FILE, `// version`, `this.VERSION = '${packageJson.version}'; // version`);
  replaceFileContent(`./README.md`, `// version`, `const version = "${packageJson.version}" // version`);

  await minifyFile(DIST_FILE);
  unlinkSync(DIST_FILE);
})();

/* ========================================================================== */

function replaceFileContent(file: string, strToFind: string, strToReplace: string) {
  const originalContent = readFileSync(file, { encoding: 'utf8' });
  // prettier-ignore
  const newContent = originalContent.split('\n').map((line) => {
    const hasSearchedStr = line.search(strToFind) > 0
    const identation = line.length - line.trimStart().length
    return hasSearchedStr ? `${' '.repeat(identation)}${strToReplace}` : line
  }).join('\n');
  writeFileSync(file, newContent);
}

async function minifyFile(filePath: string) {
  const minifiedContent = await minify(filePath);
  writeFileSync(filePath.replace(`js`, `min.js`), minifiedContent);
}

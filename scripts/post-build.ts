import * as minify from 'minify'; // ignore if an error appears
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

(async () => {
  const DIST_FILE = `./dist/GcalSync.js`;
  const VERSION_UPDATE = `// version`;

  const packageJson = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));

  replaceFileContent(DIST_FILE, VERSION_UPDATE, `this.VERSION = '${packageJson.version}'; ${VERSION_UPDATE}`);
  replaceFileContent(`./README.md`, VERSION_UPDATE, `const version = "${packageJson.version}" ${VERSION_UPDATE}`);

  await minifyFile(DIST_FILE, DIST_FILE.replace(`js`, `min.js`));
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

async function minifyFile(filePath: string, distPath: string) {
  const minifiedContent = await minify(filePath);
  writeFileSync(distPath, minifiedContent);
}

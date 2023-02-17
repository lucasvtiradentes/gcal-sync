import * as minify from 'minify';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const DIST_FOLDER = './dist';
if (!existsSync(DIST_FOLDER)) {
  mkdirSync(DIST_FOLDER);
}

  await minifyFile(DIST_FILE);
  unlinkSync(DIST_FILE);
})();

/* ========================================================================== */

async function minifyFile(filePath: string) {
  const minifiedContent = await minify(filePath);
  writeFileSync(filePath.replace(`js`, `min.js`), minifiedContent);
}

/*
function deleteFiles(filesToDeleteArr: string[]) {
  for (const filePath of filesToDeleteArr) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
*/

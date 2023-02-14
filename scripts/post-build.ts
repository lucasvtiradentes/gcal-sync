import * as minify from 'minify';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const DIST_FOLDER = './dist';
if (!existsSync(DIST_FOLDER)) {
  mkdirSync(DIST_FOLDER);
}

const FINAL_FILE = 'build/TickSync.js';
const updatedContent = `${readFileSync(FINAL_FILE, { encoding: 'utf8' })}\nthis.TickSync = TickSync`;
writeFileSync(FINAL_FILE, updatedContent);

const DIST_FILES = [FINAL_FILE];
minifyFiles(DIST_FILES).then(() => {
  const minifiedFiles = DIST_FILES.map((file) => getMinifiedName(file));
  copyFiles(minifiedFiles, DIST_FOLDER);
  // deleteFiles(DIST_FILES);
});

/* ========================================================================== */

function getMinifiedName(fileName: string) {
  return fileName.replace(`js`, `min.js`);
}

async function minifyFiles(filesToMinifyArr: string[]) {
  for (const filePath of filesToMinifyArr) {
    const minifiedFile = getMinifiedName(filePath);
    const minifiedContent = await minify(filePath);
    writeFileSync(minifiedFile, minifiedContent);
  }
}

function copyFiles(copyArr: string[], distFolder: string) {
  copyArr.forEach((file) => {
    if (!existsSync(file)) {
      throw new Error(`file could not be copied because it does not exist: [${file}]`);
    }

    copyFileSync(file, join(distFolder, basename(file)));
  });
}

function deleteFiles(filesToDeleteArr: string[]) {
  for (const filePath of filesToDeleteArr) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

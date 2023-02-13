const { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } = require('node:fs');
const { basename, join } = require('node:path');
const minify = require('minify');

const DIST_FOLDER = './dist';
if (!existsSync(DIST_FOLDER)) {
  mkdirSync(DIST_FOLDER);
}

// const FILES_TO_MERGE = ['./src/TickSync.js'];
// mergeFiles(FILES_TO_MERGE, DIST_FOLDER, 'TickSync');

const FILES_TO_COPY = ['./src/TickSync.js', './src/libs/ical.js'];
copyFiles(FILES_TO_COPY, DIST_FOLDER);

const DIST_FILES = ['TickSync.js', 'ical.js'].map((name) => `${DIST_FOLDER}/${name}`);
minifyFiles(DIST_FILES).then(() => deleteFiles(DIST_FILES));

/* ========================================================================== */

function copyFiles(copyArr, distFolder) {
  copyArr.forEach((file) => {
    if (!existsSync(file)) {
      throw new Error(`file could not be copied because it does not exist: [${file}]`);
    }

    copyFileSync(file, join(distFolder, basename(file)));
  });
}

async function minifyFiles(filesToMinifyArr) {
  for (let filePath of filesToMinifyArr) {
    const minifiedFile = filePath.replace(`js`, `min.js`);
    const minifiedContent = await minify(filePath);
    writeFileSync(minifiedFile, minifiedContent);
  }
}

function deleteFiles(filesToDeleteArr) {
  for (let filePath of filesToDeleteArr) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

async function mergeFiles(mergeArr, distFolder, fileName) {
  const mergerFile = `${distFolder}/${fileName}.js`;
  writeFileSync(mergerFile, mergeFilesContent(mergeArr));
}

function mergeFilesContent(filesArr) {
  let finalContent = '';
  for (let x = 0; x < filesArr.length; x++) {
    let data = readFileSync(filesArr[x], 'utf8');
    if (data.length > 0) {
      let space = finalContent.length > 0 ? '\n' : '';
      finalContent = finalContent + space + data;
    }
  }
  return finalContent;
}

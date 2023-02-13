const { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } = require('node:fs');
const { basename, join } = require('node:path');
const minify = require('minify');

const FILES_TO_MERGE = ['./src/configs.js', './src/setup.js', './src/sync.js'];
const FILES_TO_COPY = ['./src/libs/ical.js'];

build(FILES_TO_COPY, FILES_TO_MERGE, './dist', 'OldCode');

/* ========================================================================== */

async function build(copyArr, mergeArr, distFolder, fileName) {
  if (!existsSync(distFolder)) {
    mkdirSync(distFolder);
  }

  copyArr.forEach((file) => {
    if (!existsSync(file)) {
      throw new Error(`file could not be copied because it does not exist: [${file}]`);
    }

    copyFileSync(file, join(distFolder, basename(file)));
  });

  const mergerFile = `${distFolder}/${fileName}.js`;
  writeFileSync(mergerFile, mergeFilesContent(mergeArr));

  const minifiedFile = `${distFolder}/${fileName}.min.js`;
  const minifiedContent = await minify(mergerFile);
  writeFileSync(minifiedFile, minifiedContent);
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

import { DynMarkdown } from 'dyn-markdown';
// import minify from 'minify';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

(async () => {
  const FILES = {
    package: './package.json',
    readme: './README.md',
    configs: './resources/configs.ts',
    gasAppsScript: './dist/GAS-appsscript.json',
    gasSetup: './dist/GAS-setup.js',
    gcalSyncUmd: `./dist/UMD-GcalSync.js`,
    gcalSync: `./dist/GcalSync.js`,
    gcalSyncMin: `./dist/GcalSync.min.js`
  };

  const README_FIELDS = {
    gasAppsScriptContent: 'GAS_APPSSCRIPT',
    gasSetupContent: 'GAS_SETUP'
  };

  const VERSION = JSON.parse(readFileSync(FILES.package, { encoding: 'utf8' })).version;

  const setupGcalSyncContent = getSetupGcalSyncFileContent(FILES.configs, VERSION);
  writeFileSync(FILES.gasSetup, setupGcalSyncContent, { encoding: 'utf-8' });

  const appsScriptAllowPermissionContent = getAppsScriptAllowPermissionFileContent();
  writeFileSync(FILES.gasAppsScript, appsScriptAllowPermissionContent, { encoding: 'utf-8' });

  const readmeFile = new DynMarkdown(FILES.readme);
  readmeFile.updateField(README_FIELDS.gasSetupContent, `<pre>\n${setupGcalSyncContent}\n</pre>`);
  readmeFile.updateField(README_FIELDS.gasAppsScriptContent, `<pre>\n${appsScriptAllowPermissionContent}\n</pre>`);
  readmeFile.saveFile();

  const VERSION_UPDATE = `// version`;
  replaceFileContent(FILES.gcalSyncUmd, VERSION_UPDATE, `this.VERSION = '${VERSION}'; ${VERSION_UPDATE}`);
  replaceFileContent(FILES.readme, VERSION_UPDATE, `// const version = "${VERSION}" ${VERSION_UPDATE}`);

  // await minifyFile(FILES.gcalSyncUmd, FILES.gcalSyncMin);
  // unlinkSync(FILES.gcalSync);
  // unlinkSync(FILES.gcalSyncUmd);
})();

function getAppsScriptAllowPermissionFileContent() {
  const appsScript = `{
  "timeZone": "Etc/GMT",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Calendar",
        "serviceId": "calendar",
        "version": "v3"
      }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}`;

  return appsScript;
}

function getSetupGcalSyncFileContent(configFile: string, version: string) {
  let configContent = readFileSync(configFile, { encoding: 'utf-8' });
  configContent = configContent.replace('export const configs = ', '');
  configContent = configContent.replace('as any', '');
  configContent = configContent.replace('// prettier-ignore\n', '');
  // prettier-ignore
  configContent = configContent.split('\n').map((row, index) => index === 0 ? row : `  ${row}`).slice(0, -1).join('\n')
  const gasSetupContent = `function getConfigs() {
  const configs = ${configContent}
  return configs
}

function getGcalSync(){
  const version = "${version}"
  const gcalSyncContent = UrlFetchApp.fetch(\`https://cdn.jsdelivr.net/npm/gcal-sync@\${version}\`).getContentText();
  eval(gcalSyncContent)
  const configs = getConfigs()
  const gcalSync = new GcalSync(configs);
  return gcalSync;
}

function setup() {
  const gcalSync = getGcalSync();
  gcalSync.installGcalSync();
}

function uninstall() {
  const gcalSync = getGcalSync();
  gcalSync.uninstallGcalSync();
}

function sync(){
  let gcalSync;
  try{
    gcalSync = getGcalSync()
    gcalSync.sync()
  } catch(e){
    if (gcalSync){
      gcalSync.sendErrorEmail(e.message)
    }
  }
}

function doGet(e) {
  let response = {}
  try{
    const gcalSync = getGcalSync()
    const content = gcalSync.sync()
    const logs = gcalSync.SESSION_LOGS
    response = {...content, logs}
  } catch(e){
    response = {error: e.message}
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)
}`;

  return gasSetupContent;
}

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
  // const minifiedContent = await minify(filePath);
  // writeFileSync(distPath, minifiedContent);
}

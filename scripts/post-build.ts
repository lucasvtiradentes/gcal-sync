import { DynMarkdown } from 'dyn-markdown';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';

const FILES = {
  package: './package.json',
  readme: './README.md',
  configs: './resources/configs.ts',
  gasAppsScript: './dist/setup/GAS_appsscript.json',
  gasSetup: './dist/setup/GAS_init.js',
  gcalSyncDev: './dist/setup/GAS_gcalsync_dev.js',
  gcalSync: './dist/index.js'
};

const VERSION = JSON.parse(readFileSync(FILES.package, { encoding: 'utf8' })).version;

const README_DYNAMIC_FIELDS = {
  gasAppsScriptContent: 'GAS_APPSSCRIPT',
  gasSetupContent: 'GAS_SETUP'
} as const;

type TReadmeDynamicFields = (typeof README_DYNAMIC_FIELDS)[keyof typeof README_DYNAMIC_FIELDS];

(async () => {
  mkdirSync('./dist/setup');

  const initFileContent = getGasInitFileContent(FILES.configs, VERSION);
  writeFileSync(FILES.gasSetup, initFileContent, { encoding: 'utf-8' });

  const gasAllowPermissionContent = getAppsScriptAllowPermissionFileContent();
  writeFileSync(FILES.gasAppsScript, gasAllowPermissionContent, { encoding: 'utf-8' });

  const originalContent = readFileSync(FILES.gcalSync, { encoding: 'utf8' });
  const gcalSyncDevContent = originalContent.split('/* global Reflect, Promise, SuppressedError, Symbol */\r\n\r\n\r\n')[1].split('\n').slice(0, -2).join('\n');
  writeFileSync(FILES.gcalSyncDev, `function getGcalSyncDev(){\n${gcalSyncDevContent}\n}`, { encoding: 'utf-8' });

  const readmeFile = new DynMarkdown<TReadmeDynamicFields>(FILES.readme);
  readmeFile.updateField(README_DYNAMIC_FIELDS.gasSetupContent, `<pre>\n${initFileContent}\n</pre>`);
  readmeFile.updateField(README_DYNAMIC_FIELDS.gasAppsScriptContent, `<pre>\n${gasAllowPermissionContent}\n</pre>`);
  readmeFile.saveFile();

  const VERSION_UPDATE = `// version`;
  replaceFileContent(FILES.readme, VERSION_UPDATE, `// const version = "${VERSION}" ${VERSION_UPDATE}`);

  unlinkSync(FILES.gcalSync);
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

function getGasInitFileContent(configFile: string, version: string) {
  let configContent = readFileSync(configFile, { encoding: 'utf-8' });
  configContent = configContent.replace(`import { TConfigs } from '../src/consts/types';`, '');
  configContent = configContent.replace('\n\n// prettier-ignore\n', '');
  configContent = configContent.replace('export const configs: TConfigs = ', '');
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

function install() {
  const gcalSync = getGcalSync();
  gcalSync.install();
}

function uninstall() {
  const gcalSync = getGcalSync();
  gcalSync.uninstall();
}

function sync(){
  try{
    const gcalSync = getGcalSync()
    gcalSync.sync()
  } catch(e){
    console.log(e);
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
  const newContent = originalContent
    .split('\n')
    .map((line) => {
      const hasSearchedStr = line.search(strToFind) > 0;
      const identation = line.length - line.trimStart().length;
      return hasSearchedStr ? `${' '.repeat(identation)}${strToReplace}` : line;
    })
    .join('\n');
  writeFileSync(file, newContent);
}

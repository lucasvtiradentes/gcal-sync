import { DynMarkdown } from 'dyn-markdown';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FILES = {
  package: './package.json',
  readme: './README.md',
  configs: './resources/configs.ts',
  gas_permissions: './dist/setup/permissions.json',
  gas_setup: './dist/setup/setup.js',
  gas_dev: './dist/setup/gcalsync_dev.js',
  gas_prod: './dist/index.js'
};

const VERSION = JSON.parse(readFileSync(FILES.package, { encoding: 'utf8' })).version;

const README_DYNAMIC_FIELDS = {
  permissions_content: 'GAS_APPSSCRIPT',
  setup_content: 'GAS_SETUP'
} as const;

type TReadmeDynamicFields = (typeof README_DYNAMIC_FIELDS)[keyof typeof README_DYNAMIC_FIELDS];

(async () => {
  mkdirSync('./dist/setup');

  const initFileContent = getGasInitFileContent(FILES.configs, VERSION);
  writeFileSync(FILES.gas_setup, initFileContent, { encoding: 'utf-8' });

  const gasAllowPermissionContent = getAppsScriptAllowPermissionFileContent();
  writeFileSync(FILES.gas_permissions, gasAllowPermissionContent, { encoding: 'utf-8' });

  const originalContent = readFileSync(FILES.gas_prod, { encoding: 'utf8' });
  const gcalSyncDevContent = originalContent.split("})(this, (function () { 'use strict';\n")[1].split('\n').slice(0, -2).join('\n');
  writeFileSync(FILES.gas_dev, `function getGcalSyncDev(){\n${gcalSyncDevContent}\n}`, { encoding: 'utf-8' });

  const readmeFile = new DynMarkdown<TReadmeDynamicFields>(FILES.readme);
  readmeFile.updateField(README_DYNAMIC_FIELDS.setup_content, `<pre>\n${initFileContent}\n</pre>`);
  readmeFile.updateField(README_DYNAMIC_FIELDS.permissions_content, `<pre>\n${gasAllowPermissionContent}\n</pre>`);
  readmeFile.saveFile();
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

  let gcalSync;
  const configs = getConfigs()
  const useDevVersion = false

  if (useDevVersion){
    const GcalSync = getGcalSyncDev()
    gcalSync = new GcalSync(configs);
  } else {
    const version = "${version}"
    const gcalSyncContent = UrlFetchApp.fetch(\`https://cdn.jsdelivr.net/npm/gcal-sync@${version}\`).getContentText();
    eval(gcalSyncContent)
    gcalSync = new GcalSync(configs);
  }

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
  const gcalSync = getGcalSync()

  try{
    console.log(gcalSync.sync())
  } catch(e){
    gcalSync.handleError(e)
  }
}

function doGet(reqParams) {
  const gcalSync = getGcalSync()

  const response = {
    sessionData: {},
    logs: [],
    error: null
  }

  try {
    response.sessionData = gcalSync.sync()
    response.logs = gcalSync.getSessionLogs()
  } catch (e){
    response.error = e
    gcalSync.handleError(e)
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)
}`;

  return gasSetupContent;
}

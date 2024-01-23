import { isRunningOnGAS } from '../../modules/GoogleAppsScript';

export async function fetcher(url: string) {
  if (isRunningOnGAS()) {
    return UrlFetchApp.fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });
  } else {
    return await fetch(url);
  }
}

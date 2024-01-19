import { checkIfisGASEnvironment } from '../classes/GAS';

export async function fetcher(url: string) {
  if (checkIfisGASEnvironment()) {
    return UrlFetchApp.fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });
  } else {
    return await fetch(url);
  }
}

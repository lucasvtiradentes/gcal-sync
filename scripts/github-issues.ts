// Utility for show github repository issues [open, closed, all] may it be public or private [need auth token with repo permission from github].

// uncomment this piece of code when working with private repositories:
// import dotenv from 'dotenv';
// dotenv.config();
// const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// getIssuesFromRepo(repoName, 'open', GITHUB_TOKEN)

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as https from 'node:https';

const repoName = getCurrentProjectGithubRepo() ?? 'lucasvtiradentes/life-organizer';
getIssuesFromRepo(repoName, 'open')
  .then((data) => console.table(data))
  .catch((e) => console.log(`error: ${e.message}`));

/* ########################################################################## */

function getCurrentProjectGithubRepo() {
  const packageJsonPath = join('package.json');
  if (!existsSync(packageJsonPath)) {
    console.log('error: package json was not found in parent directory!');
    return '';
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath).toString());
  const repoName = packageJson?.repository?.url?.replace('https://github.com/', '')?.replace('.git', '');
  return repoName;
}

async function getJsonFromRequest(url: string, githubToken?: string) {
  const requestUrl = new URL(url);

  const headers = !githubToken
    ? { 'User-Agent': 'ts-dyn-markdown' }
    : {
        'User-Agent': 'ts-dyn-markdown',
        Authorization: `Bearer ${githubToken}`
      };

  const options: https.RequestOptions = {
    hostname: requestUrl.hostname,
    path: requestUrl.pathname + requestUrl.search,
    method: 'GET',
    timeout: 3000,
    headers
  };

  return new Promise((resolve, reject) => {
    https
      .get(options, function (res) {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const finalResult = JSON.parse(body);
          resolve(finalResult);
        });
      })
      .on('error', function (e) {
        console.log('Got an error: ', e);
        reject(false);
      });
  });
}

async function getIssuesFromRepo(repoName: string, state: 'open' | 'closed' | 'all' = 'all', token?: string) {
  console.log(`getting issues list from repo: [https://api.github.com/repos/${repoName}/issues]`);

  if (repoName === 'username/repository' || repoName === '') {
    throw new Error('specify a repository property at package.json in order to get issues list!');
  }

  const githubIssuesLink = `https://api.github.com/repos/${repoName}/issues?state=${state}`;
  const openIssues: any[] | any = await getJsonFromRequest(githubIssuesLink, token);
  if (openIssues?.message) {
    if (openIssues.message === 'Not Found') {
      throw new Error('repository was not found, if it is a prive repository, specify the GITHUB token in order to list issues');
    }
    throw new Error(openIssues.message);
  }

  const parsedResults = [...openIssues]
    .map((item: any) => ({
      number: item.number,
      issue: item.title,
      creator: item.user.login,
      state: item.state,
      labels: item.labels.map((item: any) => item.name).join(', '),
      assignees: item.assignees.map((item: any) => item.login).join(', ')
    }))
    .reverse();

  const tableResults = parsedResults.reduce((a: any, v: any) => {
    const finalArr = {
      issue: v.issue,
      labels: v.labels
    };
    return { ...a, [v.number]: { ...finalArr } };
  }, {});

  return tableResults;
}

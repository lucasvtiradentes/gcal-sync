import { ERRORS } from '../consts/errors';

type ParsedGithubCommit = {
  commitDate: string;
  commitMessage: string;
  commitId: string;
  commitUrl: string;
  repository: string;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  repositoryDescription: string;
  isRepositoryPrivate: boolean;
  isRepositoryFork: boolean;
};

export async function getAllGithubCommits(username: string, personalToken: string) {
  const allCommitsArr = [];

  let pageNumber = 1;
  let shouldBreak = false;

  while (shouldBreak === false) {
    const url = `https://api.github.com/search/commits?q=author:${username}&page=${pageNumber}&sort=committer-date&per_page=100`;

    let response: Response;

    if (personalToken !== '') {
      response = await fetch(url, { headers: { Authorization: `Bearer ${personalToken}` } });
    } else {
      response = await fetch(url);
    }

    console.log(response);

    const data = JSON.parse(await response.text()) ?? {};

    if (response.status !== 200) {
      if (data.message === 'Validation Failed') {
        throw new Error(ERRORS.invalidGithubUsername);
      }

      if (data.message === 'Bad credentials') {
        throw new Error(ERRORS.invalidGithubToken);
      }

      throw new Error(data.message);
    }

    const commits = data.items;

    if (commits.length === 0) {
      shouldBreak = true;
      break;
    }

    allCommitsArr.push(...commits);
    pageNumber++;

    if (pageNumber > 10) {
      shouldBreak = true;
      break;
    }
  }

  const parsedCommits = allCommitsArr.map((it) => {
    const commitObj: ParsedGithubCommit = {
      commitDate: it.commit.author.date,
      commitMessage: it.commit.message.split('\n')[0],
      commitId: it.html_url.split('commit/')[1],
      commitUrl: it.html_url,
      repository: it.repository.full_name,
      repositoryId: it.repository.id,
      repositoryName: it.repository.name,
      repositoryOwner: it.repository.owner.login,
      repositoryDescription: it.repository.description,
      isRepositoryPrivate: it.repository.private,
      isRepositoryFork: it.repository.fork
    };

    return commitObj;
  });

  return parsedCommits;
}

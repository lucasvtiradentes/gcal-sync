class Github {
  constructor(email, token) {
    this.email = email;
    this.token = token;
  }

  getIssues() {
    const userIssues = [1, 2, 3];
    return userIssues;
  }

  getPullRequests() {
    const userPullRequests = [1, 2, 3];
    return userPullRequests;
  }

  getRepositories() {
    const userRepositories = [1, 2, 3];
    return userRepositories;
  }

  getOrganizations() {
    const userOrganizations = [1, 2, 3];
    return userOrganizations;
  }
}

this.Github = Github;

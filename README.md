<a name="TOC"></a>

<h3 align="center">
  GCAL SYNC
</h3>

<div align="center">
  <a href="https://www.npmjs.com/package/gcal-sync"><img src="https://img.shields.io/npm/v/gcal-sync.svg?style=flat" alt="npm version"></a>
  <a href="https://nodejs.org/en/"><img src="https://img.shields.io/badge/made%20with-node-1f425f?logo=node.js&.svg" /></a>
  <a href="https://www.github.com/lucasvtiradentes/gcal-sync/commits/master"><img src="https://img.shields.io/github/last-commit/lucasvtiradentes/gcal-sync?color=green&label=updated"></a>
  <br>
  <a href="#"><img src="https://img.shields.io/badge/maintained%3F-yes-green.svg" alt="maintance" /></a>
  <a href="https://www.github.com/lucasvtiradentes"><img src="https://img.shields.io/badge/maintainer-%40lucasvtiradentes-yellow"></a>
  <a href="https://github.com/lucasvtiradentes/gcal-sync#contributing"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat" alt="contributions" /></a>
</div>

<p align="center">
  <a href="#dart-features">Features</a> • <a href="#warning-requirements">Requirements</a> • <a href="#bulb-usage">Usage</a> • <a href="#wrench-development">Development</a> • <a href="#pray-help">Help</a> • <a href="#books-about">About</a> • <a href="#family-community">Community</a>
</p>

<details>
  <summary align="center"><span>see <b>all badges</b></span></summary>
  <p align="center">
    <br>
    <a href="#"><img src="https://img.shields.io/badge/maintained%3F-yes-green.svg" alt="maintance" /></a>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/graphs/contributors"><img src="https://img.shields.io/github/contributors/lucasvtiradentes/gcal-sync.svg" /></a>
    <br>
    <a href="#"><img src="https://badges.frapsoft.com/os/v2/open-source.svg?v=103"></a>
    <a href="https://saythanks.io/to/lucasvtiradentes"><img src="https://img.shields.io/badge/Say%20Thanks-!-1EAEDB.svg"></a>
    <a href="#"><img src="https://img.shields.io/github/sponsors/lucasvtiradentes?label=Github%20Sponsors" /></a>
  </p>
  <p align="center">
    <br>
    <a href="https://github.com/commitizen/cz-cli"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square" alt="commitzen" /></a>
    <a href="https://gitmoji.dev"><img src="https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg?style=flat-square" alt="Gitmoji" /></a>
    <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square" alt="semantic-release"/></a>
    <br>
    <a href="https://git-scm.com/"><img src="https://badgen.net/badge/icon/git?icon=git&label"></a>
    <a href="https://github.com/"><img src="https://badgen.net/badge/icon/github?icon=github&label"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://badgen.net/badge/icon/typescript?icon=typescript&label"></a>
  </p>
  <p align="center">
    <br>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/releases"><img src="https://img.shields.io/github/v/release/lucasvtiradentes/gcal-sync.svg" /></a>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/tags" target="_blank"><img src="https://img.shields.io/github/tag/lucasvtiradentes/gcal-sync.svg" alt="GitHub tag (latest SemVer)"></a>
    <br>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/pulls" target="_blank"><img src="https://badgen.net/github/prs/lucasvtiradentes/gcal-sync?label=open%20PR" alt="GitHub"></a>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/commits/master" target="_blank"><img src="https://badgen.net/github/commits/lucasvtiradentes/gcal-sync" alt="GitHub"></a>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/issues"><img src="https://img.shields.io/github/issues-raw/lucasvtiradentes/gcal-sync" /></a>
    <a href="https://github.com/lucasvtiradentes/gcal-sync/issues?q=is%3Aissue+is%3Aclosed"><img src="https://img.shields.io/github/issues-closed-raw/lucasvtiradentes/gcal-sync" /></a>
  </p>
</details>

<details>
  <summary align="center"><span>see <b>table of content</b></span></summary>
  <p align="center">
    <ul>
      <!-- <li><a href="#trumpet-overview">Overview</a></li> -->
      <!-- <li><a href="#pushpin-table-of-contents">TOC</a></li> -->
      <li><a href="#dart-features">Features</a></li>
      <li><a href="#warning-requirements">Requirements</a></li>
      <li>
        <a href="#bulb-usage">Usage</a>
        <ul>
          <li><a href="#installation">Installation</a></li>
          <li><a href="#general-tips">General tips</a></li>
        </ul>
      </li>
      <li>
        <a href="#wrench-development">Development</a>
        <ul>
          <li><a href="#development-setup">Development setup</a></li>
          <li><a href="#folders-and-files-structure">Folders and files structure</a></li>
          <li><a href="#used-technologies">Used technologies</a></li>
          <li><a href="#code-style">Code style</a></li>
          <li><a href="#commit-messages-style">Commit messages style</a></li>
        </ul>
      </li>
      <li>
        <a href="#pray-help">Help</a>
        <ul>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="#docs-and-support">Docs and support</a></li>
        </ul>
      </li>
      <li>
        <a href="#books-about">About</a>
        <ul>
          <li><a href="#related">Related</a></li>
          <li><a href="#license">License</a></li>
        </ul>
      </li>
      <li>
        <a href="#family-community">Community</a>
        <ul>
          <li><a href="#contributing">Contributing</a></li>
          <li><a href="#feedback">Feedback</a></li>
          <li><a href="#acknowledgements">Acknowledgements</a></li>
        </ul>
      </li>
    </ul>
  </p>
</details>

<a href="#"><img src="./.github/images/divider.png" /></a>

## :trumpet: Overview




<div align="center">
  <table>
    <tr>
      <td width="250">
        <img width="250" src="./.github/images/gcalsync.webp" />
      </td>
      <td align="left">
        <p>Track your progress over time with an one way synchronization from <a href="https://ticktick.com/">ticktick</a> tasks and <a href="https://github.com/">github</a> commits to your <a href="https://calendar.google.com/">google calendar</a>.</p>
        <p>In the image it is shown my current usage of this tool:
          <ul align="left">
            <li align="left"><b>black</b>: my past github commits;</li>
            <li align="left"><b>green</b>: ticktick completed tasks;</li>
            <li align="left">the others collors are for ticktick tasks to do:
              <ul>
                <li><b>red</b>: important tasks with pre-defined datetime;</li>
                <li><b>blue</b>: planned tasks;</li>
                <li><b>purple</b>: not tasks (games to watch, movie release dates, etc).</li>
              </ul>
            </li>
          </ul>
        </p>
        <p>This project was deeply inspired by <a href="https://github.com/derekantrican/GAS-ICS-Sync">this tool</a>, and my main reason for creating this was to move the completed ticktick tasks to a 'completed_tasks' google calendar, so that I'd be able to track my progress.</p>
      </td>
    </tr>
  </table>
</div>

## :dart: Features<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

&nbsp;&nbsp;&nbsp;✔️ add github commits to google calendar;<br>
&nbsp;&nbsp;&nbsp;✔️ add ticktick tasks to google calendar;<br>
&nbsp;&nbsp;&nbsp;✔️ update ticktick tasks in its corresponding event in gcal agenda in case of changes in dates and title;<br>
&nbsp;&nbsp;&nbsp;✔️ every completed task (or deleted) in ticktick will make the event be moved to a compelted gcal agenda;<br>
&nbsp;&nbsp;&nbsp;✔️ option to send a daily summary notification of what gcalsync has done throughout the day;<br>
&nbsp;&nbsp;&nbsp;✔️ option to sync each ticktick calendar to a different google calendar agenda;<br>
&nbsp;&nbsp;&nbsp;✔️ option to ignore certain tasks based on tags<br>
&nbsp;&nbsp;&nbsp;✔️ you can add a url link to run the sync function manually whenever you want.<br>

## :warning: Requirements<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

The only thing you need to use this solution is a `google account`.

## :bulb: Usage<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

### Installation

To effectivily use this project, do the following steps:

- get all your calendars from ticktick in this [link](https://ticktick.com/webapp/#settings/subscribe);
- go to [google apps script](https://script.google.com/home) and create a new project;
- copy and past the code below and save the file;
- change the variable `configs` acording to your needs and data;
- select the function `setup` in the upfront menu and run it: it will setup the function to run every `5 minutes`;

```javascript
function getGcalSync() {
  const configs = {
    ticktickSync: {
      icsCalendars: [
        ['webcal://othercalendar1.ics', 'gcal_1', 'gcal_completed'], // everything will be synced
        ['webcal://othercalendar2.ics', 'gcal_2', 'gcal_completed', { tag: '#FUN' }], // everything will be synced, but marks all tasks with a label
        ['webcal://yourticktickcal.ics', 'gcal_all_tasks', 'gcal_completed', { ignoredTags: ['#FUN'] }] // everything will be synced, excepts tasks with the specifieds labels
      ],
      syncTicktick: true            // option to sync ticktick tasks
    },
    githubSync: {
      username: "lucasvtiradentes", // github username
      googleCalendar: "gh_commits", // google calendar to isnert commits as events
      personalToken: '',            // github token, required if you want to sync private repo commits
      ignoredRepos: [],             // ignored repositories string array: ['repo1', 'repo2']
      parseGithubEmojis: true,      // parse string emojis to emojis
      syncGithub: true              // option to sync github commits
    },
    notifications: {
      email: 'youremail@gmail.com', // email to send reports
      dailyEmailsTime: '23:30',     // time to email the summary
      timeZoneCorrection: -3,       // difference from utc time
      emailNewRelease: true,        // email new version releases
      emailDailySummary: true,      // email summary daily at a specified time
      emailSession: true            // email sessions with modifications
    },
    options: {
      syncFunction: 'sync',         // function name to run every x minutes
      updateFrequency: 5,           // wait time between sync checks
      showLogs: true,               // show runtime information
      maintanceMode: false          // option to not create, delete, update anything
    }
  };

  const version = "1.4.0" // version
  const gcalSyncContent = UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/gcal-sync@${version}`).getContentText();
  eval(`this.GcalSync = ` + gcalSyncContent);
  const gcalSync = new GcalSync(configs);
  return gcalSync;
}

function sync() {
  const gcalSync = getGcalSync();
  gcalSync.sync()
}

function setup() {
  const gcalSync = getGcalSync();
  gcalSync.installGcalSync();
}

function remove() {
  const gcalSync = getGcalSync();
  gcalSync.uninstallGcalSync();
}

// bellow function runs at every http request in the provided link

function doGet(e) {
  const gcalSync = getGcalSync()
  const content = gcalSync.sync()
  return ContentService.createTextOutput(JSON.stringify(content)).setMimeType(ContentService.MimeType.JSON)
}
```

After that, your data will be sync as you specified every 5 minutes.

Additionally, you can add a link to manually run the sync function whenever you want, by adding the following steps:

1. on google apps script, click on the button upper right **implement** button and choose "new implementation";
2. on the left menu, select "app web" as the type of the new implementation and hit enter;
3. adter that, a **http link** will be provided so you can run the sync function by accessing it.

### General tips

- update the version in the above code in a regular basis to get the most recent updates;
- in case of deleted tasks (that means, you dont intend to do it anymore) that are in gcal, make sure to delete in gcal as well;
- you can have a tikctick calendar for all your tasks and ignore certain kind of tasks and handle this ignored ones in other gcal;
- before setting up the auto sync, you can use the `maintanceMode` to check if everything is okay by reading the app logs;
- it is not necessary to generate a github token in order to sync commits, it is only required if you want to sync your contributions to private repos as well;
- every update in ticktick may take 5 minutes to propagate to its ics calendars.

## :wrench: Development<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

### Development setup

To setup this project in your computer, download it in this link or run the following commands:

```bash
# Clone this repository
$ git clone https://github.com/lucasvtiradentes/gcal-sync

# Go into the repository
$ cd gcal-sync
```

After download it, go to the project folder and run these commands:

```bash
# Install dependencies
$ npm install
```

If you want to contribute to the project, after you make the necessary changes, you can load your work in apps scripts with almost no effort, by pushing your code to a repository and then add the following code to the apps script:

```js
function getGcalSyncContent(mode){

  if (mode === 'production'){
    const version = "1.4.0" // version
    return UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/gcal-sync@${version}`).getContentText()
  } else if (mode === 'development'){
    const repository = "lucasvtiradentes/gcal-sync" // remember to update this
    const filePath = "dist/GcalSync.min.js"
    const final_link = `https://api.github.com/repos/${repository}/contents/${filePath}`
    const response = UrlFetchApp.fetch(final_link, {'method' : 'get', 'contentType': 'application/json'})
    const base64Content = JSON.parse(response.toString()).content
    const decodedArr = Utilities.base64Decode(base64Content);
    const decodedAsString = Utilities.newBlob(decodedArr).getDataAsString()
    return decodedAsString
  }

  return ''

}

function getGcalSync(){
  ...
  const gcalSyncContent = getGcalSyncContent('development') // 'production'
  ...
}
```

### Folders and files structure

The project has the following folder strucure:

```plain
|-- .github         # contains CI-CD workflows, github templates, DOCS and images.
|-- .husky          # contains git hooks configurations files.
|-- .vscode         # contains vscode settings for this project.
|-- dist            # (dev only) build folder
|-- docs            # documentation folder
|-- node_modules    # (dev only) dependencies folder
|-- scripts         # scripts to help development
|-- src             # application source code
```

and the filles present in root folder are the following:

```plain
.czrc                 # commitizen settings
.editorconfig         # editorconfig settings
.eslintignore         # eslint ignored items
.eslintrc.json        # eslint settings
.gitignore            # git ignored items
.lintstagedrc         # lintstaged settings
.npmignore            # npm package ignored items
.prettierignore       # prettier ignored items
.prettierrc.json      # prettier settings
commitlint.config.js  # commitlint settings
LICENSE               # application license
package.json          # project specifications
README.md             # project description markdown file
release.config.js     # ci-cd npm package deployment configs
tsconfig.json         # typescript settings
```

### Used technologies

gcal-sync uses the following thechnologies:

<div align="center">
  <table>
    <tr>
      <th>Scope</th>
      <th>Subject</th>
      <th>Technologies</th>
    </tr>
    <tr>
      <td rowspan="1">Main</td>
      <td>Main</td>
      <td align="center">
        <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white"></a>
        <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white"></a>
      </td>
    </tr>
    <tr>
      <td rowspan="3">Setup</td>
      <td>Code linting</td>
      <td align="center">
        <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/prettier-1A2C34?logo=prettier&logoColor=F7BA3E"></a>
        <a href="https://github.com/eslint/eslint"><img src="https://img.shields.io/badge/eslint-3A33D1?logo=eslint&logoColor=white"></a>
      </td>
    </tr>
    <tr>
      <!-- <td rowspan="2">Setup</td> -->
      <td>Commit linting</td>
      <td align="center">
      <a target="_blank" href="https://github.com/conventional-changelog/commitlint"><img src="https://img.shields.io/badge/commitlint-red?logo=commitlint&logoColor=white"></a>
      <a target="_blank" href="https://github.com/commitizen/cz-cli"><img src="https://img.shields.io/badge/commitizen-pink?logo=conventionalcommits&logoColor=white"></a>
      <a href="https://gitmoji.dev"><img
    src="https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg?style=flat-square"
    alt="Gitmoji"/></a>
      </td>
    </tr>
    <tr>
      <!-- <td rowspan="2">Setup</td> -->
      <td>Other</td>
      <td align="center">
        <a href="https://editorconfig.org/"><img src="https://img.shields.io/badge/Editor%20Config-E0EFEF?logo=editorconfig&logoColor=000"></a>
        <a target="_blank" href="https://github.com/typicode/husky"><img src="https://img.shields.io/badge/🐶%20husky-green?logo=husky&logoColor=white"></a>
        <a target="_blank" href="https://github.com/okonet/lint-staged"><img src="https://img.shields.io/badge/🚫%20lint%20staged-yellow?&logoColor=white"></a>
      </td>
    </tr>
  </table>
</div>

And also this project used the following packages:

```plain
# DEV DEPENDENCIES (skiped @types/*)

- semantic-release                   # semantic-release packages
- @semantic-release/changelog
- @semantic-release/commit-analyzer
- @semantic-release/git
- @semantic-release/release-notes-generator

- @commitlint/cli                    # commitlint packages
- @commitlint/config-conventional

- commitizen                         # commitzen packages
- commitizen-emoji

- prettier                           # code styling packages
- eslint
- lint-staged
- eslint-config-prettier
- eslint-plugin-prettier
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser

- husky                              # git hooks automation;
- minify                             # minify files
- rimraf                             # crossref delete files/folder
- ts-node                            # typescript runner;
- typescript                         # javascript superset tool;
```

### Code style

There's not a named convention used in this project (like [airbnb](https://github.com/airbnb/javascript), for instance), instead we specified he settings we like the most in prettier. You can check these settings in the [.prettierrc](./.prettierrc.json) file.

### Commit messages style

This project uses the best of two main conventions to commit messages validation:

- [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/): it's powerfull messages structure;
- [gitmoji](https://gitmoji.dev/): it's beutiful and visual way to display commits.

So a typically valid commit message has this pattern:

> 🔧 config: add lint-staged to the project (#2)

<a href="#"><img src="./.github/images/divider.png" /></a>

## :pray: Help<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

## FAQ

You can check our most common questions and awnsers in this [link](./docs/FAQ.MD).

## Docs and support

The first point of call should be our [Github discussions](https://github.com/lucasvtiradentes/gcal-sync/discussions).
Ask your questions about bugs or specific use cases, and someone I will respond as soon as possible.
Or, if you prefer, [open an issue](https://github.com/lucasvtiradentes/gcal-sync/issues) on our GitHub repo.

<a href="#"><img src="./.github/images/divider.png" /></a>

## :books: About<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

## Related

The most related links to this project are:

- [GAS-ICS-Sync](https://github.com/derekantrican/GAS-ICS-Sync): A Google Apps Script for syncing ICS/ICAL files faster than the current Google Calendar speed. This was my main inspiration;
- [online-ics](https://larrybolt.github.io/online-ics-feed-viewer/): online tool to view ICS calendars;

## License

This project is distributed under the terms of the MIT License Version 2.0. A complete version of the license is available in the [LICENSE](LICENSE) file in this repository. Any contribution made to this project will be licensed under the MIT License Version 2.0.

<a href="#"><img src="./.github/images/divider.png" /></a>

## :family: Community<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

## Contributing

If you are a typescript developer, we would kind and happy accept your help:

- The best way to get started is to select any issue from the [`good-first-issue`](https://github.com/lucasvtiradentes/gcal-sync/labels/good%20first%20issue) label;
- If you would like to contribute, please review our [Contributing Guide](docs/CONTRIBUTING.md) for all relevant details.

Another ways to positivily impact this project is to:

- **:star: Star this repository**: my goal is to impact the maximum number of developers around the world;
- ✍️ **Fix english mistakes** I might have made in this project, may it be in the DOCS or even in the code (I'm a portuguese natural speaker);
- [:heart: Say thanks](https://saythanks.io/to/lucasvtiradentes): kind words have a huge impact in anyone's life;
- [💰 Donate](https://github.com/lucasvtiradentes): if you want to support my work even more, consider make a small donation. I would be really happy!

## Feedback

Any questions or suggestions? You are welcome to discuss it on:

- [Github issues](https://github.com/lucasvtiradentes/gcal-sync/issues)
- [Email](mailto:lucasvtiradentes@gmail.com)

## Acknowledgements

This is a [@lucasvtiradentes's](https://github.com/lucasvtiradentes) project to `return some value to the world` after years of consuming a lot of useful tools provided by this `amazing open source community`.

<a href="#"><img src="./.github/images/divider.png" /></a>

<div align="center">
  <p>
    <a target="_blank" href="https://www.linkedin.com/in/lucasvtiradentes/"><img src="https://img.shields.io/badge/-linkedin-blue?logo=Linkedin&logoColor=white" alt="LinkedIn"></a>
    <a target="_blank" href="mailto:lucasvtiradentes@gmail.com"><img src="https://img.shields.io/badge/gmail-red?logo=gmail&logoColor=white" alt="Gmail"></a>
    <a target="_blank" href="https://discord.com/users/262326726892191744"><img src="https://img.shields.io/badge/discord-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
    <a target="_blank" href="https://github.com/lucasvtiradentes/"><img src="https://img.shields.io/badge/github-gray?logo=github&logoColor=white" alt="Github"></a>
  </p>
  <p>Made with ❤️ by Lucas Vieira.</p>
  <p>👉 See also all <a href="https://github.com/lucasvtiradentes/lucasvtiradentes/blob/master/portfolio/PROJECTS.md#TOC">my projects</a></p>
  <p>👉 See also all <a href="https://github.com/lucasvtiradentes/my-tutorials#readme">my articles</a></p>
</div>

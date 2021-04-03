#!/usr/bin/env node
const {
  startBackend,
  spawnBackendProcessInBackground,
  addOverrides,
  removeOverrides,
  getOverrides,
} = require('./commands');

const { EADDRINUSE } = require('./backend/errors');

const [, , commandName, ...args] = process.argv;

switch (commandName) {
  case 'start': {
    const runInBackground = args.includes('--background');

    if (runInBackground) {
      spawnBackendProcessInBackground()
        .then((serverProcess) => {
          console.log(
            'starting backend process in the background with pid:',
            serverProcess.pid,
          );
        })
        .catch((e) => {
          process.exitCode = e.exitCode;

          if (e.exitCode === EADDRINUSE.exitCode) {
            console.warn('The backend seems to be already running.');
            return;
          }

          console.error(e);
        });

      break;
    }

    startBackend().catch((e) => {
      if (e.code === EADDRINUSE.errorCode) {
        process.exitCode = EADDRINUSE.exitCode;

        console.warn('The backend seems to be already running.');
      } else {
        process.exitCode = 1;

        console.error(e);
      }
    });

    break;
  }

  case 'add': {
    if (args.length < 3 || args % 2 === 0) {
      throw new Error(
        `network-overrides: 'add' command expects an override set id followed by pairs of match and related replacement. ex: \n\tnetwork-overrides add google-search "https://www.google.com/search?(.*)" "http://localhost:3000/\\1"`,
      );
    }

    const overrideSetId = args[0];

    const overrides = [];

    for (let i = 1; i < args.length; i += 2) {
      overrides.push({ from: args[i], to: args[i + 1] });
    }

    addOverrides(overrideSetId, overrides).catch((e) => {
      console.error(`failed to add ${overrideSetId}`, e);
    });

    break;
  }

  case 'remove': {
    const overrideSetId = args[0];

    if (!overrideSetId) {
      throw new Error(
        `network-overrides: 'remove' command expects an override set id. ex: \n\tnetwork-overrides remove google-search`,
      );
    }

    removeOverrides(overrideSetId).catch((e) => {
      console.error(`failed to remove ${overrideSetId}`, e);
    });

    break;
  }

  case 'list': {
    getOverrides()
      .then((overridesMap) => {
        console.log(overridesMap);
      })
      .catch((e) => {
        console.error(`failed to get overrides`, e);
      });

    break;
  }

  default:
    throw new Error(
      `network-overrides: '${commandName}' command does not exist`,
    );
}

// node cli.js add automation-ui "https://cdn\\..*\\.pipedriveassets\\..*/automation-ui/(.*)" "http://localhost:3065/\\1"

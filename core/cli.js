#!/usr/bin/env node
const path = require('path');

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
    if (args.length < 2) {
      throw new Error(
        `'network-overrides add' command expects an override set id followed by the respective overrides\n` +
          `\t- JSON string. ex: \n\t\tnetwork-overrides add google-search '[{from:"https://www.google.com/search/(.*)",to:"http://localhost:3000/\$1"}]\n` +
          `\t- path to JSON file preceeded by @. ex: \n\t\tnetwork-overrides add google-search @config/overrides.json`,
      );
    }

    const overrideSetId = args[0];

    const overridesArg = args[1];

    let overrides;

    if (overridesArg[0] === '@') {
      overrides = require(path.resolve(overridesArg.slice(1)));
    } else {
      overrides = JSON.parse(overridesArg);
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
        `'network-overrides remove' command expects an override set id. ex: \n\tnetwork-overrides remove google-search`,
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
      `'network-overrides ${commandName}' is not a valid command`,
    );
}

// node cli.js add automation-ui '[{"from":"https://cdn\\..*\\.pipedriveassets\\..*/automation-ui/(.*)","to":"http://localhost:3065/$1"}]'

#!/usr/bin/env node
const path = require('path');

const {
  startBackend,
  spawnBackendProcessInBackground,
  addOverrides,
  removeOverrides,
  getOverrides,
  wrapCommandWithOverrides,
} = require('./commands');

const { EADDRINUSE } = require('./backend/errors');

const [, , commandName, ...args] = process.argv;

switch (commandName) {
  case 'start-backend': {
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
        `'network-overrides add' expects an override set id followed by the respective overrides\n` +
          `\t- JSON string. ex: \n\t\tnetwork-overrides add google-search '[{from:"https://www.google.com/search/(.*)",to:"http://localhost:3000/\$1"}]'\n` +
          `\t- path to JSON file preceeded by @. ex: \n\t\tnetwork-overrides add google-search @config/overrides.json`,
      );
    }

    const overrideSetId = args[0];

    const overrides = getOverridesFromArg(args[1]);

    addOverrides(overrideSetId, overrides).catch((e) => {
      console.error(`failed to add overrides for '${overrideSetId}'`, e);

      process.exitCode = 1;
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
      console.error(`failed to remove overrides for '${overrideSetId}'`, e);

      process.exitCode = 1;
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

  case 'wrap-command': {
    const normalizedArgs = args.filter((arg) => arg !== '--ensure-backend');

    if (normalizedArgs.length < 3) {
      throw new Error(
        `'network-overrides wrap-command' expects a command string to execute, followed by an override set id and the respective overrides\n` +
          `\t- JSON string. ex: \n\t\tnetwork-overrides wrap-command 'node google-search-proxy.js' google-search '[{from:"https://www.google.com/search/(.*)",to:"http://localhost:3000/\$1"}]\n` +
          `\t- path to JSON file preceeded by @. ex: \n\t\tnetwork-overrides wrap-command 'node google-search-proxy.js' google-search @config/overrides.json`,
      );
    }

    const commandToWrap = normalizedArgs[0];

    const overrideSetId = normalizedArgs[1];

    const overrides = getOverridesFromArg(normalizedArgs[2]);

    const ensureBackend = normalizedArgs.length < args.length;

    wrapCommandWithOverrides(
      commandToWrap,
      overrideSetId,
      overrides,
      ensureBackend,
    );

    break;
  }

  default:
    throw new Error(
      `'network-overrides ${commandName}' is not a valid command`,
    );
}

function getOverridesFromArg(overridesArg) {
  if (overridesArg[0] === '@') {
    return require(path.resolve(overridesArg.slice(1)));
  } else {
    return JSON.parse(overridesArg);
  }
}

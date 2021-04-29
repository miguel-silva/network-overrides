const { spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');

const { start } = require('./backend');
const { EADDRINUSE } = require('./backend/errors');

const { PORT } = require('./constants');

const backendUrl = `http://localhost:${PORT}`;

function startBackend() {
  return start(PORT);
}

async function spawnBackendProcess(options = {}) {
  const backendStartPath = path.join(__dirname, 'backend', 'start.js');

  const { envOptions, ...restOptions } = options;

  let serverIsAlreadyRunning = false;

  try {
    // check if the server is already running
    await getOverrides();
    serverIsAlreadyRunning = true;
  } catch (e) {}

  if (serverIsAlreadyRunning) {
    const error = new Error('server is already running');

    error.exitCode = EADDRINUSE.exitCode;

    throw error;
  }

  // spawn the backend process
  const serverProcess = spawn('node', [backendStartPath], {
    ...restOptions,
    env: {
      ...process.env,
      ...envOptions,
    },
  });

  // wait a while for the server to get up, checking its status multiple times in between
  let attemptsLeft = 10;

  while (attemptsLeft-- > 0) {
    await sleep(100);

    // if the server has exited -> throw corresponding error
    if (serverProcess.exitCode) {
      const error = new Error('server initialization failed');

      error.exitCode = serverProcess.exitCode;

      throw error;
    }

    try {
      // check if the server is ready
      await getOverrides();

      return serverProcess;
    } catch (e) {
      // the server is not ready but hasn't exited
      // suppress the error and try again if there are any attempts left
    }
  }

  // exhausted attemps -> return serverProcess anyways
  return serverProcess;
}

async function spawnBackendProcessInBackground(options = {}) {
  const serverProcess = await spawnBackendProcess({
    ...options,
    detached: true,
    stdio: 'ignore',
  });

  serverProcess.unref();

  return serverProcess;
}

async function stopServer() {
  await fetch(`${backendUrl}/`, {
    method: 'DELETE',
  });
}

function getOverrides() {
  return fetch(`${backendUrl}/overrides`).then((response) => response.json());
}

async function addOverrides(overrideSetId, overrides) {
  await fetch(`${backendUrl}/overrides/${overrideSetId}`, {
    method: 'POST',
    body: JSON.stringify(overrides),
    headers: { 'Content-Type': 'application/json' },
  });
}

async function removeOverrides(overrideSetId) {
  await fetch(`${backendUrl}/overrides/${overrideSetId}`, {
    method: 'DELETE',
  });
}

async function wrapCommandWithOverrides(
  commandToWrap,
  overrideSetId,
  overrides,
  ensureBackend,
) {
  if (ensureBackend) {
    // start the process in the background, continuing if already running
    try {
      await spawnBackendProcessInBackground();
    } catch (e) {
      // ignore EADDRINUSE, which means that the backend is already running
      if (e.exitCode !== EADDRINUSE.exitCode) {
        process.exitCode = e.exitCode || 1;
        console.error(e);
        return;
      }
    }
  }

  // add overrides set
  try {
    await addOverrides(overrideSetId, overrides);
  } catch (e) {
    console.error(`failed to add overrides for '${overrideSetId}'`, e);

    process.exitCode = 1;

    return;
  }

  // get command name and related args by splitting the command by spaces
  const [subCommandName, ...subArgs] = commandToWrap.trim().split(/ +/g);

  // start wrapped command
  const subProcess = spawn(subCommandName, subArgs, {
    stdio: 'inherit',
  });

  //#region cleanup section
  let cleanupCalled = false;

  /**
   * remove overrides set, if we haven't yet
   */
  function cleanup() {
    if (cleanupCalled) {
      return;
    }

    cleanupCalled = true;

    removeOverrides(overrideSetId).catch((e) => {
      console.error(`failed to remove overrides for '${overrideSetId}'`, e);
    });
  }

  subProcess.on('exit', (code) => {
    process.exitCode = code;

    cleanup();
  });

  subProcess.on('error', (error) => {
    console.error(error);

    cleanup();
  });

  process.on('SIGINT', () => {
    cleanup();
  });

  process.on('SIGTERM', () => {
    cleanup();

    subProcess.kill();
  });
  //#endregion cleanup section
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

module.exports = {
  startBackend,
  spawnBackendProcess,
  spawnBackendProcessInBackground,
  stopServer,
  getOverrides,
  addOverrides,
  removeOverrides,
  wrapCommandWithOverrides,
};

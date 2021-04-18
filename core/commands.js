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

function spawnBackendProcess(options = {}) {
  const backendStartPath = path.join(__dirname, 'backend', 'start.js');

  const { envOptions, ...restOptions } = options;

  const initializedServerProcessPromise = new Promise((resolve, reject) => {
    const serverProcess = spawn('node', [backendStartPath], {
      ...restOptions,
      env: {
        ...process.env,
        ...envOptions,
      },
    });

    setTimeout(() => {
      if (serverProcess.exitCode) {
        const error = new Error('server initialization failed');

        error.exitCode = serverProcess.exitCode;

        reject(error);
      }

      resolve(serverProcess);
    }, 500);
  });

  return initializedServerProcessPromise;
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
  const [subCommandName, ...subArgs] = commandToWrap.trim().split(/ +/g);

  if (ensureBackend) {
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

  try {
    await addOverrides(overrideSetId, overrides);
  } catch (e) {
    console.error(`failed to add overrides for '${overrideSetId}'`, e);

    process.exitCode = 1;

    return;
  }

  const subProcess = spawn(subCommandName, subArgs, {
    stdio: 'inherit',
  });

  let cleanupCalled = false;

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
}

module.exports = {
  startBackend,
  spawnBackendProcess,
  spawnBackendProcessInBackground,
  getOverrides,
  addOverrides,
  removeOverrides,
  wrapCommandWithOverrides,
};

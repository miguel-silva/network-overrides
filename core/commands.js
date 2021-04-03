const { spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');

const { start } = require('./backend');
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

module.exports = {
  startBackend,
  spawnBackendProcess,
  spawnBackendProcessInBackground,
  getOverrides,
  addOverrides,
  removeOverrides,
};

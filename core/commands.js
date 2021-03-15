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

  const serverProcess = spawn('node', [backendStartPath], {
    ...restOptions,
    env: {
      ...process.env,
      ...envOptions,
    },
  });

  return serverProcess;
}

function spawnBackendProcessInBackground(options = {}) {
  const serverProcess = spawnBackendProcess({
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

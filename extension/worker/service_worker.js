let state = {
  status: 'ready',
};

let activeOverrides = [];

let overridesSocket;

chrome.windows.onRemoved.addListener(function () {
  chrome.windows.getAll(async (windows) => {
    if (windows.length > 0) {
      return;
    }

    console.info('on browser close');

    closeSocket();
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('message received', message);

  switch (message.type) {
    case 'get-state':
      sendResponse(state);
      break;

    case 'connect':
      connect();
      break;

    case 'disconnect':
      closeSocket();
      break;
  }
});

function connect() {
  if (overridesSocket) {
    return;
  }

  updateState({
    status: 'connecting',
  });

  overridesSocket = new WebSocket('ws://localhost:8117');
  startHeartbeat();

  overridesSocket.onmessage = (event) => {
    console.log('socket message', event);

    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'overrides': {
        updateState({
          status: 'connected',
          overridesMap: message.overridesMap,
        });

        break;
      }
    }
  };

  overridesSocket.onclose = (event) => {
    console.log('socket closed', event);

    let errorMessage;

    switch (event.code) {
      case 1000:
        errorMessage = null;
        break;

      case 1006:
        errorMessage = 'Server seems to be down';
        break;

      default:
        errorMessage = `Connection closed with status code: ${event.code}`;
    }

    updateState({
      status: 'ready',
      errorMessage,
    });

    overridesSocket = null;
  };
}

function closeSocket() {
  if (overridesSocket) {
    overridesSocket.close(1000);
    overridesSocket = null;
  }
  stopHeartbeat();
}

async function handleBeforeRequest(request) {
  const override = activeOverrides.find(
    (override) => !!request.url.match(override.from),
  );

  if (!override) {
    return;
  }

  const redirectUrl = request.url.replace(override.from, override.to);

  console.log(
    'redirecting',
    request.url,
    'to',
    redirectUrl,
    'based on',
    override,
  );

  return {
    redirectUrl,
  };
}

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) =>
  console.log('chrome.declarativeNetRequest.onRuleMatchedDebug', info),
);

async function updateState(newState) {
  state = newState;

  const newActiveOverrides = newState.overridesMap
    ? Object.values(newState.overridesMap).flatMap((overrides) =>
        overrides.map(({ from, to }) => {
          return {
            from: from,
            to: to.replaceAll('$', '\\'),
          };
        }),
      )
    : [];

  const areOverridesInPlace = activeOverrides.length > 0;

  if (areOverridesInPlace && newActiveOverrides.length === 0) {
    console.log('what should we do in this scenario???');

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
    });

    // chrome.webRequest.onBeforeRequest.removeListener(handleBeforeRequest);
  } else if (!areOverridesInPlace && newActiveOverrides.length > 0) {
    const newRules = newActiveOverrides.map(({ from, to }, index) => {
      return {
        id: index + 1,
        // priority: 1,
        action: { type: 'redirect', redirect: { regexSubstitution: to } },
        condition: { regexFilter: from },
      };
    });

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map((rule) => rule.id);

    console.log({ oldRuleIds, oldRules, newRules });

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: newRules,
    });
    // chrome.webRequest.onBeforeRequest.addListener(
    //   handleBeforeRequest,
    //   {
    //     urls: ['<all_urls>'],
    //   },
    //   ['blocking'],
    // );
  }

  activeOverrides = newActiveOverrides;

  chrome.runtime.sendMessage({ type: 'state-updated', state });
}

/**
 * Tracks when a service worker was last alive and extends the service worker
 * lifetime by writing the current time to extension storage every 20 seconds.
 * You should still prepare for unexpected termination - for example, if the
 * extension process crashes or your extension is manually stopped at
 * chrome://serviceworker-internals.
 */
let heartbeatInterval;

async function runHeartbeat() {
  await chrome.storage.local.set({ 'last-heartbeat': new Date().getTime() });
}

/**
 * Starts the heartbeat interval which keeps the service worker alive. Call
 * this sparingly when you are doing work which requires persistence, and call
 * stopHeartbeat once that work is complete.
 */
async function startHeartbeat() {
  // Run the heartbeat once at service worker startup.
  runHeartbeat().then(() => {
    // Then again every 20 seconds.
    heartbeatInterval = setInterval(runHeartbeat, 20 * 1000);
  });
}

async function stopHeartbeat() {
  clearInterval(heartbeatInterval);
}

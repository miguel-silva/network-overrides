let state = {
  status: 'ready',
};

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

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) =>
  console.log('rule matched', info),
);

async function updateState(newState) {
  if (state.overridesMap || newState.overridesMap) {
    const oldRules = await chrome.declarativeNetRequest.getSessionRules();

    const removeRuleIds = oldRules.map((rule) => rule.id);

    const addRules = getRulesFromOverridesMap(newState.overridesMap);

    console.log('updating session rules', { addRules, removeRuleIds });

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds,
      addRules,
    });
  }

  state = newState;

  chrome.runtime.sendMessage({ type: 'state-updated', state });
}

function getRulesFromOverridesMap(overridesMap) {
  if (!overridesMap) {
    return [];
  }

  let idCounter = 1;

  return Object.values(overridesMap).flatMap((overrideSet) =>
    overrideSet.map(({ from, to }) => {
      return {
        id: idCounter++,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: to.replaceAll('$', '\\') },
        },
        condition: { regexFilter: from },
      };
    }),
  );
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

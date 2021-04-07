chrome.runtime.onInstalled.addListener(async () => {
  console.log('onInstalled');

  await initializeState();
});

chrome.windows.onCreated.addListener(function () {
  chrome.windows.getAll(async (windows) => {
    if (windows.length !== 1) {
      return;
    }

    try {
      console.info('on browser start');

      await initializeState();
    } catch (e) {
      console.log(
        'an unexpected error occured while initializing on browser start',
        e,
      );
    }
  });
});

chrome.runtime.onMessage.addListener((message) => {
  console.log('received message', message);
  if (message.type === 'connect') {
    connect();
  }
});

async function initializeState() {
  // clear rules
  await replaceDynamicRules();

  await clearState();

  await setState({
    status: 'ready',
  });
}

async function connect() {
  await setState({
    status: 'connecting',
    errorMessage: null,
  });

  let overridesSocket = new WebSocket('ws://localhost:8117/overrides/ws');

  overridesSocket.onmessage = (event) => {
    console.log('socket message', event);

    const overridesMap = JSON.parse(event.data);

    const addRules = getRulesFromOverridesMap(overridesMap);

    replaceDynamicRules(addRules);

    setState({
      status: 'connected',
      errorMessage: null,
      overridesMap,
    });
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

    setState({
      status: 'ready',
      overridesMap: null,
      errorMessage,
    });

    overridesSocket = null;
  };

  function closeSocket() {
    if (overridesSocket) {
      overridesSocket.close(1000);
      overridesSocket = null;
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'disconnect') {
      closeSocket();
    }
  });

  chrome.windows.onRemoved.addListener(function () {
    chrome.windows.getAll(async (windows) => {
      if (windows.length > 0) {
        return;
      }

      console.info('on browser close');

      closeSocket();
    });
  });
}

function getRulesFromOverridesMap(overridesMap) {
  let rulesId = 1;
  return Object.values(overridesMap).flatMap((overrideSet) => {
    return overrideSet.map((override) => {
      return {
        id: rulesId++,
        action: {
          type: 'redirect',
          redirect: {
            regexSubstitution: override.to,
          },
        },
        condition: {
          regexFilter: override.from,
        },
      };
    });
  });
}

function replaceDynamicRules(addRules) {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
      console.log('existing rules', existingRules);

      const removeRuleIds = existingRules.map((rule) => rule.id);

      console.log('updating rules', { addRules, removeRuleIds });

      chrome.declarativeNetRequest.updateDynamicRules(
        { addRules, removeRuleIds },
        () => {
          if (chrome.runtime.lastError) {
            console.log('failed to update rules', chrome.runtime.lastError);

            reject(chrome.runtime.lastError);
            return;
          }

          console.log('updated rules successfully');

          resolve();
        },
      );
    });
  });
}

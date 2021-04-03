importScripts('./state.js');

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
  if (message.type === 'refresh') {
    refreshOverrides();
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

async function refreshOverrides() {
  await setState({
    status: 'refreshing',
  });

  try {
    const overridesMap = await fetch('http://localhost:8117/overrides')
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => {
        return response.json();
      });

    const addRules = getRulesFromOverridesMap(overridesMap);

    await replaceDynamicRules(addRules);

    await setState({
      status: 'ready',
      overridesMap,
    });
  } catch (e) {
    console.error(e);

    // clear rules
    await replaceDynamicRules();

    await setState({
      status: 'error',
      errorMessage: e.message,
      overridesMap: {},
    });
  }
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

chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled');

  refreshOverrides();

  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const tabId = info.request.tabId;

    console.info('onRuleMatchedDebug', info);

    logToTab(tabId, 'rule matched', info);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  console.log('received message', message);
  if (message.type === 'refresh') {
    refreshOverrides();
  }
});

function logToTab(tabId, ...parameters) {
  chrome.tabs.sendMessage(tabId, {
    action: 'log',
    parameters: parameters,
  });
}

function refreshOverrides() {
  fetch('http://localhost:8117/overrides')
    .then((response) => {
      return response.json();
    })
    .then((overridesMap) => {
      replaceDynamicRules(overridesMap);
    })
    .catch((e) => {
      console.error(e);
    });
}

function replaceDynamicRules(overridesMap) {
  chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
    console.log('existing rules', existingRules);

    const removeRuleIds = existingRules.map((rule) => rule.id);

    let rulesId = 1;

    const addRules = Object.values(overridesMap).flatMap((overrideSet) => {
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

    console.log('updating rules', { addRules, removeRuleIds });

    chrome.declarativeNetRequest.updateDynamicRules(
      { addRules, removeRuleIds },
      () => {
        if (chrome.runtime.lastError) {
          console.log('failed to update rules', chrome.runtime.lastError);
          return;
        }

        console.log('updated rules successfully');
      },
    );
  });
}

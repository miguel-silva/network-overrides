function getState() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (state) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(state);
    });
  });
}

function addStateChangedListener(listener) {
  chrome.storage.onChanged.addListener(listener);
}

function setState(state) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(state, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

function logState() {
  getState().then((state) => {
    console.info(state);
  });
}

function clearState() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

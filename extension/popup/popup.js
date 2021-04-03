const statusLabelEl = document.getElementById('status-label');
const refreshButtonEl = document.getElementById('refresh-button');
const mainEl = document.querySelector('main');

getState().then(handleStateUpdate);

addStateChangedListener(() => {
  getState().then(handleStateUpdate);
});

function handleStateUpdate(state) {
  if (!state) {
    console.error('state is missing!');

    return;
  }

  switch (state.status) {
    case 'refreshing':
      setIsRefreshButtonEnabled(false);

      statusLabelEl.textContent = 'Refreshing...';
      break;

    case 'ready':
      setIsRefreshButtonEnabled(true);

      statusLabelEl.textContent = 'Ready';
      break;

    case 'error':
      setIsRefreshButtonEnabled(true);

      statusLabelEl.textContent = `Refresh failed: ${state.errorMessage}`;
      break;

    default:
      console.error('unknown status', state.status);
  }

  if (!state.overridesMap || !Object.keys(state.overridesMap).length) {
    mainEl.innerHTML = '';
    return;
  }

  const overrideSetsContentHtml = Object.entries(state.overridesMap)
    .map(([overrideSetId, overrideSet]) => {
      const overridesContentHtml = overrideSet
        .map((override) => {
          return `
          <li class="override">
            <dl>
              <dt>From:</dt><dd>${override.from}</dd>
              <dt>To:</dt><dd>${override.to}</dd>
            </dl>
          </li>
        `;
        })
        .join('');

      return `
        <li class="override-set">
          <details>
            <summary>${overrideSetId}</summary>
            <ul class="overrides">${overridesContentHtml}</ul>
          </details>
        </li>
      `;
    })
    .join('');

  mainEl.innerHTML = `<ul class="override-sets">${overrideSetsContentHtml}</ul>`;
}

function setIsRefreshButtonEnabled(enabled) {
  if (enabled) {
    refreshButtonEl.addEventListener('click', handleRefreshClick);
    refreshButtonEl.removeAttribute('disabled');
  } else {
    refreshButtonEl.removeEventListener('click', handleRefreshClick);
    refreshButtonEl.setAttribute('disabled', 'true');
  }
}

function handleRefreshClick() {
  chrome.runtime.sendMessage({ type: 'refresh' });
}

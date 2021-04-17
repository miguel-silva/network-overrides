const statusLabelEl = document.getElementById('status-label');
const connectionActionButtonEl = document.getElementById(
  'connection-action-button',
);
const mainEl = document.querySelector('main');

chrome.runtime.onMessage.addListener((message) => {
  console.log('message received', message);

  switch (message.type) {
    case 'state-updated':
      handleStateUpdate(message.state);
      break;
  }
});

chrome.runtime.sendMessage({ type: 'get-state' }, handleStateUpdate);

function handleStateUpdate(state) {
  if (!state) {
    console.error('state is missing!');

    return;
  }

  connectionActionButtonEl.removeAttribute('hidden');

  switch (state.status) {
    case 'connecting':
      connectionActionButtonEl.removeEventListener('click', handleConnectClick);
      connectionActionButtonEl.removeEventListener(
        'click',
        handleDisconnectClick,
      );
      connectionActionButtonEl.setAttribute('disabled', true);
      connectionActionButtonEl.textContent = 'Connect';

      statusLabelEl.textContent = 'Connecting...';
      break;

    case 'ready':
      connectionActionButtonEl.addEventListener('click', handleConnectClick);
      connectionActionButtonEl.removeEventListener(
        'click',
        handleDisconnectClick,
      );
      connectionActionButtonEl.removeAttribute('disabled');
      connectionActionButtonEl.textContent = 'Connect';

      if (state.errorMessage) {
        statusLabelEl.textContent = `Disconnected: ${state.errorMessage}`;
      } else {
        statusLabelEl.textContent = 'Disconnected';
      }

      break;

    case 'connected':
      connectionActionButtonEl.removeEventListener('click', handleConnectClick);
      connectionActionButtonEl.addEventListener('click', handleDisconnectClick);
      connectionActionButtonEl.removeAttribute('disabled');
      connectionActionButtonEl.textContent = 'Disconnect';

      statusLabelEl.textContent = 'Connected';
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

function handleConnectClick() {
  chrome.runtime.sendMessage({ type: 'connect' });
}

function handleDisconnectClick() {
  chrome.runtime.sendMessage({ type: 'disconnect' });
}

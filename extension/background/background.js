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
}

function handleBeforeRequest(request) {
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

function updateState(newState) {
  state = newState;

  const newActiveOverrides = newState.overridesMap
    ? Object.values(newState.overridesMap)
        .map(({ from, to }) => {
          return {
            from: new RegExp(from),
            to,
          };
        })
        .flat()
    : [];

  const areOverridesInPlace = activeOverrides.length > 0;

  if (areOverridesInPlace && newActiveOverrides.length === 0) {
    chrome.webRequest.onBeforeRequest.removeListener(handleBeforeRequest);
  } else if (!areOverridesInPlace && newActiveOverrides.length > 0) {
    chrome.webRequest.onBeforeRequest.addListener(
      handleBeforeRequest,
      {
        urls: ['<all_urls>'],
      },
      ['blocking'],
    );
  }

  activeOverrides = newActiveOverrides;

  chrome.runtime.sendMessage({ type: 'state-updated', state });
}

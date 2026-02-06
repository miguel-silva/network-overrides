const fastify = require('fastify');

const { EADDRINUSE } = require('./errors');

const app = fastify();
app.register(require('@fastify/websocket'));

const overridesMap = {};

const overridesWebsocketSet = new Set();
app.register(async function (app) {
  app.get('/', { websocket: true }, (socket) => {
    console.log('new connection');

    overridesWebsocketSet.add(socket);

    socket.send(createOverridesMessage());

    socket.on('close', () => {
      console.log('closing connection');

      overridesWebsocketSet.delete(socket);
    });
  });

  app.delete('/', () => {
    stop();

    return true;
  });

  app.get('/overrides', async () => {
    console.log('returning overrides', overridesMap);

    return overridesMap;
  });

  app.post('/overrides/:overrideSetId', async (request) => {
    const { overrideSetId } = request.params;

    console.log('adding overrides', request.params.overrideSetId, request.body);

    overridesMap[overrideSetId] = request.body;

    sendOverridesMapToClients();

    return true;
  });

  app.delete('/overrides/:overrideSetId', async (request) => {
    const { overrideSetId } = request.params;

    console.log('removing overrides', request.params.overrideSetId);

    delete overridesMap[overrideSetId];

    sendOverridesMapToClients();

    return true;
  });
});

function start(port) {
  return app
    .listen({ port, host: '127.0.0.1' })
    .then(() => {
      console.log(`Server running at http://localhost:${port}/`);
    })
    .catch((error) => {
      if (error.code === EADDRINUSE.errorCode) {
        process.exitCode = EADDRINUSE.exitCode;
      } else {
        process.exitCode = 1;
      }

      throw error;
    });
}

function stop() {
  console.log('stopping server');

  // close websocket connections with completed status code
  overridesWebsocketSet.forEach((socket) => socket.close(1000));

  overridesWebsocketSet.clear();

  app.close();
}

function sendOverridesMapToClients() {
  if (overridesWebsocketSet.size === 0) {
    return;
  }

  console.log(
    `sending latest overrides to ${overridesWebsocketSet.size} client(s)`,
  );

  const messageText = createOverridesMessage();

  overridesWebsocketSet.forEach((socket) => {
    socket.send(messageText);
  });
}

function createOverridesMessage() {
  return JSON.stringify({ type: 'overrides', overridesMap });
}

module.exports = { start };

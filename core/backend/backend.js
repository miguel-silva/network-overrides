const fastify = require('fastify');

const { EADDRINUSE } = require('./errors');

const app = fastify();
app.register(require('fastify-websocket'));

const overridesMap = {};

const overridesWebsocketConnectionSet = new Set();

app.get('/', { websocket: true }, (connection) => {
  console.log('new connection');

  overridesWebsocketConnectionSet.add(connection);

  connection.socket.send(createOverridesMessage());

  connection.socket.on('close', () => {
    console.log('closing connection');

    overridesWebsocketConnectionSet.delete(connection);
  });
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

function start(port) {
  return app
    .listen(port)
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

function sendOverridesMapToClients() {
  if (overridesWebsocketConnectionSet.size === 0) {
    return;
  }

  console.log(
    `sending latest overrides to ${overridesWebsocketConnectionSet.size} client(s)`,
  );

  const messageText = createOverridesMessage();

  overridesWebsocketConnectionSet.forEach((connection) => {
    connection.socket.send(messageText);
  });
}

function createOverridesMessage() {
  return JSON.stringify({ type: 'overrides', overridesMap });
}

module.exports = { start };

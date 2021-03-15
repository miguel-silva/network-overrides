const fastify = require('fastify');

const app = fastify();

const overridesMap = {};

app.get('/overrides', async () => {
  console.log('returning overrides', overridesMap);

  return overridesMap;
});

app.post('/overrides/:overrideSetId', async (request) => {
  const { overrideSetId } = request.params;

  console.log('adding overrides', request.params.overrideSetId, request.body);

  overridesMap[overrideSetId] = request.body;

  return true;
});

app.delete('/overrides/:overrideSetId', async (request) => {
  const { overrideSetId } = request.params;

  console.log('removing overrides', request.params.overrideSetId);

  delete overridesMap[overrideSetId];

  return true;
});

function start(port) {
  return app.listen(port).then(() => {
    console.log(`Server running at http://localhost:${port}/`);
  });
}

module.exports = { start };

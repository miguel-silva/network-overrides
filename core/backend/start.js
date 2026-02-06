const { start } = require('./backend');
const { PORT } = require('../constants');

start(PORT).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

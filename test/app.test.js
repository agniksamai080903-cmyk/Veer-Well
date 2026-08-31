const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

test('GET /api/health returns ok status', async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.app, 'Rakshak');
  } finally {
    server.close();
  }
});

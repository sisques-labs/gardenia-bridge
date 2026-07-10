'use strict';

if (process.env.USE_TESTCONTAINERS === '1') {
  process.exit(0);
}

const net = require('net');

const host = process.env.DATABASE_HOST ?? 'localhost';
const port = parseInt(process.env.DATABASE_PORT ?? '5433', 10);

const socket = net.createConnection({ host, port });

socket.setTimeout(3000);

socket.on('connect', () => {
  socket.end();
  process.exit(0);
});

socket.on('timeout', () => {
  socket.destroy();
  printHelp();
  process.exit(1);
});

socket.on('error', () => {
  printHelp();
  process.exit(1);
});

function printHelp() {
  process.stderr.write(
    [
      `PostgreSQL is not reachable at ${host}:${port}.`,
      '',
      'Start the test database with:',
      '  docker compose -f docker-compose.test.yml up -d',
      '',
      'Or use Testcontainers (Docker required):',
      '  USE_TESTCONTAINERS=1 pnpm test:integration',
      '',
    ].join('\n'),
  );
}

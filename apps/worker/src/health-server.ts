import { createServer } from 'node:http';

export function startHealthServer(port = Number(process.env.WORKER_HEALTH_PORT ?? 3001)) {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'lead-intelligence-worker', version: '0.25.0', uptimeSeconds: Math.round(process.uptime()) }));
  });
  server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ level: 'info', event: 'worker_health_started', port })));
  return server;
}

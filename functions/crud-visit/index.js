// handler.js
require('./otel-init'); // debe ser la primera línea

exports.handler = async (event, context) => {
  const start = Date.now();
  const method = event?.requestContext?.http?.method || 'GET';
  const path = event?.rawPath || '/';

  // Configurable latency injection via env vars
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const envInt = (name, def = 0) => {
    const v = parseInt(process.env[name] ?? '');
    return Number.isFinite(v) ? v : def;
  };
  const postPct = envInt('INJECT_LATENCY_POST_PCT', 0);
  const postMs  = envInt('INJECT_LATENCY_POST_MS', 0);
  const getPct  = envInt('INJECT_LATENCY_GET_PCT', 0);
  const getMs   = envInt('INJECT_LATENCY_GET_MS', 0);
  const maybeDelay = async (pct, ms, tag) => {
    if (pct > 0 && ms > 0) {
      const r = Math.random() * 100;
      if (r < pct) {
        await sleep(ms);
      }
    }
  };

  // Extract trace info from Lambda/X-Ray environment
  // Example: Root=1-5f84c7a3-3c7c8c9b8d6a2f6d1e2f3a4b;Parent=53995c3f42cd8ad8;Sampled=1
  const xrayEnv = process.env._X_AMZN_TRACE_ID || '';
  const traceParts = Object.fromEntries(
    xrayEnv.split(';').map(kv => kv.trim().split('=')).filter(([k, v]) => k && v)
  );
  const traceId = traceParts.Root || traceParts.TraceId || null;
  const parentId = traceParts.Parent || null;
  const sampled = traceParts.Sampled || null;

  // Correlation IDs from headers
  const headers = event?.headers || {};
  const correlationId = headers['x-correlation-id'] || headers['X-Correlation-Id'] || headers['x-request-id'] || headers['X-Request-Id'] || context?.awsRequestId;

  const baseLog = {
    function: context?.functionName || process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown',
    requestId: context?.awsRequestId,
    correlationId,
    method,
    path,
    traceId,
    parentId,
    sampled
  };

  const log = (level, message, extra = {}) => {
    console.log(JSON.stringify({
      level,
      message,
      ts: new Date().toISOString(),
      ...baseLog,
      ...extra
    }));
  };

  try {
    // Basic router
    if (method === 'GET' && path === '/health') {
      log('info', 'health check');
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ok' }) };
    }

    // Minimal DynamoDB example using AWS SDK v3
    const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
    const ddb = new DynamoDBClient({ region: process.env.REGION });
    const tableName = process.env.TABLE_NAME;

    if (method === 'POST' && path === '/visit') {
      const body = JSON.parse(event.body || '{}');
      log('debug', 'visit created', { body });
      const id = body.id || `${Date.now()}`;

      // Optional latency injection for POST /visit
      await maybeDelay(postPct, postMs, 'post');

      await ddb.send(new PutItemCommand({
        TableName: tableName,
        Item: {
          id: { S: id },
          ts: { N: String(Date.now()) }
        }
      }));

      log('info', 'visit created', { id, durationMs: Date.now() - start });
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) };
    }

    if (method === 'GET' && path.startsWith('/visit/')) {
      const id = path.split('/').pop();
      // Optional latency injection for GET /visit/:id
      await maybeDelay(getPct, getMs, 'get');
      const res = await ddb.send(new GetItemCommand({
        TableName: tableName,
        Key: { id: { S: id } }
      }));
      let item = null;
      if (res.Item) {
        item = { id: res.Item.id?.S, ts: res.Item.ts?.N ? Number(res.Item.ts.N) : undefined };
      }
      log('info', 'visit fetched', { id, found: !!item, durationMs: Date.now() - start });
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) };
    }

    log('warn', 'route not found', { durationMs: Date.now() - start });
    return { statusCode: 404, body: 'Not Found' };
  } catch (err) {
    log('error', 'unhandled error', { error: err?.message, stack: err?.stack, durationMs: Date.now() - start });
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';

  // Basic router
  if (method === 'GET' && path === '/health') {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ok' }) };
  }

  // Minimal DynamoDB example using AWS SDK v3
  const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
  const ddb = new DynamoDBClient({ region: process.env.REGION });
  const tableName = process.env.TABLE_NAME;

  if (method === 'POST' && path === '/visit') {
    const body = JSON.parse(event.body || '{}');
    const id = body.id || `${Date.now()}`;

    await ddb.send(new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: id },
        ts: { N: String(Date.now()) }
      }
    }));

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) };
  }

  if (method === 'GET' && path.startsWith('/visit/')) {
    const id = path.split('/').pop();
    const res = await ddb.send(new GetItemCommand({
      TableName: tableName,
      Key: { id: { S: id } }
    }));
    let item = null;
    if (res.Item) {
      item = { id: res.Item.id?.S, ts: res.Item.ts?.N ? Number(res.Item.ts.N) : undefined };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) };
  }

  return { statusCode: 404, body: 'Not Found' };
};

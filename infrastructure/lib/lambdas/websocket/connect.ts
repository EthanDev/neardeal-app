import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;
    const userId = event.queryStringParameters?.userId || 'anonymous';
    const dealId = event.queryStringParameters?.dealId;
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2h TTL

    // Store connection record
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: 'WS#CONNECTION',
        SK: connectionId,
        connectionId,
        userId,
        dealId: dealId || '',
        connectedAt: now,
        expiresAt: ttl,
      },
    }));

    // If subscribing to a specific deal, store deal subscription for fan-out
    if (dealId) {
      await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `WS#DEAL#${dealId}`,
          SK: connectionId,
          connectionId,
          userId,
          subscribedAt: now,
          expiresAt: ttl,
        },
      }));
    }

    return { statusCode: 200, body: 'Connected' };
  } catch (err) {
    console.error('ws connect error', err);
    return { statusCode: 500, body: 'Connection failed' };
  }
};

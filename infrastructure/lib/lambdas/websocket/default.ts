import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand, GoneException } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const WS_ENDPOINT = process.env.WEBSOCKET_API_ENDPOINT || '';

async function postToConnection(apigw: ApiGatewayManagementApiClient, connectionId: string, data: unknown): Promise<boolean> {
  try {
    await apigw.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(data)),
    }));
    return true;
  } catch (err) {
    if (err instanceof GoneException) {
      // Clean up stale connection
      await ddb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'WS#CONNECTION', SK: connectionId },
      })).catch(() => {});
      return false;
    }
    throw err;
  }
}

export const handler = async (event: any): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;
    const { domainName, stage } = event.requestContext;
    const endpoint = WS_ENDPOINT || `https://${domainName}/${stage}`;
    const apigw = new ApiGatewayManagementApiClient({ endpoint });

    const body = JSON.parse(event.body || '{}');
    const action = body.action as string;

    switch (action) {
      case 'ping': {
        await postToConnection(apigw, connectionId, { action: 'pong', timestamp: new Date().toISOString() });
        break;
      }

      case 'subscribe': {
        const dealId = body.dealId;
        if (!dealId) break;
        const ttl = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
        await ddb.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `WS#DEAL#${dealId}`,
            SK: connectionId,
            connectionId,
            subscribedAt: new Date().toISOString(),
            expiresAt: ttl,
          },
        }));
        await postToConnection(apigw, connectionId, { action: 'subscribed', dealId });
        break;
      }

      case 'unsubscribe': {
        const dealId = body.dealId;
        if (!dealId) break;
        await ddb.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: `WS#DEAL#${dealId}`, SK: connectionId },
        }));
        await postToConnection(apigw, connectionId, { action: 'unsubscribed', dealId });
        break;
      }

      case 'dealUpdate': {
        // Broadcast deal update to all subscribers
        const dealId = body.dealId;
        const updateData = body.data;
        if (!dealId) break;

        const subsRes = await ddb.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': `WS#DEAL#${dealId}` },
        }));

        const promises = (subsRes.Items || []).map(async (item) => {
          const connId = item.SK as string;
          const ok = await postToConnection(apigw, connId, {
            action: 'dealUpdate',
            dealId,
            data: updateData,
          });
          if (!ok) {
            // Clean up stale deal subscription
            await ddb.send(new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { PK: `WS#DEAL#${dealId}`, SK: connId },
            })).catch(() => {});
          }
        });

        await Promise.allSettled(promises);
        break;
      }

      default: {
        await postToConnection(apigw, connectionId, { action: 'error', message: `Unknown action: ${action}` });
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('ws default error', err);
    return { statusCode: 500, body: 'Error' };
  }
};

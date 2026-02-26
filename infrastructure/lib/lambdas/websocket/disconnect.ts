import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;

    // Look up connection to get dealId
    const connRes = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'WS#CONNECTION', SK: connectionId },
    }));

    const dealId = connRes.Item?.dealId as string | undefined;

    // Delete connection record
    await ddb.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'WS#CONNECTION', SK: connectionId },
    }));

    // Delete deal subscription if exists
    if (dealId) {
      await ddb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `WS#DEAL#${dealId}`, SK: connectionId },
      }));
    }

    return { statusCode: 200, body: 'Disconnected' };
  } catch (err) {
    console.error('ws disconnect error', err);
    return { statusCode: 500, body: 'Disconnect failed' };
  }
};

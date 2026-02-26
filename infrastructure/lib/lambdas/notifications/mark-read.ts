import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    // Query unread notifications
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'attribute_not_exists(readAt)',
      ExpressionAttributeValues: { ':pk': `BIZ#${userId}`, ':sk': 'NOTIF#' },
    }));

    const items = result.Items || [];
    if (items.length === 0) return respond(200, { updated: 0 });

    // Batch update - mark as read (using overwrite puts)
    const now = new Date().toISOString();
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25).map((item) => ({
        PutRequest: {
          Item: { ...item, readAt: now },
        },
      }));
      batches.push(ddb.send(new BatchWriteCommand({
        RequestItems: { [TABLE_NAME]: batch },
      })));
    }
    await Promise.all(batches);

    return respond(200, { updated: items.length });
  } catch (err) {
    console.error('markRead error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

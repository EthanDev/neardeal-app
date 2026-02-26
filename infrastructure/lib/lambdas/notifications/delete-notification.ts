import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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

    const notificationId = event.pathParameters?.id;
    if (!notificationId) return respond(400, { message: 'Notification ID is required' });

    await ddb.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BIZ#${userId}`, SK: `NOTIF#${notificationId}` },
      ConditionExpression: 'attribute_exists(PK)',
    }));

    return respond(200, { message: 'Notification deleted' });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return respond(404, { message: 'Notification not found' });
    }
    console.error('deleteNotification error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

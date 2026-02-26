import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

const EXPO_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    const body = JSON.parse(event.body || '{}');
    const { pushToken } = body;

    if (!pushToken || typeof pushToken !== 'string' || !EXPO_TOKEN_REGEX.test(pushToken)) {
      return respond(400, { message: 'Invalid push token. Expected ExponentPushToken[...] format.' });
    }

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: 'PUSH_TOKEN',
        pushToken,
        platform: body.platform || 'unknown',
        updatedAt: new Date().toISOString(),
      },
    }));

    return respond(200, { message: 'Push token registered successfully' });
  } catch (err) {
    console.error('registerPushToken error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

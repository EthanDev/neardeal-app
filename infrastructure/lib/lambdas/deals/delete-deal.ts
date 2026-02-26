import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const businessId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!businessId) return respond(401, { message: 'Unauthorized' });

    const dealId = event.pathParameters?.dealId;
    if (!dealId) return respond(400, { message: 'dealId is required' });

    // Verify ownership
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
    }));
    if (!existing.Item) return respond(404, { message: 'Deal not found' });
    if (existing.Item.businessId !== businessId) return respond(403, { message: 'Forbidden' });

    // Soft delete - set status to deleted
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
      UpdateExpression: 'SET #status = :deleted, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':deleted': 'deleted', ':now': new Date().toISOString() },
    }));

    return respond(200, { message: 'Deal deleted' });
  } catch (err) {
    console.error('deleteDeal error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

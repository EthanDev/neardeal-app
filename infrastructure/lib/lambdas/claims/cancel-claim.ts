import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    const claimId = event.pathParameters?.claimId;
    if (!claimId) return respond(400, { message: 'claimId is required' });

    // Lookup claim via GSI4
    const claimLookup = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      ExpressionAttributeValues: { ':pk': `CLAIM#${claimId}` },
      Limit: 1,
    }));

    const claim = claimLookup.Items?.[0];
    if (!claim) return respond(404, { message: 'Claim not found' });

    if (claim.userId !== userId) return respond(403, { message: 'Forbidden' });
    if (claim.status !== 'pending') return respond(409, { message: 'Claim cannot be cancelled' });

    const now = new Date().toISOString();

    // Update the main claim record to cancelled
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: claim.PK, SK: claim.SK },
      UpdateExpression: 'SET #st = :cancelled, cancelledAt = :now',
      ConditionExpression: '#st = :pending',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':cancelled': 'cancelled', ':now': now, ':pending': 'pending' },
    }));

    // Update the user history claim record (non-critical)
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `CLAIM#${claimId}` },
      UpdateExpression: 'SET #st = :cancelled, cancelledAt = :now',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':cancelled': 'cancelled', ':now': now },
    })).catch(() => {});

    // Decrement pendingClaims on the deal
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${claim.dealId}`, SK: 'META' },
      UpdateExpression: 'SET pendingClaims = pendingClaims - :one',
      ConditionExpression: 'pendingClaims > :zero',
      ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
    })).catch((err: unknown) => console.error('Failed to decrement pendingClaims', err));

    return respond(200, {
      claim: { claimId, status: 'cancelled', cancelledAt: now },
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return respond(409, { message: 'Claim is no longer pending' });
    }
    console.error('cancelClaim error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

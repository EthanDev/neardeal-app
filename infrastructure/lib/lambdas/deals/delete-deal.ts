import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import Redis from 'ioredis';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = process.env.REDIS_PORT!;

let redis: Redis | null = null;
const getRedis = () => {
  if (!redis) redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT), lazyConnect: true });
  return redis;
};

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

    const now = new Date().toISOString();

    // Soft delete - set status to deleted
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
      UpdateExpression: 'SET #status = :deleted, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':deleted': 'deleted', ':now': now },
    }));

    // Redis cleanup — remove from geo index and invalidate cache
    try {
      const r = getRedis();
      const city = existing.Item.city;
      if (city) {
        await r.zrem(`deals:geo:${city}`, dealId);
      }
      await r.del(`deal:${dealId}`);
    } catch (redisErr) {
      console.error('Redis cleanup error (non-fatal)', redisErr);
    }

    // Cancel pending claims for this deal (with pagination)
    try {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const claimsResult = await ddb.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': `DEAL#${dealId}`,
            ':skPrefix': 'CLAIM#',
          },
          ...(lastKey && { ExclusiveStartKey: lastKey }),
        }));

        const pendingClaims = (claimsResult.Items ?? []).filter((item: Record<string, unknown>) => item.status === 'pending');

        await Promise.all(pendingClaims.map((claim: Record<string, unknown>) =>
          ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: claim.PK, SK: claim.SK },
            UpdateExpression: 'SET #status = :cancelled, cancelledAt = :now',
            ConditionExpression: '#status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':cancelled': 'cancelled', ':now': now, ':pending': 'pending' },
          })).catch((e: unknown) => console.error(`Failed to cancel claim ${claim.SK}`, e))
        ));

        lastKey = claimsResult.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastKey);
    } catch (claimsErr) {
      console.error('Claims cancellation error (non-fatal)', claimsErr);
    }

    return respond(200, { message: 'Deal deleted' });
  } catch (err) {
    console.error('deleteDeal error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

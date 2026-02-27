import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

const VALID_STATUSES = ['active', 'paused'];

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

const ALLOWED_FIELDS = ['title', 'description', 'category', 'discountValue', 'originalPrice', 'dealPrice', 'maxClaims', 'terms', 'isFlash', 'status', 'expiresAt'];

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const businessId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!businessId) return respond(401, { message: 'Unauthorized' });

    const dealId = event.pathParameters?.dealId;
    if (!dealId) return respond(400, { message: 'dealId is required' });
    if (!event.body) return respond(400, { message: 'Missing request body' });

    // Verify ownership
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
    }));
    if (!existing.Item) return respond(404, { message: 'Deal not found' });
    if (existing.Item.businessId !== businessId) return respond(403, { message: 'Forbidden' });

    const updates = JSON.parse(event.body);

    // M3: Input validation
    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
      return respond(400, { message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (updates.maxClaims !== undefined && (typeof updates.maxClaims !== 'number' || updates.maxClaims < 1)) {
      return respond(400, { message: 'maxClaims must be a number >= 1' });
    }
    if (updates.expiresAt !== undefined) {
      updates.ttl = Math.floor(new Date(updates.expiresAt).getTime() / 1000);
    }

    const now = new Date().toISOString();

    const expressionParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };
    const names: Record<string, string> = {};

    const fieldsToProcess = [...ALLOWED_FIELDS, 'ttl'];
    for (const [key, val] of Object.entries(updates)) {
      if (!fieldsToProcess.includes(key)) continue;
      const attr = `#${key}`;
      const valKey = `:${key}`;
      names[attr] = key;
      values[valKey] = val;
      expressionParts.push(`${attr} = ${valKey}`);
    }

    if (expressionParts.length === 1) return respond(400, { message: 'No valid fields to update' });

    const result = await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    // H2: Redis cache invalidation
    try {
      const r = getRedis();
      await r.del(`deal:${dealId}`);
      const updatedDeal = result.Attributes;
      if (updatedDeal && updatedDeal.status && updatedDeal.status !== 'active') {
        const city = updatedDeal.city || existing.Item.city;
        if (city) {
          await r.zrem(`deals:geo:${city}`, dealId);
        }
      }
    } catch (redisErr) {
      console.error('Redis cache invalidation error', redisErr);
    }

    return respond(200, { deal: result.Attributes });
  } catch (err) {
    console.error('updateDeal error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

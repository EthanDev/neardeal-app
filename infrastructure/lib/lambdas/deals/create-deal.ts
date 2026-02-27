import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = process.env.REDIS_PORT!;
const DEALS_QUEUE_URL = process.env.DEALS_QUEUE_URL || '';

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

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  starter: 10,
  pro: 50,
  enterprise: Infinity,
};

interface CreateDealBody {
  title: string;
  description: string;
  category: string;
  discountType: 'percentage' | 'fixed' | 'bogo';
  discountValue: number;
  originalPrice: number;
  dealPrice: number;
  maxClaims: number;
  terms?: string;
  expiresAt: string;
  latitude: number;
  longitude: number;
  address?: string;
  district: string;
  city: string;
  isFlash?: boolean;
  flashExpiresAt?: string;
  imageUrl?: string;
}

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const businessId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!businessId) return respond(401, { message: 'Unauthorized' });

    if (!event.body) return respond(400, { message: 'Missing request body' });
    const body: CreateDealBody = JSON.parse(event.body);

    const { title, description, category, discountType, discountValue, originalPrice, dealPrice, maxClaims, expiresAt, latitude, longitude, district, city } = body;
    if (!title || !description || !category || !discountType || discountValue == null || !originalPrice || dealPrice == null || !maxClaims || !expiresAt || latitude == null || longitude == null || !district || !city) {
      return respond(400, { message: 'Missing required fields' });
    }

    const cityNormalized = city.toLowerCase();

    // Check business plan limits
    const planTier = (event.requestContext.authorizer.jwt.claims['custom:planTier'] as string) || 'free';
    const limit = PLAN_LIMITS[planTier] ?? PLAN_LIMITS.free;

    const existingDeals = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :biz',
      FilterExpression: '#st = :active',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':biz': `BIZ#${businessId}`,
        ':active': 'active',
      },
      Select: 'COUNT',
    }));

    if ((existingDeals.Count || 0) >= limit) {
      return respond(403, { message: `Plan limit reached. Your ${planTier} plan allows ${limit} active deals.` });
    }

    const dealId = randomUUID();
    const now = new Date().toISOString();

    const item: Record<string, unknown> = {
      PK: `DEAL#${dealId}`,
      SK: 'META',
      GSI1PK: 'STATUS#active',
      GSI1SK: expiresAt,
      GSI2PK: `BIZ#${businessId}`,
      GSI2SK: now,
      dealId,
      businessId,
      title,
      description,
      category,
      discountType,
      discountValue,
      originalPrice,
      dealPrice,
      maxClaims,
      currentClaims: 0,
      status: 'active',
      terms: body.terms || '',
      address: body.address || '',
      district,
      city: cityNormalized,
      latitude,
      longitude,
      imageUrl: body.imageUrl || '',
      isFlash: body.isFlash || false,
      flashExpiresAt: body.flashExpiresAt || '',
      expiresAt,
      ttl: Math.floor(new Date(expiresAt).getTime() / 1000),
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    const r = getRedis();
    await r.geoadd(`deals:geo:${cityNormalized}`, longitude, latitude, dealId);
    await r.set(`deal:${dealId}`, JSON.stringify(item), 'EX', 3600);

    if (body.isFlash && body.flashExpiresAt) {
      const flashTtl = Math.floor((new Date(body.flashExpiresAt).getTime() - Date.now()) / 1000);
      if (flashTtl > 0) {
        await r.set(`flash:${cityNormalized}`, dealId, 'EX', flashTtl);
      }
    }

    // Increment city stats counter
    await r.incr(`stats:deals:${cityNormalized}`);

    // Send notification via SQS
    if (DEALS_QUEUE_URL) {
      await sqs.send(new SendMessageCommand({
        QueueUrl: DEALS_QUEUE_URL,
        MessageBody: JSON.stringify({
          type: body.isFlash ? 'flash_deal' : 'new_deal',
          dealId,
          businessId,
          title,
          category,
          discountValue,
          latitude,
          longitude,
          city: cityNormalized,
        }),
        MessageGroupId: cityNormalized,
        MessageDeduplicationId: dealId,
      }));
    }

    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...safeDeal } = item;
    return respond(201, { deal: safeDeal });
  } catch (err) {
    console.error('createDeal error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

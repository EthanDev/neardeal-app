import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
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
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    const params = event.queryStringParameters || {};
    const lat = parseFloat(params.lat || '');
    const lng = parseFloat(params.lng || '');
    const radiusM = Math.min(parseFloat(params.radius || '500'), 5000); // meters, default 500m, max 5000m
    const city = params.city || 'bucharest';
    const category = params.category;
    const q = params.q; // search query
    const limit = Math.min(parseInt(params.limit || '20', 10), 50);

    if (isNaN(lat) || isNaN(lng)) {
      return respond(400, { message: 'lat and lng query parameters are required' });
    }

    const r = getRedis();

    // GEORADIUS returns deal IDs within radius (convert m to km for ioredis)
    const radiusKm = radiusM / 1000;
    const dealIds = await r.georadius(
      `deals:geo:${city}`,
      lng,
      lat,
      radiusKm,
      'km',
      'WITHDIST',
      'ASC',
      'COUNT',
      limit * 3,
    );

    if (!dealIds || dealIds.length === 0) {
      return respond(200, { deals: [], total: 0 });
    }

    const idsWithDist: Array<{ dealId: string; distance: number }> = [];
    for (const entry of dealIds) {
      if (Array.isArray(entry)) {
        idsWithDist.push({ dealId: entry[0] as string, distance: parseFloat(entry[1] as string) * 1000 }); // convert km to meters
      } else {
        idsWithDist.push({ dealId: entry as string, distance: 0 });
      }
    }

    // Try cache first, fallback to DynamoDB
    const deals: Array<Record<string, unknown>> = [];
    const cacheMisses: string[] = [];

    const pipeline = r.pipeline();
    for (const { dealId } of idsWithDist) {
      pipeline.get(`deal:${dealId}`);
    }
    const cacheResults = await pipeline.exec();

    for (let i = 0; i < idsWithDist.length; i++) {
      const cached = cacheResults?.[i]?.[1] as string | null;
      if (cached) {
        const deal = JSON.parse(cached);
        deal._distance = idsWithDist[i].distance;
        deals.push(deal);
      } else {
        cacheMisses.push(idsWithDist[i].dealId);
      }
    }

    if (cacheMisses.length > 0) {
      const batchSize = 25;
      for (let i = 0; i < cacheMisses.length; i += batchSize) {
        const batch = cacheMisses.slice(i, i + batchSize);
        const res = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE_NAME]: {
              Keys: batch.map((id) => ({ PK: `DEAL#${id}`, SK: 'META' })),
            },
          },
        }));
        const items = res.Responses?.[TABLE_NAME] || [];
        for (const item of items) {
          await r.set(`deal:${item.dealId}`, JSON.stringify(item), 'EX', 3600);
          const matchIdx = idsWithDist.findIndex((d) => d.dealId === item.dealId);
          if (matchIdx >= 0) item._distance = idsWithDist[matchIdx].distance;
          deals.push(item);
        }
      }
    }

    // Filter: active, not expired, not fully claimed
    const now = new Date().toISOString();
    const nowMs = Date.now();
    let filtered = deals.filter((d) =>
      d.status === 'active' &&
      d.expiresAt > now &&
      (d.currentClaims as number) < (d.maxClaims as number)
    );

    // Category filter
    if (category) {
      filtered = filtered.filter((d) => d.category === category);
    }

    // Search query filter
    if (q) {
      const qLower = q.toLowerCase();
      filtered = filtered.filter((d) =>
        (d.title as string).toLowerCase().includes(qLower) ||
        (d.description as string).toLowerCase().includes(qLower) ||
        (d.category as string).toLowerCase().includes(qLower)
      );
    }

    // Weighted scoring: distance * 0.4 + (100 - discountValue) * 0.3 + timeToExpiry * 0.3
    filtered.sort((a, b) => {
      const maxDist = 5000;
      const maxTime = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

      const distA = Math.min((a._distance as number) / maxDist, 1);
      const distB = Math.min((b._distance as number) / maxDist, 1);

      const discA = (100 - (a.discountValue as number || 0)) / 100;
      const discB = (100 - (b.discountValue as number || 0)) / 100;

      const timeA = Math.min((new Date(a.expiresAt as string).getTime() - nowMs) / maxTime, 1);
      const timeB = Math.min((new Date(b.expiresAt as string).getTime() - nowMs) / maxTime, 1);

      const scoreA = distA * 0.4 + discA * 0.3 + timeA * 0.3;
      const scoreB = distB * 0.4 + discB * 0.3 + timeB * 0.3;

      return scoreA - scoreB;
    });

    const result = filtered.slice(0, limit);

    const output = result.map(({ PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, _distance, ...rest }) => ({
      ...rest,
      distance: _distance,
    }));

    return respond(200, { deals: output, total: output.length });
  } catch (err) {
    console.error('getNearbyDeals error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

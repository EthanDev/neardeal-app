import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
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

const KNOWN_CATEGORIES = ['food', 'groceries', 'fashion', 'beauty', 'fitness', 'entertainment', 'pharmacy', 'home'];

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const params = event.queryStringParameters || {};
    const lat = params.lat ? parseFloat(params.lat) : null;
    const lng = params.lng ? parseFloat(params.lng) : null;
    const radiusKm = params.radius ? parseFloat(params.radius) : 5;

    const r = getRedis();

    // Try cache first (cache key includes location if provided)
    const cacheKey = lat && lng
      ? `category-stats:${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}`
      : 'category-stats:all';

    const cached = await r.get(cacheKey);
    if (cached) {
      return respond(200, JSON.parse(cached));
    }

    // Query all active deals via GSI1
    const now = new Date().toISOString();
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :now',
      FilterExpression: '#st = :status',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':pk': 'STATUS#active',
        ':now': now,
        ':status': 'active',
      },
    }));

    const deals = result.Items || [];

    // Count totals per category
    const totalCounts: Record<string, number> = {};
    const nearbyCounts: Record<string, number> = {};

    for (const deal of deals) {
      const cat = (deal.category as string) || 'other';
      totalCounts[cat] = (totalCounts[cat] || 0) + 1;

      // If caller provided location, check proximity
      if (lat !== null && lng !== null && deal.lat && deal.lng) {
        const dist = haversineKm(lat, lng, deal.lat as number, deal.lng as number);
        if (dist <= radiusKm) {
          nearbyCounts[cat] = (nearbyCounts[cat] || 0) + 1;
        }
      }
    }

    const categories = KNOWN_CATEGORIES.map((id) => ({
      id,
      totalDeals: totalCounts[id] || 0,
      nearbyDeals: nearbyCounts[id] || 0,
    }));

    const body = { categories };

    // Cache for 5 minutes
    await r.set(cacheKey, JSON.stringify(body), 'EX', 300);

    return respond(200, body);
  } catch (err) {
    console.error('getCategoryStats error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

/** Haversine distance in kilometres between two lat/lng points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

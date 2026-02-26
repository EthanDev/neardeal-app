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

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const params = event.queryStringParameters || {};
    const city = params.city || 'bucharest';

    const r = getRedis();

    // Try cache first
    const cached = await r.get(`stats:city:${city}`);
    if (cached) {
      return respond(200, JSON.parse(cached));
    }

    // Query active deals from GSI1
    const now = new Date().toISOString();
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :now',
      FilterExpression: 'city = :city AND #st = :status',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':pk': 'STATUS#active',
        ':now': now,
        ':city': city,
        ':status': 'active',
      },
    }));

    const deals = result.Items || [];
    const businesses = new Set<string>();
    const categories: Record<string, number> = {};
    let totalSavings = 0;

    for (const deal of deals) {
      businesses.add(deal.businessId as string);
      const cat = (deal.category as string) || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
      const orig = (deal.originalPrice as number) || 0;
      const price = (deal.dealPrice as number) || (deal.discountedPrice as number) || 0;
      totalSavings += orig - price;
    }

    const stats = {
      city,
      activeDeals: deals.length,
      activeBusinesses: businesses.size,
      categories,
      totalSavings,
      updatedAt: now,
    };

    // Cache for 5 minutes
    await r.set(`stats:city:${city}`, JSON.stringify(stats), 'EX', 300);

    return respond(200, stats);
  } catch (err) {
    console.error('getCityStats error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

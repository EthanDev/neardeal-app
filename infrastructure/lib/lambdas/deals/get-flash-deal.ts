import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
    const city = params.city || 'bucharest';

    const r = getRedis();

    // Try Redis for current flash deal
    const flashDealId = await r.get(`flash:${city}`);
    if (flashDealId) {
      const cached = await r.get(`deal:${flashDealId}`);
      if (cached) {
        const deal = JSON.parse(cached);
        if (deal.flashExpiresAt && new Date(deal.flashExpiresAt) > new Date()) {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...safe } = deal;
          return respond(200, { deal: safe });
        }
      }

      // Flash key exists but deal not in cache - fetch from DDB
      const result = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `DEAL#${flashDealId}`, SK: 'META' },
      }));

      if (result.Item && result.Item.flashExpiresAt && new Date(result.Item.flashExpiresAt as string) > new Date()) {
        await r.set(`deal:${flashDealId}`, JSON.stringify(result.Item), 'EX', 3600);
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...safe } = result.Item;
        return respond(200, { deal: safe });
      }
    }

    // Fallback: query GSI1 for active flash deals
    const now = new Date().toISOString();
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :now',
      FilterExpression: 'isFlash = :isFlash AND #st = :status AND city = :city',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':pk': 'STATUS#active',
        ':now': now,
        ':isFlash': true,
        ':status': 'active',
        ':city': city,
      },
      Limit: 10,
    }));

    const flashDeals = (result.Items || []).filter(
      (d) => d.flashExpiresAt && new Date(d.flashExpiresAt as string) > new Date()
    );

    if (flashDeals.length === 0) {
      return respond(200, { deal: null });
    }

    // If lat/lng provided, pick nearest flash deal
    let bestDeal = flashDeals[0];
    if (!isNaN(lat) && !isNaN(lng) && flashDeals.length > 1) {
      let minDist = Infinity;
      for (const deal of flashDeals) {
        const dlat = (deal.latitude as number) - lat;
        const dlng = (deal.longitude as number) - lng;
        const dist = dlat * dlat + dlng * dlng;
        if (dist < minDist) {
          minDist = dist;
          bestDeal = deal;
        }
      }
    }

    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...safe } = bestDeal;
    return respond(200, { deal: safe });
  } catch (err) {
    console.error('getFlashDeal error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

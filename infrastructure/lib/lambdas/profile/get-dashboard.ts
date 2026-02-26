import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
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

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const businessId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!businessId) return respond(401, { message: 'Unauthorized' });

    // Get all deals for this business
    const dealsRes = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `BIZ#${businessId}` },
      ScanIndexForward: false,
      Limit: 50,
    }));
    const deals = dealsRes.Items || [];

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const activeDeals = deals.filter((d) => d.status === 'active' && d.expiresAt > now);

    // Get today's claims from Redis
    const r = getRedis();
    const claimsToday = parseInt((await r.get(`biz:claims:${businessId}:${today}`)) || '0', 10);

    // Calculate totals
    let totalClaims = 0;
    let revenueImpact = 0;
    for (const deal of deals) {
      const claims = (deal.currentClaims as number) || (deal.claimCount as number) || 0;
      totalClaims += claims;
      const dealPrice = (deal.dealPrice as number) || (deal.discountedPrice as number) || 0;
      revenueImpact += claims * dealPrice;
    }

    const redemptionRate = totalClaims > 0 ? Math.round((claimsToday / Math.max(totalClaims, 1)) * 100) : 0;

    // Get recent activity from claims across active deals
    const recentActivity: Array<Record<string, unknown>> = [];
    for (const deal of activeDeals.slice(0, 5)) {
      const claimsRes = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `DEAL#${deal.dealId}`,
          ':sk': 'CLAIM#',
        },
        ScanIndexForward: false,
        Limit: 3,
      }));
      for (const claim of claimsRes.Items || []) {
        recentActivity.push({
          claimId: claim.claimId,
          dealTitle: claim.dealTitle || deal.title,
          claimedAt: claim.claimedAt,
          status: claim.status,
        });
      }
    }

    // Sort recent activity by time and take top 10
    recentActivity.sort((a, b) => ((b.claimedAt as string) || '').localeCompare((a.claimedAt as string) || ''));

    const dealsList = deals.map(({ PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...rest }) => rest);

    return respond(200, {
      activeDeals: activeDeals.length,
      claimsToday,
      redemptionRate,
      revenueImpact,
      recentActivity: recentActivity.slice(0, 10),
      deals: dealsList,
    });
  } catch (err) {
    console.error('getDashboard error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

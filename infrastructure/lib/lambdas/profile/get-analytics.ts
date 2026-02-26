import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

    const params = event.queryStringParameters || {};
    const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const from = params.from || defaultFrom;
    const to = params.to || new Date().toISOString();

    // Get deals for this business in date range
    const dealsRes = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :from AND :to',
      ExpressionAttributeValues: {
        ':pk': `BIZ#${businessId}`,
        ':from': from,
        ':to': to,
      },
      ScanIndexForward: false,
    }));
    const deals = dealsRes.Items || [];

    // Build claims over time (aggregate by day)
    const claimsOverTime: Record<string, number> = {};
    let totalClaims = 0;
    let totalRevenue = 0;
    const categoryBreakdown: Record<string, number> = {};
    const revenueByDeal: Array<{ dealId: string; title: string; revenue: number; claims: number }> = [];

    for (const deal of deals) {
      const claims = (deal.currentClaims as number) || (deal.claimCount as number) || 0;
      const dealPrice = (deal.dealPrice as number) || (deal.discountedPrice as number) || 0;
      const revenue = claims * dealPrice;
      totalClaims += claims;
      totalRevenue += revenue;

      const cat = (deal.category as string) || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + claims;

      revenueByDeal.push({
        dealId: deal.dealId as string,
        title: deal.title as string,
        revenue,
        claims,
      });

      // Distribute claims across days for the chart (approximate)
      const createdDay = (deal.createdAt as string).split('T')[0];
      claimsOverTime[createdDay] = (claimsOverTime[createdDay] || 0) + claims;
    }

    // Convert claimsOverTime to sorted array
    const claimsArray = Object.entries(claimsOverTime)
      .map(([date, claims]) => ({ date, claims }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top deals by claims
    const topDeals = [...revenueByDeal]
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 5);

    return respond(200, {
      claimsOverTime: claimsArray,
      topDeals,
      categoryBreakdown,
      revenueByDeal: revenueByDeal.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      totalClaims,
      totalRevenue,
    });
  } catch (err) {
    console.error('getAnalytics error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

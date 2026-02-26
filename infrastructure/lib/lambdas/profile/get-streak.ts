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

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    // Query all claims for this user via GSI3
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
      ScanIndexForward: false,
    }));

    const claims = result.Items || [];
    const totalClaims = claims.length;

    // Group claims by date
    const claimDates = new Set<string>();
    for (const claim of claims) {
      const claimedAt = (claim.claimedAt || claim.GSI3SK) as string;
      if (claimedAt) claimDates.add(claimedAt.split('T')[0]);
    }

    // Calculate current streak (consecutive days from today going backwards)
    const today = new Date();
    let currentStreak = 0;
    const checkDate = new Date(today);
    while (true) {
      const dateStr = toDateStr(checkDate);
      if (claimDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (currentStreak === 0) {
        // Check yesterday too (streak might not include today yet)
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = toDateStr(checkDate);
        if (claimDates.has(yesterdayStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Calculate longest streak
    const sortedDates = Array.from(claimDates).sort();
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    if (sortedDates.length === 0) longestStreak = 0;

    // Build week tracker (Mon-Sun for current week)
    const weekTracker: boolean[] = [];
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekTracker.push(claimDates.has(toDateStr(d)));
    }

    // Recent claims (last 10)
    const recentClaims = claims.slice(0, 10).map((c) => ({
      claimId: c.claimId,
      dealId: c.dealId,
      dealTitle: c.dealTitle,
      dealDiscount: c.dealDiscount,
      status: c.status,
      claimedAt: c.claimedAt || c.GSI3SK,
    }));

    return respond(200, {
      currentStreak,
      longestStreak,
      weekTracker,
      recentClaims,
      totalClaims,
    });
  } catch (err) {
    console.error('getStreak error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

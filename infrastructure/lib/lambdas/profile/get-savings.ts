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
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    // Query all claims for this user
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
      ScanIndexForward: false,
    }));

    const claims = result.Items || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let allTimeSavings = 0;
    let monthlySavings = 0;
    let claimsThisMonth = 0;

    for (const claim of claims) {
      const discount = (claim.dealDiscount as number) || 0;
      allTimeSavings += discount;

      const claimedAt = (claim.claimedAt || claim.GSI3SK) as string;
      if (claimedAt && claimedAt >= monthStart) {
        monthlySavings += discount;
        claimsThisMonth++;
      }
    }

    return respond(200, {
      monthlySavings,
      allTimeSavings,
      claimsThisMonth,
      totalClaims: claims.length,
    });
  } catch (err) {
    console.error('getSavings error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

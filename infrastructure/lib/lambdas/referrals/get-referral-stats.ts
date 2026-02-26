import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

    // Get the user's referral code record (has aggregate stats)
    const codeRecord = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'REFERRAL_CODE' },
    }));

    // Query individual referral records
    const referrals = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'REFERRAL#',
      },
    }));

    const totalReferrals = codeRecord.Item?.totalReferrals ?? 0;
    const totalRewardPoints = codeRecord.Item?.totalRewardPoints ?? 0;
    const referralCode = codeRecord.Item?.code ?? null;

    return respond(200, {
      referralCode,
      totalReferrals,
      totalRewardPoints,
      referrals: (referrals.Items ?? []).map((item) => ({
        refereeId: item.refereeId,
        rewardPoints: item.rewardPoints,
        createdAt: item.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('getReferralStats error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

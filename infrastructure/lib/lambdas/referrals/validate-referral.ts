import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

const REWARD_POINTS = 100; // Points awarded to both referrer and referee

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const refereeId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!refereeId) return respond(401, { message: 'Unauthorized' });

    if (!event.body) return respond(400, { message: 'Missing request body' });
    const { referralCode } = JSON.parse(event.body);
    if (!referralCode) return respond(400, { message: 'referralCode is required' });

    // Look up the referral code
    const refLookup = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `REF#${referralCode}`, SK: 'META' },
    }));

    if (!refLookup.Item) return respond(404, { message: 'Invalid referral code' });

    const referrerId = refLookup.Item.userId as string;

    // Reject self-referral
    if (referrerId === refereeId) return respond(400, { message: 'Cannot use your own referral code' });

    // Check if this referee already used this referrer's code
    const existingReferral = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${referrerId}`, SK: `REFERRAL#${refereeId}` },
    }));
    if (existingReferral.Item) return respond(409, { message: 'Referral already applied' });

    const now = new Date().toISOString();

    // Atomic: create referral record + credit rewards to both users
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${referrerId}`,
              SK: `REFERRAL#${refereeId}`,
              referrerId,
              refereeId,
              referralCode,
              rewardPoints: REWARD_POINTS,
              createdAt: now,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${referrerId}`, SK: 'REFERRAL_CODE' },
            UpdateExpression: 'SET totalReferrals = if_not_exists(totalReferrals, :zero) + :one, totalRewardPoints = if_not_exists(totalRewardPoints, :zero) + :points, updatedAt = :now',
            ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':points': REWARD_POINTS, ':now': now },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${refereeId}`, SK: 'PROFILE' },
            UpdateExpression: 'SET referredBy = :referrerId, referralRewardPoints = if_not_exists(referralRewardPoints, :zero) + :points, updatedAt = :now',
            ExpressionAttributeValues: { ':referrerId': referrerId, ':zero': 0, ':points': REWARD_POINTS, ':now': now },
          },
        },
      ],
    }));

    return respond(200, {
      message: 'Referral applied successfully',
      rewardPoints: REWARD_POINTS,
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'TransactionCanceledException') {
      return respond(409, { message: 'Referral already applied' });
    }
    console.error('validateReferral error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

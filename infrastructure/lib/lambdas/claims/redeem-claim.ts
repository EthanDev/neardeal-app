import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { createHmac } from 'crypto';
import Redis from 'ioredis';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sm = new SecretsManagerClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = process.env.REDIS_PORT!;
const QR_HMAC_SECRET_ARN = process.env.QR_HMAC_SECRET_ARN!;

let redis: Redis | null = null;
const getRedis = () => {
  if (!redis) redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT), lazyConnect: true });
  return redis;
};

let hmacSecret: string | null = null;
const getHmacSecret = async (): Promise<string> => {
  if (!hmacSecret) {
    const res = await sm.send(new GetSecretValueCommand({ SecretId: QR_HMAC_SECRET_ARN }));
    hmacSecret = res.SecretString!;
  }
  return hmacSecret;
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

    const claimId = event.pathParameters?.claimId;
    if (!claimId) return respond(400, { message: 'claimId is required' });

    if (!event.body) return respond(400, { message: 'Missing request body' });
    const { qrToken } = JSON.parse(event.body);
    if (!qrToken) return respond(400, { message: 'qrToken is required' });

    // Parse qrToken: claimId:base64hmac
    const colonIdx = qrToken.indexOf(':');
    if (colonIdx === -1) return respond(400, { message: 'Invalid QR token format' });
    const tokenClaimId = qrToken.substring(0, colonIdx);
    const providedHmac = qrToken.substring(colonIdx + 1);

    if (tokenClaimId !== claimId) return respond(400, { message: 'Claim ID mismatch' });

    // Check replay via Redis SET NX
    const r = getRedis();
    const replayCheck = await r.set(`redeem:${claimId}`, '1', 'EX', 86400, 'NX');
    if (!replayCheck) return respond(409, { message: 'Already redeemed' });

    // Lookup claim via GSI4
    const claimLookup = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      ExpressionAttributeValues: { ':pk': `CLAIM#${claimId}` },
      Limit: 1,
    }));

    const claim = claimLookup.Items?.[0];
    if (!claim) {
      await r.del(`redeem:${claimId}`); // Allow retry if claim not found
      return respond(404, { message: 'Claim not found' });
    }

    if (claim.businessId !== businessId) {
      await r.del(`redeem:${claimId}`);
      return respond(403, { message: 'This claim does not belong to your business' });
    }
    if (claim.status !== 'claimed') return respond(409, { message: `Claim is already ${claim.status}` });

    // Verify HMAC
    const secret = await getHmacSecret();
    const qrPayload = `${claimId}:${claim.dealId}:${claim.userId}`;
    const expectedHmac = createHmac('sha256', secret).update(qrPayload).digest('base64');

    if (providedHmac !== expectedHmac) {
      await r.del(`redeem:${claimId}`);
      return respond(401, { message: 'Invalid QR code' });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Update claim status to redeemed
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: claim.PK, SK: claim.SK },
      UpdateExpression: 'SET #st = :redeemed, redeemedAt = :now',
      ConditionExpression: '#st = :claimed',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':redeemed': 'redeemed', ':now': now, ':claimed': 'claimed' },
    }));

    // Also update the user history claim record
    if (claim.userId) {
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${claim.userId}`, SK: `CLAIM#${claimId}` },
        UpdateExpression: 'SET #st = :redeemed, redeemedAt = :now',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':redeemed': 'redeemed', ':now': now },
      })).catch(() => {}); // Non-critical
    }

    // Increment business daily counter
    await r.incr(`biz:claims:${businessId}:${today}`);
    await r.expire(`biz:claims:${businessId}:${today}`, 172800); // 48h TTL

    return respond(200, {
      claim: { claimId, status: 'redeemed', redeemedAt: now },
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return respond(409, { message: 'Claim was already redeemed' });
    }
    console.error('redeemClaim error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

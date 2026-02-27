import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { createHmac, randomUUID } from 'crypto';
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
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    if (!event.body) return respond(400, { message: 'Missing request body' });
    const { dealId } = JSON.parse(event.body);
    if (!dealId) return respond(400, { message: 'dealId is required' });

    // Fetch the deal
    const dealRes = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
    }));
    const deal = dealRes.Item;
    if (!deal) return respond(404, { message: 'Deal not found' });
    if (deal.status !== 'active') return respond(400, { message: 'Deal is no longer active' });
    if (new Date(deal.expiresAt as string) < new Date()) return respond(410, { message: 'Deal has expired' });
    if ((deal.currentClaims as number) >= (deal.maxClaims as number)) return respond(400, { message: 'Deal has reached max claims' });

    // Check if user already claimed
    const existingClaim = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: `CLAIM#${userId}` },
    }));
    if (existingClaim.Item) return respond(409, { message: 'You have already claimed this deal' });

    const claimId = randomUUID();
    const now = new Date().toISOString();
    const secret = await getHmacSecret();
    const qrPayload = `${claimId}:${dealId}:${userId}`;
    const hmacSignature = createHmac('sha256', secret).update(qrPayload).digest('base64');
    const qrToken = `${claimId}:${hmacSignature}`;

    // Create claim with 'pending' status — NOT yet counted towards deal claims.
    // The claim only becomes 'claimed' when the business scans the QR code
    // and the redeem-claim endpoint is called.
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `DEAL#${dealId}`,
              SK: `CLAIM#${userId}`,
              GSI3PK: `USER#${userId}`,
              GSI3SK: now,
              GSI4PK: `CLAIM#${claimId}`,
              claimId,
              dealId,
              userId,
              businessId: deal.businessId,
              dealTitle: deal.title,
              dealDiscount: (deal.originalPrice as number) - (deal.dealPrice as number),
              qrToken,
              status: 'pending',
              createdAt: now,
              expiresAt: deal.expiresAt,
              ttl: Math.floor(new Date(deal.expiresAt as string).getTime() / 1000),
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: `CLAIM#${claimId}`,
              GSI3PK: `USER#${userId}`,
              GSI3SK: now,
              claimId,
              dealId,
              dealTitle: deal.title,
              dealDiscount: (deal.originalPrice as number) - (deal.dealPrice as number),
              status: 'pending',
              createdAt: now,
              ttl: Math.floor(new Date(deal.expiresAt as string).getTime() / 1000),
            },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `DEAL#${dealId}`, SK: 'META' },
            UpdateExpression: 'SET pendingClaims = if_not_exists(pendingClaims, :zero) + :one',
            ConditionExpression: '(if_not_exists(currentClaims, :zero) + if_not_exists(pendingClaims, :zero)) < maxClaims AND #st = :active',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':active': 'active' },
          },
        },
      ],
    }));

    return respond(201, {
      claim: { claimId, dealId, qrToken, status: 'pending', createdAt: now },
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'TransactionCanceledException') {
      return respond(409, { message: 'Claim conflict, please try again' });
    }
    console.error('createClaim error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

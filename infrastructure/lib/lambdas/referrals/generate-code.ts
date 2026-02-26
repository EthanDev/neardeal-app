import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  const bytes = randomBytes(8);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
};

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!userId) return respond(401, { message: 'Unauthorized' });

    // Check if user already has a referral code
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'REFERRAL_CODE' },
    }));

    if (existing.Item) {
      return respond(200, { referralCode: existing.Item.code });
    }

    // Generate a new unique code
    const code = generateCode();
    const now = new Date().toISOString();

    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: 'REFERRAL_CODE',
              code,
              createdAt: now,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `REF#${code}`,
              SK: 'META',
              userId,
              code,
              createdAt: now,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    }));

    return respond(201, { referralCode: code });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'TransactionCanceledException') {
      // Race condition — re-read
      const userId = event.requestContext.authorizer.jwt.claims.sub as string;
      const retry = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'REFERRAL_CODE' },
      }));
      if (retry.Item) {
        return respond(200, { referralCode: retry.Item.code });
      }
      return respond(409, { message: 'Code generation conflict, please retry' });
    }
    console.error('generateCode error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

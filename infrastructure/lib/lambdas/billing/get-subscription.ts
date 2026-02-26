import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

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

    const result = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BIZ#${businessId}`, SK: 'PROFILE' },
      ProjectionExpression: 'planTier, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, monthlyDealCount, createdAt',
    }));

    if (!result.Item) return respond(404, { message: 'Business profile not found' });

    return respond(200, {
      subscription: {
        planTier: result.Item.planTier || 'free',
        stripeCustomerId: result.Item.stripeCustomerId || null,
        stripeSubscriptionId: result.Item.stripeSubscriptionId || null,
        subscriptionStatus: result.Item.subscriptionStatus || 'none',
        monthlyDealCount: result.Item.monthlyDealCount || 0,
      },
    });
  } catch (err) {
    console.error('getSubscription error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

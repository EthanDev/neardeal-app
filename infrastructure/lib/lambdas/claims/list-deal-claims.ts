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
    const businessId = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!businessId) return respond(401, { message: 'Unauthorized' });

    const dealId = event.pathParameters?.dealId;
    if (!dealId) return respond(400, { message: 'dealId is required' });

    // Verify deal ownership
    const dealRes = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DEAL#${dealId}`, SK: 'META' },
    }));
    if (!dealRes.Item) return respond(404, { message: 'Deal not found' });
    if (dealRes.Item.businessId !== businessId) return respond(403, { message: 'Forbidden' });

    // Query claims for this deal (SK begins with CLAIM#)
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `DEAL#${dealId}`, ':sk': 'CLAIM#' },
      ScanIndexForward: false,
    }));

    return respond(200, { claims: result.Items || [] });
  } catch (err) {
    console.error('listDealClaims error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

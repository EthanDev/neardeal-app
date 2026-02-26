import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { request } from 'https';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sm = new SecretsManagerClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const STRIPE_SECRET_ARN = process.env.STRIPE_SECRET_ARN!;

let stripeSecretKey: string | null = null;
const getStripeSecret = async (): Promise<string> => {
  if (!stripeSecretKey) {
    const res = await sm.send(new GetSecretValueCommand({ SecretId: STRIPE_SECRET_ARN }));
    stripeSecretKey = res.SecretString!;
  }
  return stripeSecretKey;
};

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

const PRICE_LOOKUP: Record<string, number> = {
  starter: 2900,
  pro: 7900,
  enterprise: 19900,
};

async function createStripeCheckoutSession(
  apiKey: string,
  params: {
    customerId?: string;
    planId: string;
    businessId: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<{ url: string }> {
  const body = new URLSearchParams();
  body.append('mode', 'subscription');
  body.append('success_url', params.successUrl);
  body.append('cancel_url', params.cancelUrl);
  body.append('line_items[0][price_data][currency]', 'eur');
  body.append('line_items[0][price_data][recurring][interval]', 'month');
  body.append('line_items[0][price_data][unit_amount]', String(PRICE_LOOKUP[params.planId] || 0));
  body.append('line_items[0][price_data][product_data][name]', `NearDeal ${params.planId} Plan`);
  body.append('line_items[0][quantity]', '1');
  body.append('metadata[businessId]', params.businessId);
  body.append('metadata[planTier]', params.planId);
  if (params.customerId) {
    body.append('customer', params.customerId);
  }

  const data = body.toString();

  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: 'api.stripe.com',
        path: '/v1/checkout/sessions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Stripe API error: ${parsed.error?.message || responseBody}`));
            } else {
              resolve({ url: parsed.url });
            }
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const businessId = event.requestContext?.authorizer?.jwt?.claims?.sub as string | undefined;
    if (!businessId) return respond(401, { message: 'Unauthorized' });

    const body = event.body ? JSON.parse(event.body) : {};
    const { planId } = body;
    if (!planId || !PRICE_LOOKUP[planId]) {
      return respond(400, { message: 'Invalid or missing planId' });
    }

    // Look up business profile for stripeCustomerId
    const profileResult = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BIZ#${businessId}`, SK: 'PROFILE' },
      ProjectionExpression: 'stripeCustomerId',
    }));

    const stripeCustomerId = profileResult.Item?.stripeCustomerId as string | undefined;
    const apiKey = await getStripeSecret();

    const origin = event.headers?.origin || 'https://business.neardeal.ro';
    const session = await createStripeCheckoutSession(apiKey, {
      customerId: stripeCustomerId,
      planId,
      businessId,
      successUrl: `${origin}/profile/subscription?success=true`,
      cancelUrl: `${origin}/profile/subscription?cancelled=true`,
    });

    return respond(200, { checkoutUrl: session.url });
  } catch (err) {
    console.error('createCheckout error', err);
    return respond(500, { message: 'Failed to create checkout session' });
  }
};

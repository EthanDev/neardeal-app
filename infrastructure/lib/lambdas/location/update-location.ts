import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = process.env.REDIS_PORT!;

let redis: Redis | null = null;
const getRedis = () => {
  if (!redis) redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT), lazyConnect: true });
  return redis;
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

    let body: { latitude?: number; longitude?: number };
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return respond(400, { message: 'Invalid JSON body' });
    }

    const { latitude, longitude } = body;

    if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
      return respond(400, { message: 'latitude and longitude are required and must be valid numbers' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return respond(400, { message: 'latitude must be between -90 and 90, longitude between -180 and 180' });
    }

    const r = getRedis();

    // Store user's current location in a geo set
    await r.geoadd('users:geo:bucharest', longitude, latitude, userId);

    // Also set a TTL key so stale locations expire (1 hour)
    await r.set(`user:location:${userId}`, JSON.stringify({ latitude, longitude, updatedAt: new Date().toISOString() }), 'EX', 3600);

    // Find nearby deals to return count
    const radiusKm = 0.5; // 500m
    const nearbyDealIds = await r.georadius(
      'deals:geo:bucharest',
      longitude,
      latitude,
      radiusKm,
      'km',
      'COUNT',
      50,
    );

    const nearbyCount = nearbyDealIds ? nearbyDealIds.length : 0;

    return respond(200, { nearbyCount, message: 'Location updated' });
  } catch (err) {
    console.error('updateLocation error', err);
    return respond(500, { message: 'Internal server error' });
  }
};

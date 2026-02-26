import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = process.env.REDIS_PORT!;

let redis: Redis | null = null;
const getRedis = () => {
  if (!redis) redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT), lazyConnect: true });
  return redis;
};

interface DealEvent {
  type: 'new_deal' | 'flash_deal' | 'expiring';
  dealId: string;
  businessId: string;
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  category: string;
  discountValue?: number;
}

// ─── Push Notification via Expo Push API ───

async function sendPushNotification(
  consumerId: string,
  notifTitle: string,
  notifMessage: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const tokenResult = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${consumerId}`, SK: 'PUSH_TOKEN' },
    }));

    const pushToken = tokenResult.Item?.pushToken;
    if (!pushToken) return;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: notifTitle,
        body: notifMessage,
        data: data || {},
        sound: 'default',
      }),
    });

    const result = await response.json() as { data?: { status?: string; details?: { error?: string } } };

    // Handle invalid/expired tokens
    if (result.data?.status === 'error' && result.data?.details?.error === 'DeviceNotRegistered') {
      console.log(`Removing expired push token for user ${consumerId}`);
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: [{
            DeleteRequest: {
              Key: { PK: `USER#${consumerId}`, SK: 'PUSH_TOKEN' },
            },
          }],
        },
      }));
    }
  } catch (err) {
    // Push notification is best-effort; do not fail the notification write
    console.error(`Failed to send push notification to ${consumerId}`, err);
  }
}

const NOTIFICATION_RADIUS_KM = 5;
const THROTTLE_WINDOW_SECONDS = 3600;

function buildMessage(event: DealEvent): { title: string; message: string } {
  switch (event.type) {
    case 'flash_deal':
      return {
        title: 'Flash Deal nearby!',
        message: `${event.title} — ${event.discountValue || 0}% off, limited time!`,
      };
    case 'expiring':
      return {
        title: 'Deal expiring soon',
        message: `${event.title} is about to expire — claim it now!`,
      };
    default:
      return {
        title: 'New deal nearby',
        message: `${event.title} — Save ${event.discountValue || 0}%`,
      };
  }
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const r = getRedis();
  await r.connect().catch(() => {});

  for (const record of event.Records) {
    try {
      const dealEvent: DealEvent = JSON.parse(record.body);
      const { dealId, city, latitude, longitude, category } = dealEvent;
      const { title: notifTitle, message: notifMessage } = buildMessage(dealEvent);

      // Find nearby consumers using Redis GEORADIUS
      const nearbyConsumers = await r.georadius(
        `geo:consumers:${city}`,
        longitude,
        latitude,
        NOTIFICATION_RADIUS_KM,
        'km',
        'COUNT',
        500,
      );

      if (!nearbyConsumers || nearbyConsumers.length === 0) {
        console.log(`No nearby consumers found for deal ${dealId} in ${city}`);
        continue;
      }

      const now = new Date().toISOString();
      const timestamp = Date.now();
      const notifItems: Array<Record<string, unknown>> = [];

      for (const entry of nearbyConsumers) {
        const consumerId = Array.isArray(entry) ? (entry[0] as string) : (entry as string);

        // Check throttle
        const throttleKey = `throttle:${consumerId}:deals`;
        const lastNotified = await r.get(throttleKey);
        if (lastNotified && timestamp - Number(lastNotified) < THROTTLE_WINDOW_SECONDS * 1000) {
          continue;
        }

        const notifId = randomUUID();
        notifItems.push({
          PutRequest: {
            Item: {
              PK: `USER#${consumerId}`,
              SK: `NOTIF#${now}#${notifId}`,
              notifId,
              type: dealEvent.type,
              title: notifTitle,
              message: notifMessage,
              dealId,
              category,
              read: false,
              createdAt: now,
            },
          },
        });

        // Update throttle
        await r.set(throttleKey, String(timestamp), 'EX', THROTTLE_WINDOW_SECONDS);
      }

      // Batch write notifications in chunks of 25
      for (let i = 0; i < notifItems.length; i += 25) {
        const batch = notifItems.slice(i, i + 25);
        await ddb.send(new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch,
          },
        }));
      }

      // Send push notifications (fire-and-forget, best-effort)
      const pushPromises = notifItems.map((item) => {
        const putItem = (item as { PutRequest: { Item: Record<string, unknown> } }).PutRequest.Item;
        const consumerId = (putItem.PK as string).replace('USER#', '');
        return sendPushNotification(consumerId, notifTitle, notifMessage, {
          dealId,
          type: dealEvent.type,
          category,
        });
      });
      await Promise.allSettled(pushPromises);

      console.log(`Processed deal ${dealId}: sent ${notifItems.length} notifications in ${city}`);
    } catch (err) {
      console.error('Error processing record', record.messageId, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

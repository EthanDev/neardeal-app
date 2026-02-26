# Push Notification Delivery - Verification Plan

## What We Are Verifying
End-to-end push notification delivery via Expo Push API when deals are created near consumers.

## Components
1. **register-push-token lambda** - Stores Expo push token in DynamoDB (PK=USER#{userId}, SK=PUSH_TOKEN)
2. **fan-out lambda update** - After writing notification to DynamoDB, looks up push token and calls Expo Push API
3. **API route** - POST /api/push-token for both consumer and business users
4. **Frontend hook** - expo-notifications registration + token submission to backend

## Structural Tests (file-content based)
- [ ] register-push-token.ts stores token with correct PK/SK pattern
- [ ] register-push-token.ts validates pushToken format (ExponentPushToken)
- [ ] register-push-token.ts returns 200 on success
- [ ] fan-out.ts queries for PUSH_TOKEN SK
- [ ] fan-out.ts calls Expo Push API (exp.host)
- [ ] fan-out.ts handles invalid/expired tokens (DeviceNotRegistered)
- [ ] api-stack.ts has POST /api/push-token route with consumer authorizer
- [ ] Frontend push-notifications.ts uses expo-notifications
- [ ] Frontend push-notifications.ts sends token to /api/push-token

## Manual Verification Steps
1. Install expo-notifications: `npx expo install expo-notifications`
2. Deploy dev stack: `npx cdk deploy --all`
3. Register a device, confirm PUSH_TOKEN item in DynamoDB
4. Create a deal near the consumer, confirm push notification received
5. Revoke token, confirm DeviceNotRegistered is handled gracefully

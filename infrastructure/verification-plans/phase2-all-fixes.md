# Phase 2 Verification Plan - All 10 Issues

## Issue #1: Fake QR Codes → Real Scannable QR
- **Files changed**: `neardeal-business/app/(tabs)/nearby/qr.tsx`, `neardeal-business/app/(tabs)/nearby/[id].tsx`
- **Fix**: Replaced `generateQRGrid()` pseudo-grid with `react-native-qrcode-svg` `<QRCode>` component
- **QR payload**: JSON with `claimId`, `dealId`, `businessId`, `qrToken`, `claimedAt`
- **Status**: DONE

## Issue #2: Atomic Claim Race Condition
- **File changed**: `infrastructure/lib/lambdas/claims/create-claim.ts` line 117
- **Fix**: Added `ConditionExpression: 'currentClaims < maxClaims'` to the Update item in TransactWriteCommand
- **Status**: DONE

## Issue #3: Business PK Prefix Mismatch (BUSINESS# vs BIZ#)
- **File changed**: `infrastructure/lib/lambdas/auth/business-post-confirmation.ts` line 17
- **Fix**: Changed `BUSINESS#${sub}` to `BIZ#${sub}` (8 lambdas use BIZ#, only post-confirmation used BUSINESS#)
- **Also fixed**: `infrastructure/INFRASTRUCTURE.md` documentation
- **Status**: DONE (by agent)

## Issue #4: Consumer Login Uses Business Pool
- **File changed**: `neardeal-business/lib/auth.ts`
- **Fix**: `signOut`, `refreshSession`, `getCurrentSession` now read stored role and use correct pool. `confirmSignUp`, `forgotPassword`, `confirmForgotPassword` accept `role` parameter.
- **Status**: DONE

## Issue #5: 9 Missing API Routes
- **New lambdas created**:
  1. `profile/get-consumer-profile.ts` → GET /api/consumer/profile
  2. `deals/list-business-deals.ts` → GET /api/deals
  3. `deals/update-deal.ts` → PATCH /api/deals/{dealId}
  4. `deals/delete-deal.ts` → DELETE /api/deals/{dealId}
  5. `claims/list-deal-claims.ts` → GET /api/deals/{dealId}/claims
  6. `notifications/get-notifications.ts` → GET /api/notifications
  7. `notifications/mark-read.ts` → PUT /api/notifications/read
  8. `notifications/delete-notification.ts` → DELETE /api/notifications/{id}
  9. `billing/get-subscription.ts` → GET /api/business/subscription
- **Routes added**: All 9 routes added to `infrastructure/lib/stacks/api-stack.ts`
- **Status**: DONE

## Issue #6: No Push Notifications
- **Status**: DEFERRED - Requires Expo push notification service integration (expo-notifications package + backend push delivery)

## Issue #7: No Background Location
- **Status**: DEFERRED - Requires expo-location background task configuration

## Issue #8: No Referral System Backend
- **Status**: DEFERRED - Requires new referral code generation, validation, and reward lambdas

## Issue #9: businessId Always Null in Auth Store
- **File changed**: `neardeal-business/lib/store.ts`
- **Fix**: Added `parseIdToken()` helper. `login` and `hydrate` actions now extract `sub` from JWT ID token and set `businessId`.
- **Status**: DONE

## Issue #10: Deal Creation Form Missing Fields
- **File changed**: `neardeal-business/app/(business)/deals/create.tsx`
- **Fix**: Added `expiresAt` (with future-date validation), `city`, `district` fields to form, validation, preview, and submit payload
- **Status**: DONE

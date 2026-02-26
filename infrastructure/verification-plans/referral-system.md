# Referral System - Verification Plan

## Overview
Backend for referral code generation, validation, and reward crediting.

## Test Cases

### generate-code (GET /api/referral/code)
- [ ] Generates unique 8-char alphanumeric referral code
- [ ] Stores code in DynamoDB with `PK=USER#{userId}, SK=REFERRAL_CODE`
- [ ] Creates reverse lookup `PK=REF#{code}, SK=META`
- [ ] Returns existing code if already generated (idempotent)
- [ ] Returns 401 if no userId in JWT

### validate-referral (POST /api/referral/validate)
- [ ] Looks up referrer via `PK=REF#{code}, SK=META`
- [ ] Rejects self-referral (referrer === referee)
- [ ] Rejects invalid/non-existent codes
- [ ] Rejects already-used referral (same referee)
- [ ] Creates referral record `PK=USER#{referrerId}, SK=REFERRAL#{refereeId}`
- [ ] Credits rewards to both referrer and referee
- [ ] Uses conditional writes for idempotency

### get-referral-stats (GET /api/referral/stats)
- [ ] Returns referral count and total rewards
- [ ] Queries `PK=USER#{userId}, SK begins_with REFERRAL#`
- [ ] Returns 401 if unauthorized

## API Routes (all consumer-authorized)
- GET /api/referral/code
- POST /api/referral/validate
- GET /api/referral/stats

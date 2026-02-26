# Business PK Prefix Fix - Verification Plan

## Problem
The `business-post-confirmation.ts` lambda used `BUSINESS#` as the PK prefix, while all other 8 lambdas use `BIZ#`. This inconsistency would cause business profiles created at signup to be invisible to all other operations.

## Analysis
- **8 lambdas** use `BIZ#` prefix (correct)
- **1 lambda** used `BUSINESS#` prefix (incorrect): `auth/business-post-confirmation.ts`
- **Docs** in `INFRASTRUCTURE.md` also referenced `BUSINESS#` in 2 places

## Changes Made
1. `infrastructure/lib/lambdas/auth/business-post-confirmation.ts` line 17: `BUSINESS#${sub}` -> `BIZ#${sub}`
2. `infrastructure/INFRASTRUCTURE.md` line 83: `PK=BUSINESS#{sub}` -> `PK=BIZ#{sub}`
3. `infrastructure/INFRASTRUCTURE.md` line 484: `PK=BUSINESS#{id}` -> `PK=BIZ#{id}`

## Verification
- Automated test in `__tests__/business-pk-prefix.test.ts` greps all lambda files to ensure no `BUSINESS#` string exists
- Test verifies post-confirmation specifically uses `BIZ#`

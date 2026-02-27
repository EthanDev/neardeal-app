# NearDeal Product Requirements Document

> Hyperlocal deals marketplace for Bucharest. Consumers discover nearby deals, claim them, and redeem via QR codes at the business location. Businesses create and manage deals, scan QR codes to verify redemptions, and track analytics.

**Launch target:** ~500 businesses, ~5,000 consumers in Bucharest
**Region:** eu-west-1 (Ireland)
**Primary language:** Romanian | **Secondary:** English

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles](#2-user-roles)
3. [Consumer App](#3-consumer-app)
4. [Business App](#4-business-app)
5. [Claim Lifecycle](#5-claim-lifecycle)
6. [Deal Lifecycle](#6-deal-lifecycle)
7. [Claim Flow Safeguards](#7-claim-flow-safeguards)
8. [Data Model](#8-data-model)
9. [API Reference](#9-api-reference)
10. [Notifications](#10-notifications)
11. [Analytics](#11-analytics)
12. [Billing & Subscriptions](#12-billing--subscriptions)
13. [Security](#13-security)
14. [Non-Functional Requirements](#14-non-functional-requirements)

---

## 1. Product Overview

NearDeal connects local businesses with nearby consumers through time-limited deals. Consumers browse deals on a map, claim them (receiving a QR code), then visit the business to redeem. Businesses create deals, scan consumer QR codes to confirm redemptions, and track performance through analytics.

### Core Value Propositions

| For Consumers | For Businesses |
|---|---|
| Discover deals within walking distance | Drive foot traffic from nearby consumers |
| Save money on local food, services, shopping | Low-cost marketing with measurable ROI |
| Gamified experience (streaks, badges, savings tracker) | Real-time analytics on deal performance |
| Flash deals for time-sensitive discounts | Tiered plans from free to enterprise |

---

## 2. User Roles

### Consumer
- Signs up via email/password through Cognito consumer user pool
- Browses nearby deals on a map and list view
- Claims deals (receives QR code) and presents them at the business
- Tracks streaks, savings, and badges
- Saves deals for later
- Receives push notifications for new/flash deals nearby

### Business Owner
- Signs up via email/password through Cognito business user pool
- Creates deals with pricing, location, timing, and capacity limits
- Scans consumer QR codes to verify and confirm redemptions
- Pauses, edits, or deletes deals
- Views analytics dashboard (claims, redemptions, conversion rates)
- Manages subscription tier (Free, Starter, Pro, Enterprise)

---

## 3. Consumer App

**Platform:** React Native (Expo SDK 52) with expo-router, NativeWind, Zustand
**Design:** Dark theme (`#0c0c0f` background, `#c8e000` accent, GoogleSans typography)

### 3.1 Nearby Screen (Home Tab)

The primary discovery interface with a fixed map and scrollable deals list.

**Layout:**
- **Top bar:** NearDeal logo, "Location active" pill, streak flame icon, notification bell, profile avatar
- **Search bar:** Opens a full-screen search overlay with recent searches and results
- **Filter chips:** Horizontal scroll — All, Food, Grocery, Fitness, Fashion. Selecting a filter re-fetches deals by category
- **Map (fixed):** Shows deal pins with business logos or discount badges. Tapping a pin shows a callout; tapping the callout opens the deal detail
  - Map animates to half height when the deals list is scrolling, springs back to full height when scrolling stops (600ms debounce)
  - Full height: 280px, half height: 140px
- **Flash deal card:** Yellow accent banner with countdown timer (MM:SS). Only shown when an active flash deal exists nearby
- **"Near you now" list:** Scrollable deal cards showing business logo, name, description, discount badge, category, distance, and time remaining

**Data flow:**
1. On mount, request foreground location permission
2. Fetch deals via `GET /api/deals/nearby?lat=X&lng=Y&radius=5000&limit=50`
3. Fetch flash deal via `GET /api/deals/flash?lat=X&lng=Y`
4. Re-fetch on filter change with `category` parameter

### 3.2 Deal Detail Screen

**Accessed from:** Nearby list, map callout, search results, saved deals, my-deals "Show QR" button

**Layout:**
- Back button, business logo and name, category label
- Discount badge (e.g. "30% OFF" on accent background)
- Time remaining pill (green for > 30 min, red for < 30 min)
- Deal title and description
- Stats row: distance away, minutes left, current claims
- Mini map with pin and "Directions" button (opens native maps)
- Bottom bar: Save (heart), Directions, and claim action button

**Claim status button states:**
| Status | Button | Color | Action |
|---|---|---|---|
| `none` | "Claim Deal" | `#c8e000` yellow | Calls `POST /api/claims`, navigates to QR screen on success |
| `pending` | "Show QR Code" | `#c8e000` yellow | Navigates to QR screen with stored claim params |
| `redeemed` | "Redeemed" with checkmark | `#18a056` green | Non-interactive |
| `expired` | "Expired" | `#333` grey | Non-interactive |

**Error handling:**
- 409 Conflict: "You have already claimed this deal."
- 410 Gone: "This deal has expired."
- Other: "Failed to claim deal."

### 3.3 QR Code Screen

**Accessed from:** Successful claim action, "Show QR Code" button on deal detail, "View QR" button on my-deals

**Layout:**
- Dark background with business name and deal title at top
- QR code (react-native-qrcode-svg) centered, containing JSON payload: `{ claimId, dealId, businessId, qrToken, claimedAt }`
- Expiry countdown below QR code:
  - White text when >= 30 min remaining
  - Amber (`#f59e0b`) when < 30 min
  - Red (`#ef4444`) when < 5 min
- "Done" button returns to nearby screen
- **Expired state:** QR code dims to 30% opacity, full-screen overlay with "This deal has expired" in red

**Data sources:**
- `claimId` and `qrToken` from claim API response
- `createdAt` from server response (not client-generated)
- `expiresAt` from deal data (used for countdown timer)

### 3.4 My Deals Screen

Three tabs: **Claimed** | **Saved** | **Passport**

#### Claimed Tab
- Summary strip: total claimed, RON saved, average deal value
- Deal cards grouped by section (Today, Yesterday, Earlier)
- Each card shows: business logo, deal name, discount, date, distance
- **Status badges:**
  - `pending` — amber (`#f59e0b`) "Pending" label, "View QR" button in expanded row
  - `claimed` — red (`#d93025`) "Not Redeemed" label, "View QR" button
  - `redeemed` — green (`#18a056`) "Redeemed" label in expanded row
  - `expired` — grey (`#666`) "Expired" label in expanded row
- Expanding a card reveals RON saved and action button
- Pull-to-refresh updates data

#### Saved Tab
- Count of saved deals
- Cards show: business logo, name, description, discount, category
- Heart icon for unsaving

#### Passport Tab
- Stamp grid (7 slots for weekly streak)
- Next milestone progress bar (gold badge at 20 stamps)
- Badge collection: Explorer (1 deal), Regular (5 deals), Saver (100 RON), Streak Master (7-day), Champion (20 deals)

**Data source:** `GET /api/consumer/streak` for claims + `GET /api/saves` for saves

### 3.5 Streak Screen

- Current streak count with fire icon
- Week tracker (Mon-Sun, done/today/future markers)
- Monthly savings progress bar (against 400 RON target)
- Monthly deals claimed counter
- Recent claims list with business logos and status badges

### 3.6 Profile Screen

- Name, email, avatar
- Notification preferences
- Language toggle (Romanian/English)
- About, help, logout

---

## 4. Business App

**Platform:** React Native (Expo SDK 52), same tech stack as consumer app
**Detailed spec:** See `infrastructure/business-app-plan.md`

### 4.1 Dashboard
- KPI grid: active deals, total claims (today), customer savings, redemption rate
- Quick actions: Create Deal, Scan QR
- Recent activity feed

### 4.2 Deal Management
- Segmented tabs: Active | Expired | Draft
- Deal cards with claims progress bar and time remaining
- Create deal wizard (5 steps: basics, pricing, location, timing, review)
- Deal detail with edit mode, pause/activate toggle, delete with confirmation
- **Allowed status transitions:** `active` <-> `paused`, any -> `deleted` (soft delete)

### 4.3 QR Scanner
- Full-screen camera with barcode scanning (expo-camera)
- Scan overlay with viewfinder frame
- Calls `POST /api/claims/{claimId}/redeem` with scanned `qrToken`
- Success: green checkmark animation, deal title, discount, haptic feedback
- Error states: Already redeemed (409), Expired (410), Invalid QR (401), Deal removed (400)
- Offline support: queues failed redemptions in AsyncStorage, retries on reconnection
- Manual code entry fallback

### 4.4 Analytics
- Date range filter: Today, 7d, 30d, Custom
- Charts: claims over time, top deals, redemption rate trend, revenue impact

### 4.5 Subscription
- Plan comparison: Free (5 deals/mo), Starter (20), Pro (100), Enterprise (unlimited)
- Stripe payment integration via expo-web-browser

---

## 5. Claim Lifecycle

The claim flow has three states with strict transition rules:

```
Consumer claims deal          Business scans QR          Consumer cancels
      |                            |                          |
      v                            v                          v
  [pending] ──────────────> [redeemed]              [cancelled]
      |                                                   ^
      |                                                   |
      +───────────────────────────────────────────────────+
      |
      v (DynamoDB TTL expiration)
  [record deleted]
```

### State Definitions

| State | Set By | Meaning |
|---|---|---|
| `pending` | `POST /api/claims` (consumer) | Consumer has claimed the deal and received a QR code. The deal slot is reserved but NOT yet confirmed. |
| `redeemed` | `POST /api/claims/{claimId}/redeem` (business) | Business has scanned the QR code and confirmed the redemption. The deal's `currentClaims` counter is incremented at this point. |
| `cancelled` | `DELETE /api/claims/{claimId}` (consumer) or deal deletion (business) | Consumer withdrew the claim, or the deal was deleted while the claim was pending. The deal's `pendingClaims` counter is decremented. |

### Counter Model

Two separate counters on the deal META record prevent race conditions:

| Counter | Incremented When | Decremented When |
|---|---|---|
| `pendingClaims` | Consumer creates a claim (atomically in TransactWrite) | Consumer cancels claim, OR business redeems claim |
| `currentClaims` | Business scans QR and redeems claim | Never decremented |

**Capacity check (atomic):** A new claim is only allowed when `currentClaims + pendingClaims < maxClaims AND deal.status = 'active'`. This is enforced as a `ConditionExpression` within the TransactWrite, not just in application code, preventing race conditions from concurrent claims.

### QR Code Verification

1. Consumer claims deal -> server generates `qrToken = claimId:HMAC-SHA256(claimId:dealId:userId)`
2. Consumer shows QR to business (QR contains `{ claimId, dealId, businessId, qrToken }`)
3. Business scanner app calls `POST /api/claims/{claimId}/redeem { qrToken }`
4. Server parses token, verifies HMAC signature, checks deal ownership, validates deal is still active
5. Server updates claim to `redeemed`, increments `currentClaims`, decrements `pendingClaims`, invalidates Redis cache

### Replay Protection

Redis `SET redeem:{claimId} 1 EX 86400 NX` prevents the same QR from being scanned twice. The lock is released on all error paths (claim not found, wrong business, invalid HMAC, deal expired) to allow legitimate retries.

---

## 6. Deal Lifecycle

```
Business creates deal       Business pauses       Business reactivates
      |                          |                       |
      v                          v                       v
  [active] ──────────────> [paused] ──────────────> [active]
      |
      |── Business deletes ──> [deleted]
      |                            |
      |                     Redis geo + cache cleaned
      |                     Pending claims cancelled
      |
      +── DynamoDB TTL fires ──> [record removed]
                                   |
                            deal-expiry Lambda runs
                            Redis cleanup + analytics
```

### Deal Status Values

| Status | Meaning | Visible to Consumers | New Claims Allowed |
|---|---|---|---|
| `active` | Deal is live and accepting claims | Yes (in nearby, search, map) | Yes |
| `paused` | Business temporarily disabled the deal | No (removed from geo index) | No |
| `deleted` | Business permanently removed the deal | No (removed from geo index + cache) | No, and pending claims are cancelled |

### Deal Field Validation (on update)

| Field | Validation |
|---|---|
| `status` | Must be one of: `active`, `paused` |
| `maxClaims` | Must be a number >= 1 |
| `expiresAt` | Must be a valid ISO 8601 date string; also computes `ttl` (epoch seconds) for DynamoDB TTL |

### Cache Invalidation

| Action | Redis Operations |
|---|---|
| Deal updated | `DEL deal:{dealId}`. If status changed to non-active: also `ZREM deals:geo:{city} {dealId}` |
| Deal deleted | `ZREM deals:geo:{city} {dealId}` + `DEL deal:{dealId}` |
| Deal redeemed | `DEL deal:{dealId}` (counter changed) |
| Deal expires (TTL) | `ZREM`, `DEL deal:*`, `DEL flash:*`, `DECR stats:deals:{city}` (via deal-expiry Lambda) |

---

## 7. Claim Flow Safeguards

These safeguards protect against edge cases in the claim lifecycle.

### 7.1 DynamoDB TTL (C1 - Critical)

**Problem:** `expiresAt` was stored as ISO string but DynamoDB TTL requires Unix epoch seconds.
**Solution:** A separate `ttl` attribute (Number type, epoch seconds) is stored on all deal and claim records. The table's `timeToLiveAttribute` is set to `ttl`. The `expiresAt` ISO string is kept for display/logic purposes.

**Records with TTL:**
- Deal META: `ttl = Math.floor(new Date(expiresAt).getTime() / 1000)`
- Claim records (DEAL#/CLAIM# and USER#/CLAIM#): inherit `ttl` from deal at claim time

### 7.2 Atomic Claim Count (C2 - Critical)

**Problem:** Two concurrent claim requests could both pass the `currentClaims >= maxClaims` check and create duplicate claims.
**Solution:** The TransactWrite includes an `Update` on the deal META record with:
```
ConditionExpression: (currentClaims + pendingClaims) < maxClaims AND status = 'active'
UpdateExpression: SET pendingClaims = pendingClaims + 1
```
This atomic check-and-increment prevents over-allocation.

### 7.3 Deal Deletion Cleanup (H1 - High)

**Problem:** Soft-deleting a deal left it visible in Redis and left pending claims active.
**Solution:** When a deal is deleted:
1. Set `status = 'deleted'` in DynamoDB
2. `ZREM deals:geo:{city} {dealId}` — remove from geo index
3. `DEL deal:{dealId}` — invalidate cache
4. Query all claims (`PK = DEAL#{dealId}, SK begins_with CLAIM#`) with pagination
5. Update all `pending` claims to `cancelled` with `cancelledAt` timestamp

### 7.4 Cache Invalidation on Update (H2 - High)

**Problem:** Updating a deal (e.g., pausing it) left stale data in Redis for up to 1 hour.
**Solution:** After every successful deal update:
- Always delete `deal:{dealId}` from Redis
- If status changed to non-active, also `ZREM deals:geo:{city} {dealId}`

### 7.5 Redemption Validates Deal (H3 - High)

**Problem:** A business could redeem a QR code for a deal that was already deleted or expired.
**Solution:** Before processing the redemption, the server fetches the deal META and verifies:
- Deal exists and `status !== 'deleted'` (400 "Deal has been removed")
- Deal `status === 'active'` (400 "Deal is no longer active")
- Deal `expiresAt > now` (410 "Deal has expired")

### 7.6 Cancel Claim (H4 - High)

**Problem:** A consumer who claims a deal cannot undo it — the slot is permanently consumed.
**Solution:** New endpoint `DELETE /api/claims/{claimId}` (consumer JWT):
1. Look up claim via GSI4
2. Verify `claim.userId === requestor` (403 if not)
3. Verify `claim.status === 'pending'` (409 if not)
4. Update both claim records (DEAL# and USER#) to `status = 'cancelled'`
5. Decrement `pendingClaims` on the deal META

### 7.7 Pending Status Display (M1 - Medium)

**Problem:** The `pending` status rendered as "expired" (grey) in the consumer app because the type union didn't include it.
**Solution:** Added `'pending'` to all claim status type unions. Pending renders with amber color (`#f59e0b`) and shows the "View QR" button.

### 7.8 View QR Navigation (M2 - Medium)

**Problem:** The "View QR" button in my-deals had no `onPress` handler.
**Solution:** Button now navigates to `/(tabs)/nearby/qr` with all required params (`claimId`, `qrToken`, `dealTitle`, `business`, `discount`, `dealId`, `businessId`, `expiresAt`).

### 7.9 Update Deal Validation (M3 - Medium)

**Problem:** Businesses could set `status` to arbitrary strings or `maxClaims` to 0.
**Solution:** Server validates:
- `status` must be one of `['active', 'paused']`
- `maxClaims` must be >= 1
- If `expiresAt` is updated, a new `ttl` epoch value is also computed

### 7.10 QR Expiry Countdown (M4 - Medium)

**Problem:** The QR screen showed no indication of time remaining or deal expiry.
**Solution:** Added a real-time countdown timer:
- Displays "Expires in Xh Xm" (>= 1 hour) or "Expires in Xm Xs" (< 1 hour)
- Color changes: white (>= 30 min), amber (< 30 min), red (< 5 min)
- When expired: QR code dims to 30% opacity, overlay appears with "This deal has expired"

### 7.11 Redemption Notification (L2 - Low)

**Problem:** Consumer receives no confirmation when their QR is successfully scanned.
**Solution:** After successful redemption, a `CLAIM_REDEEMED` notification record is written to the consumer's DynamoDB partition (`PK = USER#{userId}`, `SK = NOTIF#{timestamp}#{claimId}`).

### 7.12 Server Timestamps (L3 - Low)

**Problem:** The QR payload used a client-generated `claimedAt` timestamp.
**Solution:** The QR screen now uses `createdAt` from the server's claim response, with fallback to client time if unavailable.

---

## 8. Data Model

### DynamoDB Single-Table Design

**Table:** `neardeal-main-{stage}`
**TTL attribute:** `ttl` (Unix epoch seconds)

| Entity | PK | SK | Key GSIs |
|---|---|---|---|
| Consumer profile | `USER#{id}` | `PROFILE` | — |
| Business profile | `BIZ#{id}` | `PROFILE` | — |
| Deal | `DEAL#{dealId}` | `META` | GSI1: `STATUS#active` / `expiresAt`, GSI2: `BIZ#{id}` / `createdAt` |
| Claim (deal-scoped) | `DEAL#{dealId}` | `CLAIM#{userId}` | GSI3: `USER#{id}` / `createdAt`, GSI4: `CLAIM#{claimId}` |
| Claim (user history) | `USER#{userId}` | `CLAIM#{claimId}` | GSI3: `USER#{id}` / `createdAt` |
| Save | `USER#{userId}` | `SAVE#{dealId}` | GSI1: `USER#{id}#SAVES` / `savedAt` |
| Notification | `USER#{id}` | `NOTIF#{ts}#{id}` | — |
| WebSocket conn | `WS#{connId}` | `CONNECTION` | — |

### Redis Key Patterns

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `deals:geo:{city}` | Sorted Set (geo) | None | Geospatial deal index |
| `deal:{dealId}` | String (JSON) | 3600s | Cached deal metadata |
| `flash:{city}:{dealId}` | String | Until expiry | Flash deal data |
| `redeem:{claimId}` | String | 86400s | QR replay protection |
| `biz:claims:{bizId}:{date}` | Counter | 172800s | Daily business claim count |
| `throttle:{consumerId}:deals` | String | 3600s | Notification throttle |

---

## 9. API Reference

| Method | Path | Auth | Handler | Description |
|---|---|---|---|---|
| POST | `/api/deals` | Business JWT | CreateDeal | Create a new deal |
| PATCH | `/api/deals/{dealId}` | Business JWT | UpdateDeal | Update deal fields (validated) |
| DELETE | `/api/deals/{dealId}` | Business JWT | DeleteDeal | Soft-delete + Redis cleanup + cancel pending claims |
| GET | `/api/deals/nearby` | Consumer JWT | GetNearbyDeals | Geo query within radius |
| GET | `/api/deals/flash` | Consumer JWT | GetFlashDeal | Active flash deal nearby |
| GET | `/api/deals/{dealId}` | Consumer JWT | GetDeal | Deal detail with isSaved/hasClaimed |
| GET | `/api/deals/{dealId}/claims` | Business JWT | ListDealClaims | All claims for a deal |
| POST | `/api/claims` | Consumer JWT | CreateClaim | Claim a deal (status: pending) |
| POST | `/api/claims/{claimId}/redeem` | Business JWT | RedeemClaim | Scan QR to redeem (pending -> redeemed) |
| DELETE | `/api/claims/{claimId}` | Consumer JWT | CancelClaim | Cancel a pending claim |
| POST | `/api/saves/{dealId}` | Consumer JWT | ToggleSave | Save/unsave a deal |
| GET | `/api/saves` | Consumer JWT | GetSaves | List saved deals |
| GET | `/api/consumer/streak` | Consumer JWT | GetStreak | Streak + recent claims |
| GET | `/api/consumer/savings` | Consumer JWT | GetSavings | Monthly/all-time savings |
| PUT | `/api/consumer/profile` | Consumer JWT | UpdateConsumerProfile | Update consumer profile |
| GET | `/api/business/dashboard` | Business JWT | GetDashboard | Business KPIs |
| GET | `/api/business/analytics` | Business JWT | GetAnalytics | Charts + data |
| PUT | `/api/business/profile` | Business JWT | UpdateBusinessProfile | Update business profile |
| POST | `/api/webhooks/stripe` | Public | StripeWebhook | Subscription events |

---

## 10. Notifications

### Push Notifications (Consumer)

| Trigger | Event Type | Channel |
|---|---|---|
| New deal created nearby | `new_deal` | Expo Push + DynamoDB notification record |
| Flash deal nearby | `flash_deal` | Expo Push + DynamoDB notification record |
| Deal expiring soon | `expiring` | Expo Push + DynamoDB notification record |
| Claim redeemed by business | `CLAIM_REDEEMED` | DynamoDB notification record |

**Throttle:** Max 1 push notification per consumer per hour for deal notifications.
**Geo-targeting:** Only consumers within 5km of the deal receive notifications.
**Preference enforcement:** Consumer notification preferences are checked before sending.

### Business Notifications

| Trigger | Type | Channel |
|---|---|---|
| Deal expired | `DEAL_EXPIRED` | DynamoDB notification record |

---

## 11. Analytics

### Consumer Analytics
- **Streak:** Current streak, longest streak, week tracker, total claims
- **Savings:** Monthly savings, all-time savings, claims this month
- **Badges:** Milestone-based achievements (1, 5, 20 deals; 100 RON saved; 7-day streak)

### Business Analytics
- **Dashboard KPIs:** Active deals, total claims today, customer savings, redemption rate
- **Charts:** Claims over time, top deals by claims, redemption rate trend, revenue impact
- **Granularity:** Today, 7d, 30d, custom date range
- **Data sources:** Redis counters for real-time, DynamoDB for historical

---

## 12. Billing & Subscriptions

| Tier | Price | Deals/Month | Max Active | Flash Deals |
|---|---|---|---|---|
| Free | 0 RON | 5 | 2 | No |
| Starter | 49 RON/mo | 20 | 10 | No |
| Pro | 149 RON/mo | 100 | 50 | Yes |
| Enterprise | Custom | Unlimited | Unlimited | Yes |

**Payment:** Stripe Checkout via expo-web-browser
**Enforcement:** Plan tier checked from DynamoDB on deal creation (not from JWT)
**Webhook events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## 13. Security

### Authentication
- Two separate Cognito user pools (consumer and business) with email sign-in
- Password: min 8 chars, uppercase, digits required
- Token validity: 1hr access, 30d refresh
- JWT authorizers on API Gateway enforce pool-specific access

### QR Code HMAC
- QR token: `claimId:HMAC-SHA256(claimId:dealId:userId)` using server-side secret from Secrets Manager
- Timing-safe comparison on verification
- Replay protection via Redis SET NX with 24hr TTL

### Network
- All Lambdas run in VPC private subnets
- Redis accessible only from within VPC on port 6379
- S3 buckets block all public access

### Data Protection
- GDPR Article 17: `delete-account` Lambda removes all user data
- DynamoDB point-in-time recovery enabled
- Stripe webhook signature verified with HMAC-SHA256 and 5-minute tolerance

---

## 14. Non-Functional Requirements

### Performance
- Nearby deals query: < 500ms (Redis GEORADIUS + pipeline cache lookup)
- Deal detail: < 200ms (Redis cache hit) / < 500ms (DynamoDB fallback)
- Claim creation: < 1s (TransactWrite)
- QR redemption: < 1s (HMAC verify + conditional update)

### Scalability
- DynamoDB on-demand billing (auto-scales)
- Lambda concurrency: provisioned for `nearbyDeals` (5 prod) and `createClaim` (3 prod)
- Redis: cache.r6g.large for prod

### Reliability
- DLQ on all SQS queues (14-day retention, 3 retries)
- DynamoDB Streams with TRIM_HORIZON and bisect-on-error
- Lambda error rate alarm at > 5%
- Stripe webhook fails open on plan enforcement

### Observability
- CloudWatch dashboard: API requests, latency p99, errors, SQS depth
- X-Ray tracing on all Lambdas
- SNS alert topic for all alarms

# THRIFT MARKETPLACE — PROJECT BIBLE
> Read this file before every Claude Code command. All decisions are final unless explicitly overridden.

---

## PROJECT OVERVIEW

**Name:** AI-Powered Thrift Marketplace  
**Type:** Web application  
**Purpose:** Buy, sell, swap, and rent second-hand clothing. Secure transactions via escrow. Virtual try-on via API.  
**Users:** General public (not campus-only)  
**Phase:** Minor project — sandbox/demo environment, dummy data seeded  

---

## TECH STACK (FINAL)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React.js | Vercel deploy |
| Backend | Node.js + Express.js | Render/Railway deploy |
| Database | Supabase (PostgreSQL) | Auth + Storage + Realtime all via Supabase |
| Real-time chat | Supabase Realtime | NOT Socket.io |
| Payment | Razorpay sandbox | Escrow simulation only |
| Delivery | Shiprocket REST API | Third-party integration |
| Virtual Try-On | API4AI | 2 images in → 1 result image out |
| Version control | Git + GitHub | |
| Dev tool | VS Code | |

---

## FOLDER STRUCTURE

```
/project-root
  /client                        # React frontend
    /src
      /pages                     # Route-level components
      /components                # Reusable UI components
      /hooks                     # Custom React hooks
      /lib
        supabaseClient.js        # Supabase JS client init
        api.js                   # Axios wrapper for backend calls
      /context                   # Auth context, cart context
    .env                         # REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY

  /server                        # Node.js + Express backend
    /routes
      auth.js
      listings.js
      transactions.js
      swap.js
      rental.js
      meetup.js
      dispute.js
      tryon.js
      wishlist.js
      analytics.js
      delivery.js
    /controllers                 # Business logic per route
    /middleware
      authGuard.js               # Verify Supabase JWT
      errorHandler.js
    /services
      supabase.js                # Supabase admin client (service role key)
      razorpay.js                # Razorpay sandbox client
      shiprocket.js              # Shiprocket API wrapper
      api4ai.js                  # Virtual try-on API wrapper
    /utils
      qrGenerator.js             # QR code generation for meetup/escrow
      seedData.js                # Dummy data seeder script
    index.js                     # Express app entry
    .env                         # All secret keys

  CLAUDE.md                      # This file
```

---

## DATABASE SCHEMA (Supabase / PostgreSQL)

### users
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
email         text UNIQUE NOT NULL
name          text
avatar_url    text
locality      text                        -- city/neighborhood for discovery
trust_score   numeric DEFAULT 0
verified      boolean DEFAULT false
role          text DEFAULT 'user'         -- 'user' | 'admin'
style_prefs   jsonb                       -- from style quiz onboarding
created_at    timestamptz DEFAULT now()
```

### user_photos
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES users(id)
photo_url     text NOT NULL               -- stored in Supabase Storage
created_at    timestamptz DEFAULT now()
```

### listings
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
seller_id     uuid REFERENCES users(id)
title         text NOT NULL
description   text
category      text                        -- tops | bottoms | dress | outerwear | footwear | accessories
size          text
condition     text                        -- A | B | C | D
condition_ai  text                        -- AI-suggested grade from photo
price         numeric
available_for text[]                      -- ['buy','swap','rental']
images        text[]                      -- min 3 required (front, back, defect)
locality      text
status        text DEFAULT 'active'       -- active | reserved | sold | delisted
views         integer DEFAULT 0
saves         integer DEFAULT 0
created_at    timestamptz DEFAULT now()
delisted_at   timestamptz
```

### transactions
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
buyer_id        uuid REFERENCES users(id)
seller_id       uuid REFERENCES users(id)
listing_id      uuid REFERENCES listings(id)
type            text                      -- buy | swap | rental
status          text DEFAULT 'pending'    -- pending | escrow_held | completed | disputed | cancelled
amount          numeric
escrow_status   text DEFAULT 'pending'    -- pending | held | released | refunded
delivery_type   text                      -- meetup | delivery
created_at      timestamptz DEFAULT now()
completed_at    timestamptz
```

### swaps
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid REFERENCES transactions(id)
listing_id_a    uuid REFERENCES listings(id)
listing_id_b    uuid REFERENCES listings(id)
user_a          uuid REFERENCES users(id)
user_b          uuid REFERENCES users(id)
value_a         numeric
value_b         numeric
gap_payment     numeric DEFAULT 0         -- abs(value_a - value_b)
gap_payer       uuid REFERENCES users(id) -- who pays the gap
deposit_a       numeric
deposit_b       numeric
status          text DEFAULT 'pending'    -- pending | matched | escrow_held | completed | disputed
```

### rentals
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid REFERENCES transactions(id)
listing_id      uuid REFERENCES listings(id)
renter_id       uuid REFERENCES users(id)
owner_id        uuid REFERENCES users(id)
start_date      date
end_date        date
rent_amount     numeric
deposit         numeric
return_status   text                      -- pending | returned | damaged | disputed
deposit_released numeric                 -- actual amount released after damage check
status          text DEFAULT 'booked'    -- booked | active | returned | completed | disputed
```

### meetups
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id      uuid REFERENCES transactions(id)
scheduled_time      timestamptz
qr_code             text UNIQUE           -- one-time hash: listing_id + transaction_id + timestamp
grace_timer_start   timestamptz
status              text DEFAULT 'scheduled'
                                          -- scheduled | active | completed | buyer_noshow | seller_noshow | disputed
```

### disputes
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid REFERENCES transactions(id)
type            text                      -- condition_mismatch | rental_damage | swap_misrepresentation
filed_by        uuid REFERENCES users(id)
evidence_buyer  text[]                    -- image URLs + timestamps
evidence_seller text[]
admin_decision  text
admin_notes     text
status          text DEFAULT 'open'       -- open | under_review | resolved
created_at      timestamptz DEFAULT now()
resolved_at     timestamptz
```

### conversations
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
participant_a   uuid REFERENCES users(id)
participant_b   uuid REFERENCES users(id)
listing_id      uuid REFERENCES listings(id)
created_at      timestamptz DEFAULT now()
```

### messages
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
conversation_id uuid REFERENCES conversations(id)
sender_id       uuid REFERENCES users(id)
content         text
read            boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### wishlists
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES users(id)
listing_id  uuid REFERENCES listings(id)
created_at  timestamptz DEFAULT now()
UNIQUE(user_id, listing_id)
```

### notifications
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES users(id)
type        text     -- wishlist_match | meetup_reminder | dispute_update | offer_received | rental_return
content     text
read        boolean DEFAULT false
metadata    jsonb    -- { listing_id, transaction_id, etc. }
created_at  timestamptz DEFAULT now()
```

### offers
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
listing_id  uuid REFERENCES listings(id)
buyer_id    uuid REFERENCES users(id)
seller_id   uuid REFERENCES users(id)
amount      numeric
status      text DEFAULT 'pending'        -- pending | countered | accepted | declined
counter_amount numeric
created_at  timestamptz DEFAULT now()
```

### tryon_results
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES users(id)
listing_id      uuid REFERENCES listings(id)
user_photo_url  text
result_url      text                      -- stored in Supabase Storage
created_at      timestamptz DEFAULT now()
```

### vouches
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
voucher_id  uuid REFERENCES users(id)    -- must have 3+ completed transactions
vouchee_id  uuid REFERENCES users(id)
created_at  timestamptz DEFAULT now()
UNIQUE(voucher_id, vouchee_id)
```

### sustainability_log
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid REFERENCES transactions(id)
category        text
co2_saved_kg    numeric                   -- fixed estimate per category
water_saved_l   numeric
created_at      timestamptz DEFAULT now()
```

---

## SUSTAINABILITY CO₂ ESTIMATES (fixed, no API needed)

| Category | CO₂ saved (kg) | Water saved (L) |
|---|---|---|
| Tops / shirts | 2.1 | 2,700 |
| Jeans / bottoms | 3.8 | 7,000 |
| Dress | 3.2 | 5,000 |
| Outerwear / jacket | 5.5 | 4,000 |
| Footwear | 2.8 | 1,500 |
| Accessories | 0.5 | 300 |

---

## FEATURE LIST (CONFIRMED FINAL)

### MUST-HAVE (build first, viva non-negotiable)
1. User auth & profiles (Supabase Auth)
2. Item listing — image upload, condition grading A–D, AI grade suggestion, min 3 photos enforced (front + back + defect), listing photo guidelines overlay
3. Search & filter (size, category, price, condition, locality)
4. Buy / sell transaction flow
5. Local Meetup Escrow — QR-based payment hold, 15-min grace period timer, no-show flow (buyer_noshow / seller_noshow states)
6. Buyer-seller real-time chat (Supabase Realtime)
7. Smart Swap Engine — mutual match, valuation gap payment, safety deposit on both sides
8. Delivery option — Shiprocket API, auto-release escrow on delivery confirmation
9. Dispute resolution admin panel — photo evidence, timestamp metadata, 3 dispute types

### SHOULD-HAVE (build after must-haves)
10. Occasion rental flow — rent + refundable safety deposit + return condition check + damage deduction by admin
11. Dynamic pricing engine — price suggestion from seeded historical sales data
12. Seller analytics dashboard — views, saves, conversion rate, optimal listing time suggestion
13. Community trust score — calculated from transaction rate, dispute history, grading accuracy
14. Verified user badge — email verification
15. Wishlist + notify me — alert when matching listing posted
16. Scheduled meetup slot booking (feeds into #5 grace timer)
17. Return window — 24hr post-transaction dispute window
18. Style quiz onboarding — personalised feed; fallback to trending if DB has <50 listings
19. Seller storefronts — mini profile page per seller with their listings
20. Trending now — most viewed/saved items this week
21. Virtual try-on — per-listing modal, API4AI integration, user photo saved to profile, result save/download

### ADD-ON (build if time permits, demo with seeded data if not)
22. Bundle deals (multiple items at combined discount)
23. Best offer / negotiation flow (offer → counter → accept/decline)
24. Reserved listing (24hr hold for specific buyer)
25. Flash sale mode (2hr discount window with wishlist push notification)
26. Auto-delist reminder (nudge seller after 30 days)
27. Community vouching (requires 3 completed transactions gate)
28. Sustainability score (CO₂ + water saved per transaction, running total on profile)
29. Thrift hauls feed (users post purchases)
30. City leaderboard (top sellers this month)
31. Referral system (invite = listing priority boost)
32. Complete the outfit suggestions (tag-based matching)
33. Price history graph (similar item sales — seeded data required)
34. Size confidence indicator (post try-on feedback → item fit score)
35. Recently viewed (localStorage, last 10 listings)
36. Make an offer on rental
37. Min 3 condition photos enforced on listing submission (front, back, defect close-up)

### CUT (do not build, do not discuss)
- Centralized storage hub
- B2B analytics dashboard
- Service barter / skill exchange (merged into Swap Engine)
- Video condition proof
- OTP fallback for QR meetup scan
- Socket.io (replaced by Supabase Realtime)

---

## KEY FLOWS

### Buy Flow
```
Buyer clicks Buy → Razorpay sandbox payment → amount held in escrow (transaction.escrow_status = held)
→ Seller chooses: Meetup or Delivery
  MEETUP: QR generated → buyer scans at meetup → escrow released → transaction complete
  DELIVERY: Shiprocket order created → delivery confirmed → escrow auto-released
→ 24hr return window opens → if no dispute → trust scores updated
```

### Swap Flow
```
User A lists item (value set) → User B proposes swap with their item (value set)
→ System calculates gap = abs(value_A - value_B)
→ Lower-value party pays gap into escrow + both pay safety deposit
→ Mutual confirmation → meetup or delivery → items exchanged
→ Both confirm receipt → deposits released → complete
```

### Rental Flow
```
Owner lists item as rentable (sets rent/day + deposit amount)
→ Renter books dates → pays rent + deposit into escrow
→ Item dispatched (meetup or delivery) → rental period active
→ Return date → owner checks condition
  OK: full deposit released to renter
  DAMAGED: admin reviews → partial or no deposit release → balance to owner
```

### Meetup Grace Timer Flow
```
Meetup scheduled → at scheduled_time → grace_timer_start set → 15min countdown
→ Buyer scans QR: meetup.status = completed → escrow released ✅
→ 15min expire, no scan:
    Buyer marks no-show → meetup.status = seller_noshow → escrow refunded, listing reactivated, seller flagged
    Seller marks no-show → meetup.status = buyer_noshow → listing reactivated, buyer flagged
    Both silent → meetup.status = disputed → admin reviews
```

### Virtual Try-On Flow
```
User opens listing page → clicks "Try This On"
→ Modal opens with listing photo pre-loaded (image 1)
→ User selects saved photo from profile OR uploads new photo (saved to user_photos)
→ POST /api/tryon → server calls API4AI with both images
→ Result image returned → displayed in modal
→ User can download result OR save try-on result (stored in tryon_results)
→ After try-on: "Does this look like it fits?" → size confidence feedback stored
```

### Dispute Flow
```
User files dispute (within return window) → selects type → uploads evidence photos + timestamps
→ Admin panel shows: listing photo | complaint photo | metadata side-by-side
→ Admin makes decision → escrow action triggered (release / refund / partial)
→ Both parties notified → trust scores updated
```

---

## VIRTUAL TRY-ON — API INTEGRATION

**Provider:** API4AI  
**Input:** image_1 (listing/clothing photo), image_2 (user body photo)  
**Output:** result image URL  

```js
// /server/services/api4ai.js
const axios = require('axios');

const tryOn = async (clothingImageUrl, userImageBase64) => {
  const response = await axios.post(process.env.API4AI_ENDPOINT, {
    clothing_image: clothingImageUrl,
    person_image: userImageBase64
  }, {
    headers: { 'Authorization': `Bearer ${process.env.API4AI_KEY}` }
  });
  return response.data.result_url;
};

module.exports = { tryOn };
```

**Cache logic:** Before calling API, check `tryon_results` table for same user_id + listing_id. If exists, return cached result_url. Save API credits.

---

## REAL-TIME CHAT — SUPABASE REALTIME

```js
// Frontend subscription
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

Typing indicators via Supabase Presence on same channel.

---

## QR CODE — MEETUP ESCROW

```js
// /server/utils/qrGenerator.js
const QRCode = require('qrcode');
const crypto = require('crypto');

const generateMeetupQR = (listingId, transactionId) => {
  const hash = crypto
    .createHash('sha256')
    .update(`${listingId}:${transactionId}:${Date.now()}`)
    .digest('hex');
  return hash; // stored in meetups.qr_code, encoded as QR on frontend
};
```

QR is one-time use. Scanning calls `POST /api/meetup/confirm` with hash → validates → releases escrow.

---

## ADMIN PANEL

Single admin user (`role = 'admin'` in users table). Admin sees:
- All open disputes with evidence comparison
- Meetup no-show flags
- User trust score overrides
- Rental damage decisions
- Platform-wide stats

Route guard: `authGuard.js` checks `req.user.role === 'admin'` for all `/admin/*` routes.

---

## DUMMY DATA SEED TARGETS

| Table | Target count |
|---|---|
| users | 50 |
| listings | 200 (varied category, size, condition, price, locality) |
| transactions | 80 (mix of buy/swap/rental, all statuses) |
| messages | 150 |
| wishlists | 100 |
| offers | 40 |
| reviews | 60 |
| swaps | 30 |
| rentals | 20 |
| sustainability_log | 80 (one per completed transaction) |
| tryon_results | 25 |

Run with: `node server/utils/seedData.js`

---

## ENVIRONMENT VARIABLES

### /server/.env
```
PORT=5000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
API4AI_ENDPOINT=
API4AI_KEY=
JWT_SECRET=
```

### /client/.env
```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_API_BASE_URL=http://localhost:5000
```

---

## BUILD ORDER (8 WEEKS)

| Week | Focus |
|---|---|
| 1–2 | Supabase schema setup + Auth + User profiles + Listing CRUD + 3-photo enforcement |
| 3 | Buy/sell flow + Razorpay escrow sandbox + QR generation |
| 4 | Meetup grace timer + Supabase Realtime chat + Swap Engine |
| 5 | Virtual Try-On (API4AI) + Delivery (Shiprocket) + Rental flow |
| 6 | Dispute panel + Admin module + Trust score logic |
| 7 | Should-have features + Dummy data seed (200 listings) |
| 8 | Add-ons (time permitting) + polish + demo prep |

---

## DECISIONS LOG (do not re-discuss)

| Decision | Choice | Reason |
|---|---|---|
| Backend | Node.js + Express | Full JS stack, better with Supabase JS SDK |
| Real-time | Supabase Realtime | Already in stack, chat history free from DB |
| AI layer | None (removed) | Only try-on needed, no agent orchestration |
| Try-on UI | Per-listing modal | Better UX than global tab |
| Try-on photos | Saved to user profile | Reusable, saves API credits |
| B2B dashboard | Cut | Seller dashboard covers it |
| Storage hub | Cut | Physical ops, not software |
| Video proof | Cut | Storage cost + upload friction |
| OTP fallback | Cut | Extra implementation not worth it |
| Meetup trust | 15-min grace timer + no-show states | No OTP needed |
| Escrow | Razorpay sandbox | Minor project — simulation only |
| Dummy data | 200 listings, 50 users, 80 transactions | Demo-ready for every feature |

---

*Last updated: Project planning complete. Ready to build.*

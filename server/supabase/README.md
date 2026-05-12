# Supabase Setup

## Migrations

Run the SQL files in `migrations/` in ascending filename order, in the
**Supabase Dashboard → SQL Editor** (or via `supabase db push` if you wire up
the Supabase CLI):

1. `202605120001_create_users.sql`
2. `202605120002_create_user_photos.sql`
3. `202605120003_create_listings.sql`
4. `202605120004_create_transactions.sql`
5. `202605120005_create_swaps.sql`
6. `202605120006_create_rentals.sql`
7. `202605120007_create_meetups.sql`
8. `202605120008_create_disputes.sql`
9. `202605120009_create_conversations_messages.sql`
10. `202605120010_create_wishlists.sql`
11. `202605120011_create_notifications.sql`
12. `202605120012_create_offers.sql`
13. `202605120013_create_tryon_results.sql`
14. `202605120014_create_vouches.sql`
15. `202605120015_create_sustainability_log.sql`
16. `202605120016_functions_triggers.sql`

## Storage buckets

Create these buckets in **Supabase Dashboard → Storage**:

| Bucket | Purpose | Public |
|---|---|---|
| `listing-images` | Clothing photos per listing | Yes |
| `user-avatars` | Profile pictures | Yes |
| `user-photos` | Try-on body photos | No (private) |
| `tryon-results` | Virtual try-on output images | No (private) |
| `dispute-evidence` | Dispute photo uploads | No (private) |

## Seed dummy data

After migrations + buckets, from `server/`:

```bash
npm run seed
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawSupabaseUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_EMAIL_DOMAIN = 'example.com';
const SHARED_PASSWORD = 'Thrift@2026Seed!';
const USER_COUNT = 60;
const LISTING_COUNT = 360;
const CATEGORIES = ['tops', 'bottoms', 'dress', 'outerwear', 'footwear', 'accessories'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const CONDITIONS = ['A', 'B', 'C', 'D'];
const LOCALITIES = ['Indore', 'Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Hyderabad', 'Jaipur', 'Ahmedabad', 'Chennai', 'Kolkata'];
const SOURCE_URLS = {
  users: 'https://dummyjson.com/users?limit=60&select=firstName,lastName,email,image,address,gender,username',
  products: 'https://dummyjson.com/products?limit=194',
};

const CO2_MAP = {
  tops: { co2: 2.1, water: 2700 },
  bottoms: { co2: 3.8, water: 7000 },
  dress: { co2: 3.2, water: 5000 },
  outerwear: { co2: 5.5, water: 4000 },
  footwear: { co2: 2.8, water: 1500 },
  accessories: { co2: 0.5, water: 300 },
};

const FALLBACK_PRODUCTS = [
  { title: 'Vintage Denim Jacket', category: 'outerwear', description: 'Pre-loved denim jacket with a structured fit.', price: 1299, thumbnail: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600', images: [] },
  { title: 'Floral Summer Dress', category: 'womens-dresses', description: 'Easy floral dress for brunch or casual outings.', price: 899, thumbnail: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600', images: [] },
  { title: 'Classic White Sneakers', category: 'mens-shoes', description: 'Clean white sneakers with light signs of use.', price: 1499, thumbnail: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600', images: [] },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Number((Math.random() * (max - min) + min).toFixed(2));
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();
const dateFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const uuidFromSeed = (seed) => {
  const hex = crypto.createHash('md5').update(seed).digest('hex').split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const id = hex.join('');
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status}`);
  return response.json();
};

const chunk = (rows, size = 100) => {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
};

const upsertMany = async (table, rows, options = {}) => {
  if (!rows.length) return [];
  const selected = [];
  for (const group of chunk(rows, 100)) {
    const query = supabase.from(table).upsert(group, options);
    const { data, error } = await query.select();
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    selected.push(...(data || []));
  }
  return selected;
};

const getExistingAuthUsers = async () => {
  const all = [];
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Auth listUsers failed: ${error.message}`);
    all.push(...(data.users || []));
    if ((data.users || []).length < 1000) break;
  }
  return all;
};

const createOrUpdateAuthUsers = async (internetUsers) => {
  const existing = await getExistingAuthUsers();
  const byEmail = new Map(existing.map((user) => [user.email, user]));
  const credentials = [];
  const authUsers = [];

  for (let i = 0; i < USER_COUNT; i += 1) {
    const source = internetUsers[i % internetUsers.length] || {};
    const index = String(i + 1).padStart(2, '0');
    const email = `thrift.seed.${index}@${SEED_EMAIL_DOMAIN}`;
    const name = `${source.firstName || `Seed${index}`} ${source.lastName || 'User'}`.trim();
    const role = i === 0 ? 'admin' : 'user';
    const payload = {
      email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name,
        source: 'dummyjson',
        original_username: source.username || null,
      },
      app_metadata: { role },
    };

    let authUser = byEmail.get(email);
    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser(payload);
      if (error) throw new Error(`Auth createUser ${email} failed: ${error.message}`);
      authUser = data.user;
    } else {
      const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, payload);
      if (error) throw new Error(`Auth updateUser ${email} failed: ${error.message}`);
      authUser = data.user;
    }

    credentials.push({ email, password: SHARED_PASSWORD, role, name });
    authUsers.push({ ...authUser, seedName: name, seedRole: role, source });
  }

  return { authUsers, credentials };
};

const mapProductCategory = (product) => {
  const category = String(product.category || '').toLowerCase();
  const title = String(product.title || '').toLowerCase();

  if (category.includes('dress') || title.includes('dress')) return 'dress';
  if (category.includes('shoe') || title.includes('sneaker') || title.includes('boot')) return 'footwear';
  if (category.includes('bag') || category.includes('jewellery') || category.includes('watch') || category.includes('sunglasses')) return 'accessories';
  if (category.includes('shirt') || category.includes('top') || title.includes('shirt') || title.includes('top')) return 'tops';
  if (title.includes('jean') || title.includes('trouser') || title.includes('short') || title.includes('skirt')) return 'bottoms';
  return rand(CATEGORIES);
};

const buildImages = (product, category, index) => {
  const base = [
    product.thumbnail,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter(Boolean);

  const fallbacks = {
    tops: ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=700', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=700'],
    bottoms: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=700', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=700'],
    dress: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=700', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=700'],
    outerwear: ['https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=700', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=700'],
    footwear: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=700', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=700'],
    accessories: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=700', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=700'],
  };

  while (base.length < 3) {
    base.push(fallbacks[category][(base.length + index) % fallbacks[category].length]);
  }
  return base.slice(0, 3);
};

const buildProfiles = (authUsers) => authUsers.map((authUser, i) => {
  const source = authUser.source || {};
  const locality = LOCALITIES[i % LOCALITIES.length];
  const preferred = [CATEGORIES[i % CATEGORIES.length], CATEGORIES[(i + 2) % CATEGORIES.length]];
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.seedName,
    avatar_url: source.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(authUser.seedName)}`,
    locality,
    bio: `Thrift lover in ${locality}. Into ${preferred.join(' and ')} finds, fair swaps, and circular fashion.`,
    trust_score: randFloat(3.4, 4.95),
    total_sales: randNum(0, 35),
    total_swaps: randNum(0, 18),
    total_rentals: randNum(0, 14),
    disputes_filed: randNum(0, 2),
    disputes_against: randNum(0, 2),
    verified: i % 3 !== 0,
    role: authUser.seedRole,
    style_prefs: {
      preferred_categories: preferred,
      preferred_sizes: [SIZES[i % (SIZES.length - 1)], SIZES[(i + 1) % (SIZES.length - 1)]],
      color_mood: rand(['earthy neutrals', 'clean monochrome', 'festival brights', 'soft pastels', 'streetwear blacks']),
      source: 'dummyjson users endpoint',
    },
    created_at: daysAgo(randNum(10, 365)),
  };
});

const buildUserPhotos = (profiles) => profiles.flatMap((profile, i) => [
  {
    id: uuidFromSeed(`user-photo-${profile.id}-front`),
    user_id: profile.id,
    photo_url: profile.avatar_url,
    label: 'Profile reference',
    created_at: daysAgo(randNum(1, 90)),
  },
  {
    id: uuidFromSeed(`user-photo-${profile.id}-fit`),
    user_id: profile.id,
    photo_url: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(profile.name)}-${i}`,
    label: 'Try-on fit reference',
    created_at: daysAgo(randNum(1, 60)),
  },
]);

const buildListings = (profiles, products) => {
  const sellers = profiles.filter((profile) => profile.role === 'user');
  const listingRows = [];
  const fashionProducts = products.length ? products : FALLBACK_PRODUCTS;

  for (let i = 0; i < LISTING_COUNT; i += 1) {
    const product = fashionProducts[i % fashionProducts.length];
    const seller = sellers[i % sellers.length];
    const category = mapProductCategory(product);
    const price = Math.max(99, Math.round(Number(product.price || randNum(8, 80)) * 83 * randFloat(0.35, 0.8)));
    const available_for = rand([
      ['buy'],
      ['buy', 'swap'],
      ['buy', 'rental'],
      ['buy', 'swap', 'rental'],
      ['swap'],
      ['rental'],
    ]);
    const isRental = available_for.includes('rental');
    const status = i % 13 === 0 ? 'sold' : i % 17 === 0 ? 'rented' : i % 19 === 0 ? 'reserved' : i % 29 === 0 ? 'delisted' : 'active';
    const createdAt = daysAgo(randNum(1, 150));
    const tags = [
      category,
      ...(Array.isArray(product.tags) ? product.tags : []),
      rand(['vintage', 'streetwear', 'college', 'ethnic', 'party', 'minimal', 'workwear', 'festival']),
    ].filter(Boolean).slice(0, 5);

    listingRows.push({
      id: uuidFromSeed(`listing-${i + 1}`),
      seller_id: seller.id,
      title: `${rand(['Pre-loved', 'Thrifted', 'Vintage', 'Gently Used', 'Closet Drop'])} ${product.title || rand(['Fashion Find', 'Everyday Piece'])}`.slice(0, 120),
      description: `${product.description || 'Internet-sourced catalogue item'} Repriced as a thrift marketplace listing with visible photos, realistic condition, and local pickup options.`,
      category,
      size: rand(SIZES),
      condition: rand(CONDITIONS),
      condition_ai: rand(CONDITIONS),
      price,
      available_for,
      images: buildImages(product, category, i),
      tags,
      locality: seller.locality,
      status,
      views: randNum(8, 2200),
      saves: randNum(0, 180),
      rental_price_per_day: isRental ? Math.max(50, Math.round(price * randFloat(0.06, 0.16))) : null,
      rental_deposit: isRental ? Math.round(price * randFloat(0.25, 0.5)) : null,
      flash_sale_end: i % 11 === 0 ? daysFromNow(randNum(1, 9)) : null,
      flash_sale_price: i % 11 === 0 ? Math.round(price * randFloat(0.72, 0.88)) : null,
      reserved_for: null,
      reserved_until: null,
      created_at: createdAt,
      delisted_at: status === 'delisted' ? daysAgo(randNum(1, 20)) : null,
    });
  }

  return listingRows;
};

const pickOtherUser = (profiles, excludedId) => {
  const candidates = profiles.filter((profile) => profile.role === 'user' && profile.id !== excludedId);
  return rand(candidates);
};

const buildTransactions = (profiles, listings) => {
  const statuses = ['pending', 'escrow_held', 'in_transit', 'completed', 'completed', 'completed', 'disputed', 'cancelled', 'refunded'];
  return listings.slice(0, 140).map((listing, i) => {
    const buyer = pickOtherUser(profiles, listing.seller_id);
    const status = statuses[i % statuses.length];
    const type = i % 7 === 0 ? 'rental' : i % 5 === 0 ? 'swap' : 'buy';
    const completed = status === 'completed';
    return {
      id: uuidFromSeed(`transaction-${i + 1}`),
      buyer_id: buyer.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      type,
      status,
      amount: type === 'swap' ? Math.round(listing.price * randFloat(0.05, 0.25)) : listing.price,
      escrow_status: completed ? 'released' : status === 'refunded' || status === 'cancelled' ? 'refunded' : status === 'pending' ? 'pending' : 'held',
      delivery_type: i % 3 === 0 ? 'delivery' : 'meetup',
      razorpay_order_id: `order_seed_${String(i + 1).padStart(4, '0')}`,
      razorpay_payment_id: completed ? `pay_seed_${String(i + 1).padStart(4, '0')}` : null,
      return_window_end: completed ? daysFromNow(1) : null,
      created_at: daysAgo(randNum(1, 120)),
      completed_at: completed ? daysAgo(randNum(0, 60)) : null,
    };
  });
};

const buildSwaps = (transactions, listings) => transactions
  .filter((txn) => txn.type === 'swap')
  .slice(0, 45)
  .map((txn, i) => {
    const listingA = listings.find((listing) => listing.id === txn.listing_id);
    const listingB = listings[(i * 7 + 20) % listings.length];
    const gap = Math.abs(Number(listingA.price) - Number(listingB.price));
    return {
      id: uuidFromSeed(`swap-${i + 1}`),
      transaction_id: txn.id,
      listing_id_a: listingA.id,
      listing_id_b: listingB.id,
      user_a: txn.buyer_id,
      user_b: txn.seller_id,
      value_a: listingA.price,
      value_b: listingB.price,
      gap_payment: gap,
      gap_payer: gap > 0 ? (Number(listingA.price) < Number(listingB.price) ? txn.buyer_id : txn.seller_id) : null,
      deposit_a: Math.round(Number(listingA.price) * 0.2),
      deposit_b: Math.round(Number(listingB.price) * 0.2),
      status: txn.status === 'completed' ? 'completed' : txn.status === 'disputed' ? 'disputed' : txn.status === 'cancelled' ? 'cancelled' : rand(['pending', 'matched', 'escrow_held']),
      created_at: txn.created_at,
    };
  });

const buildRentals = (transactions, listings) => transactions
  .filter((txn) => txn.type === 'rental')
  .slice(0, 45)
  .map((txn, i) => {
    const listing = listings.find((item) => item.id === txn.listing_id);
    const days = randNum(3, 12);
    const rent = listing.rental_price_per_day || Math.round(Number(listing.price) * 0.1);
    return {
      id: uuidFromSeed(`rental-${i + 1}`),
      transaction_id: txn.id,
      listing_id: listing.id,
      renter_id: txn.buyer_id,
      owner_id: txn.seller_id,
      start_date: dateFromNow(randNum(-20, 10)),
      end_date: dateFromNow(randNum(11, 30)),
      rent_amount: rent * days,
      deposit: listing.rental_deposit || Math.round(Number(listing.price) * 0.35),
      return_status: txn.status === 'disputed' ? 'disputed' : txn.status === 'completed' ? rand(['returned_ok', 'returned_damaged']) : 'pending',
      deposit_released: txn.status === 'completed' ? Math.round((listing.rental_deposit || Number(listing.price) * 0.35) * 0.9) : null,
      damage_deducted: txn.status === 'completed' && i % 5 === 0 ? randNum(100, 650) : 0,
      return_photos: listing.images.slice(0, 2),
      status: txn.status === 'completed' ? 'completed' : txn.status === 'disputed' ? 'disputed' : rand(['booked', 'active', 'returned']),
      created_at: txn.created_at,
    };
  });

const buildMeetups = (transactions) => transactions
  .filter((txn) => txn.delivery_type === 'meetup')
  .slice(0, 70)
  .map((txn, i) => ({
    id: uuidFromSeed(`meetup-${i + 1}`),
    transaction_id: txn.id,
    scheduled_time: i % 4 === 0 ? daysFromNow(randNum(1, 10)) : daysAgo(randNum(1, 30)),
    location_note: rand(['Cafe near Gate 2', 'Metro station exit B', 'College canteen', 'Mall food court', 'Library entrance', 'Society clubhouse']),
    qr_code: crypto.createHash('sha256').update(`meetup-${txn.id}-${i}`).digest('hex'),
    qr_used: txn.status === 'completed',
    grace_timer_start: txn.status === 'completed' ? daysAgo(randNum(1, 20)) : null,
    status: txn.status === 'completed' ? 'completed' : txn.status === 'disputed' ? 'disputed' : rand(['scheduled', 'active', 'buyer_noshow', 'seller_noshow']),
    noshow_filed_by: i % 9 === 0 ? txn.buyer_id : null,
    created_at: txn.created_at,
  }));

const buildDisputes = (transactions, listings) => transactions
  .filter((txn) => txn.status === 'disputed')
  .slice(0, 25)
  .map((txn, i) => {
    const listing = listings.find((item) => item.id === txn.listing_id);
    const resolved = i % 3 === 0;
    return {
      id: uuidFromSeed(`dispute-${i + 1}`),
      transaction_id: txn.id,
      type: txn.type === 'rental' ? 'rental_damage' : txn.type === 'swap' ? 'swap_misrepresentation' : 'condition_mismatch',
      filed_by: i % 2 === 0 ? txn.buyer_id : txn.seller_id,
      against: i % 2 === 0 ? txn.seller_id : txn.buyer_id,
      description: rand([
        'Item condition did not match the listing photos.',
        'Return photos show damage that needs admin review.',
        'Swap item value and condition were misrepresented.',
        'Buyer and seller disagree about pickup confirmation.',
      ]),
      evidence_filer: listing.images.slice(0, 2),
      evidence_defense: listing.images.slice(1, 3),
      listing_photo: listing.images[0],
      listing_photo_timestamp: listing.created_at,
      complaint_photo_timestamp: daysAgo(randNum(0, 20)),
      admin_decision: resolved ? rand(['buyer_wins', 'seller_wins', 'partial_refund', 'no_action']) : null,
      admin_notes: resolved ? 'Seeded admin review note for demo workflows.' : null,
      refund_amount: resolved ? Math.round(Number(txn.amount) * randFloat(0.2, 1)) : null,
      status: resolved ? 'resolved' : rand(['open', 'evidence_requested', 'under_review']),
      created_at: txn.created_at,
      resolved_at: resolved ? daysAgo(randNum(0, 10)) : null,
    };
  });

const buildConversationsAndMessages = (profiles, listings) => {
  const conversations = [];
  const messages = [];
  const text = [
    'Is this still available?',
    'Yes, it is. I can hold it until evening.',
    'Can you share a close-up of the fabric?',
    'Sure, uploading one now.',
    'Would you do a small discount?',
    'I can do 10 percent if pickup is today.',
    'Can we meet near the metro?',
    'That works. I will bring a tote bag too.',
    'Is the listed size accurate?',
    'Yes, I added measurements in the description.',
  ];

  for (let i = 0; i < 120; i += 1) {
    const listing = listings[(i * 3) % listings.length];
    const seller = profiles.find((profile) => profile.id === listing.seller_id);
    const buyer = pickOtherUser(profiles, seller.id);
    const conversationId = uuidFromSeed(`conversation-${i + 1}`);
    conversations.push({
      id: conversationId,
      participant_a: buyer.id,
      participant_b: seller.id,
      listing_id: listing.id,
      last_message: text[(i + 4) % text.length],
      last_message_at: daysAgo(randNum(0, 20)),
      created_at: daysAgo(randNum(1, 90)),
    });

    for (let j = 0; j < 5; j += 1) {
      messages.push({
        id: uuidFromSeed(`message-${i + 1}-${j + 1}`),
        conversation_id: conversationId,
        sender_id: j % 2 === 0 ? buyer.id : seller.id,
        content: text[(i + j) % text.length],
        read: j < 3 || Math.random() > 0.4,
        created_at: daysAgo(randNum(0, 20)),
      });
    }
  }

  return { conversations, messages };
};

const buildWishlists = (profiles, listings) => {
  const users = profiles.filter((profile) => profile.role === 'user');
  const rows = [];
  const seen = new Set();
  for (let i = 0; i < 450; i += 1) {
    const user = users[i % users.length];
    const listing = listings[(i * 11 + 5) % listings.length];
    if (user.id === listing.seller_id) continue;
    const key = `${user.id}:${listing.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: uuidFromSeed(`wishlist-${key}`),
      user_id: user.id,
      listing_id: listing.id,
      created_at: daysAgo(randNum(0, 80)),
    });
  }
  return rows;
};

const buildOffers = (profiles, listings) => listings.slice(0, 150).map((listing, i) => {
  const buyer = pickOtherUser(profiles, listing.seller_id);
  const amount = Math.round(Number(listing.price) * randFloat(0.68, 0.96));
  const status = rand(['pending', 'pending', 'countered', 'accepted', 'declined', 'expired']);
  return {
    id: uuidFromSeed(`offer-${i + 1}`),
    listing_id: listing.id,
    buyer_id: buyer.id,
    seller_id: listing.seller_id,
    amount,
    status,
    counter_amount: status === 'countered' ? Math.round(Number(listing.price) * randFloat(0.88, 1.02)) : null,
    expires_at: daysFromNow(randNum(1, 5)),
    created_at: daysAgo(randNum(0, 45)),
  };
});

const buildNotifications = (profiles, listings, transactions, offers) => {
  const types = ['wishlist_match', 'meetup_reminder', 'meetup_grace_start', 'dispute_update', 'offer_received', 'offer_accepted', 'offer_declined', 'rental_return_due', 'swap_matched', 'escrow_released', 'listing_sold'];
  const rows = [];
  for (let i = 0; i < 400; i += 1) {
    const user = profiles[i % profiles.length];
    const listing = listings[(i * 5) % listings.length];
    const txn = transactions[(i * 3) % transactions.length];
    const offer = offers[(i * 2) % offers.length];
    const type = types[i % types.length];
    rows.push({
      id: uuidFromSeed(`notification-${i + 1}`),
      user_id: user.id,
      type,
      title: rand(['Action needed', 'New activity', 'Marketplace update', 'Order update', 'Offer update']),
      content: `${type.replace(/_/g, ' ')} for ${listing.title}.`,
      read: i % 4 === 0,
      metadata: {
        listing_id: listing.id,
        transaction_id: txn?.id || null,
        offer_id: offer?.id || null,
        source: 'internet dummy seed',
      },
      created_at: daysAgo(randNum(0, 40)),
    });
  }
  return rows;
};

const buildTryOnResults = (profiles, listings, userPhotos) => {
  const rows = [];
  for (let i = 0; i < 80; i += 1) {
    const user = profiles[(i + 3) % profiles.length];
    const listing = listings[(i * 4) % listings.length];
    const photo = userPhotos.find((item) => item.user_id === user.id) || userPhotos[0];
    rows.push({
      id: uuidFromSeed(`tryon-${i + 1}`),
      user_id: user.id,
      listing_id: listing.id,
      user_photo_url: photo.photo_url,
      result_url: listing.images[0],
      fit_feedback: rand(['fits_well', 'too_big', 'too_small']),
      created_at: daysAgo(randNum(0, 35)),
    });
  }
  return rows;
};

const buildVouches = (profiles) => {
  const users = profiles.filter((profile) => profile.role === 'user');
  const rows = [];
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) {
    const voucher = users[i % users.length];
    const vouchee = users[(i * 7 + 3) % users.length];
    if (voucher.id === vouchee.id) continue;
    const key = `${voucher.id}:${vouchee.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: uuidFromSeed(`vouch-${key}`),
      voucher_id: voucher.id,
      vouchee_id: vouchee.id,
      note: rand(['Smooth pickup and honest photos.', 'Great communication.', 'Item matched the description.', 'Would trade again.', 'Quick payment and easy handoff.']),
      created_at: daysAgo(randNum(1, 120)),
    });
  }
  return rows;
};

const buildSustainability = (transactions, listings) => transactions
  .filter((txn) => txn.status === 'completed')
  .map((txn, i) => {
    const listing = listings.find((item) => item.id === txn.listing_id);
    const category = listing?.category || 'tops';
    const saved = CO2_MAP[category];
    return {
      id: uuidFromSeed(`sustainability-${i + 1}`),
      transaction_id: txn.id,
      category,
      co2_saved_kg: saved.co2,
      water_saved_l: saved.water,
      created_at: txn.completed_at || txn.created_at,
    };
  });

const writeCredentials = (credentials) => {
  const lines = [
    '# Seed User Credentials',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Shared password for all seed users: ${SHARED_PASSWORD}`,
    '',
    '| Role | Name | Email | Password |',
    '| --- | --- | --- | --- |',
    ...credentials.map((item) => `| ${item.role} | ${item.name} | ${item.email} | ${item.password} |`),
    '',
  ];
  const filePath = path.resolve(__dirname, '../../seed-credentials.md');
  fs.writeFileSync(filePath, lines.join('\n'));
  return filePath;
};

const main = async () => {
  console.log('\nStarting internet-backed dummy seed...');
  console.log(`Sources: ${SOURCE_URLS.users} and ${SOURCE_URLS.products}\n`);

  const [userData, productData] = await Promise.all([
    fetchJson(SOURCE_URLS.users),
    fetchJson(SOURCE_URLS.products),
  ]);
  const internetUsers = userData.users || [];
  const products = productData.products || FALLBACK_PRODUCTS;

  const { authUsers, credentials } = await createOrUpdateAuthUsers(internetUsers);
  const profiles = buildProfiles(authUsers);
  const userPhotos = buildUserPhotos(profiles);
  const listings = buildListings(profiles, products);
  const transactions = buildTransactions(profiles, listings);
  const swaps = buildSwaps(transactions, listings);
  const rentals = buildRentals(transactions, listings);
  const meetups = buildMeetups(transactions);
  const disputes = buildDisputes(transactions, listings);
  const { conversations, messages } = buildConversationsAndMessages(profiles, listings);
  const wishlists = buildWishlists(profiles, listings);
  const offers = buildOffers(profiles, listings);
  const notifications = buildNotifications(profiles, listings, transactions, offers);
  const tryons = buildTryOnResults(profiles, listings, userPhotos);
  const vouches = buildVouches(profiles);
  const sustainability = buildSustainability(transactions, listings);

  await upsertMany('users', profiles);
  await upsertMany('user_photos', userPhotos);
  await upsertMany('listings', listings);
  await upsertMany('transactions', transactions);
  await upsertMany('swaps', swaps);
  await upsertMany('rentals', rentals);
  await upsertMany('meetups', meetups);
  await upsertMany('disputes', disputes);
  await upsertMany('conversations', conversations);
  await upsertMany('messages', messages);
  await upsertMany('wishlists', wishlists, { onConflict: 'user_id,listing_id' });
  await upsertMany('offers', offers);
  await upsertMany('notifications', notifications);
  await upsertMany('tryon_results', tryons);
  await upsertMany('vouches', vouches, { onConflict: 'voucher_id,vouchee_id' });
  await upsertMany('sustainability_log', sustainability);

  const credentialPath = writeCredentials(credentials);
  const counts = {
    auth_users: authUsers.length,
    users: profiles.length,
    user_photos: userPhotos.length,
    listings: listings.length,
    transactions: transactions.length,
    swaps: swaps.length,
    rentals: rentals.length,
    meetups: meetups.length,
    disputes: disputes.length,
    conversations: conversations.length,
    messages: messages.length,
    wishlists: wishlists.length,
    offers: offers.length,
    notifications: notifications.length,
    tryon_results: tryons.length,
    vouches: vouches.length,
    sustainability_log: sustainability.length,
  };

  console.table(counts);
  console.log(`\nCredentials written to ${credentialPath}`);
  console.log('Internet-backed dummy seed complete.\n');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

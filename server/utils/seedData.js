const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Constants ────────────────────────────────────────────────
const CATEGORIES  = ['tops', 'bottoms', 'dress', 'outerwear', 'footwear', 'accessories'];
const SIZES       = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CONDITIONS  = ['A', 'B', 'C', 'D'];
const LOCALITIES  = ['Indore', 'Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Hyderabad', 'Jaipur', 'Ahmedabad'];
const AVAIL_FOR   = [['buy'], ['buy', 'swap'], ['buy', 'rental'], ['buy', 'swap', 'rental'], ['swap'], ['rental']];

const CO2_MAP = {
  tops: { co2: 2.1, water: 2700 },
  bottoms: { co2: 3.8, water: 7000 },
  dress: { co2: 3.2, water: 5000 },
  outerwear: { co2: 5.5, water: 4000 },
  footwear: { co2: 2.8, water: 1500 },
  accessories: { co2: 0.5, water: 300 },
};

const LISTING_TITLES = {
  tops:        ['Vintage Denim Shirt', 'Floral Kurti', 'Cotton Polo', 'Linen Casual Shirt', 'Striped Tee', 'Silk Blouse', 'Graphic Tee', 'Hoodie', 'Crop Top', 'Oversized Tshirt'],
  bottoms:     ['High-waist Jeans', 'Palazzo Pants', 'Cargo Shorts', 'Slim Chinos', 'Flared Skirt', 'Denim Cutoffs', 'Linen Trousers', 'Jogger Pants', 'Pleated Skirt', 'Track Pants'],
  dress:       ['Wrap Dress', 'Maxi Floral Dress', 'Mini Party Dress', 'Shirt Dress', 'Sundress', 'Bodycon Dress', 'A-line Dress', 'Boho Dress', 'Sequin Dress', 'Casual Shift Dress'],
  outerwear:   ['Denim Jacket', 'Wool Blazer', 'Puffer Coat', 'Leather Jacket', 'Trench Coat', 'Bomber Jacket', 'Windbreaker', 'Fleece Hoodie', 'Overcoat', 'Rain Jacket'],
  footwear:    ['Canvas Sneakers', 'Leather Loafers', 'Block Heel Sandals', 'Running Shoes', 'Chelsea Boots', 'Kolhapuri Chappals', 'Platform Boots', 'Ballet Flats', 'Ankle Boots', 'Strappy Heels'],
  accessories: ['Woven Tote Bag', 'Silk Scarf', 'Leather Belt', 'Statement Earrings', 'Vintage Watch', 'Bucket Hat', 'Crossbody Bag', 'Beaded Necklace', 'Sunglasses', 'Embroidered Clutch'],
};

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
  'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
  'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400',
];

// ─── Helpers ──────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const getImages = () => [rand(PLACEHOLDER_IMAGES), rand(PLACEHOLDER_IMAGES), rand(PLACEHOLDER_IMAGES)];

// ─── Seed Users ───────────────────────────────────────────────
const seedUsers = async () => {
  console.log('Seeding 50 users...');
  const firstNames = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Divya',
    'Ishaan', 'Pooja', 'Karan', 'Nisha', 'Dev', 'Meera', 'Aditya', 'Riya', 'Siddharth', 'Sanya',
    'Nikhil', 'Tara', 'Varun', 'Mira', 'Kabir', 'Zara', 'Harsh', 'Aisha', 'Manav', 'Simran',
    'Yash', 'Natasha', 'Samar', 'Kritika', 'Raj', 'Shruti', 'Ankur', 'Prerna', 'Shiv', 'Muskan',
    'Aman', 'Pallavi', 'Vivek', 'Jyoti', 'Mohit', 'Shweta', 'Gaurav', 'Nandini', 'Sumit', 'Radha'];

  const users = firstNames.map((name, i) => ({
    id:           `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    email:        `${name.toLowerCase()}${i}@example.com`,
    name,
    locality:     rand(LOCALITIES),
    trust_score:  randFloat(0, 5),
    total_sales:  randNum(0, 30),
    verified:     Math.random() > 0.5,
    role:         i === 0 ? 'admin' : 'user', // first user is admin
    style_prefs:  { preferred_categories: [rand(CATEGORIES), rand(CATEGORIES)], preferred_sizes: [rand(SIZES)] },
    created_at:   new Date(Date.now() - randNum(0, 180) * 86400000).toISOString(),
  }));

  const { error } = await supabase.from('users').upsert(users);
  if (error) console.error('Users seed error:', error.message);
  else console.log('✓ Users seeded');

  return users;
};

// ─── Seed Listings ────────────────────────────────────────────
const seedListings = async (users) => {
  console.log('Seeding 200 listings...');
  const listings = [];
  const sellerIds = users.filter(u => u.role === 'user').map(u => u.id);

  for (let i = 0; i < 200; i++) {
    const category = rand(CATEGORIES);
    const titles = LISTING_TITLES[category];
    const availFor = rand(AVAIL_FOR);
    const isRental = availFor.includes('rental');
    const price = randNum(100, 3000);

    listings.push({
      seller_id:            rand(sellerIds),
      title:                rand(titles),
      description:          `Lightly used ${rand(CONDITIONS)}-grade item. Clean and ready to go. ${rand(['Great condition!', 'Minimal wear.', 'No defects.', 'Single owner.'])}`,
      category,
      size:                 rand(SIZES),
      condition:            rand(CONDITIONS),
      price,
      available_for:        availFor,
      images:               getImages(),
      tags:                 [category, rand(['vintage', 'casual', 'ethnic', 'western', 'formal', 'streetwear'])],
      locality:             rand(LOCALITIES),
      status:               rand(['active', 'active', 'active', 'active', 'sold', 'delisted']),
      views:                randNum(0, 500),
      saves:                randNum(0, 80),
      rental_price_per_day: isRental ? randNum(50, 300) : null,
      rental_deposit:       isRental ? Math.round(price * 0.3) : null,
      created_at:           new Date(Date.now() - randNum(0, 90) * 86400000).toISOString(),
    });
  }

  const { data, error } = await supabase.from('listings').insert(listings).select('id,seller_id,category,price,status');
  if (error) console.error('Listings seed error:', error.message);
  else console.log('✓ Listings seeded:', data.length);

  return data;
};

// ─── Seed Transactions ────────────────────────────────────────
const seedTransactions = async (users, listings) => {
  console.log('Seeding 80 transactions...');
  const soldListings = listings.filter(l => l.status === 'sold').slice(0, 80);
  const buyerIds = users.filter(u => u.role === 'user').map(u => u.id);
  const transactions = [];

  for (let i = 0; i < Math.min(80, soldListings.length); i++) {
    const listing = soldListings[i];
    const type = rand(['buy', 'buy', 'buy', 'swap', 'rental']);
    const deliveryType = rand(['meetup', 'meetup', 'delivery']);
    const status = rand(['completed', 'completed', 'completed', 'disputed', 'cancelled']);

    transactions.push({
      buyer_id:      rand(buyerIds.filter(id => id !== listing.seller_id)),
      seller_id:     listing.seller_id,
      listing_id:    listing.id,
      type,
      status,
      amount:        listing.price,
      escrow_status: status === 'completed' ? 'released' : status === 'cancelled' ? 'refunded' : 'held',
      delivery_type: deliveryType,
      created_at:    new Date(Date.now() - randNum(0, 60) * 86400000).toISOString(),
      completed_at:  status === 'completed' ? new Date(Date.now() - randNum(0, 30) * 86400000).toISOString() : null,
    });
  }

  const { data, error } = await supabase.from('transactions').insert(transactions).select('id,buyer_id,seller_id,listing_id,type,status');
  if (error) console.error('Transactions seed error:', error.message);
  else console.log('✓ Transactions seeded:', data.length);

  return data;
};

// ─── Seed Messages ────────────────────────────────────────────
const seedMessages = async (users, listings) => {
  console.log('Seeding conversations and messages...');
  const SAMPLE_MESSAGES = [
    'Is this still available?', 'Yes, it is! Come check it out.',
    'What is the lowest price you can do?', 'Best I can do is 10% off.',
    'Can I pick it up tomorrow?', 'Sure, noon works for me.',
    'Does it have any hidden damage?', 'No, condition is exactly as described.',
    'Can you do a video call to show the item?', 'Sure, DM me your number.',
    'Is size M available?', 'Yes, only M left.',
    'Do you ship to Mumbai?', 'Yes via Shiprocket, adding delivery charges.',
  ];

  const convos = [];
  const msgs = [];
  const userIds = users.map(u => u.id);

  for (let i = 0; i < 30; i++) {
    const [a, b] = [rand(userIds), rand(userIds)];
    if (a === b) continue;
    const listing = rand(listings);
    convos.push({ participant_a: a, participant_b: b, listing_id: listing.id });
  }

  const { data: convoData } = await supabase.from('conversations').insert(convos).select('id,participant_a,participant_b');

  for (const convo of (convoData || [])) {
    const msgCount = randNum(3, 8);
    for (let j = 0; j < msgCount; j++) {
      msgs.push({
        conversation_id: convo.id,
        sender_id:       j % 2 === 0 ? convo.participant_a : convo.participant_b,
        content:         SAMPLE_MESSAGES[randNum(0, SAMPLE_MESSAGES.length - 1)],
        read:            Math.random() > 0.3,
        created_at:      new Date(Date.now() - randNum(0, 30) * 86400000).toISOString(),
      });
    }
  }

  const { error } = await supabase.from('messages').insert(msgs);
  if (error) console.error('Messages seed error:', error.message);
  else console.log('✓ Messages seeded:', msgs.length);
};

// ─── Seed Wishlists ───────────────────────────────────────────
const seedWishlists = async (users, listings) => {
  console.log('Seeding 100 wishlist entries...');
  const seen = new Set();
  const entries = [];

  for (let i = 0; i < 100; i++) {
    const user = rand(users.filter(u => u.role === 'user'));
    const listing = rand(listings);
    const key = `${user.id}:${listing.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ user_id: user.id, listing_id: listing.id });
  }

  const { error } = await supabase.from('wishlists').insert(entries);
  if (error) console.error('Wishlists seed error:', error.message);
  else console.log('✓ Wishlists seeded:', entries.length);
};

// ─── Seed Sustainability Log ──────────────────────────────────
const seedSustainability = async (transactions, listings) => {
  console.log('Seeding sustainability log...');
  const completedTxns = transactions.filter(t => t.status === 'completed');
  const entries = completedTxns.map(t => {
    const listing = listings.find(l => l.id === t.listing_id);
    const category = listing?.category || 'tops';
    const map = CO2_MAP[category];
    return {
      transaction_id: t.id,
      category,
      co2_saved_kg:   map.co2,
      water_saved_l:  map.water,
    };
  });

  const { error } = await supabase.from('sustainability_log').insert(entries);
  if (error) console.error('Sustainability seed error:', error.message);
  else console.log('✓ Sustainability log seeded:', entries.length);
};

// ─── MAIN ─────────────────────────────────────────────────────
const seed = async () => {
  console.log('\n🌱 Starting seed...\n');
  try {
    const users        = await seedUsers();
    const listings     = await seedListings(users);
    const transactions = await seedTransactions(users, listings);
    await seedMessages(users, listings);
    await seedWishlists(users, listings);
    await seedSustainability(transactions, listings);
    console.log('\n✅ Seed complete!\n');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();

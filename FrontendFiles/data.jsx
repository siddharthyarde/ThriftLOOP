// data.jsx — sample listing data for the prototype
// All "photos" are placeholder tile descriptors: { variant, tone, label }

const PH_VARIANTS = ["ph-soft", "ph-warm", "ph-dots", "ph-stripes", "ph-grid", "ph"];

const sampleListings = [
  { id:"l1", title:"Wool-Blend Overcoat",       brand:"Uniqlo",      price:1899, size:"M",  city:"Mumbai",    cat:"Outerwear", grade:"A", gradeLabel:"Like New", swap:true,  rent:true,  rentPerDay:120, deposit:1500, views:412, saves:38, ph:"ph-soft"   },
  { id:"l2", title:"Vintage Denim Jacket",       brand:"Levi's",      price:1450, size:"L",  city:"Bengaluru", cat:"Outerwear", grade:"B", gradeLabel:"Good",     swap:true,  rent:false, views:289, saves:22, ph:"ph-warm" },
  { id:"l3", title:"Linen Wide-Leg Trousers",    brand:"H&M",         price:799,  size:"M",  city:"Delhi",     cat:"Bottoms",   grade:"A", gradeLabel:"Like New", swap:false, rent:false, views:201, saves:14, ph:"ph-dots"   },
  { id:"l4", title:"Cropped Knit Sweater",       brand:"Zara",        price:649,  size:"S",  city:"Pune",      cat:"Tops",      grade:"A", gradeLabel:"Like New", swap:true,  rent:false, views:512, saves:61, ph:"ph-soft"   },
  { id:"l5", title:"90s Graphic Tee — Tour",      brand:"Vintage",     price:899,  size:"L",  city:"Mumbai",    cat:"Tops",      grade:"B", gradeLabel:"Good",     swap:true,  rent:false, views:734, saves:88, ph:"ph-stripes"},
  { id:"l6", title:"Pleated Midi Skirt",         brand:"Mango",       price:599,  size:"S",  city:"Chennai",   cat:"Bottoms",   grade:"A", gradeLabel:"Like New", swap:false, rent:true,  rentPerDay:80,  deposit:900,  views:340, saves:29, ph:"ph-warm"   },
  { id:"l7", title:"Leather Crossbody Bag",      brand:"Coach",       price:2400, size:"-",  city:"Hyderabad", cat:"Accessories",grade:"B", gradeLabel:"Good",    swap:true,  rent:true,  rentPerDay:150, deposit:2500, views:611, saves:74, ph:"ph-grid"   },
  { id:"l8", title:"Embroidered Kurta Set",       brand:"Fabindia",    price:1799, size:"M",  city:"Jaipur",    cat:"Ethnic",    grade:"A", gradeLabel:"Like New", swap:false, rent:true,  rentPerDay:200, deposit:2000, views:228, saves:31, ph:"ph-soft"   },
  { id:"l9", title:"Chunky Platform Sneakers",   brand:"Nike",        price:2100, size:"9",  city:"Mumbai",    cat:"Shoes",     grade:"B", gradeLabel:"Good",     swap:true,  rent:false, views:489, saves:52, ph:"ph-stripes"},
  { id:"l10",title:"Oversized Flannel Shirt",    brand:"Pull&Bear",   price:549,  size:"L",  city:"Kolkata",   cat:"Tops",      grade:"B", gradeLabel:"Good",     swap:true,  rent:false, views:198, saves:17, ph:"ph-warm"   },
  { id:"l11",title:"Silk Slip Dress",            brand:"Aritzia",     price:1250, size:"S",  city:"Delhi",     cat:"Dresses",   grade:"A", gradeLabel:"Like New", swap:false, rent:true,  rentPerDay:180, deposit:1500, views:401, saves:44, ph:"ph-soft"   },
  { id:"l12",title:"Carpenter Cargo Pants",      brand:"Carhartt",    price:1399, size:"32", city:"Bengaluru", cat:"Bottoms",   grade:"B", gradeLabel:"Good",     swap:true,  rent:false, views:267, saves:23, ph:"ph-dots"   },
];

const categories = [
  { id:"all",     label:"Everything", count:12480, glyph:"all" },
  { id:"tops",    label:"Tops",        count:2840,  glyph:"top" },
  { id:"bottoms", label:"Bottoms",     count:1920,  glyph:"bot" },
  { id:"dresses", label:"Dresses",     count:1410,  glyph:"drs" },
  { id:"outer",   label:"Outerwear",   count:980,   glyph:"out" },
  { id:"shoes",   label:"Shoes",       count:1670,  glyph:"shz" },
  { id:"bags",    label:"Bags",        count:840,   glyph:"bag" },
  { id:"ethnic",  label:"Ethnic",      count:1120,  glyph:"eth" },
  { id:"acc",     label:"Accessories", count:1700,  glyph:"acc" },
];

const trustedSellers = [
  { name:"Aanya R.",   city:"Mumbai",    score:4.9, sales:142, ph:"ph-soft"  },
  { name:"Kabir M.",   city:"Bengaluru", score:4.8, sales:88,  ph:"ph-warm"  },
  { name:"Diya S.",    city:"Delhi",     score:4.95,sales:206, ph:"ph-dots"  },
  { name:"Rohan T.",   city:"Pune",      score:4.7, sales:64,  ph:"ph-stripes"},
];

const sampleSeller = {
  name: "Aanya R.",
  handle: "@aanya.thrifts",
  city: "Mumbai",
  score: 4.9,
  reviews: 142,
  sales: 142,
  verified: true,
  bio: "Curated drops every Sunday. Mostly Y2K, denim, and quiet luxury basics. Shipping pan-India.",
  ph: "ph-soft"
};

const sampleListingDetail = {
  ...sampleListings[0],
  description:
    "An oversized wool-blend overcoat with a relaxed drop shoulder and notched lapel. Pre-loved with one previous owner; lining and buttons are intact. Pairs well with knits, slip dresses, and tailored trousers. Originally bought at Uniqlo Mumbai in 2023.",
  gallery: ["ph-soft", "ph-warm", "ph-dots", "ph-stripes"],
  measurements: [
    { k: "Chest",      v: '44"' },
    { k: "Length",     v: '38"' },
    { k: "Shoulder",   v: '18"' },
    { k: "Sleeve",     v: '24"' },
  ],
};

window.thriftData = { sampleListings, categories, trustedSellers, sampleSeller, sampleListingDetail, PH_VARIANTS };

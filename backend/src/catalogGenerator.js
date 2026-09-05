// backend/src/catalogGenerator.js - Differentiated Multi-Storefront Catalog Generator
// Amazon India (Premium/Flagship/Prime), Flipkart (Gaming/Audio/Assured), Meesho (Factory Direct/Budget)

const AMAZON_EXCLUSIVE_TEMPLATES = [
  { name: "Apple 20W USB-C Power Adapter (iPhone 16 / 15 Fast Charger)", brand: "Apple", cat: "cables", basePrice: 1699, emoji: "⚡", specs: { wattage: "20W USB-C PD", compatibility: "iPhone 16 / 15 / 14 / iPad", warranty: "1 Year Official Apple" } },
  { name: "UGREEN 65W Nexode GaN Fast Charger 3-Port Wall Adapter", brand: "UGREEN", cat: "cables", basePrice: 999, emoji: "⚡", specs: { wattage: "65W GaN II", ports: "2x USB-C + 1x USB-A", compatibility: "iPhone, Mac, Android" } },
  { name: "LG 65W GaN Fast Charger 3-Port Wall Adapter", brand: "LG", cat: "cables", basePrice: 944, emoji: "⚡", specs: { wattage: "65W GaN III Pro", ports: "2x USB-C + 1x USB-A", protocols: "PD 3.0 / QC 4+" } },
  { name: "Anker 20W PowerPort III Nano Fast Charger for iPhone", brand: "Anker", cat: "cables", basePrice: 799, emoji: "⚡", specs: { wattage: "20W IQ3", size: "Compact Nano", compatibility: "iPhone & Android" } },
  { name: "Apple iPhone 16 Pro (128GB Desert Titanium)", brand: "Apple", cat: "mobiles", basePrice: 119900, emoji: "📱", specs: { chip: "A18 Pro", display: "6.3-inch Super Retina XDR", camera: "48MP Fusion" } },
  { name: "Keychron K2 V2 Wireless Mechanical Keyboard (RGB Brown)", brand: "Keychron", cat: "computers", basePrice: 7499, emoji: "⌨️", specs: { switches: "Gateron Brown", layout: "75% Compact", battery: "4000mAh" } },
  { name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones", brand: "Sony", cat: "electronics", basePrice: 26990, emoji: "🎧", specs: { anc: "Auto NC Optimizer", battery: "30 Hours", driver: "30mm Carbon" } },
  { name: "Logitech MX Master 3S Wireless Performance Mouse", brand: "Logitech", cat: "computers", basePrice: 8995, emoji: "🖱️", specs: { sensor: "8000 DPI Darkfield", scroll: "MagSpeed Electromagnetic", battery: "70 Days" } },
  { name: "Anker 737 Power Bank (PowerCore 24K 140W Output)", brand: "Anker", cat: "cables", basePrice: 10999, emoji: "🔋", specs: { capacity: "24,000mAh", output: "140W Two-Way Fast Charge", display: "Smart Digital Screen" } },
  { name: "SanDisk 2TB Extreme Portable SSD 1050MB/s USB-C", brand: "SanDisk", cat: "storage", basePrice: 13999, emoji: "💾", specs: { speed: "1050 MB/s", durability: "IP55 Water & Dust", interface: "USB 3.2 Gen 2" } },
  { name: "Apple MacBook Air M3 (13.6-inch Liquid Retina 16GB)", brand: "Apple", cat: "computers", basePrice: 114900, emoji: "💻", specs: { chip: "Apple M3 8-core", memory: "16GB Unified", storage: "512GB SSD" } },
  { name: "Amazon Echo Dot (5th Gen) Deep Bass Smart Speaker", brand: "Amazon", cat: "smarthome", basePrice: 4499, emoji: "🔊", specs: { voice: "Alexa Built-in", audio: "Clearer Vocals & Deeper Bass", sensors: "Motion & Temperature" } },
  { name: "Kindle Paperwhite (16GB Signature Edition Wireless Charging)", brand: "Amazon", cat: "electronics", basePrice: 14999, emoji: "📖", specs: { display: "6.8-inch 300 ppi", battery: "10 Weeks", light: "Auto-adjusting Warm Light" } },
  { name: "Logitech M330 Silent Plus Wireless Optical Mouse", brand: "Logitech", cat: "computers", basePrice: 799, emoji: "🖱️", specs: { dpi: "1000 DPI", noise_reduction: "90% Silent Click", battery: "24 Months" } }
];

const FLIPKART_EXCLUSIVE_TEMPLATES = [
  { name: "Cosmic Byte GS410 RGB Gaming Headset with Mic", brand: "Cosmic Byte", cat: "electronics", basePrice: 999, emoji: "🎧", specs: { audio: "7.1 Surround Sound", mic: "Flexible Boom Mic", cable: "3.5mm Braided" } },
  { name: "Cosmic Byte Equinox Europa 7.1 RGB Gaming Headphone", brand: "Cosmic Byte", cat: "electronics", basePrice: 1699, emoji: "🎧", specs: { audio: "Dolby Virtual 7.1", mic: "ENC Noise Cancel", drivers: "50mm Neodymium" } },
  { name: "Cosmic Byte CB-GK-16 Firefly Tenkeyless Mechanical Keyboard", brand: "Cosmic Byte", cat: "computers", basePrice: 1999, emoji: "⌨️", specs: { switches: "Outemu Blue Clicky", lighting: "RGB 16.8M", layout: "Tenkeyless" } },
  { name: "Zebronics Zeb-Juke Bar 9500WS Pro Dolby 5.1 Soundbar 525W", brand: "Zebronics", cat: "electronics", basePrice: 11999, emoji: "🔊", specs: { output: "525W RMS", sub: "Wireless Subwoofer", audio: "Dolby Audio 5.1" } },
  { name: "Acer Nitro V15 Gaming Laptop (13th Gen Intel Core i5 + RTX 4050)", brand: "Acer", cat: "computers", basePrice: 69990, emoji: "💻", specs: { gpu: "NVIDIA RTX 4050 6GB", screen: "15.6-inch 144Hz FHD", ram: "16GB DDR5" } },
  { name: "Realme GT 6T 5G (8GB RAM + 256GB Fluid Display)", brand: "Realme", cat: "mobiles", basePrice: 30999, emoji: "📱", specs: { processor: "Snapdragon 7+ Gen 3", display: "6000 nits Ultra Bright", charging: "120W SUPERVOOC" } },
  { name: "Noise ColorFit Pro 5 Max AMOLED Bluetooth Calling Smartwatch", brand: "Noise", cat: "wearables", basePrice: 2999, emoji: "⌚", specs: { display: "1.96-inch AMOLED", calling: "Tru Sync BT Calling", health: "Noise Health Suite" } },
  { name: "Boat Stone 1200 14W Portable RGB Bluetooth Speaker", brand: "Boat", cat: "electronics", basePrice: 2799, emoji: "🔊", specs: { power: "14W RMS", battery: "9 Hours", rgb: "Dynamic LEDs" } },
  { name: "Redragon M601 RGB Centrophorus Ergonomic Gaming Mouse", brand: "Redragon", cat: "computers", basePrice: 899, emoji: "🖱️", specs: { dpi: "3200 DPI", weights: "8-piece Tuning Set", buttons: "6 Programmable" } },
  { name: "Boat Airdopes 141 True Wireless Earbuds with 42H Playtime", brand: "Boat", cat: "electronics", basePrice: 1299, emoji: "🎵", specs: { playback: "42 Hours", drivers: "8mm Dynamic", water: "IPX4" } }
];

const MEESHO_EXCLUSIVE_TEMPLATES = [
  { name: "Factory Direct Silent Slim Optical Mouse (Rechargeable)", brand: "Factory Direct", cat: "computers", basePrice: 299, emoji: "🖱️", specs: { dpi: "1600 DPI", connection: "2.4GHz USB Nano", battery: "Built-in Lithium" } },
  { name: "Ubon Wireless Bluetooth Neckband Earphones with 30-Hr Battery", brand: "Ubon", cat: "electronics", basePrice: 349, emoji: "🎵", specs: { playback: "30 Hours", bass: "Dynamic Deep Bass", bluetooth: "v5.2" } },
  { name: "Adjustable Foldable Aluminum Mobile Phone & Tablet Desk Stand", brand: "Direct Supply", cat: "accessories", basePrice: 129, emoji: "📱", specs: { material: "Anti-skid Alloy", compatibility: "4-11 inch", angle: "270 Degree Rotatable" } },
  { name: "Portronics 3-in-1 Fast Charging Braided Cable (Type-C + Micro + Lightning)", brand: "Portronics", cat: "cables", basePrice: 149, emoji: "⚡", specs: { current: "3.5A Max", length: "1.2 Meters", durability: "Tangle Free Nylon" } },
  { name: "Mini USB Rechargeable 3-Speed Portable Silent Desk Fan", brand: "Direct Supply", cat: "electronics", basePrice: 219, emoji: "💨", specs: { speeds: "3 Level Airflow", battery: "1200mAh", power: "Micro-USB" } },
  { name: "Gizmore Digital Sports LED Water-Resistant Wrist Watch", brand: "Gizmore", cat: "wearables", basePrice: 189, emoji: "⌚", specs: { display: "LED Night Glow", strap: "Silicone Anti-sweat", water: "30M Waterproof" } },
  { name: "Universal 360-Degree Flexible Phone Tripod with Wireless Bluetooth Shutter", brand: "Direct Supply", cat: "accessories", basePrice: 199, emoji: "📷", specs: { mount: "Universal Phone Holder", legs: "Octopus Grip", remote: "BT 10M Range" } },
  { name: "RGB Extended Gaming Mousepad with 14 LED Light Modes (800x300mm)", brand: "Direct Supply", cat: "computers", basePrice: 389, emoji: "⬛", specs: { size: "800x300x4mm", lighting: "14 Spectrum Modes", base: "Non-slip Natural Rubber" } },
  { name: "Clip-on Collar Lavalier Lapel Microphone (3.5mm Jack)", brand: "Direct Supply", cat: "electronics", basePrice: 119, emoji: "🎙️", specs: { pickup: "Omnidirectional", cable: "1.5m Shielded", usage: "Recording & Streaming" } },
  { name: "USB-C to 3.5mm Headphone Jack DAC Audio Dongle Adapter", brand: "Direct Supply", cat: "cables", basePrice: 99, emoji: "🔌", specs: { chip: "Hi-Res DAC", compatibility: "Type-C Android/iPad", build: "Aluminum Shell" } },
  { name: "Ambrane 10,000mAh Compact Slim Power Bank (12W Fast Charge)", brand: "Ambrane", cat: "cables", basePrice: 599, emoji: "🔋", specs: { capacity: "10,000mAh", output: "Dual USB Output", body: "Pocket Slim Design" } },
  { name: "Bluetooth 5.0 Wireless Sleep Mask with Built-in HD Stereo Speakers", brand: "Direct Supply", cat: "electronics", basePrice: 449, emoji: "🎧", specs: { material: "Ultra Soft Velvet", battery: "10 Hours Playtime", washable: "Removable Module" } }
];

const GENERIC_TEMPLATES = [
  { prefix: "Mechanical Keyboard RGB Backlit", cat: "computers", basePrice: 1499, emoji: "⌨️", specs: { layout: "Tenkeyless", switches: "Mechanical", rgb: "Multi-Zone" } },
  { prefix: "Wireless Optical Productivity Mouse", cat: "computers", basePrice: 499, emoji: "🖱️", specs: { dpi: "1600 DPI", battery: "12 Months", range: "10 Meters" } },
  { prefix: "True Wireless Stereo Earbuds", cat: "electronics", basePrice: 899, emoji: "🎵", specs: { drivers: "10mm", battery: "24 Hours Total", bluetooth: "v5.3" } },
  { prefix: "Fast Charging Type-C Cable (2m Braided)", cat: "cables", basePrice: 199, emoji: "⚡", specs: { rating: "65W Fast Charge", length: "2 Meters", weave: "Braided Nylon" } },
  { prefix: "Multiport USB 3.0 Hub Adapter", cat: "computers", basePrice: 699, emoji: "🔌", specs: { ports: "4x USB 3.0", speed: "5 Gbps", casing: "Aluminum" } },
  { prefix: "Compact 10000mAh Slim Power Bank", cat: "cables", basePrice: 799, emoji: "🔋", specs: { capacity: "10000 mAh", ports: "Dual USB", safety: "Multi-protection" } },
  { prefix: "Bluetooth Smart Fitness Tracker Band", cat: "wearables", basePrice: 999, emoji: "⌚", specs: { heart_rate: "24/7 Monitor", battery: "10 Days", water: "IP68" } },
  { prefix: "Ergonomic Memory Foam Mouse Pad with Wrist Rest", cat: "accessories", basePrice: 199, emoji: "⬛", specs: { foam: "Memory Foam", base: "Anti-slip PU", size: "230x210mm" } }
];

function buildStoreCatalog(storeType, storeName, exclusiveTemplates, itemCount = 500) {
  const products = [];
  let idCounter = 1;

  const prefixMap = {
    amazon: 'amz',
    flipkart: 'fk',
    meesho: 'msh'
  };
  const prefix = prefixMap[storeType] || 'prod';

  // 1. Add exclusive tailored products
  for (const item of exclusiveTemplates) {
    const isAmz = storeType === 'amazon';
    const isFk = storeType === 'flipkart';
    const isMsh = storeType === 'meesho';

    let mrpMultiplier = isMsh ? 2.2 : (isAmz ? 1.25 : 1.35);
    const mrp = Math.round(item.basePrice * mrpMultiplier);
    const discountPct = Math.round(((mrp - item.basePrice) / mrp) * 100);

    let badge = isAmz ? "#1 Best Seller" : (isFk ? "Flipkart Assured ✦" : "Direct Factory Rate 🏷️");
    let deliveryText = isAmz 
      ? "FREE Delivery by Tomorrow for Prime" 
      : (isFk ? "Free Express Delivery with SuperCoins" : "Factory Direct Free Shipping (3-4 Days)");

    products.push({
      id: `${prefix}_prod_${String(idCounter).padStart(4, '0')}`,
      name: item.name,
      brand: item.brand,
      category: item.cat,
      price: item.basePrice,
      mrp: mrp,
      discount_pct: discountPct,
      rating: isMsh ? 4.5 : (isAmz ? 4.8 : 4.6),
      review_count: isMsh ? 8400 : (isAmz ? 34200 : 21800),
      stock: 40 + (idCounter % 50),
      image: item.emoji,
      badge: badge,
      is_prime: isAmz,
      is_assured: isFk,
      is_meesho_direct: isMsh,
      delivery_text: deliveryText,
      specs: item.specs,
      description: `${storeName} verified: ${item.name} with authentic merchant warranty, 0-OTP AP2 payment support, and direct fulfillment.`
    });
    idCounter++;
  }

  // 2. Add remaining variations
  const targetCount = itemCount;
  for (let i = 0; products.length < targetCount; i++) {
    const tmpl = GENERIC_TEMPLATES[i % GENERIC_TEMPLATES.length];
    const isAmz = storeType === 'amazon';
    const isFk = storeType === 'flipkart';
    const isMsh = storeType === 'meesho';

    // Tailored price multiplier based on store positioning
    let priceScale = isMsh ? 0.65 : (isAmz ? 1.05 : 0.95);
    const price = Math.max(79, Math.round(tmpl.basePrice * priceScale + ((i % 7) * 20) - 40));
    const mrp = Math.round(price * (isMsh ? 2.0 : 1.3));
    const discountPct = Math.round(((mrp - price) / mrp) * 100);

    let brand = isMsh ? "Direct Supplier" : (isAmz ? (i % 2 === 0 ? "Logitech" : "Anker") : (i % 2 === 0 ? "Cosmic Byte" : "Zebronics"));
    let badge = isMsh ? "Factory Deal" : (isAmz ? "Prime Verified" : "Assured Quality");
    let deliveryText = isAmz 
      ? "FREE 1-Day Prime Delivery" 
      : (isFk ? "Express Delivery" : "Free Direct Delivery");

    products.push({
      id: `${prefix}_prod_${String(idCounter).padStart(4, '0')}`,
      name: `${brand} ${tmpl.prefix} (Model ${idCounter})`,
      brand: brand,
      category: tmpl.cat,
      price: price,
      mrp: mrp,
      discount_pct: discountPct,
      rating: parseFloat((4.1 + (i % 9) * 0.1).toFixed(1)),
      review_count: 50 + (i * 37) % 5000,
      stock: 15 + (i % 80),
      image: tmpl.emoji,
      badge: badge,
      is_prime: isAmz,
      is_assured: isFk,
      is_meesho_direct: isMsh,
      delivery_text: deliveryText,
      specs: tmpl.specs,
      description: `${storeName} item: ${brand} ${tmpl.prefix} with standard warranty and AP2 0-OTP settlement.`
    });
    idCounter++;
  }

  return products;
}

export const AMAZON_CATALOG = buildStoreCatalog('amazon', 'Amazon India', AMAZON_EXCLUSIVE_TEMPLATES, 500);
export const FLIPKART_CATALOG = buildStoreCatalog('flipkart', 'Flipkart Assured', FLIPKART_EXCLUSIVE_TEMPLATES, 500);
export const MEESHO_CATALOG = buildStoreCatalog('meesho', 'Meesho Direct', MEESHO_EXCLUSIVE_TEMPLATES, 500);

export function getAmazonCatalog(options = {}) {
  return filterAndPaginateCatalog(AMAZON_CATALOG, options);
}

export function getFlipkartCatalog(options = {}) {
  return filterAndPaginateCatalog(FLIPKART_CATALOG, options);
}

export function getMeeshoCatalog(options = {}) {
  return filterAndPaginateCatalog(MEESHO_CATALOG, options);
}

export function filterAndPaginateCatalog(catalog, {
  category = 'all',
  query = '',
  minPrice = 0,
  maxPrice = Infinity,
  page = 1,
  limit = 24,
  sort = 'popular'
} = {}) {
  let filtered = catalog;

  // 1. Filter Category
  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  // 2. Filter Search Query
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    );
  }

  // 3. Filter Price Range
  if (minPrice || maxPrice) {
    filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);
  }

  // 4. Sort
  if (sort === 'price_asc') {
    filtered = filtered.slice().sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    filtered = filtered.slice().sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    filtered = filtered.slice().sort((a, b) => b.rating - a.rating);
  }

  // 5. Paginate
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const paginatedProducts = filtered.slice(startIndex, startIndex + limit);

  return {
    total,
    page: currentPage,
    totalPages,
    limit,
    count: paginatedProducts.length,
    products: paginatedProducts
  };
}

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialiser Firebase Admin
admin.initializeApp();

const db = admin.database();

// Middleware de vérification de la clé API
async function verifyApiKey(req, res, next) {
  let apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.query.api_key;

  // Autoriser les requêtes depuis GitHub Pages
  const referer = req.headers.referer || '';
  const origin = req.headers.origin || '';
  const isGitHubPages = referer.includes('github.io') || origin.includes('github.io');

  if (isGitHubPages) {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }

  try {
    const snapshot = await db.ref(`api_keys/${apiKey}`).once('value');

    if (!snapshot.exists()) {
      return res.status(403).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    const keyData = snapshot.val();

    if (!keyData.isActive) {
      return res.status(403).json({
        success: false,
        error: 'API key deactivated',
        code: 'API_KEY_DEACTIVATED'
      });
    }

    if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
      return res.status(403).json({
        success: false,
        error: 'API key expired',
        code: 'API_KEY_EXPIRED'
      });
    }

    // Vérifier la limite quotidienne
    const today = new Date().toISOString().split('T')[0];
    if (keyData.lastReset !== today) {
      await db.ref(`api_keys/${apiKey}`).update({
        dailyUsage: 0,
        lastReset: today
      });
    } else if (keyData.dailyUsage >= 1000) {
      return res.status(429).json({
        success: false,
        error: 'Daily limit exceeded',
        code: 'DAILY_LIMIT_EXCEEDED'
      });
    }

    // Incrémenter le compteur
    await db.ref(`api_keys/${apiKey}/dailyUsage`).transaction((count) => {
      return (count || 0) + 1;
    });

    await db.ref(`api_keys/${apiKey}`).update({
      lastUsed: Date.now()
    });

    // Headers CORS et RateLimit
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
      'X-RateLimit-Limit': '1000',
      'X-RateLimit-Remaining': String(1000 - ((keyData.dailyUsage || 0) + 1))
    });

    req.apiKeyData = keyData;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Middleware CORS
function enableCors(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  next();
}

// GET /api/food - Liste des aliments
exports.api = functions.https.onRequest(enableCors, async (req, res) => {
  const path = req.path.replace(/^\/api/, '');
  const method = req.method;

  try {
    if (path === '/food' && method === 'GET') {
      return await listFood(req, res);
    } else if (path.match(/^\/food\/([^\/]+)$/) && method === 'GET') {
      return await getFoodItem(req, res);
    } else if (path === '/food/search' && method === 'GET') {
      return await searchFood(req, res);
    } else if (path === '/food/category' && method === 'GET') {
      return await getFoodByCategory(req, res);
    } else if (path === '/categories' && method === 'GET') {
      return await listCategories(req, res);
    } else if (path === '/stats' && method === 'GET') {
      return await getStats(req, res);
    } else {
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/food - Liste des aliments
async function listFood(req, res) {
  await verifyApiKey(req, res, () => {});

  const { limit = 100, offset = 0, group, subgroup } = req.query;
  const foodRef = db.ref('food_data');
  const snapshot = await foodRef.once('value');

  let foodItems = [];
  snapshot.forEach((childSnapshot) => {
    foodItems.push({ id: childSnapshot.key, ...childSnapshot.val() });
  });

  if (group || subgroup) {
    foodItems = foodItems.filter(item => {
      if (group && item.categories && item.categories.group_code !== group) return false;
      if (subgroup && item.categories && item.categories.subgroup_code !== subgroup) return false;
      return true;
    });
  }

  const limitNum = Math.min(parseInt(limit) || 100, 1000);
  const offsetNum = parseInt(offset) || 0;
  const paginatedItems = foodItems.slice(offsetNum, offsetNum + limitNum);

  res.json({
    success: true,
    items: paginatedItems,
    total: foodItems.length,
    limit: limitNum,
    offset: offsetNum
  });
}

// GET /api/food/{id} - Aliment spécifique
async function getFoodItem(req, res) {
  await verifyApiKey(req, res, () => {});

  const foodId = req.path.split('/')[2];
  if (!foodId) {
    return res.status(400).json({ success: false, error: 'Food ID required' });
  }

  const foodRef = db.ref(`food_data/${foodId}`);
  const snapshot = await foodRef.once('value');

  if (!snapshot.exists()) {
    return res.status(404).json({ success: false, error: 'Food item not found' });
  }

  res.json({ success: true, item: { id: snapshot.key, ...snapshot.val() } });
}

// GET /api/food/search - Recherche
async function searchFood(req, res) {
  await verifyApiKey(req, res, () => {});

  const { q: query, limit = 50 } = req.query;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Search query required' });
  }

  const foodRef = db.ref('food_data');
  const snapshot = await foodRef.once('value');
  const queryLower = query.toLowerCase();
  const results = [];

  snapshot.forEach((childSnapshot) => {
    const item = { id: childSnapshot.key, ...childSnapshot.val() };
    if (item.names && item.names.fr && item.names.fr.toLowerCase().includes(queryLower)) {
      results.push(item);
    }
  });

  const limitNum = Math.min(parseInt(limit) || 50, 100);
  res.json({ success: true, items: results.slice(0, limitNum), total: results.length, query });
}

// GET /api/food/category - Filtre par catégorie
async function getFoodByCategory(req, res) {
  await verifyApiKey(req, res, () => {});

  const { group, subgroup, limit = 100 } = req.query;
  if (!group && !subgroup) {
    return res.status(400).json({ success: false, error: 'At least one filter parameter required' });
  }

  const foodRef = db.ref('food_data');
  const snapshot = await foodRef.once('value');
  const results = [];

  snapshot.forEach((childSnapshot) => {
    const item = { id: childSnapshot.key, ...childSnapshot.val() };
    if (group && item.categories && item.categories.group_code !== group) return;
    if (subgroup && item.categories && item.categories.subgroup_code !== subgroup) return;
    results.push(item);
  });

  const limitNum = Math.min(parseInt(limit) || 100, 1000);
  res.json({ success: true, items: results.slice(0, limitNum), total: results.length });
}

// GET /api/categories - Liste des catégories
async function listCategories(req, res) {
  await verifyApiKey(req, res, () => {});

  const foodRef = db.ref('food_data');
  const snapshot = await foodRef.once('value');
  const categories = new Set();
  const subgroups = new Map();

  snapshot.forEach((childSnapshot) => {
    const item = childSnapshot.val();
    if (item.categories) {
      const groupCode = item.categories.group_code;
      const groupName = item.categories.group_name || `Groupe ${groupCode}`;
      categories.add({ code: groupCode, name: groupName });

      const subgroupCode = item.categories.subgroup_code;
      const subgroupName = item.categories.subgroup_name || `Sous-groupe ${subgroupCode}`;

      if (!subgroups.has(groupCode)) {
        subgroups.set(groupCode, []);
      }
      subgroups.get(groupCode).push({ code: subgroupCode, name: subgroupName });
    }
  });

  res.json({
    success: true,
    groups: Array.from(categories).sort((a, b) => a.code.localeCompare(b.code)),
    subgroups: Object.fromEntries(subgroups)
  });
}

// GET /api/stats - Statistiques
async function getStats(req, res) {
  await verifyApiKey(req, res, () => {});

  const foodRef = db.ref('food_data');
  const snapshot = await foodRef.once('value');
  const totalFoodItems = snapshot.numChildren();
  const groupCounts = {};

  snapshot.forEach((childSnapshot) => {
    const item = childSnapshot.val();
    if (item.categories && item.categories.group_code) {
      const groupCode = item.categories.group_code;
      groupCounts[groupCode] = (groupCounts[groupCode] || 0) + 1;
    }
  });

  res.json({ success: true, totalFoodItems, groups: groupCounts });
}

// Wikimind Food API - Cloud Functions
// Ces fonctions doivent être déployées sur Firebase pour fournir les endpoints API

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialiser Firebase Admin
admin.initializeApp();

const db = admin.database();

// ========== MIDDLEWARE ==========

// Middleware de vérification de la clé API
async function verifyApiKey(req, res, next) {
  // Récupérer la clé API depuis les headers ou les paramètres
  let apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.query.api_key;
  
  // Pour les requêtes depuis GitHub Pages, on peut autoriser sans clé
  const referer = req.headers.referer || '';
  const origin = req.headers.origin || '';
  const isGitHubPages = referer.includes('github.io') || origin.includes('github.io');
  
  // Si c'est une requête depuis GitHub Pages, on peut sauter la vérification
  // (à adapter selon votre configuration)
  if (isGitHubPages) {
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY',
      message: 'Veuillez fournir une clé API dans les headers (X-API-Key) ou en paramètre (api_key)'
    });
  }
  
  try {
    // Vérifier la clé dans Firebase
    const snapshot = await db.ref(`api_keys/${apiKey}`).once('value');
    
    if (!snapshot.exists()) {
      return res.status(403).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
        message: 'La clé API fournie est invalide'
      });
    }
    
    const keyData = snapshot.val();
    
    // Vérifier si la clé est active
    if (!keyData.isActive) {
      return res.status(403).json({
        error: 'API key deactivated',
        code: 'API_KEY_DEACTIVATED',
        message: 'Cette clé API a été désactivée'
      });
    }
    
    // Vérifier la date d'expiration
    if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
      return res.status(403).json({
        error: 'API key expired',
        code: 'API_KEY_EXPIRED',
        message: 'Cette clé API a expiré'
      });
    }
    
    // Vérifier la limite quotidienne
    const today = new Date().toISOString().split('T')[0];
    if (keyData.lastReset !== today) {
      // Reset du compteur
      await db.ref(`api_keys/${apiKey}`).update({
        dailyUsage: 0,
        lastReset: today
      });
    } else if (keyData.dailyUsage >= 1000) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        code: 'DAILY_LIMIT_EXCEEDED',
        message: 'Limite quotidienne de 1000 requêtes dépassée pour cette clé API'
      });
    }
    
    // Incrémenter le compteur d'utilisation
    await db.ref(`api_keys/${apiKey}/dailyUsage`).transaction((count) => {
      return (count || 0) + 1;
    });
    
    // Mettre à jour la date de dernière utilisation
    await db.ref(`api_keys/${apiKey}`).update({
      lastUsed: Date.now()
    });
    
    // Ajouter les infos de la clé à la requête
    req.apiKeyData = keyData;
    req.apiKey = apiKey;
    
    // Ajouter les headers de limite
    res.set({
      'X-RateLimit-Limit': '1000',
      'X-RateLimit-Remaining': String(1000 - ((keyData.dailyUsage || 0) + 1)),
      'X-RateLimit-Reset': String(86400 - (Date.now() % 86400))
    });
    
    next();
  } catch (error) {
    console.error('Error verifying API key:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue'
    });
  }
}

// Middleware pour CORS
function enableCors(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
  } else {
    next();
  }
}

// ========== ENDPOINTS API ==========

// GET /api/food - Liste des aliments
exports.listFood = functions.https.onRequest(enableCors, verifyApiKey, async (req, res) => {
  try {
    // Récupérer les paramètres
    const { limit = 100, offset = 0, group, subgroup } = req.query;
    
    const foodRef = db.ref('food_data');
    const snapshot = await foodRef.once('value');
    
    let foodItems = [];
    snapshot.forEach((childSnapshot) => {
      foodItems.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    // Filtrer par catégorie si nécessaire
    if (group || subgroup) {
      foodItems = foodItems.filter(item => {
        if (group && item.categories && item.categories.group_code !== group) return false;
        if (subgroup && item.categories && item.categories.subgroup_code !== subgroup) return false;
        return true;
      });
    }
    
    // Pagination
    const limitNum = Math.min(parseInt(limit) || 100, 1000); // Limite max de 1000
    const offsetNum = parseInt(offset) || 0;
    const paginatedItems = foodItems.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      items: paginatedItems,
      total: foodItems.length,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error listing food items:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/food/:id - Aliment spécifique
exports.getFoodItem = functions.https.onRequest(enableCors, verifyApiKey, async (req, res) => {
  try {
    const foodId = req.params.id || req.query.id;
    
    if (!foodId) {
      return res.status(400).json({
        success: false,
        error: 'Food ID required',
        code: 'MISSING_FOOD_ID'
      });
    }
    
    const foodRef = db.ref(`food_data/${foodId}`);
    const snapshot = await foodRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Food item not found',
        code: 'FOOD_NOT_FOUND'
      });
    }
    
    const foodItem = {
      id: snapshot.key,
      ...snapshot.val()
    };
    
    res.json({
      success: true,
      item: foodItem
    });
  } catch (error) {
    console.error('Error getting food item:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/food/search - Recherche d'aliments
exports.searchFood = functions.https.onRequest(enableCors, verifyApiKey, async (req, res) => {
  try {
    const { q: query, limit = 50 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        code: 'MISSING_SEARCH_QUERY'
      });
    }
    
    const foodRef = db.ref('food_data');
    const snapshot = await foodRef.once('value');
    
    const queryLower = query.toLowerCase();
    const results = [];
    
    snapshot.forEach((childSnapshot) => {
      const item = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      };
      
      // Rechercher dans les noms
      if (item.names && item.names.fr && item.names.fr.toLowerCase().includes(queryLower)) {
        results.push(item);
      }
      // Rechercher dans la description si elle existe
      else if (item.description && item.description.toLowerCase().includes(queryLower)) {
        results.push(item);
      }
      // Rechercher dans les catégories
      else if (item.categories && (
        (item.categories.group_name && item.categories.group_name.toLowerCase().includes(queryLower)) ||
        (item.categories.subgroup_name && item.categories.subgroup_name.toLowerCase().includes(queryLower))
      )) {
        results.push(item);
      }
    });
    
    // Limiter les résultats
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const paginatedResults = results.slice(0, limitNum);
    
    res.json({
      success: true,
      items: paginatedResults,
      total: results.length,
      query: query
    });
  } catch (error) {
    console.error('Error searching food items:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/food/category - Filtrer par catégorie
exports.getFoodByCategory = functions.https.onRequest(enableCors, verifyApiKey, async (req, res) => {
  try {
    const { group, subgroup, limit = 100 } = req.query;
    
    if (!group && !subgroup) {
      return res.status(400).json({
        success: false,
        error: 'At least one filter parameter required (group or subgroup)',
        code: 'MISSING_FILTER_PARAMETERS'
      });
    }
    
    const foodRef = db.ref('food_data');
    const snapshot = await foodRef.once('value');
    
    const results = [];
    
    snapshot.forEach((childSnapshot) => {
      const item = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      };
      
      if (group && item.categories && item.categories.group_code !== group) return;
      if (subgroup && item.categories && item.categories.subgroup_code !== subgroup) return;
      
      results.push(item);
    });
    
    // Limiter les résultats
    const limitNum = Math.min(parseInt(limit) || 100, 1000);
    const paginatedResults = results.slice(0, limitNum);
    
    res.json({
      success: true,
      items: paginatedResults,
      total: results.length
    });
  } catch (error) {
    console.error('Error filtering food by category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/categories - Liste des catégories disponibles
exports.listCategories = functions.https.onRequest(enableCors, verifyApiKey, async (req, res) => {
  try {
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
        subgroups.get(groupCode).push({
          code: subgroupCode,
          name: subgroupName
        });
      }
    });
    
    res.json({
      success: true,
      groups: Array.from(categories).sort((a, b) => a.code.localeCompare(b.code)),
      subgroups: Object.fromEntries(subgroups)
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/stats - Statistiques générales
exports.getStats = functions.https.onRequest(enableCors, verifyApiKey, async (req, res) => {
  try {
    const foodRef = db.ref('food_data');
    const snapshot = await foodRef.once('value');
    
    const totalFoodItems = snapshot.numChildren();
    
    // Compter par groupe
    const groupCounts = {};
    snapshot.forEach((childSnapshot) => {
      const item = childSnapshot.val();
      if (item.categories && item.categories.group_code) {
        const groupCode = item.categories.group_code;
        groupCounts[groupCode] = (groupCounts[groupCode] || 0) + 1;
      }
    });
    
    res.json({
      success: true,
      totalFoodItems,
      groups: groupCounts
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ========== ENDPOINTS DE GESTION DES CLÉS API ==========

// GET /api/keys - Lister les clés API de l'utilisateur (nécessite auth Firebase)
exports.listUserApiKeys = functions.https.onRequest(enableCors, async (req, res) => {
  try {
    // Vérifier l'authentification Firebase
    const user = req.headers.authorization ? await verifyFirebaseToken(req.headers.authorization) : null;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const apiKeysRef = db.ref('api_keys');
    const snapshot = await apiKeysRef.orderByChild('userId').equalTo(user.uid).once('value');
    
    const keys = [];
    snapshot.forEach((childSnapshot) => {
      keys.push({
        key: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    // Trier par date de création
    keys.sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({
      success: true,
      keys: keys.map(key => ({
        key: key.key,
        name: key.name,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        dailyUsage: key.dailyUsage
      }))
    });
  } catch (error) {
    console.error('Error listing user API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/keys - Créer une nouvelle clé API (nécessite auth Firebase)
exports.createApiKey = functions.https.onRequest(enableCors, async (req, res) => {
  try {
    // Vérifier l'authentification Firebase
    const user = req.headers.authorization ? await verifyFirebaseToken(req.headers.authorization) : null;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const { name, expiresInDays } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
        code: 'MISSING_NAME'
      });
    }
    
    // Générer une clé unique
    const prefix = 'wm-fd';
    let apiKey;
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 100) {
      attempts++;
      const randomPart = String(Math.floor(10000000 + Math.random() * 90000000));
      apiKey = prefix + randomPart;
      
      const snapshot = await db.ref(`api_keys/${apiKey}`).once('value');
      exists = snapshot.exists();
    }
    
    if (exists) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate unique API key',
        code: 'KEY_GENERATION_FAILED'
      });
    }
    
    // Calculer la date d'expiration
    let expiresAt = null;
    if (expiresInDays && expiresInDays !== 'unlimited') {
      expiresAt = Date.now() + (parseInt(expiresInDays) * 24 * 60 * 60 * 1000);
    }
    
    // Créer la clé
    const apiKeyData = {
      userId: user.uid,
      name: name,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      isActive: true,
      dailyUsage: 0,
      lastReset: new Date().toISOString().split('T')[0],
      lastUsed: null
    };
    
    await db.ref(`api_keys/${apiKey}`).set(apiKeyData);
    
    // Ajouter à la liste de l'utilisateur
    await db.ref(`users/${user.uid}/apiKeys`).push(apiKey);
    
    res.status(201).json({
      success: true,
      key: apiKey,
      ...apiKeyData
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/keys/:keyId - Supprimer une clé API (nécessite auth Firebase)
exports.deleteApiKey = functions.https.onRequest(enableCors, async (req, res) => {
  try {
    // Vérifier l'authentification Firebase
    const user = req.headers.authorization ? await verifyFirebaseToken(req.headers.authorization) : null;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const apiKey = req.params.keyId || req.query.keyId;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required',
        code: 'MISSING_API_KEY'
      });
    }
    
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    const snapshot = await apiKeyRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
    }
    
    const keyData = snapshot.val();
    
    // Vérifier que la clé appartient à l'utilisateur
    if (keyData.userId !== user.uid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Marquer comme inactive
    await apiKeyRef.update({
      isActive: false,
      revokedAt: Date.now()
    });
    
    // Retirer de la liste de l'utilisateur
    const userApiKeysRef = db.ref(`users/${user.uid}/apiKeys`);
    const userKeysSnapshot = await userApiKeysRef.once('value');
    
    if (userKeysSnapshot.exists()) {
      const userKeys = userKeysSnapshot.val();
      const keyIndex = Object.values(userKeys).indexOf(apiKey);
      
      if (keyIndex > -1) {
        const keyToRemove = Object.keys(userKeys)[keyIndex];
        await userApiKeysRef.child(keyToRemove).remove();
      }
    }
    
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ========== UTILITY FUNCTIONS ==========

// Vérifier un token Firebase ID Token
async function verifyFirebaseToken(idToken) {
  try {
    if (!idToken || !idToken.startsWith('Bearer ')) {
      return null;
    }
    
    const token = idToken.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

// Exporter toutes les fonctions
module.exports = {
  listFood,
  getFoodItem,
  searchFood,
  getFoodByCategory,
  listCategories,
  getStats,
  listUserApiKeys,
  createApiKey,
  deleteApiKey
};

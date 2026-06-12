const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

// Database reference
const db = admin.database();

// Food data (in a real app, this would be loaded from a file or database)
let foodData = [];

// Load food data from JSON file
try {
    // In a real deployment, you would load this from a file
    // For now, we'll use a simplified version
    foodData = require('./food-data.json');
} catch (error) {
    console.error('Error loading food data:', error);
    foodData = [];
}

// API Key prefix
const API_KEY_PREFIX = 'wm-fd';

// Validate API Key middleware
const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'MISSING_API_KEY',
                message: 'Clé API manquante'
            },
            timestamp: new Date().toISOString()
        });
    }

    if (!apiKey.startsWith(API_KEY_PREFIX)) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_API_KEY_FORMAT',
                message: 'Format de clé API invalide'
            },
            timestamp: new Date().toISOString()
        });
    }

    try {
        const snapshot = await db.ref('apiKeys').once('value');
        const apiKeys = snapshot.val();

        const validKey = Object.values(apiKeys || {}).find(key =>
            key.key === apiKey && key.isActive
        );

        if (!validKey) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_API_KEY',
                    message: 'Clé API invalide ou expirée'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Check if key is expired
        if (validKey.expiresAt && new Date(validKey.expiresAt) < new Date()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'API_KEY_EXPIRED',
                    message: 'Clé API expirée'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Update last used and request count
        await db.ref(`apiKeys/${validKey.id}`).update({
            lastUsedAt: new Date().toISOString(),
            requestCount: (validKey.requestCount || 0) + 1
        });

        // Attach user info to request
        req.apiKeyData = validKey;
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erreur interne lors de la validation de la clé API'
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Rate limiting middleware
const rateLimiter = (limit = 100, windowMs = 60000) => {
    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();

        // Clean up old requests
        for (const [key, timestamp] of requests.entries()) {
            if (now - timestamp > windowMs) {
                requests.delete(key);
            }
        }

        // Check if limit exceeded
        const userRequests = Array.from(requests.keys()).filter(key =>
            key.startsWith(`${ip}:`)
        ).length;

        if (userRequests >= limit) {
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Limite de requêtes dépassée. Veuillez patienter ${Math.ceil(windowMs / 1000 / 60)} minutes.`,
                    retryAfter: Math.ceil(windowMs / 1000)
                },
                timestamp: new Date().toISOString()
            });
        }

        // Add current request
        requests.set(`${ip}:${now}`, now);
        next();
    };
};

// Search food endpoint
exports.searchFood = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Validate API key
            await validateApiKey(req, res, () => {});

            const { query, limit = 10, language = 'fr' } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_QUERY',
                        message: 'Paramètre de recherche manquant'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // Limit results
            const limitNum = Math.min(parseInt(limit), 50);
            const results = [];

            // Search in food data
            for (const food of foodData) {
                if (results.length >= limitNum) break;

                // Check if query matches name or ID
                const nameMatch = food.names?.[language]?.toLowerCase().includes(query.toLowerCase());
                const idMatch = food.id?.toString().includes(query);

                if (nameMatch || idMatch) {
                    results.push(food);
                }
            }

            res.json({
                success: true,
                data: results,
                count: results.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Search food error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erreur interne du serveur'
                },
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Get food by ID endpoint
exports.getFoodById = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Validate API key
            await validateApiKey(req, res, () => {});

            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_ID',
                        message: 'ID de l\'aliment manquant'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // Find food by ID
            const food = foodData.find(f => f.id === id);

            if (!food) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'FOOD_NOT_FOUND',
                        message: 'Aliment non trouvé'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: food,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Get food by ID error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erreur interne du serveur'
                },
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Get categories endpoint
exports.getCategories = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Validate API key
            await validateApiKey(req, res, () => {});

            // Extract unique categories from food data
            const categories = {};

            for (const food of foodData) {
                if (food.categories) {
                    const groupCode = food.categories.group_code;
                    const subgroupCode = food.categories.subgroup_code;

                    if (!categories[groupCode]) {
                        categories[groupCode] = {
                            code: groupCode,
                            name: food.categories.group_name || `Groupe ${groupCode}`,
                            subgroups: {}
                        };
                    }

                    if (subgroupCode && food.categories.subgroup_name) {
                        categories[groupCode].subgroups[subgroupCode] = {
                            code: subgroupCode,
                            name: food.categories.subgroup_name
                        };
                    }
                }
            }

            // Convert to array
            const result = Object.values(categories).map(group => ({
                code: group.code,
                name: group.name,
                subgroups: Object.values(group.subgroups)
            }));

            res.json({
                success: true,
                data: {
                    groups: result
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erreur interne du serveur'
                },
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Advanced search endpoint
exports.advancedSearch = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Validate API key
            await validateApiKey(req, res, () => {});

            const { group, subgroup, minEnergy, maxEnergy, limit = 10 } = req.query;

            // Parse parameters
            const groupCode = group ? group.toString() : null;
            const subgroupCode = subgroup ? subgroup.toString() : null;
            const minEnergyNum = minEnergy ? parseFloat(minEnergy) : 0;
            const maxEnergyNum = maxEnergy ? parseFloat(maxEnergy) : Infinity;
            const limitNum = Math.min(parseInt(limit), 50);

            const results = [];

            // Filter food data
            for (const food of foodData) {
                if (results.length >= limitNum) break;

                // Check group
                if (groupCode && food.categories?.group_code !== groupCode) {
                    continue;
                }

                // Check subgroup
                if (subgroupCode && food.categories?.subgroup_code !== subgroupCode) {
                    continue;
                }

                // Check energy
                const energy = food.nutrition?.energy?.value || 0;
                if (energy < minEnergyNum || energy > maxEnergyNum) {
                    continue;
                }

                results.push(food);
            }

            res.json({
                success: true,
                data: results,
                count: results.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Advanced search error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erreur interne du serveur'
                },
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Create a new API key (for demo purposes, this would normally be client-side)
exports.createApiKey = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // In a real app, this would be handled client-side
        // This is just for demonstration

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Méthode non autorisée'
                }
            });
        }

        try {
            const { userId, name, expiryDays } = req.body;

            if (!userId || !name) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Paramètres manquants'
                    }
                });
            }

            // Generate API key
            const generateApiKey = () => {
                const randomNum = Math.floor(10000000 + Math.random() * 90000000);
                return `${API_KEY_PREFIX}${randomNum}`;
            };

            // Check if key already exists
            const keyExists = async (key) => {
                const snapshot = await db.ref('apiKeys').once('value');
                const keys = snapshot.val();
                return Object.values(keys || {}).some(k => k.key === key);
            };

            let key;
            let exists;

            do {
                key = generateApiKey();
                exists = await keyExists(key);
            } while (exists);

            // Calculate expiry date
            const expiryDate = expiryDays === 0 ? null : new Date();
            if (expiryDate) {
                expiryDate.setDate(expiryDate.getDate() + expiryDays);
            }

            // Save to database
            const newKeyRef = db.ref('apiKeys').push();
            await newKeyRef.set({
                id: newKeyRef.key,
                key: key,
                name: name,
                userId: userId,
                createdAt: new Date().toISOString(),
                expiresAt: expiryDate ? expiryDate.toISOString() : null,
                isActive: true,
                requestCount: 0,
                lastUsedAt: null
            });

            res.json({
                success: true,
                data: {
                    id: newKeyRef.key,
                    key: key,
                    name: name,
                    userId: userId,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiryDate ? expiryDate.toISOString() : null
                }
            });
        } catch (error) {
            console.error('Create API key error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erreur interne du serveur'
                }
            });
        }
    });
});

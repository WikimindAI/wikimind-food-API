// Wikimind Food API - Module de Gestion des Clés API
// Crée, liste, révoque et gère les clés API des utilisateurs

(function() {
  'use strict';

  // Attendre que Firebase soit initialisé
  function waitForFirebase() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.firebaseDB && window.WikimindFoodAPIAuth) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // Générer une clé API unique
  async function generateUniqueApiKey() {
    const prefix = 'wm-fd';
    const db = window.firebaseDB;
    const ref = db.ref('api_keys');
    
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      attempts++;
      const randomPart = String(Math.floor(10000000 + Math.random() * 90000000));
      const key = prefix + randomPart;
      
      const snapshot = await ref.child(key).once('value');
      if (!snapshot.exists()) {
        return key;
      }
    }
    
    throw new Error('Impossible de générer une clé unique après ' + maxAttempts + ' tentatives');
  }

  // Créer une nouvelle clé API
  async function createApiKey(name, expiryDays) {
    const user = window.WikimindFoodAPIAuth.getCurrentUser();
    
    if (!user) {
      throw new Error('Vous devez être connecté pour créer une clé API');
    }
    
    // Vérifier que le test anti-bot est passé
    if (!window.WikimindFoodAPIAntiBot || !window.WikimindFoodAPIAntiBot.isTestPassed()) {
      throw new Error('Vous devez passer le test anti-bot pour créer une clé API');
    }
    
    const db = window.firebaseDB;
    const apiKey = await generateUniqueApiKey();
    
    // Calculer la date d'expiration
    let expiresAt = null;
    if (expiryDays !== 'unlimited') {
      expiresAt = Date.now() + (parseInt(expiryDays) * 24 * 60 * 60 * 1000);
    }
    
    // Créer la clé dans la base de données
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
    
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    await apiKeyRef.set(apiKeyData);
    
    // Ajouter à la liste des clés de l'utilisateur
    const userApiKeysRef = db.ref(`users/${user.uid}/apiKeys`);
    await userApiKeysRef.push(apiKey);
    
    // Réinitialiser le test anti-bot
    window.WikimindFoodAPIAntiBot.resetTest();
    
    return {
      key: apiKey,
      ...apiKeyData
    };
  }

  // Lister les clés API de l'utilisateur
  async function listApiKeys(page = 1, pageSize = 10) {
    const user = window.WikimindFoodAPIAuth.getCurrentUser();
    
    if (!user) {
      throw new Error('Vous devez être connecté pour lister vos clés API');
    }
    
    const db = window.firebaseDB;
    const apiKeysRef = db.ref('api_keys');
    
    // Récupérer toutes les clés de l'utilisateur
    const snapshot = await apiKeysRef.orderByChild('userId').equalTo(user.uid).once('value');
    const allKeys = [];
    
    snapshot.forEach((childSnapshot) => {
      const keyData = childSnapshot.val();
      allKeys.push({
        key: childSnapshot.key,
        ...keyData
      });
    });
    
    // Trier par date de création (plus récentes en premier)
    allKeys.sort((a, b) => b.createdAt - a.createdAt);
    
    // Pagination
    const total = allKeys.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const keys = allKeys.slice(start, end);
    
    return {
      keys,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // Récupérer les détails d'une clé API spécifique
  async function getApiKeyDetails(apiKey) {
    const user = window.WikimindFoodAPIAuth.getCurrentUser();
    
    if (!user) {
      throw new Error('Vous devez être connecté');
    }
    
    const db = window.firebaseDB;
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    
    const snapshot = await apiKeyRef.once('value');
    
    if (!snapshot.exists()) {
      throw new Error('Clé API non trouvée');
    }
    
    const keyData = snapshot.val();
    
    // Vérifier que la clé appartient à l'utilisateur
    if (keyData.userId !== user.uid) {
      throw new Error('Accès non autorisé à cette clé API');
    }
    
    return {
      key: apiKey,
      ...keyData
    };
  }

  // Révoquer une clé API
  async function revokeApiKey(apiKey) {
    const user = window.WikimindFoodAPIAuth.getCurrentUser();
    
    if (!user) {
      throw new Error('Vous devez être connecté');
    }
    
    const db = window.firebaseDB;
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    
    const snapshot = await apiKeyRef.once('value');
    
    if (!snapshot.exists()) {
      throw new Error('Clé API non trouvée');
    }
    
    const keyData = snapshot.val();
    
    // Vérifier que la clé appartient à l'utilisateur
    if (keyData.userId !== user.uid) {
      throw new Error('Accès non autorisé à cette clé API');
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
    
    return true;
  }

  // Vérifier si une clé API est valide (pour les appels API)
  async function isApiKeyValid(apiKey) {
    const db = window.firebaseDB;
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    
    const snapshot = await apiKeyRef.once('value');
    
    if (!snapshot.exists()) {
      return {
        valid: false,
        reason: 'Clé API non trouvée'
      };
    }
    
    const keyData = snapshot.val();
    
    // Vérifier si la clé est active
    if (!keyData.isActive) {
      return {
        valid: false,
        reason: 'Clé API désactivée'
      };
    }
    
    // Vérifier la date d'expiration
    if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
      return {
        valid: false,
        reason: 'Clé API expirée'
      };
    }
    
    // Vérifier la limite quotidienne
    const today = new Date().toISOString().split('T')[0];
    if (keyData.lastReset !== today) {
      // Reset du compteur
      await apiKeyRef.update({
        dailyUsage: 0,
        lastReset: today
      });
    } else if (keyData.dailyUsage >= 1000) {
      return {
        valid: false,
        reason: 'Limite quotidienne dépassée (1000 requêtes/jour)'
      };
    }
    
    // Incrémenter le compteur d'utilisation
    await apiKeyRef.child('dailyUsage').transaction((count) => {
      return (count || 0) + 1;
    });
    
    // Mettre à jour la date de dernière utilisation
    await apiKeyRef.update({
      lastUsed: Date.now()
    });
    
    return {
      valid: true,
      userId: keyData.userId,
      keyData: keyData
    };
  }

  // Mettre à jour le nom d'une clé API
  async function updateApiKeyName(apiKey, newName) {
    const user = window.WikimindFoodAPIAuth.getCurrentUser();
    
    if (!user) {
      throw new Error('Vous devez être connecté');
    }
    
    const db = window.firebaseDB;
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    
    const snapshot = await apiKeyRef.once('value');
    
    if (!snapshot.exists()) {
      throw new Error('Clé API non trouvée');
    }
    
    const keyData = snapshot.val();
    
    if (keyData.userId !== user.uid) {
      throw new Error('Accès non autorisé');
    }
    
    await apiKeyRef.update({
      name: newName
    });
    
    return true;
  }

  // Récupérer les statistiques d'utilisation
  async function getApiKeyStats(apiKey) {
    const user = window.WikimindFoodAPIAuth.getCurrentUser();
    
    if (!user) {
      throw new Error('Vous devez être connecté');
    }
    
    const db = window.firebaseDB;
    const apiKeyRef = db.ref(`api_keys/${apiKey}`);
    
    const snapshot = await apiKeyRef.once('value');
    
    if (!snapshot.exists()) {
      throw new Error('Clé API non trouvée');
    }
    
    const keyData = snapshot.val();
    
    if (keyData.userId !== user.uid) {
      throw new Error('Accès non autorisé');
    }
    
    return {
      totalRequests: keyData.dailyUsage || 0,
      lastUsed: keyData.lastUsed,
      createdAt: keyData.createdAt,
      expiresAt: keyData.expiresAt
    };
  }

  // Exporter les fonctions publiques
  window.WikimindFoodAPIKeys = {
    createApiKey,
    listApiKeys,
    getApiKeyDetails,
    revokeApiKey,
    isApiKeyValid,
    updateApiKeyName,
    getApiKeyStats,
    generateUniqueApiKey
  };

  // Initialiser le module
  async function init() {
    await waitForFirebase();
  }

  // Initialiser automatiquement
  init();
})();

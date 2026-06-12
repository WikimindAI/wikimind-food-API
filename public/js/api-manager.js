import { database, ref, set, get, push, remove, onValue, query, orderByChild } from './firebase-config.js';
import { auth } from './firebase-config.js';

// API Key prefix
const API_KEY_PREFIX = 'wm-fd';

// Generate random API key
function generateApiKey() {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    return `${API_KEY_PREFIX}${randomNum}`;
}

// Check if API key exists
async function apiKeyExists(key) {
    const keysRef = ref(database, 'apiKeys');
    const snapshot = await get(keysRef);

    if (snapshot.exists()) {
        const keys = snapshot.val();
        return Object.values(keys).some(k => k.key === key);
    }

    return false;
}

// Generate a unique API key
async function generateUniqueApiKey() {
    let key;
    let exists;

    do {
        key = generateApiKey();
        exists = await apiKeyExists(key);
    } while (exists);

    return key;
}

// Create a new API key
async function createApiKey(name, expiryDays = 30) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Vous devez être connecté pour créer une clé API');
    }

    // Generate unique key
    const key = await generateUniqueApiKey();

    // Calculate expiry date
    const expiryDate = expiryDays === 0 ? null : new Date();
    if (expiryDate) {
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
    }

    // Create API key data
    const apiKeyData = {
        id: push(ref(database, 'apiKeys')).key,
        key: key,
        name: name,
        userId: user.uid,
        userEmail: user.email,
        createdAt: new Date().toISOString(),
        expiresAt: expiryDate ? expiryDate.toISOString() : null,
        isActive: true,
        requestCount: 0,
        lastUsedAt: null
    };

    // Save to database
    const keyRef = ref(database, `apiKeys/${apiKeyData.id}`);
    await set(keyRef, apiKeyData);

    // Add to user's API keys
    const userRef = ref(database, `users/${user.uid}/apiKeys`);
    const userKeysSnapshot = await get(userRef);

    let userKeys = [];
    if (userKeysSnapshot.exists()) {
        userKeys = userKeysSnapshot.val() || [];
    }

    userKeys.push({
        id: apiKeyData.id,
        key: key,
        name: name,
        createdAt: apiKeyData.createdAt,
        expiresAt: apiKeyData.expiresAt
    });

    await set(userRef, userKeys);

    return apiKeyData;
}

// Get user's API keys
async function getUserApiKeys() {
    const user = auth.currentUser;
    if (!user) return [];

    const userRef = ref(database, `users/${user.uid}/apiKeys`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        return Object.values(snapshot.val() || []);
    }

    return [];
}

// Delete an API key
async function deleteApiKey(keyId) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Vous devez être connecté pour supprimer une clé API');
    }

    // Delete from apiKeys collection
    const keyRef = ref(database, `apiKeys/${keyId}`);
    await remove(keyRef);

    // Remove from user's API keys
    const userRef = ref(database, `users/${user.uid}/apiKeys`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        const userKeys = snapshot.val() || [];
        const updatedKeys = userKeys.filter(k => k.id !== keyId);
        await set(userRef, updatedKeys);
    }

    return true;
}

// Validate an API key
async function validateApiKey(key) {
    if (!key || !key.startsWith(API_KEY_PREFIX)) {
        return { valid: false, error: 'Format de clé API invalide' };
    }

    const keysRef = ref(database, 'apiKeys');
    const snapshot = await get(keysRef);

    if (!snapshot.exists()) {
        return { valid: false, error: 'Clé API non trouvée' };
    }

    const keys = snapshot.val();
    const apiKey = Object.values(keys).find(k => k.key === key);

    if (!apiKey) {
        return { valid: false, error: 'Clé API non trouvée' };
    }

    if (!apiKey.isActive) {
        return { valid: false, error: 'Clé API désactivée' };
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return { valid: false, error: 'Clé API expirée' };
    }

    // Update last used and request count
    const keyRef = ref(database, `apiKeys/${apiKey.id}`);
    await set(keyRef, {
        ...apiKey,
        lastUsedAt: new Date().toISOString(),
        requestCount: (apiKey.requestCount || 0) + 1
    });

    return {
        valid: true,
        apiKey: {
            id: apiKey.id,
            name: apiKey.name,
            userId: apiKey.userId,
            createdAt: apiKey.createdAt,
            expiresAt: apiKey.expiresAt
        }
    };
}

// Get API key statistics
async function getApiKeyStats() {
    const user = auth.currentUser;
    if (!user) return {};

    const userRef = ref(database, `users/${user.uid}/apiKeys`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
        return {
            totalKeys: 0,
            activeKeys: 0,
            expiredKeys: 0
        };
    }

    const userKeys = Object.values(snapshot.val() || []);
    const now = new Date();

    const stats = {
        totalKeys: userKeys.length,
        activeKeys: userKeys.filter(k => !k.expiresAt || new Date(k.expiresAt) > now).length,
        expiredKeys: userKeys.filter(k => k.expiresAt && new Date(k.expiresAt) <= now).length
    };

    return stats;
}

// Generate bot challenge
function generateBotChallenge() {
    const challenges = [
        {
            type: 'math',
            question: `Quel est le résultat de ${Math.floor(Math.random() * 10) + 1} + ${Math.floor(Math.random() * 10) + 1} ?`,
            answer: function() {
                const [a, b] = this.question.match(/\d+/g).map(Number);
                return (a + b).toString();
            }
        },
        {
            type: 'color',
            question: 'Quelle est la couleur du ciel par temps clair ? (en français)',
            answer: 'bleu'
        },
        {
            type: 'animal',
            question: 'Quel animal est connu pour être "le roi de la jungle" ? (en français)',
            answer: 'lion'
        },
        {
            type: 'capital',
            question: 'Quelle est la capitale de la France ?',
            answer: 'Paris'
        },
        {
            type: 'reverse',
            question: `Écrivez "${['a', 'b', 'c', 'd', 'e'][Math.floor(Math.random() * 5)]}" à l'envers`,
            answer: function() {
                const letter = this.question.match(/"([^"]+)"/)[1];
                return letter.split('').reverse().join('');
            }
        }
    ];

    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    const challengeElement = document.getElementById('botChallenge');

    if (challengeElement) {
        challengeElement.innerHTML = `
            <div class="wm-bot-challenge-question">${challenge.question}</div>
            <input type="hidden" id="currentChallengeAnswer" value="${challenge.answer()}">
        `;

        // Show the challenge group
        document.getElementById('botChallengeGroup').style.display = 'block';
        document.getElementById('createApiKeyBtn').disabled = false;
    }

    return challenge;
}

// Check bot challenge answer
function checkBotChallengeAnswer() {
    const userAnswer = document.getElementById('botChallengeAnswer').value.trim().toLowerCase();
    const correctAnswer = document.getElementById('currentChallengeAnswer').value.trim().toLowerCase();

    return userAnswer === correctAnswer;
}

// Show API key modal
function showApiKeyModal(apiKeyData) {
    const modal = document.getElementById('apiKeyModal');
    const keyElement = document.getElementById('generatedApiKey');
    const nameElement = document.getElementById('modalApiKeyName');
    const expiryElement = document.getElementById('modalApiKeyExpiry');

    if (modal && keyElement && nameElement && expiryElement) {
        keyElement.textContent = apiKeyData.key;
        nameElement.textContent = apiKeyData.name;

        if (apiKeyData.expiresAt) {
            const expiryDate = new Date(apiKeyData.expiresAt);
            expiryElement.textContent = expiryDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else {
            expiryElement.textContent = 'Jamais';
        }

        modal.classList.add('open');
    }
}

// Close API key modal
function closeApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.classList.remove('open');
    }
}

// Copy API key to clipboard
function copyApiKey() {
    const keyElement = document.getElementById('generatedApiKey');
    if (keyElement) {
        navigator.clipboard.writeText(keyElement.textContent)
            .then(() => {
                showNotification('Clé API copiée dans le presse-papiers !', 'success');
            })
            .catch(() => {
                showNotification('Échec de la copie', 'error');
            });
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('open');
    }
}

// Show delete modal
function showDeleteModal(keyName, keyId) {
    const modal = document.getElementById('deleteModal');
    const nameElement = document.getElementById('deleteKeyName');

    if (modal && nameElement) {
        nameElement.textContent = `"${keyName}"`;
        modal.setAttribute('data-key-id', keyId);
        modal.classList.add('open');
    }
}

// Confirm delete API key
async function confirmDeleteApiKey() {
    const modal = document.getElementById('deleteModal');
    const keyId = modal.getAttribute('data-key-id');

    if (!keyId) return;

    try {
        await deleteApiKey(keyId);
        showNotification('Clé API supprimée avec succès', 'success');
        closeDeleteModal();
        refreshApiKeys();
    } catch (error) {
        console.error('Error deleting API key:', error);
        showNotification('Erreur lors de la suppression de la clé API', 'error');
    }
}

// Refresh API keys list
async function refreshApiKeys() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const apiKeys = await getUserApiKeys();
        const stats = await getApiKeyStats();
        const tableBody = document.getElementById('apiKeysTableBody');

        if (tableBody) {
            if (apiKeys.length === 0) {
                tableBody.innerHTML = `
                    <tr class="wm-empty-state">
                        <td colspan="6">
                            <div class="wm-empty-content">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5"/>
                                    <path d="M2 12l10 5 10-5"/>
                                </svg>
                                <p>Aucune clé API créée pour l'instant.</p>
                                <p class="wm-empty-hint">Créez votre première clé API en utilisant le formulaire ci-dessus.</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = apiKeys.map(key => {
                    const createdAt = new Date(key.createdAt);
                    const expiresAt = key.expiresAt ? new Date(key.expiresAt) : null;

                    let statusBadge;
                    if (!key.expiresAt) {
                        statusBadge = '<span class="wm-badge wm-badge-success">Active</span>';
                    } else if (expiresAt > new Date()) {
                        statusBadge = '<span class="wm-badge wm-badge-success">Active</span>';
                    } else {
                        statusBadge = '<span class="wm-badge wm-badge-danger">Expirée</span>';
                    }

                    return `
                        <tr>
                            <td>${escapeHtml(key.name)}</td>
                            <td>
                                <code class="wm-api-key-short">${key.key.substring(0, 8)}...</code>
                            </td>
                            <td>${createdAt.toLocaleDateString('fr-FR')}</td>
                            <td>${expiresAt ? expiresAt.toLocaleDateString('fr-FR') : 'Jamais'}</td>
                            <td>${statusBadge}</td>
                            <td class="wm-table-actions">
                                <button class="wm-table-btn" onclick="showDeleteModal('${escapeHtml(key.name)}', '${key.id}')" title="Supprimer">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 6h18"/>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            // Update stats
            const totalKeysEl = document.getElementById('totalKeys');
            const totalRequestsEl = document.getElementById('totalRequests');
            const oldestKeyEl = document.getElementById('oldestKey');

            if (totalKeysEl) totalKeysEl.textContent = stats.totalKeys || 0;
            if (totalRequestsEl) totalRequestsEl.textContent = '0'; // Would need tracking
            if (oldestKeyEl) {
                if (apiKeys.length > 0) {
                    const oldestKey = new Date(Math.min(...apiKeys.map(k => new Date(k.createdAt))));
                    oldestKeyEl.textContent = oldestKey.toLocaleDateString('fr-FR');
                } else {
                    oldestKeyEl.textContent = '-';
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing API keys:', error);
        showNotification('Erreur lors du chargement des clés API', 'error');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize API manager
function initApiManager() {
    // Create API key form
    const createApiKeyForm = document.getElementById('createApiKeyForm');
    if (createApiKeyForm) {
        createApiKeyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('apiKeyName').value.trim();
            const expiry = parseInt(document.getElementById('apiKeyExpiry').value);
            const answer = document.getElementById('botChallengeAnswer').value.trim();
            const createBtn = document.getElementById('createApiKeyBtn');

            // Validation
            if (!name) {
                showNotification('Veuillez donner un nom à votre clé API', 'error');
                return;
            }

            if (isNaN(expiry) || expiry < 0) {
                showNotification('Veuillez sélectionner une durée d\'expiration valide', 'error');
                return;
            }

            // Check bot challenge
            if (!checkBotChallengeAnswer()) {
                showNotification('Réponse incorrecte au test anti-bot', 'error');
                return;
            }

            // Show loading
            createBtn.querySelector('.wm-btn-text').style.display = 'none';
            createBtn.querySelector('.wm-btn-loader').style.display = 'block';
            createBtn.disabled = true;

            try {
                const apiKeyData = await createApiKey(name, expiry === 0 ? 0 : expiry);
                showApiKeyModal(apiKeyData);
                refreshApiKeys();

                // Reset form
                createApiKeyForm.reset();
                document.getElementById('botChallengeGroup').style.display = 'none';
            } catch (error) {
                console.error('Error creating API key:', error);
                showNotification(error.message || 'Erreur lors de la création de la clé API', 'error');
            } finally {
                // Hide loading
                createBtn.querySelector('.wm-btn-text').style.display = 'block';
                createBtn.querySelector('.wm-btn-loader').style.display = 'none';
                createBtn.disabled = false;
            }
        });
    }

    // Refresh API keys on page load
    refreshApiKeys();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initApiManager();

    // Make functions available globally
    window.generateBotChallenge = generateBotChallenge;
    window.closeApiKeyModal = closeApiKeyModal;
    window.copyApiKey = copyApiKey;
    window.closeDeleteModal = closeDeleteModal;
    window.showDeleteModal = showDeleteModal;
    window.confirmDeleteApiKey = confirmDeleteApiKey;
    window.refreshApiKeys = refreshApiKeys;
});

// Export functions
export { createApiKey, getUserApiKeys, deleteApiKey, validateApiKey, generateBotChallenge, generateUniqueApiKey };

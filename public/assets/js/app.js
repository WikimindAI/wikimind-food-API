import { auth } from './firebase-config.js';
import { getUserApiKeys, validateApiKey } from './api-manager.js';

// Global state
let currentUser = null;

// Initialize the application
function initApp() {
    // Auth state listener
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            updateUIForAuth(user);
            if (user) {
                loadUserData(user);
            }
        });
    }

    // Initialize page-specific functionality
    initPageSpecific();
}

// Update UI based on auth state
function updateUIForAuth(user) {
    const authRequiredElements = document.querySelectorAll('[data-auth-required]');
    const guestOnlyElements = document.querySelectorAll('[data-guest-only]');

    if (user) {
        authRequiredElements.forEach(el => el.style.display = '');
        guestOnlyElements.forEach(el => el.style.display = 'none');
    } else {
        authRequiredElements.forEach(el => el.style.display = 'none');
        guestOnlyElements.forEach(el => el.style.display = '');
    }
}

// Load user data
async function loadUserData(user) {
    try {
        if (window.location.pathname.includes('dashboard.html') && window.refreshApiKeys) {
            await window.refreshApiKeys();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Initialize page-specific functionality
function initPageSpecific() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    switch (currentPage) {
        case 'index.html':
            initHomePage();
            break;
        case 'dashboard.html':
            initDashboardPage();
            break;
        case 'test-api.html':
            initTestApiPage();
            break;
        case 'docs.html':
            initDocsPage();
            break;
    }
}

// Home page initialization
function initHomePage() {}

// Dashboard page initialization
function initDashboardPage() {}

// Test API page initialization
function initTestApiPage() {
    const groupSelect = document.getElementById('advGroup');
    const subgroupSelect = document.getElementById('advSubgroup');

    if (groupSelect && subgroupSelect) {
        const subgroups = {
            '1': ['Salades composées et crudités', 'Soupes', 'Plats composés'],
            '2': ['Viandes de boucherie', 'Viandes de volaille', 'Abats'],
            '3': ['Poissons', 'Crustacés', 'Mollusques'],
            '4': ['Fruits frais', 'Légumes frais', 'Fruits et légumes transformés']
        };

        groupSelect.addEventListener('change', () => {
            const group = groupSelect.value;
            subgroupSelect.innerHTML = '<option value="">Tous les sous-groupes</option>';

            if (group && subgroups[group]) {
                subgroupSelect.disabled = false;
                subgroups[group].forEach(subgroup => {
                    const option = document.createElement('option');
                    option.value = subgroup;
                    option.textContent = subgroup;
                    subgroupSelect.appendChild(option);
                });
            } else {
                subgroupSelect.disabled = true;
            }
        });
    }
}

// Docs page initialization
function initDocsPage() {
    const sections = document.querySelectorAll('.wm-docs-section');
    const navLinks = document.querySelectorAll('.wm-docs-link');

    if (sections.length > 0 && navLinks.length > 0) {
        window.addEventListener('scroll', () => {
            let current = '';
            const scrollPosition = window.scrollY + 100;

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }
}

// ============================================
// FONCTIONS DE TEST API (avec vérification de connexion)
// ============================================

async function testSearchFood() {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Veuillez vous connecter pour tester l\'API', 'error');
        return;
    }

    const query = document.getElementById('searchQuery').value.trim();
    const limit = parseInt(document.getElementById('searchLimit').value) || 5;
    const apiKey = document.getElementById('testApiKey').value.trim();
    const resultElement = document.getElementById('searchResultCode');
    const resultContainer = document.getElementById('searchResult');

    if (!query) {
        showNotification('Veuillez entrer une requête de recherche', 'error');
        return;
    }

    const btn = event.target.closest('.wm-btn') || event.currentTarget;
    const btnText = btn.querySelector('.wm-btn-text');
    const btnLoader = btn.querySelector('.wm-btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    btn.disabled = true;

    try {
        const response = await simulateApiCall('search', { query, limit }, apiKey);
        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }
        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => resultContainer.classList.remove('wm-result-success'), 2000);
        }
    } catch (error) {
        console.error('API test error:', error);
        showNotification(error.message || 'Erreur lors du test de l\'API', 'error');
        if (resultElement) {
            resultElement.textContent = JSON.stringify({
                success: false,
                error: error.message || 'Erreur inconnue'
            }, null, 2);
        }
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

async function testGetFoodById() {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Veuillez vous connecter pour tester l\'API', 'error');
        return;
    }

    const foodId = document.getElementById('foodId').value.trim();
    const resultElement = document.getElementById('foodByIdResultCode');
    const resultContainer = document.getElementById('foodByIdResult');

    if (!foodId) {
        showNotification('Veuillez entrer un ID CIQUAL', 'error');
        return;
    }

    const btn = event.target.closest('.wm-btn') || event.currentTarget;
    const btnText = btn.querySelector('.wm-btn-text');
    const btnLoader = btn.querySelector('.wm-btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    btn.disabled = true;

    try {
        const response = await simulateApiCall('food', { id: foodId });
        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }
        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => resultContainer.classList.remove('wm-result-success'), 2000);
        }
    } catch (error) {
        console.error('API test error:', error);
        showNotification(error.message || 'Erreur lors du test de l\'API', 'error');
        if (resultElement) {
            resultElement.textContent = JSON.stringify({
                success: false,
                error: error.message || 'Erreur inconnue'
            }, null, 2);
        }
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

async function testGetCategories() {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Veuillez vous connecter pour tester l\'API', 'error');
        return;
    }

    const resultElement = document.getElementById('categoriesResultCode');
    const resultContainer = document.getElementById('categoriesResult');

    const btn = event.target.closest('.wm-btn') || event.currentTarget;
    const btnText = btn.querySelector('.wm-btn-text');
    const btnLoader = btn.querySelector('.wm-btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    btn.disabled = true;

    try {
        const response = await simulateApiCall('categories');
        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }
        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => resultContainer.classList.remove('wm-result-success'), 2000);
        }
    } catch (error) {
        console.error('API test error:', error);
        showNotification(error.message || 'Erreur lors du test de l\'API', 'error');
        if (resultElement) {
            resultElement.textContent = JSON.stringify({
                success: false,
                error: error.message || 'Erreur inconnue'
            }, null, 2);
        }
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

async function testAdvancedQuery() {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Veuillez vous connecter pour tester l\'API', 'error');
        return;
    }

    const group = document.getElementById('advGroup').value;
    const subgroup = document.getElementById('advSubgroup').value;
    const minEnergy = parseFloat(document.getElementById('advMinEnergy').value) || 0;
    const maxEnergy = parseFloat(document.getElementById('advMaxEnergy').value) || 1000;
    const limit = parseInt(document.getElementById('advLimit').value) || 10;
    const resultElement = document.getElementById('advancedResultCode');
    const resultContainer = document.getElementById('advancedResult');

    const btn = event.target.closest('.wm-btn') || event.currentTarget;
    const btnText = btn.querySelector('.wm-btn-text');
    const btnLoader = btn.querySelector('.wm-btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    btn.disabled = true;

    try {
        const response = await simulateApiCall('advanced', {
            group,
            subgroup,
            minEnergy,
            maxEnergy,
            limit
        });
        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }
        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => resultContainer.classList.remove('wm-result-success'), 2000);
        }
    } catch (error) {
        console.error('API test error:', error);
        showNotification(error.message || 'Erreur lors du test de l\'API', 'error');
        if (resultElement) {
            resultElement.textContent = JSON.stringify({
                success: false,
                error: error.message || 'Erreur inconnue'
            }, null, 2);
        }
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

// Simulate API call (pour la démo)
async function simulateApiCall(endpoint, params = {}, apiKey = '') {
    const user = auth.currentUser;

    if (apiKey && apiKey !== '') {
        const validation = await validateApiKey(apiKey);
        if (!validation.valid) {
            throw new Error(validation.error || 'Clé API invalide');
        }
    } else if (!user) {
        throw new Error('Vous devez être connecté ou fournir une clé API valide');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    switch (endpoint) {
        case 'search':
            return {
                success: true,
                data: [
                    {
                        id: "26213",
                        names: { fr: "Pomme crue" },
                        nutrition: {
                            energy: { value: 52, unit: "kcal" },
                            carbohydrates: { value: 13.8, unit: "g" },
                            fats: { value: 0.2, unit: "g" },
                            proteins: { value: 0.3, unit: "g" }
                        },
                        categories: {
                            group_code: "4",
                            group_name: "Fruits et légumes",
                            subgroup_code: "401",
                            subgroup_name: "Fruits frais"
                        }
                    }
                ],
                count: 1,
                timestamp: new Date().toISOString()
            };
        case 'food':
            return {
                success: true,
                data: {
                    id: params.id || "26213",
                    names: { fr: "Pomme crue" },
                    nutrition: {
                        energy: { value: 52, unit: "kcal" },
                        carbohydrates: { value: 13.8, unit: "g" },
                        fats: { value: 0.2, unit: "g" },
                        proteins: { value: 0.3, unit: "g" }
                    },
                    categories: {
                        group_code: "4",
                        group_name: "Fruits et légumes",
                        subgroup_code: "401",
                        subgroup_name: "Fruits frais"
                    },
                    source: "CIQUAL 2025",
                    language: "fr"
                },
                timestamp: new Date().toISOString()
            };
        case 'categories':
            return {
                success: true,
                data: {
                    groups: [
                        {
                            code: "1",
                            name: "Entrées et plats composés",
                            subgroups: [
                                { code: "101", name: "Salades composées et crudités" },
                                { code: "102", name: "Soupes" }
                            ]
                        },
                        {
                            code: "4",
                            name: "Fruits et légumes",
                            subgroups: [
                                { code: "401", name: "Fruits frais" },
                                { code: "402", name: "Légumes frais" }
                            ]
                        }
                    ]
                },
                timestamp: new Date().toISOString()
            };
        case 'advanced':
            return {
                success: true,
                data: [
                    {
                        id: "26213",
                        names: { fr: "Pomme crue" },
                        nutrition: { energy: { value: 52, unit: "kcal" } },
                        categories: {
                            group_name: "Fruits et légumes",
                            subgroup_name: "Fruits frais"
                        }
                    }
                ],
                count: 1,
                timestamp: new Date().toISOString()
            };
        default:
            throw new Error('Endpoint non trouvé');
    }
}

// Copy result to clipboard
function copyResult(elementId) {
    const element = document.getElementById(elementId);
    const codeElement = element.querySelector('code');
    if (codeElement) {
        navigator.clipboard.writeText(codeElement.textContent)
            .then(() => showNotification('Résultat copié !', 'success'))
            .catch(() => showNotification('Échec de la copie', 'error'));
    }
}

// Clear result
function clearResult(elementId) {
    const element = document.getElementById(elementId);
    const codeElement = element.querySelector('code');
    if (codeElement) {
        codeElement.textContent = '// Cliquez sur le bouton de test pour voir le résultat';
    }
}

// Paste API key from clipboard
async function pasteApiKey() {
    try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById('testApiKey');
        if (input && text && text.startsWith('wm-fd') && text.length === 10) {
            input.value = text;
            showNotification('Clé API collée !', 'success');
        } else if (input) {
            showNotification('Le texte ne ressemble pas à une clé API valide', 'error');
        }
    } catch (error) {
        showNotification('Impossible de lire le presse-papiers', 'error');
    }
}

// Show notification (fallback si pas définie dans auth.js)
function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        const notification = document.createElement('div');
        notification.className = `wm-notification wm-notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('wm-notification-show'), 100);
        setTimeout(() => {
            notification.classList.remove('wm-notification-show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Make functions available globally
window.testSearchFood = testSearchFood;
window.testGetFoodById = testGetFoodById;
window.testGetCategories = testGetCategories;
window.testAdvancedQuery = testAdvancedQuery;
window.copyResult = copyResult;
window.clearResult = clearResult;
window.pasteApiKey = pasteApiKey;
window.showNotification = showNotification;

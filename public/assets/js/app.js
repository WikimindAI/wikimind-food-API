import { auth, onAuthStateChanged } from './firebase-config.js';
import { getUserApiKeys, validateApiKey } from './api-manager.js';

// Global state
let currentUser = null;

// Initialize the application
function initApp() {
    // Auth state listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateUIForAuth(user);

        // Load user data if logged in
        if (user) {
            loadUserData(user);
        }
    });

    // Initialize page-specific functionality
    initPageSpecific();

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Update active nav link
                updateActiveNavLink(this);
            }
        });
    });
}

// Update UI based on auth state
function updateUIForAuth(user) {
    const authRequiredElements = document.querySelectorAll('[data-auth-required]');
    const guestOnlyElements = document.querySelectorAll('[data-guest-only]');

    if (user) {
        // Show elements for authenticated users
        authRequiredElements.forEach(el => {
            el.style.display = '';
        });

        // Hide elements for guests
        guestOnlyElements.forEach(el => {
            el.style.display = 'none';
        });
    } else {
        // Hide elements for authenticated users
        authRequiredElements.forEach(el => {
            el.style.display = 'none';
        });

        // Show elements for guests
        guestOnlyElements.forEach(el => {
            el.style.display = '';
        });
    }
}

// Load user data
async function loadUserData(user) {
    try {
        // Load API keys if on dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            await refreshApiKeys();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update active navigation link
function updateActiveNavLink(activeLink) {
    const navLinks = document.querySelectorAll('.wm-nav-item, .wm-docs-link');

    navLinks.forEach(link => {
        link.classList.remove('active');

        // Check if this link matches the clicked one
        if (link === activeLink ||
            (activeLink.href && link.href === activeLink.href)) {
            link.classList.add('active');
        }
    });
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
function initHomePage() {
    // Add any home page specific functionality here
}

// Dashboard page initialization
function initDashboardPage() {
    // Already handled by api-manager.js
}

// Test API page initialization
function initTestApiPage() {
    // Load subgroups when group is selected
    const groupSelect = document.getElementById('advGroup');
    const subgroupSelect = document.getElementById('advSubgroup');

    if (groupSelect && subgroupSelect) {
        // This would be populated from the API in a real implementation
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
    // Update active section in sidebar based on scroll position
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

// Test API functions
async function testSearchFood() {
    const query = document.getElementById('searchQuery').value.trim();
    const limit = parseInt(document.getElementById('searchLimit').value) || 5;
    const apiKey = document.getElementById('testApiKey').value.trim();
    const resultElement = document.getElementById('searchResultCode');
    const resultContainer = document.getElementById('searchResult');

    if (!query) {
        showNotification('Veuillez entrer une requête de recherche', 'error');
        return;
    }

    // Show loading in button
    const btn = event.target.closest('.wm-btn');
    btn.querySelector('.wm-btn-text').style.display = 'none';
    btn.querySelector('.wm-btn-loader').style.display = 'block';
    btn.disabled = true;

    try {
        // In a real implementation, this would call the actual API
        // For demo purposes, we'll simulate a response
        const response = await simulateApiCall('search', { query, limit }, apiKey);

        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }

        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => {
                resultContainer.classList.remove('wm-result-success');
            }, 2000);
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
        // Hide loading
        if (btn) {
            btn.querySelector('.wm-btn-text').style.display = 'block';
            btn.querySelector('.wm-btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    }
}

async function testGetFoodById() {
    const foodId = document.getElementById('foodId').value.trim();
    const resultElement = document.getElementById('foodByIdResultCode');
    const resultContainer = document.getElementById('foodByIdResult');

    if (!foodId) {
        showNotification('Veuillez entrer un ID CIQUAL', 'error');
        return;
    }

    // Show loading in button
    const btn = event.target.closest('.wm-btn');
    btn.querySelector('.wm-btn-text').style.display = 'none';
    btn.querySelector('.wm-btn-loader').style.display = 'block';
    btn.disabled = true;

    try {
        const response = await simulateApiCall('food', { id: foodId });

        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }

        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => {
                resultContainer.classList.remove('wm-result-success');
            }, 2000);
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
        // Hide loading
        if (btn) {
            btn.querySelector('.wm-btn-text').style.display = 'block';
            btn.querySelector('.wm-btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    }
}

async function testGetCategories() {
    const resultElement = document.getElementById('categoriesResultCode');
    const resultContainer = document.getElementById('categoriesResult');

    // Show loading in button
    const btn = event.target.closest('.wm-btn');
    btn.querySelector('.wm-btn-text').style.display = 'none';
    btn.querySelector('.wm-btn-loader').style.display = 'block';
    btn.disabled = true;

    try {
        const response = await simulateApiCall('categories');

        if (resultElement) {
            resultElement.textContent = JSON.stringify(response, null, 2);
        }

        if (resultContainer) {
            resultContainer.classList.add('wm-result-success');
            setTimeout(() => {
                resultContainer.classList.remove('wm-result-success');
            }, 2000);
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
        // Hide loading
        if (btn) {
            btn.querySelector('.wm-btn-text').style.display = 'block';
            btn.querySelector('.wm-btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    }
}

async function testAdvancedQuery() {
    const group = document.getElementById('advGroup').value;
    const subgroup = document.getElementById('advSubgroup').value;
    const minEnergy = parseFloat(document.getElementById('advMinEnergy').value) || 0;
    const maxEnergy = parseFloat(document.getElementById('advMaxEnergy').value) || 1000;
    const limit = parseInt(document.getElementById('advLimit').value) || 10;
    const resultElement = document.getElementById('advancedResultCode');
    const resultContainer = document.getElementById('advancedResult');

    // Show loading in button
    const btn = event.target.closest('.wm-btn');
    btn.querySelector('.wm-btn-text').style.display = 'none';
    btn.querySelector('.wm-btn-loader').style.display = 'block';
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
            setTimeout(() => {
                resultContainer.classList.remove('wm-result-success');
            }, 2000);
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
        // Hide loading
        if (btn) {
            btn.querySelector('.wm-btn-text').style.display = 'block';
            btn.querySelector('.wm-btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    }
}

// Simulate API call (for demo purposes)
async function simulateApiCall(endpoint, params = {}, apiKey = '') {
    // In a real implementation, this would make an actual API call
    // For now, we'll return mock data

    // Check if API key is provided (for demo, we'll accept any non-empty string)
    if (apiKey && apiKey !== '') {
        // In a real implementation, we would validate the API key
        const validation = await validateApiKey(apiKey);
        if (!validation.valid) {
            throw new Error(validation.error || 'Clé API invalide');
        }
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock data based on endpoint
    switch (endpoint) {
        case 'search':
            return {
                success: true,
                data: [
                    {
                        id: "26213",
                        names: {
                            fr: "Pomme crue"
                        },
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
                    },
                    {
                        id: "26214",
                        names: {
                            fr: "Pomme cuite"
                        },
                        nutrition: {
                            energy: { value: 48, unit: "kcal" },
                            carbohydrates: { value: 12.5, unit: "g" },
                            fats: { value: 0.1, unit: "g" },
                            proteins: { value: 0.2, unit: "g" }
                        },
                        categories: {
                            group_code: "4",
                            group_name: "Fruits et légumes",
                            subgroup_code: "401",
                            subgroup_name: "Fruits frais"
                        }
                    }
                ],
                count: 2,
                timestamp: new Date().toISOString()
            };

        case 'food':
            return {
                success: true,
                data: {
                    id: params.id || "26213",
                    names: {
                        fr: "Pomme crue"
                    },
                    nutrition: {
                        energy: { value: 52, unit: "kcal" },
                        carbohydrates: { value: 13.8, unit: "g" },
                        fats: { value: 0.2, unit: "g" },
                        proteins: { value: 0.3, unit: "g" },
                        fiber: { value: 2.4, unit: "g" },
                        sugars: { value: 10.4, unit: "g" }
                    },
                    minerals: {
                        calcium: { value: 6, unit: "mg" },
                        iron: { value: 0.1, unit: "mg" },
                        potassium: { value: 107, unit: "mg" }
                    },
                    vitamins: {
                        vitaminC: { value: 4.6, unit: "mg" }
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
                                { code: "102", name: "Soupes" },
                                { code: "103", name: "Plats composés" }
                            ]
                        },
                        {
                            code: "2",
                            name: "Viandes",
                            subgroups: [
                                { code: "201", name: "Viandes de boucherie" },
                                { code: "202", name: "Viandes de volaille" },
                                { code: "203", name: "Abats" }
                            ]
                        },
                        {
                            code: "3",
                            name: "Poissons et produits de la mer",
                            subgroups: [
                                { code: "301", name: "Poissons" },
                                { code: "302", name: "Crustacés" },
                                { code: "303", name: "Mollusques" }
                            ]
                        },
                        {
                            code: "4",
                            name: "Fruits et légumes",
                            subgroups: [
                                { code: "401", name: "Fruits frais" },
                                { code: "402", name: "Légumes frais" },
                                { code: "403", name: "Fruits et légumes transformés" }
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
                        nutrition: {
                            energy: { value: 52, unit: "kcal" }
                        },
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
            .then(() => {
                showNotification('Résultat copié dans le presse-papiers !', 'success');
            })
            .catch(() => {
                showNotification('Échec de la copie', 'error');
            });
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

        // Simple validation - check if it looks like an API key
        if (text && text.startsWith('wm-fd') && text.length === 10) {
            if (input) {
                input.value = text;
                showNotification('Clé API collée !', 'success');
            }
        } else {
            showNotification('Le texte dans le presse-papiers ne ressemble pas à une clé API valide', 'error');
        }
    } catch (error) {
        console.error('Error reading clipboard:', error);
        showNotification('Impossible de lire le presse-papiers', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
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

    // Add styles if not already present
    if (!document.getElementById('wm-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'wm-notification-styles';
        style.textContent = `
            .wm-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: #1a1a1a;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 0.875rem;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
                z-index: 5000;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
            }

            .wm-notification-show {
                transform: translateY(0);
                opacity: 1;
            }

            .wm-notification button {
                margin-left: auto;
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .wm-notification-success {
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.1);
            }

            .wm-notification-error {
                border-color: #f87171;
                background: rgba(248, 113, 113, 0.1);
            }

            .wm-notification-info {
                border-color: #4d8fff;
                background: rgba(77, 143, 255, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('wm-notification-show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('wm-notification-show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
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

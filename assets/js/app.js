// Wikimind Food API - Application Principale
// Orchestre tous les modules et gère l'interface utilisateur

(function() {
  'use strict';

  // Attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  // Initialisation de l'application
  async function initApp() {
    try {
      // Attendre que tous les modules soient prêts
      await waitForModules();
      
      // Initialiser les modules
      setupEventListeners();
      setupNavigation();
      setupAuthUI();
      setupDashboard();
      setupCreateKeyForm();
      setupMyKeysTable();
      setupTestAPI();
      setupDocs();
      
      // Charger les données initiales
      loadInitialData();
      
      console.log('Wikimind Food API initialized successfully');
    } catch (error) {
      console.error('Error initializing Wikimind Food API:', error);
      showToast('Erreur lors de l\'initialisation de l\'application', 'error');
    }
  }

  // Attendre que les modules soient prêts
  function waitForModules() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.WikimindFoodAPIAuth && 
            window.WikimindFoodAPIAntiBot && 
            window.WikimindFoodAPIKeys &&
            window.firebaseDB) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // ========== NAVIGATION ==========
  function setupNavigation() {
    // Sidebar toggle
    const burger = document.getElementById('burger');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebar = document.getElementById('close-sidebar');

    if (burger && sidebar) {
      burger.addEventListener('click', () => {
        sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
      });
    }

    if (closeSidebar && sidebar) {
      closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
      });
    }

    // Navigation entre les sections
    const navItems = document.querySelectorAll('.conv-item[data-section]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.getAttribute('data-section');
        navigateToSection(section);
        
        // Fermer la sidebar sur mobile
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
          if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
      });
    });

    // Déconnexion
    const logoutItem = document.getElementById('logout-item');
    if (logoutItem) {
      logoutItem.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await window.WikimindFoodAPIAuth.logout();
          showToast('Déconnexion réussie', 'success');
        } catch (error) {
          showToast('Erreur lors de la déconnexion', 'error');
        }
      });
    }
  }

  // Naviguer vers une section
  function navigateToSection(section) {
    // Masquer toutes les sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.add('hidden'));
    
    // Afficher la section demandée
    const targetSection = document.getElementById(section + '-section');
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
    
    // Mettre à jour les items de navigation
    const navItems = document.querySelectorAll('.conv-item[data-section]');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-section') === section) {
        item.classList.add('active');
      }
    });
    
    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========== AUTHENTICATION UI ==========
  function setupAuthUI() {
    // Écouter les changements d'état d'authentification
    window.WikimindFoodAPIAuth.onAuthStateChange((authState) => {
      updateAuthUI(authState);
    });

    // Connexion avec email
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    
    if (loginForm && loginBtn) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('auth-error');
        
        if (loginBtn.classList.contains('loading')) return;
        
        loginBtn.classList.add('loading');
        loginBtn.innerHTML = '<span>Connexion en cours...</span><span class="btn-loading"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>';
        
        try {
          await window.WikimindFoodAPIAuth.loginWithEmail(email, password);
          if (errorElement) errorElement.classList.add('hidden');
        } catch (error) {
          if (errorElement) {
            errorElement.textContent = error.message || 'Erreur de connexion';
            errorElement.classList.remove('hidden');
          }
          showToast(error.message || 'Erreur de connexion', 'error');
        } finally {
          loginBtn.classList.remove('loading');
          loginBtn.innerHTML = '<span>Se connecter</span>';
        }
      });
    }

    // Inscription avec email
    const registerForm = document.getElementById('register-form');
    const registerBtn = document.getElementById('register-btn');
    
    if (registerForm && registerBtn) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const errorElement = document.getElementById('auth-error');
        
        if (password !== confirmPassword) {
          if (errorElement) {
            errorElement.textContent = 'Les mots de passe ne correspondent pas';
            errorElement.classList.remove('hidden');
          }
          return;
        }
        
        if (registerBtn.classList.contains('loading')) return;
        
        registerBtn.classList.add('loading');
        registerBtn.innerHTML = '<span>Inscription en cours...</span><span class="btn-loading"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>';
        
        try {
          await window.WikimindFoodAPIAuth.registerWithEmail(email, password);
          if (errorElement) errorElement.classList.add('hidden');
          showToast('Inscription réussie ! Bienvenue sur Wikimind Food API', 'success');
        } catch (error) {
          if (errorElement) {
            errorElement.textContent = error.message || 'Erreur d\'inscription';
            errorElement.classList.remove('hidden');
          }
          showToast(error.message || 'Erreur d\'inscription', 'error');
        } finally {
          registerBtn.classList.remove('loading');
          registerBtn.innerHTML = '<span>S\'inscrire</span>';
        }
      });
    }

    // Basculer entre connexion et inscription
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        // Mettre à jour les onglets
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Mettre à jour les formulaires
        const forms = document.querySelectorAll('.auth-form');
        forms.forEach(f => f.classList.add('hidden'));
        
        const targetForm = document.getElementById(tabId + '-form');
        if (targetForm) targetForm.classList.remove('hidden');
        
        // Effacer les erreurs
        const errorElement = document.getElementById('auth-error');
        if (errorElement) errorElement.classList.add('hidden');
      });
    });

    // Connexion avec Google
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', async () => {
        try {
          await window.WikimindFoodAPIAuth.loginWithGoogle();
        } catch (error) {
          showToast(error.message || 'Erreur de connexion avec Google', 'error');
        }
      });
    }

    // Mot de passe oublié
    const forgotPassword = document.getElementById('forgot-password');
    if (forgotPassword) {
      forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt('Entrez votre adresse email pour réinitialiser votre mot de passe:');
        if (email) {
          window.WikimindFoodAPIAuth.resetPassword(email)
            .then(() => {
              showToast('Un email de réinitialisation a été envoyé', 'success');
            })
            .catch(error => {
              showToast(error.message || 'Erreur lors de l\'envoi de l\'email', 'error');
            });
        }
      });
    }

    // Retour à la connexion
    const backToLogin = document.getElementById('back-to-login');
    if (backToLogin) {
      backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.auth-tab[data-tab="login"]').classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById('login-form').classList.remove('hidden');
      });
    }
  }

  // Mettre à jour l'UI en fonction de l'état d'authentification
  function updateAuthUI(authState) {
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const body = document.body;

    if (authState.isAuthenticated) {
      // Masquer la section auth
      if (authSection) authSection.classList.add('hidden');
      
      // Afficher le dashboard
      if (dashboardSection) dashboardSection.classList.remove('hidden');
      
      // Mettre à jour les infos utilisateur
      if (userName) {
        userName.textContent = authState.user.displayName || authState.user.email.split('@')[0];
      }
      
      if (userAvatar) {
        if (authState.user.photoURL) {
          userAvatar.innerHTML = `<img src="${authState.user.photoURL}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
          userAvatar.textContent = (authState.user.displayName || authState.user.email).charAt(0).toUpperCase();
        }
      }
      
      body.classList.add('auth-state');
      body.classList.remove('chat-empty-state');
      
      // Charger les données du dashboard
      loadDashboardData();
    } else {
      // Afficher la section auth
      if (authSection) authSection.classList.remove('hidden');
      
      // Masquer le dashboard
      if (dashboardSection) dashboardSection.classList.add('hidden');
      
      body.classList.remove('auth-state');
      body.classList.add('chat-empty-state');
    }
  }

  // ========== DASHBOARD ==========
  async function setupDashboard() {
    // Bouton de création rapide de clé
    const quickCreateKey = document.getElementById('quick-create-key');
    if (quickCreateKey) {
      quickCreateKey.addEventListener('click', () => {
        navigateToSection('create-key');
      });
    }

    // Bouton de test rapide de l'API
    const quickTestApi = document.getElementById('quick-test-api');
    if (quickTestApi) {
      quickTestApi.addEventListener('click', () => {
        navigateToSection('test-api');
      });
    }
  }

  // Charger les données du dashboard
  async function loadDashboardData() {
    try {
      // Charger le nombre total de clés
      const keysData = await window.WikimindFoodAPIKeys.listApiKeys();
      const totalKeysElement = document.getElementById('total-keys');
      if (totalKeysElement) {
        totalKeysElement.textContent = `${keysData.total} clé${keysData.total > 1 ? 's' : ''} active${keysData.total > 1 ? 's' : ''}`;
      }
      
      // Charger le nombre total d'aliments (à partir du JSON statique)
      // On va charger le fichier JSON depuis le repo GitHub
      try {
        const response = await fetch('https://raw.githubusercontent.com/WikimindAI/wikimind-food-API/main/food-data/wikimind-food-api.json');
        const foodData = await response.json();
        const totalFoodItemsElement = document.getElementById('total-food-items');
        if (totalFoodItemsElement) {
          totalFoodItemsElement.textContent = `${foodData.length} aliments`;
        }
      } catch (e) {
        console.error('Error loading food data:', e);
        const totalFoodItemsElement = document.getElementById('total-food-items');
        if (totalFoodItemsElement) {
          totalFoodItemsElement.textContent = 'Chargement...';
        }
      }
      
      // Charger les requêtes d'aujourd'hui (à implémenter)
      const todayRequestsElement = document.getElementById('today-requests');
      if (todayRequestsElement) {
        todayRequestsElement.textContent = '0 requêtes';
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  // ========== CREATE KEY FORM ==========
  function setupCreateKeyForm() {
    const form = document.getElementById('create-key-form');
    const nameInput = document.getElementById('key-name');
    const expirySelect = document.getElementById('key-expiry');
    const antiBotQuestion = document.getElementById('anti-bot-question');
    const antiBotAnswer = document.getElementById('anti-bot-answer');
    const submitBtn = document.getElementById('submit-create-key');
    const cancelBtn = document.getElementById('cancel-create-key');
    const modal = document.getElementById('key-created-modal');
    const newApiKeyElement = document.getElementById('new-api-key');
    const copyApiKeyBtn = document.getElementById('copy-api-key');
    const closeModalBtn = document.getElementById('close-key-modal');

    // Générer une nouvelle question anti-bot
    function loadNewAntiBotQuestion() {
      const question = window.WikimindFoodAPIAntiBot.getNewQuestion();
      if (antiBotQuestion) {
        antiBotQuestion.textContent = question.text;
      }
    }

    // Charger une question au démarrage
    loadNewAntiBotQuestion();

    // Soumission du formulaire
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = nameInput ? nameInput.value.trim() : '';
        const expiry = expirySelect ? expirySelect.value : '30';
        const answer = antiBotAnswer ? antiBotAnswer.value.trim() : '';
        
        if (!name) {
          showToast('Veuillez entrer un nom pour votre clé API', 'error');
          return;
        }
        
        if (!answer) {
          showToast('Veuillez répondre à la question anti-bot', 'error');
          return;
        }
        
        // Valider la réponse anti-bot
        const validation = window.WikimindFoodAPIAntiBot.validateAnswer(answer);
        
        if (!validation.success) {
          showToast(validation.message, 'error');
          loadNewAntiBotQuestion();
          if (antiBotAnswer) antiBotAnswer.value = '';
          return;
        }
        
        if (submitBtn.classList.contains('loading')) return;
        
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span>Création en cours...</span><span class="btn-loading"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>';
        
        try {
          const result = await window.WikimindFoodAPIKeys.createApiKey(name, expiry);
          
          // Afficher la modal avec la nouvelle clé
          if (newApiKeyElement) {
            newApiKeyElement.textContent = result.key;
          }
          if (modal) {
            modal.classList.remove('hidden');
          }
          
          showToast('Clé API créée avec succès !', 'success');
          
          // Réinitialiser le formulaire
          if (nameInput) nameInput.value = '';
          if (expirySelect) expirySelect.value = '30';
          if (antiBotAnswer) antiBotAnswer.value = '';
          loadNewAntiBotQuestion();
          
        } catch (error) {
          showToast(error.message || 'Erreur lors de la création de la clé API', 'error');
        } finally {
          submitBtn.classList.remove('loading');
          submitBtn.innerHTML = '<span>Créer la clé API</span>';
        }
      });
    }

    // Annuler
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        navigateToSection('dashboard');
      });
    }

    // Copier la clé API
    if (copyApiKeyBtn && newApiKeyElement) {
      copyApiKeyBtn.addEventListener('click', () => {
        const key = newApiKeyElement.textContent;
        navigator.clipboard.writeText(key).then(() => {
          showToast('Clé API copiée dans le presse-papiers', 'success');
          copyApiKeyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(() => {
            copyApiKeyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          }, 2000);
        }).catch(() => {
          showToast('Impossible de copier la clé API', 'error');
        });
      });
    }

    // Fermer la modal
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        navigateToSection('my-keys');
      });
    }

    // Fermer la modal en cliquant à l'extérieur
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          navigateToSection('my-keys');
        }
      });
    }
  }

  // ========== MY KEYS TABLE ==========
  async function setupMyKeysTable() {
    const tableBody = document.getElementById('keys-table-body');
    const refreshBtn = document.getElementById('refresh-keys');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const paginationInfo = document.getElementById('pagination-info');
    const searchInput = document.getElementById('keys-search');
    const createFirstKey = document.getElementById('create-first-key');

    let currentPage = 1;
    let currentPageSize = 10;
    let allKeys = [];
    let filteredKeys = [];

    // Charger les clés
    async function loadKeys() {
      try {
        const result = await window.WikimindFoodAPIKeys.listApiKeys(currentPage, currentPageSize);
        allKeys = result.keys;
        filteredKeys = [...allKeys];
        renderTable();
        updatePagination(result);
      } catch (error) {
        showToast(error.message || 'Erreur lors du chargement des clés API', 'error');
      }
    }

    // Rendre le tableau
    function renderTable() {
      if (!tableBody) return;

      if (filteredKeys.length === 0) {
        tableBody.innerHTML = '<tr class="empty-state"><td colspan="7">Aucune clé API trouvée. <a href="#" id="create-first-key">Créez votre première clé</a></td></tr>';
        
        const newCreateFirstKey = tableBody.querySelector('#create-first-key');
        if (newCreateFirstKey) {
          newCreateFirstKey.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection('create-key');
          });
        }
        return;
      }

      tableBody.innerHTML = filteredKeys.map(key => {
        const createdAt = new Date(key.createdAt).toLocaleDateString('fr-FR');
        const expiresAt = key.expiresAt ? new Date(key.expiresAt).toLocaleDateString('fr-FR') : 'Jamais';
        const maskedKey = maskApiKey(key.key);
        const status = getKeyStatus(key);
        
        return `
          <tr>
            <td>${escapeHtml(key.name)}</td>
            <td><code>${maskedKey}</code></td>
            <td>${createdAt}</td>
            <td>${expiresAt}</td>
            <td>${key.dailyUsage || 0}</td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            <td>
              <div class="action-btns">
                <button class="action-btn" title="Copier la clé" onclick="copyKey('${key.key}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="action-btn" title="Modifier le nom" onclick="renameKey('${key.key}', '${escapeHtml(key.name)}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="action-btn danger" title="Révoker la clé" onclick="revokeKey('${key.key}', '${escapeHtml(key.name)}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Obtenir le statut de la clé
    function getKeyStatus(key) {
      if (!key.isActive) {
        return { text: 'Révoquée', class: 'revoked' };
      }
      
      if (key.expiresAt && key.expiresAt < Date.now()) {
        return { text: 'Expirée', class: 'expired' };
      }
      
      return { text: 'Active', class: 'active' };
    }

    // Masquer la clé API
    function maskApiKey(key) {
      if (key.length <= 8) return key;
      return key.substring(0, 6) + '...' + key.substring(key.length - 4);
    }

    // Mettre à jour la pagination
    function updatePagination(result) {
      if (paginationInfo) {
        paginationInfo.textContent = `Page ${result.page} sur ${result.totalPages}`;
      }
      
      if (prevPageBtn) {
        prevPageBtn.disabled = result.page <= 1;
      }
      
      if (nextPageBtn) {
        nextPageBtn.disabled = result.page >= result.totalPages;
      }
    }

    // Filtrer les clés
    function filterKeys() {
      const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
      
      if (!searchTerm) {
        filteredKeys = [...allKeys];
      } else {
        filteredKeys = allKeys.filter(key => 
          key.name.toLowerCase().includes(searchTerm) ||
          key.key.toLowerCase().includes(searchTerm)
        );
      }
      
      currentPage = 1;
      renderTable();
      updatePagination({
        page: 1,
        totalPages: Math.ceil(filteredKeys.length / currentPageSize),
        total: filteredKeys.length
      });
    }

    // Charger les clés au démarrage
    loadKeys();

    // Rafraîchir
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadKeys);
    }

    // Pagination
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadKeys();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        currentPage++;
        loadKeys();
      });
    }

    // Recherche
    if (searchInput) {
      searchInput.addEventListener('input', filterKeys);
    }

    // Exposer les fonctions globales
    window.copyKey = function(key) {
      navigator.clipboard.writeText(key).then(() => {
        showToast('Clé API copiée dans le presse-papiers', 'success');
      }).catch(() => {
        showToast('Impossible de copier la clé API', 'error');
      });
    };

    window.renameKey = function(key, currentName) {
      const newName = prompt('Nouveau nom pour la clé API:', currentName);
      if (newName && newName.trim() !== currentName) {
        window.WikimindFoodAPIKeys.updateApiKeyName(key, newName.trim())
          .then(() => {
            showToast('Nom de la clé API mis à jour', 'success');
            loadKeys();
          })
          .catch(error => {
            showToast(error.message || 'Erreur lors de la mise à jour', 'error');
          });
      }
    };

    window.revokeKey = function(key, name) {
      const modal = document.getElementById('revoke-key-modal');
      const keyNameElement = document.getElementById('revoke-key-name');
      
      if (modal && keyNameElement) {
        keyNameElement.textContent = name || key;
        modal.classList.remove('hidden');
        
        // Gérer les boutons de la modal
        const confirmRevoke = document.getElementById('confirm-revoke');
        const cancelRevoke = document.getElementById('cancel-revoke');
        
        if (confirmRevoke) {
          confirmRevoke.onclick = async () => {
            try {
              await window.WikimindFoodAPIKeys.revokeApiKey(key);
              showToast('Clé API révoquée avec succès', 'success');
              modal.classList.add('hidden');
              loadKeys();
            } catch (error) {
              showToast(error.message || 'Erreur lors de la révocation', 'error');
              modal.classList.add('hidden');
            }
          };
        }
        
        if (cancelRevoke) {
          cancelRevoke.onclick = () => {
            modal.classList.add('hidden');
          };
        }
      }
    };
  }

  // ========== TEST API ==========
  function setupTestAPI() {
    const endpointSelect = document.getElementById('test-endpoint');
    const paramsContainer = document.getElementById('test-params-container');
    const apiKeyInput = document.getElementById('test-api-key-input');
    const testBtn = document.getElementById('test-api-btn');
    const resultStatus = document.getElementById('result-status');
    const resultTime = document.getElementById('result-time');
    const resultResponse = document.getElementById('result-response');
    const resultHeaders = document.getElementById('result-headers');
    const resultTabs = document.querySelectorAll('.result-tab');

    // Paramètres pour chaque endpoint
    const endpointParams = {
      'GET /api/food': [],
      'GET /api/food/{id': [
        { name: 'id', type: 'text', placeholder: 'Ex: 24999', required: true }
      ],
      'GET /api/food/search': [
        { name: 'q', type: 'text', placeholder: 'Terme de recherche', required: true },
        { name: 'limit', type: 'number', placeholder: 'Ex: 50', required: false }
      ],
      'GET /api/food/category': [
        { name: 'group', type: 'text', placeholder: 'Code du groupe', required: false },
        { name: 'subgroup', type: 'text', placeholder: 'Code du sous-groupe', required: false },
        { name: 'limit', type: 'number', placeholder: 'Ex: 100', required: false }
      ]
    };

    // Charger les paramètres en fonction de l'endpoint
    function loadParams() {
      if (!endpointSelect || !paramsContainer) return;
      
      const endpoint = endpointSelect.value;
      const params = endpointParams[endpoint] || [];
      
      paramsContainer.innerHTML = params.map(param => `
        <div class="form-group">
          <label for="param-${param.name}">${param.name} ${param.required ? '*' : ''}</label>
          <input type="${param.type}" id="param-${param.name}" placeholder="${param.placeholder}" ${param.required ? 'required' : ''}>
        </div>
      `).join('');
    }

    // Exécuter le test
    async function runTest() {
      if (!endpointSelect || !testBtn) return;

      const endpoint = endpointSelect.value;
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      
      // Obtenir les paramètres
      const params = {};
      const paramInputs = paramsContainer ? paramsContainer.querySelectorAll('input') : [];
      paramInputs.forEach(input => {
        const name = input.id.replace('param-', '');
        const value = input.value.trim();
        if (value) {
          params[name] = value;
        }
      });

      // Valider
      if (endpointParams[endpoint] && endpointParams[endpoint].some(p => p.required)) {
        const requiredParams = endpointParams[endpoint].filter(p => p.required);
        const missingParams = requiredParams.filter(p => !params[p.name]);
        
        if (missingParams.length > 0) {
          showToast(`Paramètre(s) manquant(s): ${missingParams.map(p => p.name).join(', ')}`, 'error');
          return;
        }
      }

      // Désactiver le bouton pendant le test
      testBtn.classList.add('loading');
      testBtn.innerHTML = '<span>Test en cours...</span><span class="btn-loading"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg></span>';
      
      // Réinitialiser les résultats
      if (resultStatus) resultStatus.textContent = 'Statut: -';
      if (resultTime) resultTime.textContent = 'Temps: -';
      if (resultResponse) resultResponse.textContent = '';
      if (resultHeaders) resultHeaders.textContent = '';

      try {
        const startTime = Date.now();
        const response = await callTestEndpoint(endpoint, params, apiKey);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Afficher les résultats
        if (resultStatus) {
          resultStatus.textContent = `Statut: ${response.status}`;
          resultStatus.style.color = response.status >= 200 && response.status < 300 ? 'var(--success)' : 'var(--danger)';
        }
        
        if (resultTime) {
          resultTime.textContent = `Temps: ${duration}ms`;
        }
        
        if (resultResponse) {
          resultResponse.textContent = JSON.stringify(response.data, null, 2);
        }
        
        if (resultHeaders) {
          const headersText = Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\n');
          resultHeaders.textContent = headersText || 'Aucun header';
        }
        
        showToast('Test API exécuté avec succès', 'success');
        
      } catch (error) {
        if (resultStatus) {
          resultStatus.textContent = `Statut: ${error.status || 'Erreur'}`;
          resultStatus.style.color = 'var(--danger)';
        }
        
        if (resultResponse) {
          resultResponse.textContent = error.message || String(error);
        }
        
        showToast(error.message || 'Erreur lors du test API', 'error');
      } finally {
        testBtn.classList.remove('loading');
        testBtn.innerHTML = '<span>Tester l\'API</span>';
      }
    }

    // Appeler l'endpoint de test
    async function callTestEndpoint(endpoint, params, apiKey) {
      // Utiliser les Cloud Functions ou une simulation
      // Pour le moment, on va simuler avec les données locales
      
      const baseUrl = window.location.origin;
      let url = `${baseUrl}/api${endpoint.replace('GET ', '')}`;
      
      // Ajouter les paramètres
      const queryParams = new URLSearchParams(params);
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      // Ajouter la clé API
      if (apiKey) {
        queryParams.set('api_key', apiKey);
        url = `${baseUrl}/api${endpoint.replace('GET ', '')}?${queryParams.toString()}`;
      }
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && !url.includes('api_key=') ? { 'X-API-Key': apiKey } : {})
          }
        });
        
        const data = await response.json();
        const headers = {};
        response.headers.forEach((value, name) => {
          headers[name] = value;
        });
        
        return {
          status: response.status,
          data: data,
          headers: headers
        };
      } catch (error) {
        // Si l'API n'est pas disponible, simuler avec les données locales
        if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
          return simulateEndpoint(endpoint, params);
        }
        throw error;
      }
    }

    // Simuler l'endpoint (pour le développement)
    function simulateEndpoint(endpoint, params) {
      // Charger les données depuis le JSON
      const foodData = window.foodData || [];
      
      if (endpoint === 'GET /api/food') {
        const limit = params.limit ? parseInt(params.limit) : 100;
        return {
          status: 200,
          data: {
            items: foodData.slice(0, limit),
            total: foodData.length,
            limit: limit,
            offset: 0
          },
          headers: {}
        };
      }
      
      if (endpoint === 'GET /api/food/{id}') {
        const id = params.id;
        const foodItem = foodData.find(item => item.id === id);
        
        if (!foodItem) {
          return {
            status: 404,
            data: { error: 'Food item not found' },
            headers: {}
          };
        }
        
        return {
          status: 200,
          data: foodItem,
          headers: {}
        };
      }
      
      if (endpoint === 'GET /api/food/search') {
        const query = params.q.toLowerCase();
        const limit = params.limit ? parseInt(params.limit) : 50;
        
        const results = foodData.filter(item => 
          item.names && item.names.fr && item.names.fr.toLowerCase().includes(query)
        ).slice(0, limit);
        
        return {
          status: 200,
          data: {
            items: results,
            total: results.length,
            query: query
          },
          headers: {}
        };
      }
      
      if (endpoint === 'GET /api/food/category') {
        const group = params.group;
        const subgroup = params.subgroup;
        const limit = params.limit ? parseInt(params.limit) : 100;
        
        const results = foodData.filter(item => {
          if (group && item.categories && item.categories.group_code !== group) return false;
          if (subgroup && item.categories && item.categories.subgroup_code !== subgroup) return false;
          return true;
        }).slice(0, limit);
        
        return {
          status: 200,
          data: {
            items: results,
            total: results.length
          },
          headers: {}
        };
      }
      
      return {
        status: 400,
        data: { error: 'Endpoint non reconnu' },
        headers: {}
      };
    }

    // Charger les paramètres au démarrage
    loadParams();

    // Changer d'endpoint
    if (endpointSelect) {
      endpointSelect.addEventListener('change', loadParams);
    }

    // Exécuter le test
    if (testBtn) {
      testBtn.addEventListener('click', runTest);
    }

    // Basculer entre les onglets de résultats
    resultTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        resultTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabId = tab.getAttribute('data-tab');
        if (tabId === 'response') {
          if (resultResponse) resultResponse.parentElement.classList.remove('hidden');
          if (resultHeaders) resultHeaders.parentElement.classList.add('hidden');
        } else if (tabId === 'headers') {
          if (resultResponse) resultResponse.parentElement.classList.add('hidden');
          if (resultHeaders) resultHeaders.parentElement.classList.remove('hidden');
        }
      });
    });

    // Préremplir avec la clé API de l'utilisateur si connecté
    if (apiKeyInput) {
      window.WikimindFoodAPIAuth.onAuthStateChange((authState) => {
        if (authState.isAuthenticated) {
          // On pourrait préremplir avec une clé par défaut, mais c'est plus sûr de laisser l'utilisateur choisir
          apiKeyInput.placeholder = 'Entrez votre clé API ou laissez vide pour utiliser une clé de test';
        } else {
          apiKeyInput.placeholder = 'wm-fd12345678';
        }
      });
    }
  }

  // ========== DOCUMENTATION ==========
  function setupDocs() {
    const navItems = document.querySelectorAll('.docs-nav-item');
    const sections = document.querySelectorAll('.docs-section');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.getAttribute('data-section');
        
        // Mettre à jour la navigation
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Mettre à jour les sections
        sections.forEach(section => {
          if (section.id === sectionId) {
            section.classList.remove('hidden');
          } else {
            section.classList.add('hidden');
          }
        });
      });
    });
  }

  // ========== LOAD INITIAL DATA ==========
  async function loadInitialData() {
    // Charger les données alimentaires depuis GitHub
    try {
      const response = await fetch('https://raw.githubusercontent.com/WikimindAI/wikimind-food-API/main/food-data/wikimind-food-api.json');
      const foodData = await response.json();
      window.foodData = foodData;
    } catch (error) {
      console.error('Error loading food data:', error);
      // Essayer de charger depuis un fallback
      try {
        const response = await fetch('assets/data/wikimind-food-api.json');
        const foodData = await response.json();
        window.foodData = foodData;
      } catch (e) {
        console.error('Error loading fallback food data:', e);
      }
    }
  }

  // ========== UTILITY FUNCTIONS ==========
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    
    toast.innerHTML = `
      ${icons[type] || ''}
      <span class="toast-message">${message}</span>
      <button class="toast-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Fermer le toast
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.remove();
      });
    }
    
    // Auto-fermeture après 5 secondes
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Exposer quelques fonctions globales
  window.navigateToSection = navigateToSection;
  window.showToast = showToast;
  window.escapeHtml = escapeHtml;
})();

// Wikimind Food API - Module d'Authentification
// Gère la connexion, l'inscription et la déconnexion des utilisateurs

(function() {
  'use strict';

  // Attendre que Firebase soit initialisé
  function waitForFirebase() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.firebaseAuth && window.firebaseAuthAuth) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // État de l'authentification
  const authState = {
    isAuthenticated: false,
    user: null,
    listeners: []
  };

  // Notifier les écouteurs
  function notifyListeners() {
    authState.listeners.forEach(listener => {
      try {
        listener(authState);
      } catch (e) {
        console.error('Error in auth listener:', e);
      }
    });
  }

  // S'abonner aux changements d'état
  function onAuthStateChange(listener) {
    authState.listeners.push(listener);
    // Retourner une fonction pour se désabonner
    return () => {
      const index = authState.listeners.indexOf(listener);
      if (index > -1) {
        authState.listeners.splice(index, 1);
      }
    };
  }

  // Mettre à jour l'état
  function updateAuthState(user) {
    authState.isAuthenticated = !!user;
    authState.user = user;
    
    // Sauvegarder dans localStorage
    if (user) {
      localStorage.setItem('wikimindFoodAPIUser', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0]
      }));
    } else {
      localStorage.removeItem('wikimindFoodAPIUser');
    }
    
    notifyListeners();
  }

  // Écouter les changements d'authentification Firebase
  function setupAuthListener() {
    // Utiliser authAuth pour l'authentification principale
    window.firebaseAuthAuth.onAuthStateChanged((user) => {
      updateAuthState(user);
      
      // Mettre à jour l'UI
      updateUI();
    });
  }

  // Mettre à jour l'interface utilisateur
  function updateUI() {
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const body = document.body;

    if (authState.isAuthenticated) {
      // Masquer la section auth, afficher le dashboard
      if (authSection) authSection.classList.add('hidden');
      if (dashboardSection) dashboardSection.classList.remove('hidden');
      
      // Mettre à jour les infos utilisateur
      if (userName) {
        userName.textContent = authState.user.displayName || authState.user.email.split('@')[0];
      }
      if (userAvatar) {
        if (authState.user.photoURL) {
          userAvatar.innerHTML = `<img src="${authState.user.photoURL}" alt="Avatar">`;
        } else {
          userAvatar.textContent = (authState.user.displayName || authState.user.email).charAt(0).toUpperCase();
        }
      }
      
      body.classList.add('auth-state');
      body.classList.remove('chat-empty-state');
    } else {
      // Afficher la section auth, masquer le dashboard
      if (authSection) authSection.classList.remove('hidden');
      if (dashboardSection) dashboardSection.classList.add('hidden');
      
      body.classList.remove('auth-state');
      body.classList.add('chat-empty-state');
    }
  }

  // Connexion avec email/mot de passe
  async function loginWithEmail(email, password) {
    try {
      const userCredential = await window.firebaseAuthAuth.signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      throw formatAuthError(error);
    }
  }

  // Inscription avec email/mot de passe
  async function registerWithEmail(email, password) {
    try {
      const userCredential = await window.firebaseAuthAuth.createUserWithEmailAndPassword(email, password);
      
      // Créer le profil utilisateur dans la base de données
      await createUserProfile(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      throw formatAuthError(error);
    }
  }

  // Créer le profil utilisateur dans Firebase Database
  async function createUserProfile(user) {
    try {
      const db = window.firebaseDB;
      const userRef = db.ref(`users/${user.uid}`);
      
      await userRef.set({
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        createdAt: Date.now(),
        lastLogin: Date.now(),
        apiKeys: [],
        isActive: true
      });
      
      // Créer un nœud pour stocker les clés API de cet utilisateur
      const apiKeysRef = db.ref(`api_keys_by_user/${user.uid}`);
      await apiKeysRef.set({});
    } catch (e) {
      console.error('Error creating user profile:', e);
    }
  }

  // Connexion avec Google
  async function loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const userCredential = await window.firebaseAuthAuth.signInWithPopup(provider);
      
      // Créer ou mettre à jour le profil utilisateur
      await createUserProfile(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      throw formatAuthError(error);
    }
  }

  // Déconnexion
  async function logout() {
    try {
      await window.firebaseAuthAuth.signOut();
      // Forcer la mise à jour de l'état
      updateAuthState(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Réinitialiser le mot de passe
  async function resetPassword(email) {
    try {
      await window.firebaseAuthAuth.sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      throw formatAuthError(error);
    }
  }

  // Formater les erreurs d'authentification
  function formatAuthError(error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    
    const messages = {
      'auth/invalid-email': 'Adresse email invalide',
      'auth/user-disabled': 'Ce compte a été désactivé',
      'auth/user-not-found': 'Utilisateur non trouvé',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
      'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas autorisée',
      'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
      'auth/invalid-credential': 'Identifiants invalides',
      'auth/popup-closed-by-user': 'Connexion annulée',
      'auth/cancelled-popup-request': 'Connexion annulée',
      'auth/popup-blocked': 'La fenêtre de connexion a été bloquée. Veuillez autoriser les popups.',
      'auth/network-request-failed': 'Erreur de connexion. Veuillez vérifier votre connexion internet.',
      'auth/internal-error': 'Une erreur interne est survenue. Veuillez réessayer.'
    };
    
    return {
      code: errorCode,
      message: messages[errorCode] || errorMessage || 'Une erreur est survenue'
    };
  }

  // Vérifier si l'utilisateur est connecté
  function isAuthenticated() {
    return authState.isAuthenticated;
  }

  // Récupérer l'utilisateur actuel
  function getCurrentUser() {
    return authState.user;
  }

  // Initialisation du module
  async function init() {
    await waitForFirebase();
    setupAuthListener();
    
    // Charger l'état depuis localStorage si Firebase n'a pas encore chargé
    const savedUser = localStorage.getItem('wikimindFoodAPIUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        // Cela déclenchera la mise à jour de l'UI
        // L'écouteur Firebase prendra le relais
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
  }

  // Exporter les fonctions publiques
  window.WikimindFoodAPIAuth = {
    init,
    onAuthStateChange,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    isAuthenticated,
    getCurrentUser,
    formatAuthError
  };

  // Initialiser automatiquement
  init();
})();

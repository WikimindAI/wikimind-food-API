// Configuration Firebase pour Wikimind Food API
// Ce fichier doit être chargé avant tout autre script utilisant Firebase

// Configuration principale pour wikimind-food-api (stockage des données)
const firebaseConfig = {
  apiKey: "AIzaSyB5BwEC69LUaPGtmLz4fuuD_jPXpB7B7mE",
  authDomain: "wikimind-food-api.firebaseapp.com",
  databaseURL: "https://wikimind-food-api-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wikimind-food-api",
  storageBucket: "wikimind-food-api.firebasestorage.app",
  messagingSenderId: "1045464204780",
  appId: "1:1045464204780:web:c17ed616c161a5482c2cc9"
};

// Configuration secondaire pour wikimind-3-comments (authentification)
const authFirebaseConfig = {
  apiKey: "AIzaSyD6qIOtKSx0Sl1Ht_a6ppLiMdKZRCc75tA",
  authDomain: "wikimind-3-comments.firebaseapp.com",
  databaseURL: "https://wikimind-3-comments-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wikimind-3-comments",
  storageBucket: "wikimind-3-comments.firebasestorage.app",
  messagingSenderId: "137479541640",
  appId: "1:137479541640:web:4ed2510a9908055052e03d"
};

// Initialisation des applications Firebase
let app, auth, db, authApp, authAuth;

function initializeFirebase() {
  // Initialiser l'application principale pour les données
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.app();
  }
  
  auth = firebase.auth(app);
  db = firebase.database(app);
  
  // Initialiser l'application d'authentification
  try {
    authApp = firebase.initializeApp(authFirebaseConfig, 'authApp');
    authAuth = firebase.auth(authApp);
  } catch (e) {
    console.log('Auth app already initialized');
    authApp = firebase.app('authApp');
    authAuth = firebase.auth(authApp);
  }
  
  // Configuration de la persistance pour l'authentification
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      console.error('Error setting auth persistence:', error);
    });
  
  authAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      console.error('Error setting auth persistence for authApp:', error);
    });
}

// Charger Firebase SDK dynamiquement si nécessaire
function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (typeof firebase !== 'undefined') {
      resolve();
      return;
    }
    
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
      script2.onload = () => {
        const script3 = document.createElement('script');
        script3.src = 'https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js';
        script3.onload = resolve;
        script3.onerror = reject;
        document.head.appendChild(script3);
      };
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

// Initialiser dès que le DOM est chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadFirebaseSDK().then(initializeFirebase);
  });
} else {
  loadFirebaseSDK().then(initializeFirebase);
}

// Exporter pour les autres modules
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseAuthApp = authApp;
window.firebaseAuthAuth = authAuth;

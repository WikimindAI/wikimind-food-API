# Wikimind Food API

> Une API complète pour accéder aux données nutritionnelles de la base CIQUAL 2025

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange.svg)](https://firebase.google.com/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen.svg)](https://pages.github.com/)

---

## 📖 Table des matières

- [🚀 Démarrage rapide](#-démarrage-rapide)
- [📡 Endpoints API](#-endpoints-api)
- [🔐 Authentification](#-authentification)
- [📋 Documentation](#-documentation)
- [🛠️ Déploiement](#️-déploiement)
- [🤝 Contribution](#-contribution)
- [📜 Licence](#-licence)

---

## 🚀 Démarrage rapide

### Prérequis

- Un compte [Firebase](https://firebase.google.com/)
- Node.js 20.x ou supérieur
- npm ou yarn

### Installation

1. **Cloner le dépôt**

   ```bash
   git clone https://github.com/WikimindAI/wikimind-food-API.git
   cd wikimind-food-API





Configurer Firebase

Allez sur Firebase Console
Créez un nouveau projet ou sélectionnez-en un existant
Activez Authentication (avec Email/Mot de passe et Google)
Activez Realtime Database
Activez Hosting


Configurer Firebase CLI
bash
Copier

npm install -g firebase-tools
firebase login
firebase use wikimind-3-comments  # ou votre projet Firebase





Installer les dépendances
bash
Copier

cd functions
npm install
cd ..





Configurer les règles de la base de données
Copiez le contenu de database.rules.json dans les règles de votre Realtime Database.


Déployer
bash
Copier

firebase deploy



Cela déployera :

Le site statique sur Firebase Hosting
Les fonctions cloud sur Firebase Functions


📡 Endpoints API


  
    
      Méthode
      Endpoint
      Description
    
  
  
    
      GET
      /api/food/search
      Rechercher des aliments
    
    
      GET
      /api/food/{id}
      Obtenir un aliment par ID
    
    
      GET
      /api/categories
      Lister les catégories
    
    
      GET
      /api/food/advanced
      Requête avancée
    
  



Paramètres communs
Tous les endpoints nécessitent le header suivant :
http
Copier

X-API-KEY: wm-fdXXXXXXXX




🔐 Authentification
1. Créer un compte

Allez sur la page de connexion
Inscrivez-vous avec votre email ou votre compte Google
2. Créer une clé API

Connectez-vous à votre tableau de bord
Cliquez sur "Créer une nouvelle clé API"
Donnez un nom à votre clé
Sélectionnez une durée d'expiration
Passez le test anti-bot
Copiez votre clé API (elle ne sera plus affichée après)
3. Utiliser votre clé API
Incluez votre clé API dans les headers de vos requêtes :
javascript
Copier

fetch('https://wikimind-food-api.web.app/api/food/search?query=pomme', {
  headers: {
    'X-API-KEY': 'wm-fd12345678'
  }
})
.then(response => response.json())
.then(data => console.log(data));




📋 Documentation
La documentation complète est disponible sur la page de documentation.
Elle inclut :

Des exemples détaillés pour chaque endpoint
Des exemples de code en JavaScript, Python, PHP et Node.js
Les limites et quotas
La gestion des erreurs

🛠️ Déploiement
Déploiement manuel


Déployer les fonctions
bash
Copier

cd functions
firebase deploy --only functions





Déployer le site
bash
Copier

firebase deploy --only hosting




Déploiement automatique avec GitHub Actions
Créez un fichier .github/workflows/deploy.yml :
yaml
Copier

name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Install dependencies
        run: |
          cd functions
          npm install
          cd ..

      - name: Deploy to Firebase
        run: firebase deploy --token \${{ secrets.FIREBASE_TOKEN }}
        env:
          FIREBASE_TOKEN: \${{ secrets.FIREBASE_TOKEN }}



Pour obtenir votre FIREBASE_TOKEN :
bash
Copier

firebase login\:ci




🤝 Contribution
Les contributions sont les bienvenues ! Voici comment contribuer :

Forker le projet
Créer une branche (git checkout -b feature/ma-fonctionnalité)
Commiter vos changements (git commit -m 'Ajout de ma fonctionnalité')
Pousser vers la branche (git push origin feature/ma-fonctionnalité)
Ouvrir une Pull Request
Structure du projet
text
Copier

wikimind-food-API/
├── public/              # Site statique
│   ├── index.html       # Page d'accueil
│   ├── auth.html        # Authentification
│   ├── dashboard.html   # Tableau de bord
│   ├── test-api.html    # Test de l'API
│   ├── docs.html        # Documentation
│   └── assets/          # CSS, JS, images
├── functions/           # Fonctions Firebase
│   ├── index.js        # Code des fonctions
│   └── package.json
├── firebase.json        # Configuration Firebase
├── .firebaserc          # Projet Firebase
└── README.md




📜 Licence
Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

📞 Contact
Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue ou à nous contacter :

GitHub : WikimindAI/wikimind-food-API
Email : contact@wikimind.ai

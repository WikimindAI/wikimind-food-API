# Wikimind Food API

[GitHub Pages](https://wikimind-ai.github.io/wikimind-food-API/)  
[License: MIT](https://opensource.org/licenses/MIT)  
[CIQUAL 2025](https://ciqual.anses.fr/)

**Wikimind Food API** est une API RESTful gratuite qui vous donne accès à une base de données complète d'aliments basée sur **CIQUAL 2025**, la table de composition nutritionnelle des aliments de référence en France.

## 📌 À propos du projet

### Fonctionnalités

✅ **Base de données complète** - Accès à plus de 2500 aliments avec leurs informations nutritionnelles  
✅ **Recherche avancée** - Recherchez par nom, catégorie ou ID  
✅ **Filtrage flexible** - Filtrez par groupe et sous-groupe alimentaire  
✅ **Système de clés API** - Générez et gérez vos propres clés d'accès  
✅ **Limites raisonnables** - 1000 requêtes/jour par clé API  
✅ **Interface web** - Tableau de bord pour gérer vos clés et tester l'API  
✅ **Documentation complète** - Exemples dans plusieurs langages

### Cas d'utilisation

- Développement d'applications nutritionnelles
- Intégration dans des sites web de recettes
- Analyse nutritionnelle d'aliments
- Recherche et comparaison d'aliments
- Développement d'applications de suivi alimentaire

### Données

Les données proviennent de **CIQUAL 2025**, la table de composition nutritionnelle des aliments de l'ANSES (Agence nationale de sécurité sanitaire de l'alimentation, de l'environnement et du travail).

Chaque aliment contient :

- Informations de base (ID, nom, catégorie)
- Valeurs énergétiques
- Macronutriments (glucides, lipides, protéines)
- Minéraux (calcium, fer, magnésium, etc.)
- Vitamines (A, B, C, D, E, K, etc.)
- Source et métadonnées

---

## 🚀 Démarrage rapide

### 1. Accéder à l'API

L'API est hébergée sur GitHub Pages et Firebase :

- **URL de l'API** : `https://wikimind-food-api.web.app/api`
- **Interface web** : [https://wikimind-ai.github.io/wikimind-food-API/](https://wikimind-ai.github.io/wikimind-food-API/)

### 2. Obtenir une clé API

1. Allez sur [l'interface web](https://wikimind-ai.github.io/wikimind-food-API/)
2. Créez un compte ou connectez-vous
3. Allez dans la section **"Créer une clé API"**
4. Remplissez le formulaire et passez le test anti-bot
5. Copiez votre nouvelle clé API (format : `wm-fd` + 8 chiffres)

### 3. Faire votre première requête

```bash
# Récupérer un aliment spécifique
curl -X GET "https://wikimind-food-api.web.app/api/food/24999" \
  -H "X-API-Key: VOTRE_CLE_API"
```

```javascript
// JavaScript (Fetch API)
const API_KEY = 'VOTRE_CLE_API';
const response = await fetch('https://wikimind-food-api.web.app/api/food/24999', {
  headers: { 'X-API-Key': API_KEY }
});
const data = await response.json();
console.log(data);
```

```python
# Python (requests)
import requests
API_KEY = 'VOTRE_CLE_API'
response = requests.get(
    'https://wikimind-food-api.web.app/api/food/24999',
    headers={'X-API-Key': API_KEY}
)
data = response.json()
print(data)
```

---

## 📂 Structure du projet

```
wikimind-food-API/
├── index.html                  # Page principale de l'interface web
├── assets/
│   ├── css/
│   │   └── style.css           # Styles CSS (thème sombre Wikimind)
│   └── js/
│       ├── firebase-config.js  # Configuration Firebase
│       ├── auth.js             # Gestion de l'authentification
│       ├── anti-bot.js         # Système anti-bot
│       ├── api-keys.js         # Gestion des clés API
│       └── app.js              # Logique principale de l'application
├── food-data/
│   └── wikimind-food-api.json  # Données alimentaires CIQUAL 2025
├── functions/
│   ├── index.js               # Cloud Functions (Firebase)
│   └── package.json
├── docs/
│   └── docs.md                # Documentation complète
├── .github/
│   └── workflows/
│       └── deploy.yml         # Workflow de déploiement
├── firebase.json              # Configuration Firebase
├── README.md                  # Ce fichier
└── LICENSE                    # Licence MIT
```

---

## 🛠 Installation et déploiement

### Prérequis

- Node.js 18+ (pour les Cloud Functions)
- Compte Firebase
- Compte GitHub

### 1. Cloner le dépôt

```bash
git clone https://github.com/WikimindAI/wikimind-food-API.git
cd wikimind-food-API
```

### 2. Configurer Firebase

#### Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Créez un nouveau projet (ex: `wikimind-food-api`)
3. Activez **Firebase Authentication** et **Realtime Database**

#### Configurer la Realtime Database

1. Allez dans **Realtime Database**
2. Créez une base de données (mode **test** pour le développement, **verrouillé** pour la production)
3. Importez les données depuis `food-data/wikimind-food-api.json`
4. Configurez les règles de sécurité (voir [firebase.rules.json](https://github.com/WikimindAI/wikimind-food-API/blob/main/firebase.rules.json))

#### Configurer l'authentification

1. Allez dans **Authentication**
2. Activez les méthodes de connexion :
  - Email/Mot de passe
  - Google (optionnel)

### 3. Déployer l'interface web (GitHub Pages)

1. Activez GitHub Pages dans les paramètres du dépôt
2. Sélectionnez la branche `main` ou `gh-pages`
3. Le site sera disponible à : `https://wikimind-ai.github.io/wikimind-food-API/`

### 4. Déployer les Cloud Functions (optionnel)

Pour une API plus robuste, vous pouvez déployer les Cloud Functions :

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser Firebase dans le projet
firebase init functions

# Installer les dépendances
cd functions
npm install

# Déployer les fonctions
firebase deploy --only functions
```

### 5. Configurer les variables d'environnement

Créez un fichier `.env` dans le dossier `functions/` :

```env
# Configuration Firebase
FIREBASE_PROJECT_ID=wikimind-food-api
FIREBASE_DATABASE_URL=https://wikimind-food-api-default-rtdb.europe-west1.firebasedatabase.app
```

---

## 📖 Documentation

La documentation complète est disponible :

- **[Documentation en ligne](https://wikimind-ai.github.io/wikimind-food-API/)** (via l'interface web)
- **[Fichier Markdown](docs/docs.md)** (dans le dépôt)

### Endpoints disponibles


| Méthode | Endpoint             | Description                          |
| ------- | -------------------- | ------------------------------------ |
| GET     | `/api/food`          | Liste des aliments (avec pagination) |
| GET     | `/api/food/{id}`     | Aliment spécifique                   |
| GET     | `/api/food/search`   | Recherche d'aliments                 |
| GET     | `/api/food/category` | Filtrer par catégorie                |
| GET     | `/api/categories`    | Liste des catégories                 |
| GET     | `/api/stats`         | Statistiques générales               |


### Gestion des clés API


| Méthode | Endpoint            | Description            |
| ------- | ------------------- | ---------------------- |
| GET     | `/api/keys`         | Lister ses clés API    |
| POST    | `/api/keys`         | Créer une nouvelle clé |
| DELETE  | `/api/keys/{keyId}` | Supprimer une clé      |


> ⚠️ **Note** : Les endpoints de gestion des clés nécessitent une authentification Firebase.

---

## 🔧 Configuration

### Règles de la base de données Firebase

Les règles de sécurité pour la Realtime Database sont définies dans `firebase.rules.json` :

```json
{
  "rules": {
    "api_keys": {
      ".read": "auth != null",
      "$key": {
        ".write": "auth != null && root.child('api_keys/' + $key + '/userId').val() === auth.uid"
      }
    },
    "food_data": {
      ".read": true,
      ".write": false
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

### Limites et quotas


| Type                         | Limite   | Période    |
| ---------------------------- | -------- | ---------- |
| Requêtes externes            | 1000     | par jour   |
| Requêtes par minute          | 60       | par minute |
| Requêtes depuis GitHub Pages | Illimité | -          |


---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voici comment contribuer :

### 1. Signaler un bug

Ouvrez une [issue](https://github.com/WikimindAI/wikimind-food-API/issues) avec :

- Une description détaillée
- Les étapes pour reproduire
- Le code utilisé
- La réponse de l'API

### 2. Proposer une amélioration

Ouvrez une [discussion](https://github.com/WikimindAI/wikimind-food-API/discussions) pour discuter de votre idée.

### 3. Contribuer au code

1. Forkez le dépôt
2. Créez une branche (`git checkout -b feature/ma-fonctionnalité`)
3. Commitez vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/ma-fonctionnalité`)
5. Ouvrez une Pull Request

### 4. Améliorer la documentation

La documentation est dans `docs/docs.md`. N'hésitez pas à la compléter ou à la corriger.

---

## 📜 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

```
MIT License

Copyright (c) 2026 Wikimind AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Remerciements

- **ANSES** pour la base de données [CIQUAL 2025](https://ciqual.anses.fr/)
- **Firebase** pour l'infrastructure backend
- **GitHub** pour l'hébergement du code et de la documentation
- Tous les contributeurs qui aident à améliorer ce projet

---

## 📞 Contact

- **Site web** : [https://wikimind.ai](https://wikimind.ai)
- **Email** : [support@wikimind.ai](mailto:support@wikimind.ai)
- **GitHub** : [WikimindAI](https://github.com/WikimindAI)
- **Twitter** : [@WikimindAI](https://twitter.com/WikimindAI)

---

*© 2026 Wikimind AI. Tous droits réservés.*

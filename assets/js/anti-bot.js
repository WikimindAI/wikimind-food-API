// Wikimind Food API - Module Anti-Bot
// Génère des tests aléatoires pour vérifier que l'utilisateur est humain

(function() {
  'use strict';

  // Liste des questions anti-bot avec différentes catégories
  const antiBotQuestions = [
    // Mathématiques simples
    {
      type: 'math',
      question: 'Quel est le résultat de 3 + 5 ?',
      answer: '8',
      options: ['7', '8', '9', '10']
    },
    {
      type: 'math',
      question: 'Quel est le résultat de 7 × 8 ?',
      answer: '56',
      options: ['48', '56', '64', '72']
    },
    {
      type: 'math',
      question: 'Quel est le résultat de 15 - 7 ?',
      answer: '8',
      options: ['6', '7', '8', '9']
    },
    {
      type: 'math',
      question: 'Quel est le résultat de 24 ÷ 6 ?',
      answer: '4',
      options: ['3', '4', '5', '6']
    },
    {
      type: 'math',
      question: 'Quel est le résultat de 5 + 12 ?',
      answer: '17',
      options: ['15', '16', '17', '18']
    },
    
    // Culture générale
    {
      type: 'knowledge',
      question: 'Quelle est la capitale de la France ?',
      answer: 'Paris',
      options: ['Londres', 'Berlin', 'Paris', 'Madrid']
    },
    {
      type: 'knowledge',
      question: 'Quel est le plus grand océan du monde ?',
      answer: 'Pacifique',
      options: ['Atlantique', 'Indien', 'Pacifique', 'Arctique']
    },
    {
      type: 'knowledge',
      question: 'Quel est le troisième mois de l\'année ?',
      answer: 'mars',
      options: ['février', 'mars', 'avril', 'mai']
    },
    {
      type: 'knowledge',
      question: 'Combien de continents y a-t-il sur Terre ?',
      answer: '7',
      options: ['5', '6', '7', '8']
    },
    {
      type: 'knowledge',
      question: 'Quel est l\'animal le plus rapide du monde ?',
      answer: 'guépard',
      options: ['lion', 'guépard', 'antilope', 'faucon']
    },
    
    // Logique
    {
      type: 'logic',
      question: 'Si tous les Bloops sont des Razzies et tous les Razzies sont des Lazzies, alors tous les Bloops sont des Lazzies. Vrai ou Faux ?',
      answer: 'Vrai',
      options: ['Vrai', 'Faux']
    },
    {
      type: 'logic',
      question: 'Quel nombre vient après : 2, 4, 8, 16, ... ?',
      answer: '32',
      options: ['24', '32', '64', '128']
    },
    {
      type: 'logic',
      question: 'Si un train électrique se déplace vers le nord à 100 km/h et que le vent souffle vers l\'est à 20 km/h, dans quelle direction la fumée s\'envole-t-elle ?',
      answer: 'Aucune, c\'est un train électrique',
      options: ['Nord', 'Est', 'Nord-Est', 'Aucune, c\'est un train électrique']
    },
    
    // Wikimind spécifique
    {
      type: 'wikimind',
      question: 'Que signifie "Wikimind" ? (répondez avec le premier mot)',
      answer: 'Wiki',
      options: ['Web', 'Wiki', 'Win', 'Wok']
    },
    {
      type: 'wikimind',
      question: 'Quel type de données cette API fournit-elle ?',
      answer: 'Aliments',
      options: ['Utilisateurs', 'Aliments', 'Vidéos', 'Musique']
    },
    {
      type: 'wikimind',
      question: 'Quel est le préfixe des clés API Wikimind Food ?',
      answer: 'wm-fd',
      options: ['wm-food', 'wm-fd', 'food-api', 'api-wm']
    },
    
    // Vrai ou Faux
    {
      type: 'boolean',
      question: 'Vrai ou Faux : 2 + 2 = 5',
      answer: 'Faux',
      options: ['Vrai', 'Faux']
    },
    {
      type: 'boolean',
      question: 'Vrai ou Faux : La Terre est plate',
      answer: 'Faux',
      options: ['Vrai', 'Faux']
    },
    {
      type: 'boolean',
      question: 'Vrai ou Faux : Paris est la capitale de l\'Espagne',
      answer: 'Faux',
      options: ['Vrai', 'Faux']
    },
    {
      type: 'boolean',
      question: 'Vrai ou Faux : L\'eau bout à 100°C à pression normale',
      answer: 'Vrai',
      options: ['Vrai', 'Faux']
    }
  ];

  // État actuel du test
  let currentQuestion = null;
  let currentAnswer = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  // Générer une question aléatoire
  function generateRandomQuestion() {
    // Mélanger le tableau
    const shuffled = [...antiBotQuestions].sort(() => 0.5 - Math.random());
    
    // Sélectionner une question
    currentQuestion = shuffled[0];
    
    // Mélanger les options
    const shuffledOptions = [...currentQuestion.options].sort(() => 0.5 - Math.random());
    
    return {
      question: currentQuestion.question,
      options: shuffledOptions,
      type: currentQuestion.type
    };
  }

  // Vérifier la réponse
  function checkAnswer(userAnswer) {
    attempts++;
    
    if (userAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim()) {
      currentAnswer = true;
      return {
        success: true,
        message: 'Réponse correcte !',
        attempts: attempts
      };
    } else {
      currentAnswer = false;
      return {
        success: false,
        message: attempts >= MAX_ATTEMPTS 
          ? 'Trop de tentatives. Veuillez réessayer plus tard.'
          : `Réponse incorrecte. ${MAX_ATTEMPTS - attempts} tentative(s) restante(s).`,
        attempts: attempts
      };
    }
  }

  // Réinitialiser le test
  function resetTest() {
    currentQuestion = null;
    currentAnswer = null;
    attempts = 0;
  }

  // Vérifier si le test est réussi
  function isTestPassed() {
    return currentAnswer === true;
  }

  // Obtenir la question actuelle
  function getCurrentQuestion() {
    return currentQuestion;
  }

  // Récupérer le nombre de tentatives restantes
  function getRemainingAttempts() {
    return MAX_ATTEMPTS - attempts;
  }

  // Obtenir une nouvelle question (pour l'interface)
  function getNewQuestion() {
    resetTest();
    const question = generateRandomQuestion();
    return {
      text: question.question,
      options: question.options,
      type: question.type
    };
  }

  // Valider une réponse (pour l'interface)
  function validateAnswer(userAnswer) {
    const result = checkAnswer(userAnswer);
    return result;
  }

  // Initialiser le module
  function init() {
    // Prégénérer une question au chargement
    generateRandomQuestion();
  }

  // Exporter les fonctions publiques
  window.WikimindFoodAPIAntiBot = {
    init,
    generateRandomQuestion,
    checkAnswer,
    resetTest,
    isTestPassed,
    getCurrentQuestion,
    getRemainingAttempts,
    getNewQuestion,
    validateAnswer,
    MAX_ATTEMPTS
  };

  // Initialiser automatiquement
  init();
})();

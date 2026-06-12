// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6qIOtKSx0Sl1Ht_a6ppLiMdKZRCc75tA",
    authDomain: "wikimind-3-comments.firebaseapp.com",
    databaseURL: "https://wikimind-3-comments-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "wikimind-3-comments",
    storageBucket: "wikimind-3-comments.firebasestorage.app",
    messagingSenderId: "137479541640",
    appId: "1:137479541640:web:4ed2510a9908055052e03d"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Export Firebase services
export { auth, database, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, ref, set, get, push, remove, onValue, query, orderByChild, limitToLast };

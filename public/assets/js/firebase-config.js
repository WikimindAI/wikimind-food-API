// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB5BwEC69LUaPGtmLz4fuuD_jPXpB7B7mE",
    authDomain: "wikimind-food-api.firebaseapp.com",
    databaseURL: "https://wikimind-food-api-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "wikimind-food-api",
    storageBucket: "wikimind-food-api.firebasestorage.app",
    messagingSenderId: "1045464204780",
    appId: "1:1045464204780:web:c17ed616c161a5482c2cc9",
    measurementId: "G-W2F98GE2PS"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Export Firebase services
export { auth, database, googleProvider, analytics, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, ref, set, get, push, remove, onValue, query, orderByChild, limitToLast };

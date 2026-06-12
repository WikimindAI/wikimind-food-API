import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';
import { database, ref, set, get } from './firebase-config.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTabs = document.querySelectorAll('.wm-auth-tab');
const authForms = document.querySelectorAll('.wm-auth-form');
const userBtn = document.getElementById('userBtn');
const userDropdown = document.getElementById('userDropdown');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const authLink = document.getElementById('authLink');
const userMenu = document.getElementById('userMenu');

// Current user state
let currentUser = null;

// Initialize authentication
function initAuth() {
    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.getAttribute('data-tab');

            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active form
            authForms.forEach(f => f.classList.remove('active'));
            document.querySelector(`[data-form="${targetForm}"]`).classList.add('active');
        });
    });

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Auth state listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(user);

        // Save user to database if new
        if (user && !user.emailVerified) {
            saveUserToDatabase(user);
        }
    });

    // User dropdown toggle
    if (userBtn && userDropdown) {
        userBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('open');
        });
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !password) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    // Show loading
    loginBtn.querySelector('.wm-btn-text').style.display = 'none';
    loginBtn.querySelector('.wm-btn-loader').style.display = 'block';
    loginBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('Connexion réussie !', 'success');
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Erreur de connexion';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Utilisateur non trouvé';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Mot de passe incorrect';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Adresse e-mail invalide';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Compte désactivé';
                break;
        }

        showNotification(errorMessage, 'error');
    } finally {
        // Hide loading
        loginBtn.querySelector('.wm-btn-text').style.display = 'block';
        loginBtn.querySelector('.wm-btn-loader').style.display = 'none';
        loginBtn.disabled = false;
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const terms = document.getElementById('registerTerms').checked;
    const registerBtn = document.getElementById('registerBtn');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (!terms) {
        showNotification('Veuillez accepter les conditions d\'utilisation', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Le mot de passe doit contenir au moins 8 caractères', 'error');
        return;
    }

    // Show loading
    registerBtn.querySelector('.wm-btn-text').style.display = 'none';
    registerBtn.querySelector('.wm-btn-loader').style.display = 'block';
    registerBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user profile with name
        await updateUserProfile(user, { displayName: name });

        // Save user to database
        await saveUserToDatabase(user, { name });

        showNotification('Inscription réussie ! Vous êtes maintenant connecté.', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Erreur d\'inscription';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Cette adresse e-mail est déjà utilisée';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Adresse e-mail invalide';
                break;
            case 'auth/weak-password':
                errorMessage = 'Mot de passe trop faible';
                break;
        }

        showNotification(errorMessage, 'error');
    } finally {
        // Hide loading
        registerBtn.querySelector('.wm-btn-text').style.display = 'block';
        registerBtn.querySelector('.wm-btn-loader').style.display = 'none';
        registerBtn.disabled = false;
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        await signInWithPopup(auth, googleProvider);
        showNotification('Connexion avec Google réussie !', 'success');
    } catch (error) {
        console.error('Google sign-in error:', error);
        showNotification('Erreur de connexion avec Google', 'error');
    }
}

// Sign out
async function signOutUser() {
    try {
        await signOut(auth);
        showNotification('Déconnexion réussie', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
        showNotification('Erreur de déconnexion', 'error');
    }
}

// Update user profile
async function updateUserProfile(user, profileData) {
    // In a real app, you would use updateProfile from firebase/auth
    // For now, we'll just save to our database
    return true;
}

// Save user to database
async function saveUserToDatabase(user, additionalData = {}) {
    const userRef = ref(database, `users/${user.uid}`);

    const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.name || '',
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        apiKeys: [],
        ...additionalData
    };

    try {
        await set(userRef, userData);
        console.log('User saved to database:', user.uid);
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

// Update auth UI
function updateAuthUI(user) {
    if (user) {
        // User is logged in
        if (authLink) authLink.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';

        // Update user info
        if (userAvatar) {
            const initials = (user.displayName || user.email || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            userAvatar.textContent = initials || 'U';
        }

        if (userName) {
            userName.textContent = user.displayName || user.email || 'Utilisateur';
        }
    } else {
        // User is not logged in
        if (authLink) authLink.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
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

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('wm-notification-show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('wm-notification-show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initAuth);

// Export functions for global access
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOutUser;
window.currentUser = () => currentUser;

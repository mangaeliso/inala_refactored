import { firebaseAuth as auth } from './firebase.js';

// Import auth methods dynamically to match your Firebase version
let signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged;

async function loadAuthMethods() {
    const authModule = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js');
    signInWithPopup = authModule.signInWithPopup;
    GoogleAuthProvider = authModule.GoogleAuthProvider;
    signOut = authModule.signOut;
    onAuthStateChanged = authModule.onAuthStateChanged;
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.initialized = false;
        
        // Authorized users with roles
        this.authorizedUsers = {
            'mangaliso.s@gmail.com': 'admin',
            'lenye@example.com': 'manager'
        };
    }

    // Initialize authentication
    async initialize() {
        if (this.initialized) return;
        
        console.log('🔐 Initializing authentication...');
        
        // Load auth methods
        await loadAuthMethods();
        
        this.initialized = true;
        
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.handleUserLogin(user);
            } else {
                this.showLoginScreen();
            }
        });
    }

    // Handle user login
    handleUserLogin(user) {
        const userEmail = user.email;
        
        // Check if user is authorized
        if (this.authorizedUsers[userEmail]) {
            this.currentUser = user;
            this.userRole = this.authorizedUsers[userEmail];
            
            console.log(`✅ User logged in: ${userEmail} (${this.userRole})`);
            this.hideLoginScreen();
            this.applyRolePermissions();
            
            // Initialize app
            if (window.app) {
                window.app.initialize();
            }
        } else {
            // Unauthorized user
            console.warn('⚠️ Unauthorized user attempted login:', userEmail);
            this.showUnauthorizedMessage(userEmail);
            this.logout();
        }
    }

    // Show login screen
    showLoginScreen() {
        const appContainer = document.querySelector('.container');
        if (!appContainer) return;
        
        // Hide main app
        appContainer.style.display = 'none';
        
        // Create or show login screen
        let loginScreen = document.getElementById('login-screen');
        if (!loginScreen) {
            loginScreen = document.createElement('div');
            loginScreen.id = 'login-screen';
            loginScreen.innerHTML = `
                <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1rem;">
                    <div style="background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; width: 100%; text-align: center;">
                        <h1 style="font-family: 'Dancing Script', cursive; color: #667eea; font-size: 3rem; margin-bottom: 0.5rem;">
                            INALA HOLDINGS
                        </h1>
                        <p style="color: #6b7280; margin-bottom: 2rem; font-size: 0.875rem;">
                            Next-Generation Business Management
                        </p>
                        
                        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
                            <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; color: #667eea;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <h2 style="color: #1f2937; font-size: 1.25rem; margin-bottom: 0.5rem;">Secure Access Required</h2>
                            <p style="color: #6b7280; font-size: 0.875rem;">
                                Sign in with your authorized Google account
                            </p>
                        </div>

                        <button id="google-signin-btn" style="width: 100%; background: white; border: 2px solid #e5e7eb; color: #1f2937; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.2s; font-size: 1rem;">
                            <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Sign in with Google
                        </button>

                        <p style="margin-top: 2rem; font-size: 0.75rem; color: #9ca3af;">
                            Only authorized personnel can access this system
                        </p>
                    </div>
                </div>
            `;
            document.body.appendChild(loginScreen);
        }
        
        loginScreen.style.display = 'block';
        
        // Attach sign-in handler
        const signInBtn = document.getElementById('google-signin-btn');
        if (signInBtn) {
            signInBtn.onclick = () => this.signInWithGoogle();
        }
    }

    // Hide login screen
    hideLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        const appContainer = document.querySelector('.container');
        if (appContainer) {
            appContainer.style.display = 'block';
        }
        
        // Show user info
        this.showUserInfo();
    }

    // Sign in with Google
    async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const signInBtn = document.getElementById('google-signin-btn');
        
        try {
            if (signInBtn) {
                signInBtn.disabled = true;
                signInBtn.innerHTML = '<span style="margin: 0 auto;">Signing in...</span>';
            }
            
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Sign in error:', error);
            if (signInBtn) {
                signInBtn.disabled = false;
                signInBtn.innerHTML = `
                    <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                `;
            }
            alert('Sign in failed. Please try again.');
        }
    }

    // Show unauthorized message
    showUnauthorizedMessage(email) {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.innerHTML = `
                <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1rem;">
                    <div style="background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; width: 100%; text-align: center;">
                        <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                            <svg style="width: 32px; height: 32px; color: #ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <h2 style="color: #1f2937; font-size: 1.5rem; margin-bottom: 1rem;">Access Denied</h2>
                        <p style="color: #6b7280; margin-bottom: 1rem;">
                            The account <strong>${email}</strong> is not authorized to access this system.
                        </p>
                        <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 2rem;">
                            Please contact the administrator if you believe this is an error.
                        </p>
                        <button onclick="location.reload()" style="width: 100%; background: #667eea; color: white; padding: 0.875rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Show user info as floating element
    showUserInfo() {
        if (!this.currentUser) return;
        
        let userInfo = document.getElementById('user-info');
        if (!userInfo) {
            userInfo = document.createElement('div');
            userInfo.id = 'user-info';
            userInfo.style.cssText = 'position: fixed; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: white; border-radius: 8px; font-size: 0.875rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; border: 1px solid #e5e7eb;';
            document.body.appendChild(userInfo);
        }
        
        const roleBadge = this.userRole === 'admin' ? '👑 Admin' : '👤 Manager';
        const roleColor = this.userRole === 'admin' ? '#fbbf24' : '#60a5fa';
        
        userInfo.innerHTML = `
            <img src="${this.currentUser.photoURL}" alt="User" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #e5e7eb;">
            <div style="flex: 1; min-width: 120px;">
                <div style="font-weight: 600; color: #1f2937; font-size: 0.875rem;">${this.currentUser.displayName}</div>
                <div style="font-size: 0.7rem; color: #6b7280;">${this.currentUser.email}</div>
            </div>
            <span style="background: ${roleColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600; font-size: 0.7rem; white-space: nowrap;">
                ${roleBadge}
            </span>
            <button onclick="window.auth.logout()" style="background: #ef4444; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.75rem; white-space: nowrap;">
                Logout
            </button>
        `;
    }

    // Apply role-based permissions
    applyRolePermissions() {
        if (this.userRole === 'manager') {
            // Managers cannot access Admin tab
            setTimeout(() => {
                const adminTab = document.querySelector('[data-tab="admin"]');
                if (adminTab) {
                    adminTab.style.display = 'none';
                }
            }, 100);
            
            console.log('📋 Manager permissions applied');
        } else {
            console.log('👑 Admin permissions applied - Full access');
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(auth);
            console.log('👋 User logged out');
            location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Check if user has permission
    hasPermission(requiredRole) {
        if (requiredRole === 'admin') {
            return this.userRole === 'admin';
        }
        return true;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get user role
    getUserRole() {
        return this.userRole;
    }
}

// Create and export singleton instance
export const authManager = new AuthManager();

// Make it globally accessible for logout button
window.auth = authManager;
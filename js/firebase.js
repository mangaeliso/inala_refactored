import { firebaseConfig } from './config.js';

// Firebase imports - declare once
let app, db, auth, firestoreModules;

async function initializeFirebase() {
    try {
        // Import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js');
        const firestoreImports = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js');
        const authImports = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js');
        
        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        db = firestoreImports.getFirestore(app);
        auth = authImports.getAuth(app);
        
        // Store Firestore modules for use throughout the app
        firestoreModules = {
            collection: firestoreImports.collection,
            addDoc: firestoreImports.addDoc,
            getDocs: firestoreImports.getDocs,
            getDoc: firestoreImports.getDoc,           // ADDED
            setDoc: firestoreImports.setDoc,           // ADDED
            deleteDoc: firestoreImports.deleteDoc,
            doc: firestoreImports.doc,
            updateDoc: firestoreImports.updateDoc,
            query: firestoreImports.query,
            where: firestoreImports.where,
            orderBy: firestoreImports.orderBy,
            limit: firestoreImports.limit,
            serverTimestamp: firestoreImports.serverTimestamp
        };
        
        console.log('✅ Firebase initialized successfully');
        return { app, db, auth, firestoreModules };
        
    } catch (error) {
        console.warn('⚠️ Firebase initialization failed, using localStorage fallback:', error.message);
        return { app: null, db: null, auth: null, firestoreModules: null };
    }
}

// Initialize and export
const firebaseInstance = await initializeFirebase();
export const { app: firebaseApp, db: firebaseDb, auth: firebaseAuth, firestoreModules: firestore } = firebaseInstance;

// Helper function to check if Firebase is available
export function isFirebaseAvailable() {
    return firebaseDb !== null && firestore !== null;
}
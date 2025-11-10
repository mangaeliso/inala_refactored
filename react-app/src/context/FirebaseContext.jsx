import { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

const FirebaseContext = createContext(null);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within FirebaseProvider');
  }
  return context;
};

export const FirebaseProvider = ({ children }) => {
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [firebaseDb, setFirebaseDb] = useState(null);
  const [firebaseAuth, setFirebaseAuth] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const auth = getAuth(app);

      setFirebaseApp(app);
      setFirebaseDb(db);
      setFirebaseAuth(auth);
      setIsAvailable(true);

      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.warn('⚠️ Firebase initialization failed, using localStorage fallback:', error.message);
      setIsAvailable(false);
    }
  }, []);

  const value = {
    app: firebaseApp,
    db: firebaseDb,
    auth: firebaseAuth,
    isAvailable,
    firestore: {
      collection,
      addDoc,
      getDocs,
      doc,
      updateDoc,
      deleteDoc,
      setDoc,
      query,
      where,
      serverTimestamp
    }
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

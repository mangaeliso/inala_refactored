import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useFirebase } from './FirebaseContext';

const AppContext = createContext(null);

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const firebase = useFirebase();

  const [salesData, setSalesData] = useState([]);
  const [expenditureData, setExpenditureData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [householdBillsData, setHouseholdBillsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const showNotification = useCallback((message, type = 'info') => {
    const existing = document.querySelectorAll('.app-notification');
    existing.forEach(n => n.remove());

    const colors = {
      success: { bg: '#d1fae5', border: '#10b981', text: '#065f46', icon: '✅' },
      error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '❌' },
      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
      info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' }
    };

    const color = colors[type] || colors.info;
    const notification = document.createElement('div');
    notification.className = 'app-notification';
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: ${color.bg}; color: ${color.text};
      padding: 1rem 1.5rem; border-radius: 8px;
      border-left: 4px solid ${color.border};
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      z-index: 10000; max-width: 400px;
      animation: slideIn 0.3s ease-out;
      display: flex; align-items: center; gap: 0.75rem;
      font-weight: 500;
    `;
    notification.innerHTML = `
      <span style="font-size: 1.5rem;">${color.icon}</span>
      <span style="flex: 1;">${message}</span>
      <button style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: ${color.text}; opacity: 0.7;">&times;</button>
    `;

    notification.querySelector('button').addEventListener('click', () => notification.remove());

    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }, []);

  const formatCurrency = (amount) => {
    return `R${parseFloat(amount || 0).toFixed(2)}`;
  };

  const saveData = useCallback(async (collectionName, data) => {
    if (firebase.isAvailable && firebase.db) {
      try {
        const cleanData = {};
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            cleanData[key] = data[key];
          }
        });

        cleanData.created_at = cleanData.created_at || new Date().toISOString();
        if (currentUser) {
          cleanData.created_by = cleanData.created_by || currentUser.email;
          cleanData.created_by_name = cleanData.created_by_name || currentUser.displayName || currentUser.email;
        }

        const docRef = await firebase.firestore.addDoc(
          firebase.firestore.collection(firebase.db, collectionName),
          {
            ...cleanData,
            timestamp: firebase.firestore.serverTimestamp()
          }
        );

        console.log(`✅ Saved to Firebase: ${collectionName} - ${docRef.id}`);
        await loadAllData();
        return docRef.id;
      } catch (error) {
        console.error(`❌ Firebase save error for ${collectionName}:`, error);
        return saveToLocalStorage(collectionName, data);
      }
    } else {
      return saveToLocalStorage(collectionName, data);
    }
  }, [firebase, currentUser]);

  const saveToLocalStorage = (collectionName, data) => {
    const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
    const newRecord = {
      ...data,
      id: data.id || Date.now().toString(),
      created_at: data.created_at || new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    if (currentUser) {
      newRecord.created_by = newRecord.created_by || currentUser.email;
      newRecord.created_by_name = newRecord.created_by_name || currentUser.displayName || currentUser.email;
    }

    existing.push(newRecord);
    localStorage.setItem(collectionName, JSON.stringify(existing));

    updateLocalCache(collectionName, existing);

    console.log(`💾 Saved to localStorage: ${collectionName}`);
    return newRecord.id;
  };

  const updateLocalCache = (collectionName, data) => {
    switch (collectionName) {
      case 'sales':
        setSalesData(data);
        break;
      case 'expenditure':
        setExpenditureData(data);
        break;
      case 'payments':
        setPaymentsData(data);
        break;
      case 'customers':
        setCustomersData(data);
        break;
      case 'household_bills':
        setHouseholdBillsData(data);
        break;
    }
  };

  const loadAllData = useCallback(async () => {
    if (firebase.isAvailable && firebase.db) {
      try {
        const [salesSnap, expenseSnap, paymentsSnap, customersSnap, billsSnap] = await Promise.all([
          firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'sales')),
          firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'expenditure')),
          firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'payments')),
          firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'customers')),
          firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'household_bills'))
        ]);

        const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const expenses = expenseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const bills = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setSalesData(sales);
        setExpenditureData(expenses);
        setPaymentsData(payments);
        setCustomersData(customers);
        setHouseholdBillsData(bills);

        console.log(`📊 Loaded from Firebase: ${sales.length} sales, ${expenses.length} expenses, ${payments.length} payments`);
      } catch (error) {
        console.error('❌ Error loading from Firebase:', error);
        loadFromLocalStorage();
      }
    } else {
      loadFromLocalStorage();
    }
  }, [firebase]);

  const loadFromLocalStorage = () => {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const expenses = JSON.parse(localStorage.getItem('expenditure') || '[]');
    const payments = JSON.parse(localStorage.getItem('payments') || '[]');
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const bills = JSON.parse(localStorage.getItem('household_bills') || '[]');

    setSalesData(sales);
    setExpenditureData(expenses);
    setPaymentsData(payments);
    setCustomersData(customers);
    setHouseholdBillsData(bills);

    console.log(`💾 Loaded from localStorage: ${sales.length} sales, ${expenses.length} expenses, ${payments.length} payments`);
  };

  const clearAllTransactions = useCallback(async () => {
    if (firebase.isAvailable && firebase.db) {
      try {
        const salesSnapshot = await firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'sales'));
        await Promise.all(salesSnapshot.docs.map(docSnapshot =>
          firebase.firestore.deleteDoc(firebase.firestore.doc(firebase.db, 'sales', docSnapshot.id))
        ));

        const expensesSnapshot = await firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'expenditure'));
        await Promise.all(expensesSnapshot.docs.map(docSnapshot =>
          firebase.firestore.deleteDoc(firebase.firestore.doc(firebase.db, 'expenditure', docSnapshot.id))
        ));

        const paymentsSnapshot = await firebase.firestore.getDocs(firebase.firestore.collection(firebase.db, 'payments'));
        await Promise.all(paymentsSnapshot.docs.map(docSnapshot =>
          firebase.firestore.deleteDoc(firebase.firestore.doc(firebase.db, 'payments', docSnapshot.id))
        ));

        console.log(`🗑️ Cleared transactions from Firebase`);
      } catch (error) {
        console.error('❌ Error clearing transactions from Firebase:', error);
      }
    }

    localStorage.removeItem('sales');
    localStorage.removeItem('expenditure');
    localStorage.removeItem('payments');

    setSalesData([]);
    setExpenditureData([]);
    setPaymentsData([]);

    console.log('🗑️ Cleared transactions from localStorage');
  }, [firebase]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const value = {
    salesData,
    expenditureData,
    paymentsData,
    customersData,
    householdBillsData,
    isLoading,
    currentUser,
    setCurrentUser,
    showNotification,
    formatCurrency,
    saveData,
    loadAllData,
    clearAllTransactions,
    getSales: () => salesData,
    getExpenditures: () => expenditureData,
    getPayments: () => paymentsData,
    getCustomers: () => customersData,
    getHouseholdBills: () => householdBillsData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

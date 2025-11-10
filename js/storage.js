import { firebaseDb, firestore, isFirebaseAvailable } from './firebase.js';

class StorageManager {
    constructor() {
        this.salesData = [];
        this.expenditureData = [];
        this.customersData = [];
        this.paymentsData = [];
        this.householdBillsData = [];
        this.dataSource = null;
        this.pendingSaves = new Map();
    }

    // ------------------------------
    // Generic Save Methods
    // ------------------------------

    async saveData(collectionName, data) {
        const saveKey = this.createSaveKey(collectionName, data);
        
        if (this.pendingSaves.has(saveKey)) {
            console.warn(`⚠️ Save already in progress for ${collectionName}, skipping:`, data);
            return null;
        }

        this.pendingSaves.set(saveKey, true);

        try {
            const existingData = this.getCollectionData(collectionName);
            const duplicate = this.findDuplicate(collectionName, data, existingData);
            
            if (duplicate) {
                console.warn(`⚠️ Duplicate detected in ${collectionName}, skipping save:`, data);
                return null;
            }

            if (isFirebaseAvailable()) {
                return await this.saveToFirebase(collectionName, data);
            } else {
                return this.saveToLocalStorage(collectionName, data);
            }
        } finally {
            this.pendingSaves.delete(saveKey);
        }
    }

    createSaveKey(collectionName, data) {
        const timestamp = Date.now();
        if (collectionName === 'sales') {
            return `sales_${data.date}_${data.product}_${data.quantity}_${data.price}_${data.customer_name}_${timestamp}`;
        }
        return `${collectionName}_${JSON.stringify(data)}_${timestamp}`;
    }

    getCollectionData(collectionName) {
        switch (collectionName) {
            case 'sales': return this.salesData;
            case 'expenditure': return this.expenditureData;
            case 'payments': return this.paymentsData;
            case 'customers': return this.customersData;
            case 'household_bills': return this.householdBillsData;
            default: return [];
        }
    }

    findDuplicate(collectionName, newData, existingData) {
        if (!existingData || !Array.isArray(existingData)) return false;
        
        const now = Date.now();
        
        if (collectionName === 'sales') {
            return existingData.some(existing => {
                const timeDiff = Math.abs(new Date(existing.created_at).getTime() - now);
                return existing.product === newData.product &&
                       existing.quantity === newData.quantity &&
                       existing.price === newData.price &&
                       existing.date === newData.date &&
                       existing.customer_name === newData.customer_name &&
                       timeDiff < 300000;
            });
        }
        
        if (collectionName === 'payments') {
            return existingData.some(existing => {
                const timeDiff = Math.abs(new Date(existing.created_at).getTime() - now);
                return existing.amount === newData.amount &&
                       existing.customer_name === newData.customer_name &&
                       existing.date === newData.date &&
                       timeDiff < 300000;
            });
        }
        
        return existingData.some(existing => {
            const timeDiff = Math.abs(new Date(existing.created_at).getTime() - now);
            return JSON.stringify(existing) === JSON.stringify(newData) ||
                   timeDiff < 60000;
        });
    }

    async saveToFirebase(collectionName, data) {
        try {
            const { collection, addDoc, serverTimestamp } = firestore;

            const cleanData = {
                ...data,
                created_at: data.created_at || new Date().toISOString()
            };

            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            if (window.app?.currentUser) {
                cleanData.created_by = cleanData.created_by || window.app.currentUser.email;
                cleanData.created_by_name = cleanData.created_by_name || window.app.currentUser.displayName || window.app.currentUser.email;
            }

            const docRef = await addDoc(collection(firebaseDb, collectionName), {
                ...cleanData,
                timestamp: serverTimestamp()
            });

            console.log(`✅ Saved to Firebase: ${collectionName} - ${docRef.id}`);
            
            const savedData = { ...cleanData, id: docRef.id };
            this.updateLocalCacheWithNewItemSafe(collectionName, savedData);
            
            return docRef.id;

        } catch (error) {
            console.error(`❌ Firebase save error for ${collectionName}:`, error);
            throw new Error(`Firebase save failed: ${error.message}`);
        }
    }

    saveToLocalStorage(collectionName, data) {
        const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
        
        const duplicate = this.findDuplicate(collectionName, data, existing);
        if (duplicate) {
            console.warn(`⚠️ Duplicate detected in localStorage ${collectionName}, skipping save`);
            return null;
        }

        const newRecord = {
            ...data,
            id: data.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_at: data.created_at || new Date().toISOString(),
            timestamp: new Date().toISOString()
        };

        if (window.app?.currentUser) {
            newRecord.created_by = newRecord.created_by || window.app.currentUser.email;
            newRecord.created_by_name = newRecord.created_by_name || window.app.currentUser.displayName || window.app.currentUser.email;
        }

        existing.push(newRecord);
        localStorage.setItem(collectionName, JSON.stringify(existing));

        this.updateLocalCache(collectionName, existing);

        console.log(`💾 Saved to localStorage: ${collectionName}`);
        return newRecord.id;
    }

    updateLocalCacheWithNewItemSafe(collectionName, item) {
        switch (collectionName) {
            case 'sales':
                this.salesData = this.salesData.filter(s => s.id !== item.id);
                this.salesData.push(item);
                break;
            case 'expenditure':
                this.expenditureData = this.expenditureData.filter(e => e.id !== item.id);
                this.expenditureData.push(item);
                break;
            case 'payments':
                this.paymentsData = this.paymentsData.filter(p => p.id !== item.id);
                this.paymentsData.push(item);
                break;
            case 'customers':
                this.customersData = this.customersData.filter(c => c.id !== item.id);
                this.customersData.push(item);
                break;
            case 'household_bills':
                this.householdBillsData = this.householdBillsData.filter(b => b.id !== item.id);
                this.householdBillsData.push(item);
                break;
        }
    }

    updateLocalCache(collectionName, data) {
        switch (collectionName) {
            case 'sales':
                this.salesData = data;
                break;
            case 'expenditure':
                this.expenditureData = data;
                break;
            case 'payments':
                this.paymentsData = data;
                break;
            case 'customers':
                this.customersData = data;
                break;
            case 'household_bills':
                this.householdBillsData = data;
                break;
        }
    }

    // ------------------------------
    // Data Loading Methods
    // ------------------------------

    async loadAllData(forceRefresh = false) {
        if (forceRefresh) {
            console.log('🔄 Force refresh - clearing cache');
            this.clearCache();
        }
        
        const hasData = this.salesData.length > 0 || 
                        this.expenditureData.length > 0 || 
                        this.paymentsData.length > 0;
        
        if (!forceRefresh && hasData) {
            console.log('📦 Using cached data (skipping reload)');
            return;
        }
        
        if (isFirebaseAvailable()) {
            await this.loadFromFirebase();
            this.dataSource = 'firebase';
        } else {
            this.loadFromLocalStorage();
            this.dataSource = 'localStorage';
        }
        
        this.removeDuplicates();
    }

    async loadFromFirebase() {
        try {
            const { collection, getDocs } = firestore;

            const [salesSnap, expenseSnap, paymentsSnap, customersSnap, billsSnap] = await Promise.all([
                getDocs(collection(firebaseDb, 'sales')),
                getDocs(collection(firebaseDb, 'expenditure')),
                getDocs(collection(firebaseDb, 'payments')),
                getDocs(collection(firebaseDb, 'customers')),
                getDocs(collection(firebaseDb, 'household_bills'))
            ]);

            this.salesData = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.expenditureData = expenseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.paymentsData = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.householdBillsData = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`📊 Loaded from Firebase: ${this.salesData.length} sales, ${this.expenditureData.length} expenses, ${this.paymentsData.length} payments, ${this.householdBillsData.length} household bills`);

        } catch (error) {
            console.error('❌ Error loading from Firebase:', error);
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        this.salesData = JSON.parse(localStorage.getItem('sales') || '[]');
        this.expenditureData = JSON.parse(localStorage.getItem('expenditure') || '[]');
        this.paymentsData = JSON.parse(localStorage.getItem('payments') || '[]');
        this.customersData = JSON.parse(localStorage.getItem('customers') || '[]');
        this.householdBillsData = JSON.parse(localStorage.getItem('household_bills') || '[]');

        console.log(`💾 Loaded from localStorage: ${this.salesData.length} sales, ${this.expenditureData.length} expenses, ${this.paymentsData.length} payments, ${this.householdBillsData.length} household bills`);
    }

    clearCache() {
        console.log('🗑️ Clearing cache...');
        this.salesData = [];
        this.expenditureData = [];
        this.paymentsData = [];
        this.customersData = [];
        this.householdBillsData = [];
        this.dataSource = null;
    }

    removeDuplicates() {
        console.log('🧹 Removing duplicates from cache...');
        
        const uniqueById = (arr) => {
            const seen = new Set();
            return arr.filter(item => {
                if (!item.id) return true;
                if (seen.has(item.id)) {
                    console.log('Duplicate removed:', item.id);
                    return false;
                }
                seen.add(item.id);
                return true;
            });
        };
        
        this.salesData = uniqueById(this.salesData);
        this.expenditureData = uniqueById(this.expenditureData);
        this.paymentsData = uniqueById(this.paymentsData);
        this.customersData = uniqueById(this.customersData);
        this.householdBillsData = uniqueById(this.householdBillsData);
        
        console.log('✅ Duplicates removed from cache');
    }

    // ------------------------------
    // Getters - ALL REQUIRED METHODS
    // ------------------------------

    getSales() { 
        return this.salesData || []; 
    }
    
    getExpenditures() { 
        return this.expenditureData || []; 
    }
    
    getPayments() { 
        return this.paymentsData || []; 
    }
    
    getCustomers() { 
        return this.customersData || []; 
    }
    
    getHouseholdBills() { 
        return this.householdBillsData || []; 
    }

    // NEW: Add the missing getAllHouseholdBills method
    getAllHouseholdBills() {
        return this.householdBillsData || [];
    }

    // NEW: Add getHouseholdBills method for filtering
    async getHouseholdBills(year, month) {
        await this.loadAllData();
        return this.householdBillsData.filter(bill => {
            // Handle different bill date formats
            if (bill.year && bill.month) {
                return bill.year === year && bill.month === month;
            } else if (bill.date) {
                const billDate = new Date(bill.date);
                return billDate.getFullYear() === year && (billDate.getMonth() + 1) === month;
            }
            return false;
        });
    }

    // NEW: Add getHouseholdBillById method
    async getHouseholdBillById(billId) {
        await this.loadAllData();
        return this.householdBillsData.find(b => b.id === billId) || null;
    }

    // ------------------------------
    // Payment Methods
    // ------------------------------

    async addPayment(paymentData) {
        console.log('💾 addPayment called with:', paymentData);
        return await this.saveData('payments', paymentData);
    }

    async updatePayment(paymentId, updates) {
        console.log('🔄 updatePayment called:', paymentId, updates);
        
        const index = this.paymentsData.findIndex(p => p.id === paymentId);
        if (index !== -1) {
            this.paymentsData[index] = { ...this.paymentsData[index], ...updates, updated_at: new Date().toISOString() };
        }

        if (!isFirebaseAvailable()) {
            let payments = JSON.parse(localStorage.getItem('payments') || '[]');
            const lsIndex = payments.findIndex(p => p.id === paymentId);
            if (lsIndex !== -1) {
                payments[lsIndex] = { ...payments[lsIndex], ...updates, updated_at: new Date().toISOString() };
                localStorage.setItem('payments', JSON.stringify(payments));
            }
            return false;
        }

        try {
            const { doc, updateDoc } = firestore;
            await updateDoc(doc(firebaseDb, 'payments', paymentId), updates);
            console.log(`✅ Payment updated in Firebase: ${paymentId}`);
            return true;
        } catch (error) {
            console.error('❌ Error updating payment in Firebase:', error);
            return false;
        }
    }

    // ------------------------------
    // Household Bills Methods
    // ------------------------------

    async saveHouseholdBill(billData) {
        const billId = billData.id || `bill_${Date.now()}`;
        const bill = {
            id: billId,
            ...billData,
            createdAt: new Date().toISOString()
        };

        if (!isFirebaseAvailable()) {
            const existing = JSON.parse(localStorage.getItem('household_bills') || '[]');
            existing.push(bill);
            localStorage.setItem('household_bills', JSON.stringify(existing));
            this.householdBillsData = existing;
            console.log('💾 Saved household bill to localStorage');
            return bill;
        }

        try {
            const { doc, setDoc } = firestore;
            await setDoc(doc(firebaseDb, 'household_bills', billId), bill);
            console.log('✅ Saved household bill to Firebase');
            await this.loadAllData(true);
            return bill;
        } catch (error) {
            console.error('❌ Error saving household bill to Firebase:', error);
            const existing = JSON.parse(localStorage.getItem('household_bills') || '[]');
            existing.push(bill);
            localStorage.setItem('household_bills', JSON.stringify(existing));
            this.householdBillsData = existing;
            return bill;
        }
    }

    async updateHouseholdBill(billId, billData) {
        const updatedBill = {
            ...billData,
            id: billId,
            updatedAt: new Date().toISOString()
        };

        if (!isFirebaseAvailable()) {
            this.householdBillsData = this.householdBillsData.map(b =>
                b.id === billId ? updatedBill : b
            );
            localStorage.setItem('household_bills', JSON.stringify(this.householdBillsData));
            console.log('💾 Updated household bill in localStorage');
            return;
        }

        try {
            const { doc, setDoc } = firestore;
            await setDoc(doc(firebaseDb, 'household_bills', billId), updatedBill, { merge: true });
            console.log('✅ Updated household bill in Firebase');
            await this.loadAllData(true);
        } catch (error) {
            console.error('❌ Error updating household bill in Firebase:', error);
            this.householdBillsData = this.householdBillsData.map(b =>
                b.id === billId ? updatedBill : b
            );
            localStorage.setItem('household_bills', JSON.stringify(this.householdBillsData));
        }
    }

    async deleteHouseholdBill(billId) {
        if (!isFirebaseAvailable()) {
            this.householdBillsData = this.householdBillsData.filter(b => b.id !== billId);
            localStorage.setItem('household_bills', JSON.stringify(this.householdBillsData));
            console.log('💾 Deleted household bill from localStorage');
            return;
        }

        try {
            const { doc, deleteDoc } = firestore;
            await deleteDoc(doc(firebaseDb, 'household_bills', billId));
            console.log('✅ Deleted household bill from Firebase');
            await this.loadAllData(true);
        } catch (error) {
            console.error('❌ Error deleting household bill from Firebase:', error);
            this.householdBillsData = this.householdBillsData.filter(b => b.id !== billId);
            localStorage.setItem('household_bills', JSON.stringify(this.householdBillsData));
        }
    }

    // ------------------------------
    // Creditor Management
    // ------------------------------

    async updateCreditorName(oldName, newName) {
        if (isFirebaseAvailable()) {
            return await this.updateCreditorNameInFirebase(oldName, newName);
        } else {
            return this.updateCreditorNameInLocalStorage(oldName, newName);
        }
    }

    async updateCreditorNameInFirebase(oldName, newName) {
        try {
            const { collection, getDocs, doc, updateDoc, query, where } = firestore;

            const salesQuery = query(collection(firebaseDb, 'sales'), where('customer_name', '==', oldName));
            const salesSnapshot = await getDocs(salesQuery);
            const salesUpdates = salesSnapshot.docs.map(docSnapshot =>
                updateDoc(doc(firebaseDb, 'sales', docSnapshot.id), { customer_name: newName })
            );

            const paymentsQuery = query(collection(firebaseDb, 'payments'), where('customer_name', '==', oldName));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const paymentsUpdates = paymentsSnapshot.docs.map(docSnapshot =>
                updateDoc(doc(firebaseDb, 'payments', docSnapshot.id), { customer_name: newName })
            );

            await Promise.all([...salesUpdates, ...paymentsUpdates]);
            console.log(`✅ Updated creditor name in Firebase: ${oldName} → ${newName}`);
            await this.loadAllData(true);

        } catch (error) {
            console.error('❌ Error updating creditor name in Firebase:', error);
            this.updateCreditorNameInLocalStorage(oldName, newName);
        }
    }

    updateCreditorNameInLocalStorage(oldName, newName) {
        this.salesData = this.salesData.map(sale =>
            sale.customer_name === oldName ? { ...sale, customer_name: newName } : sale
        );
        localStorage.setItem('sales', JSON.stringify(this.salesData));

        this.paymentsData = this.paymentsData.map(payment =>
            payment.customer_name === oldName ? { ...payment, customer_name: newName } : payment
        );
        localStorage.setItem('payments', JSON.stringify(this.paymentsData));

        console.log(`💾 Updated creditor name in localStorage: ${oldName} → ${newName}`);
    }

    // ------------------------------
    // Transaction Management
    // ------------------------------

    async clearAllTransactions() {
        if (isFirebaseAvailable()) {
            return await this.clearTransactionsFromFirebase();
        } else {
            return this.clearTransactionsFromLocalStorage();
        }
    }

    async clearTransactionsFromFirebase() {
        try {
            const { collection, getDocs, deleteDoc, doc } = firestore;

            const salesSnapshot = await getDocs(collection(firebaseDb, 'sales'));
            await Promise.all(salesSnapshot.docs.map(docSnapshot =>
                deleteDoc(doc(firebaseDb, 'sales', docSnapshot.id))
            ));

            const expensesSnapshot = await getDocs(collection(firebaseDb, 'expenditure'));
            await Promise.all(expensesSnapshot.docs.map(docSnapshot =>
                deleteDoc(doc(firebaseDb, 'expenditure', docSnapshot.id))
            ));

            const paymentsSnapshot = await getDocs(collection(firebaseDb, 'payments'));
            await Promise.all(paymentsSnapshot.docs.map(docSnapshot =>
                deleteDoc(doc(firebaseDb, 'payments', docSnapshot.id))
            ));

            console.log(`🗑️ Cleared transactions from Firebase`);
            this.clearCache();

        } catch (error) {
            console.error('❌ Error clearing transactions from Firebase:', error);
            this.clearTransactionsFromLocalStorage();
        }
    }

    clearTransactionsFromLocalStorage() {
        localStorage.removeItem('sales');
        localStorage.removeItem('expenditure');
        localStorage.removeItem('payments');
        this.clearCache();
        console.log('🗑️ Cleared transactions from localStorage');
    }

    async deleteExpenditure(expenseId) {
        if (!isFirebaseAvailable()) {
            this.expenditureData = this.expenditureData.filter(e => e.id !== expenseId);
            localStorage.setItem('expenditure', JSON.stringify(this.expenditureData));
            console.log('💾 Deleted expenditure from localStorage');
            return true;
        }

        try {
            const { doc, deleteDoc } = firestore;
            await deleteDoc(doc(firebaseDb, 'expenditure', expenseId));
            console.log('✅ Deleted expenditure from Firebase');
            await this.loadAllData(true);
            return true;
        } catch (error) {
            console.error('❌ Error deleting expenditure from Firebase:', error);
            this.expenditureData = this.expenditureData.filter(e => e.id !== expenseId);
            localStorage.setItem('expenditure', JSON.stringify(this.expenditureData));
            return false;
        }
    }

    // ------------------------------
    // Additional Utility Methods
    // ------------------------------

    async savePayments(paymentsArray) {
        console.log('💾 savePayments called with array length:', paymentsArray.length);
        
        if (!isFirebaseAvailable()) {
            console.warn('⚠️ Firebase not available');
            localStorage.setItem('payments', JSON.stringify(paymentsArray));
            this.paymentsData = paymentsArray;
            return false;
        }

        try {
            const { doc, setDoc, serverTimestamp } = firestore;
            
            const savePromises = paymentsArray.map(payment => {
                const cleanData = {};
                Object.keys(payment).forEach(key => {
                    if (payment[key] !== undefined && payment[key] !== null) {
                        cleanData[key] = payment[key];
                    }
                });
                
                return setDoc(doc(firebaseDb, 'payments', payment.id), {
                    ...cleanData,
                    timestamp: serverTimestamp()
                });
            });

            await Promise.all(savePromises);
            console.log(`✅ ${paymentsArray.length} payments saved to Firebase`);
            
            this.paymentsData = paymentsArray;
            return true;

        } catch (error) {
            console.error('❌ Error saving payments to Firebase:', error);
            localStorage.setItem('payments', JSON.stringify(paymentsArray));
            this.paymentsData = paymentsArray;
            return false;
        }
    }

    async savePaymentToFirebase(paymentData) {
        console.log('☁️ savePaymentToFirebase called');
        
        if (!isFirebaseAvailable()) {
            console.warn('⚠️ Firebase not available, saving to localStorage');
            return this.saveToLocalStorage('payments', paymentData);
        }

        try {
            const { doc, setDoc, serverTimestamp } = firestore;
            
            const cleanData = {};
            Object.keys(paymentData).forEach(key => {
                if (paymentData[key] !== undefined && paymentData[key] !== null) {
                    cleanData[key] = paymentData[key];
                }
            });

            cleanData.created_at = cleanData.created_at || new Date().toISOString();
            if (window.app?.currentUser) {
                cleanData.created_by = cleanData.created_by || window.app.currentUser.email;
                cleanData.created_by_name = cleanData.created_by_name || window.app.currentUser.displayName || window.app.currentUser.email;
            }

            await setDoc(doc(firebaseDb, 'payments', paymentData.id), {
                ...cleanData,
                timestamp: serverTimestamp()
            });

            console.log(`✅ Payment saved to Firebase: ${paymentData.id}`);
            
            this.paymentsData = this.paymentsData.filter(p => p.id !== paymentData.id);
            this.paymentsData.push(cleanData);
            
            return true;

        } catch (error) {
            console.error('❌ Firebase payment save error:', error);
            throw new Error(`Firebase payment save failed: ${error.message}`);
        }
    }
}

// Create and export singleton instance
const storage = new StorageManager();
export { storage };
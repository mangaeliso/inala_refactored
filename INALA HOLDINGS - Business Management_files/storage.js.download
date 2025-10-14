import { firebaseDb, firestore, isFirebaseAvailable } from './firebase.js';

class StorageManager {
    constructor() {
        this.salesData = [];
        this.expenditureData = [];
        this.customersData = [];
        this.paymentsData = [];
        this.householdBillsData = [];
    }

    // ------------------------------
    // Generic Save
    // ------------------------------
    async saveData(collectionName, data) {
        if (isFirebaseAvailable()) {
            return await this.saveToFirebase(collectionName, data);
        } else {
            return this.saveToLocalStorage(collectionName, data);
        }
    }

    async saveToFirebase(collectionName, data) {
        try {
            const { collection, addDoc, serverTimestamp } = firestore;

            // Clean data - remove undefined/null values
            const cleanData = {};
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    cleanData[key] = data[key];
                }
            });

            // Ensure creator and timestamp fields are recorded
            cleanData.created_at = cleanData.created_at || new Date().toISOString();
            if (window.app?.currentUser) {
                cleanData.created_by = cleanData.created_by || window.app.currentUser.email;
                cleanData.created_by_name = cleanData.created_by_name || window.app.currentUser.displayName || window.app.currentUser.email;
            }

            const docRef = await addDoc(collection(firebaseDb, collectionName), {
                ...cleanData,
                timestamp: serverTimestamp()
            });

            console.log(`✅ Saved to Firebase: ${collectionName} - ${docRef.id}`);
            return docRef.id;

        } catch (error) {
            console.error(`❌ Firebase save error for ${collectionName}:`, error);
            return this.saveToLocalStorage(collectionName, data);
        }
    }

    saveToLocalStorage(collectionName, data) {
        const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
        const newRecord = {
            ...data,
            id: data.id || Date.now().toString(),
            created_at: data.created_at || new Date().toISOString(),
            timestamp: new Date().toISOString()
        };

        // Auto-attach user info if available
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

    // ------------------------------
    // Load Data
    // ------------------------------
    async loadAllData() {
        if (isFirebaseAvailable()) {
            return await this.loadFromFirebase();
        } else {
            return this.loadFromLocalStorage();
        }
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
    // Getters
    // ------------------------------
    getSales() { return this.salesData; }
    getExpenditures() { return this.expenditureData; }
    getPayments() { return this.paymentsData; }
    getCustomers() { return this.customersData; }
    getHouseholdBills() { return this.householdBillsData; }

    // ------------------------------
    // Update Creditor Name
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

            // Update sales
            const salesQuery = query(collection(firebaseDb, 'sales'), where('customer_name', '==', oldName));
            const salesSnapshot = await getDocs(salesQuery);
            const salesUpdates = salesSnapshot.docs.map(docSnapshot =>
                updateDoc(doc(firebaseDb, 'sales', docSnapshot.id), { customer_name: newName })
            );
            await Promise.all(salesUpdates);

            // Update payments
            const paymentsQuery = query(collection(firebaseDb, 'payments'), where('customer_name', '==', oldName));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const paymentsUpdates = paymentsSnapshot.docs.map(docSnapshot =>
                updateDoc(doc(firebaseDb, 'payments', docSnapshot.id), { customer_name: newName })
            );
            await Promise.all(paymentsUpdates);

            // Update customers
            const customersQuery = query(collection(firebaseDb, 'customers'), where('name', '==', oldName));
            const customersSnapshot = await getDocs(customersQuery);
            const customersUpdates = customersSnapshot.docs.map(docSnapshot =>
                updateDoc(doc(firebaseDb, 'customers', docSnapshot.id), { name: newName })
            );
            await Promise.all(customersUpdates);

            console.log(`✅ Updated creditor name in Firebase: ${oldName} → ${newName}`);
            await this.loadAllData();

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

        this.customersData = this.customersData.map(customer =>
            customer.name === oldName ? { ...customer, name: newName } : customer
        );
        localStorage.setItem('customers', JSON.stringify(this.customersData));

        console.log(`💾 Updated creditor name in localStorage: ${oldName} → ${newName}`);
    }

    // ------------------------------
    // Clear Transactions
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

            this.salesData = [];
            this.expenditureData = [];
            this.paymentsData = [];

        } catch (error) {
            console.error('❌ Error clearing transactions from Firebase:', error);
            this.clearTransactionsFromLocalStorage();
        }
    }

    clearTransactionsFromLocalStorage() {
        localStorage.removeItem('sales');
        localStorage.removeItem('expenditure');
        localStorage.removeItem('payments');

        this.salesData = [];
        this.expenditureData = [];
        this.paymentsData = [];

        console.log('🗑️ Cleared transactions from localStorage');
    }

    // ------------------------------
    // Household Bills
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
            await this.loadAllData();
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

    async getHouseholdBills(year, month) {
        await this.loadAllData();
        return this.householdBillsData.filter(bill => bill.year === year && bill.month === month);
    }

    async getAllHouseholdBills() {
        await this.loadAllData();
        return this.householdBillsData;
    }

    async getHouseholdBillById(billId) {
        await this.loadAllData();
        return this.householdBillsData.find(b => b.id === billId) || null;
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
            await this.loadAllData();
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
            await this.loadAllData();
        } catch (error) {
            console.error('❌ Error deleting household bill from Firebase:', error);
            this.householdBillsData = this.householdBillsData.filter(b => b.id !== billId);
            localStorage.setItem('household_bills', JSON.stringify(this.householdBillsData));
        }
    }
}

// Create and export singleton instance
export const storage = new StorageManager();

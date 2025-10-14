import { ui } from './ui.js';
import { firebaseDb, firestore, isFirebaseAvailable } from './firebase.js';
import { PersonalBudgetUI } from './personal-budget-ui.js';
import { PersonalBudgetAI } from './personal-budget-ai.js';

class PersonalBudgetManager {
    constructor() {
        this.budgetDisplay = null;
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.budgetData = null;
        this.personalTransactions = [];
        
        // Initialize UI and AI helpers
        this.ui = new PersonalBudgetUI(this);
        this.ai = new PersonalBudgetAI(this);
    }

    initialize() {
        this.budgetDisplay = document.getElementById('personal-budget-display');
        if (this.budgetDisplay) {
            this.loadPersonalBudget();
        }
    }

    async loadPersonalBudget() {
        if (!this.budgetDisplay) return;
        this.budgetDisplay.innerHTML = '<div style="text-align: center; padding: 3rem; color: #6b7280;">Loading...</div>';

        try {
            await this.loadBudgetData();
            await this.loadPersonalTransactions();
            this.ui.renderBudgetDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.budgetDisplay.innerHTML = '<div style="text-align: center; padding: 3rem; color: #ef4444;">Error loading budget</div>';
        }
    }

    async loadBudgetData() {
        const budgetKey = this.currentYear + '-' + String(this.currentMonth).padStart(2, '0');
        
        if (isFirebaseAvailable()) {
            try {
                const { collection, query, where, getDocs } = firestore;
                const budgetQuery = query(
                    collection(firebaseDb, 'personal_budget'),
                    where('month', '==', this.currentMonth),
                    where('year', '==', this.currentYear)
                );
                const snapshot = await getDocs(budgetQuery);
                this.budgetData = !snapshot.empty 
                    ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } 
                    : this.getDefaultBudget();
            } catch (error) {
                this.budgetData = JSON.parse(localStorage.getItem('personal_budget_' + budgetKey) || 'null') || this.getDefaultBudget();
            }
        } else {
            this.budgetData = JSON.parse(localStorage.getItem('personal_budget_' + budgetKey) || 'null') || this.getDefaultBudget();
        }
    }

    async loadPersonalTransactions() {
        const key = 'personal_trans_' + this.currentYear + '_' + this.currentMonth;
        if (isFirebaseAvailable()) {
            try {
                const { collection, query, where, getDocs } = firestore;
                const transQuery = query(
                    collection(firebaseDb, 'personal_transactions'),
                    where('month', '==', this.currentMonth),
                    where('year', '==', this.currentYear)
                );
                const snapshot = await getDocs(transQuery);
                this.personalTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                this.personalTransactions = JSON.parse(localStorage.getItem(key) || '[]');
            }
        } else {
            this.personalTransactions = JSON.parse(localStorage.getItem(key) || '[]');
        }
    }

    getDefaultBudget() {
        return {
            month: this.currentMonth,
            year: this.currentYear,
            income: { salary: 0, freelance: 0, investments: 0, other: 0 },
            fixedExpenses: { rent: 0, utilities: 0, insurance: 0, loans: 0, subscriptions: 0, other: 0 },
            variableExpenses: { groceries: 0, transport: 0, entertainment: 0, dining: 0, shopping: 0, healthcare: 0, other: 0 },
            savings: { emergency: 0, investment: 0, goals: 0 },
            bills: []
        };
    }

    calculateTotals() {
        const totalIncome = Object.values(this.budgetData.income).reduce((sum, v) => sum + (v || 0), 0);
        const totalExpenses = Object.values(this.budgetData.fixedExpenses).reduce((sum, v) => sum + (v || 0), 0) + 
                             Object.values(this.budgetData.variableExpenses).reduce((sum, v) => sum + (v || 0), 0);
        const totalSavings = Object.values(this.budgetData.savings).reduce((sum, v) => sum + (v || 0), 0);
        const netAmount = totalIncome - totalExpenses - totalSavings;
        const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;

        return { totalIncome, totalExpenses, totalSavings, netAmount, savingsRate };
    }

    setupBudget() {
        ui.showAlert('Budget setup feature coming soon!', 'info');
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        this.loadPersonalBudget();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        }
        this.loadPersonalBudget();
    }
}

export const personalBudget = new PersonalBudgetManager();
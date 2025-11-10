import { authManager } from './auth.js';
import { ui } from './ui.js';
import { sales } from './sales.js';
import { expenditure } from './expenditure.js';
import { reports } from './reports.js';
import { whatsapp } from './whatsapp-notifications.js';
import { finances } from './finances.js';
import { personalBudget } from './personal-budget.js';
import { adminPanel as admin } from './admin.js';
import { loanManager } from './loans.js';
import { creditors } from './creditors.js';
import { auditLogger } from './audit.js';
import { auditViewer } from './audit-viewer.js';

class App {
    constructor() {
        this.currentUser = null;
        this.sales = sales;
        this.expenditure = expenditure;
        this.reports = reports;
        this.whatsapp = whatsapp;
        this.finances = finances;
        this.personalBudget = personalBudget;
        this.admin = admin;
        this.loanManager = loanManager;
        this.creditors = creditors;
        this.ui = ui;
        this.auditLogger = auditLogger;
        this.auditViewer = auditViewer;
    }

    async init() {
        console.log('🚀 Initializing Inala Holdings Management System...');
        await authManager.initialize();
        console.log('✅ Authentication initialized');
        
        // Initialize audit logging
        await this.initializeAuditLogging();
        
        await this.initialize(); // Add await here
    }

    async initializeAuditLogging() {
        try {
            // Check if Firebase is available globally
            if (typeof window.firebase === 'undefined') {
                console.warn('⚠️ Firebase not available, skipping audit logging initialization');
                return;
            }
            
            // Get Firebase instances from window
            const db = window.firebase.firestore();
            const auth = window.firebase.auth();
            
            // Initialize audit logger
            await auditLogger.initialize(db, auth);
            
            // Set current user if already logged in
            const currentUser = auth.currentUser;
            if (currentUser) {
                auditLogger.setCurrentUser(currentUser);
            }
            
            // Listen for auth state changes
            auth.onAuthStateChanged((user) => {
                if (user) {
                    auditLogger.setCurrentUser(user);
                    console.log('🔍 Audit logging active for:', user.email);
                }
            });
            
            // Initialize viewer
            auditViewer.initialize();
            
            console.log('✅ Audit logging system initialized');
        } catch (error) {
            console.error('⚠️ Audit logging initialization failed:', error);
            // Don't block app initialization if audit fails
        }
    }

    async initialize() { // Add async here
        this.currentUser = authManager.getCurrentUser();
        console.log('✅ User authenticated:', this.currentUser?.email);

        this.setupNavigation();
        this.setupFooterLinks();
        this.sales.initialize();
        this.expenditure.initialize();
        this.reports.initialize();
        this.whatsapp.initialize();
        this.finances.initialize();
        this.personalBudget.initialize();
        await this.admin.init(); // This requires await
        this.loanManager.initialize();
        this.creditors.initialize();

        this.showSection('sales');
        console.log('✅ Application initialized successfully');
    }

    setupNavigation() {
        const navContainer = document.getElementById('main-nav');
        const tabs = [
            { id: 'sales', icon: '💰', label: 'Sales' },
            { id: 'expenditure', icon: '💸', label: 'Expenditure' },
            { id: 'reports', icon: '📊', label: 'Reports' },
            { id: 'finances', icon: '💼', label: 'Business Finances' },
            { id: 'admin', icon: '⚙️', label: 'Admin' }
        ];

        navContainer.innerHTML = tabs.map(tab => `
            <button class="nav-btn ${tab.id === 'sales' ? 'active' : ''}" data-section="${tab.id}">
                ${tab.icon} ${tab.label}
            </button>
        `).join('');

        navContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.nav-btn');
            if (button) this.showSection(button.dataset.section);
        });
    }

    setupFooterLinks() {
        // Footer links removed
    }

    showSection(sectionId) {
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        const activeContent = document.getElementById(`${sectionId}-content`);
        if (activeContent) activeContent.classList.remove('hidden');

        if (sectionId !== 'personal-budget') {
            const activeButton = document.querySelector(`[data-section="${sectionId}"]`);
            if (activeButton) activeButton.classList.add('active');
        }

        const sectionActions = {
            'reports': () => this.reports.updateOverview(),
            'finances': () => this.finances.loadFinancesData(),
            'personal-budget': () => this.personalBudget.loadPersonalBudget(),
            'admin': () => this.admin.loadAdminStats(), // FIXED: Changed from loadAdminData to loadAdminStats
            'loans': () => this.loanManager.initialize()
        };

        if (sectionActions[sectionId]) sectionActions[sectionId]();
        console.log(`📍 Switched to ${sectionId} section`);
    }
}

window.app = new App();
window.app.init().catch(error => console.error('App initialization failed:', error));
export { App };
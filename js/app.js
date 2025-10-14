import { authManager } from './auth.js';
import { ui } from './ui.js';
import { sales } from './sales.js';
import { expenditure } from './expenditure.js';
import { reports } from './reports.js';
import { whatsapp } from './whatsapp-notifications.js';
import { finances } from './finances.js';
import { personalBudget } from './personal-budget.js';
import { admin } from './admin.js';
import { loanManager } from './loans.js';
import { creditors } from './creditors.js'; // ✅ ADDED

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
        this.creditors = creditors; // ✅ ADDED
        this.ui = ui;
    }

    async init() {
        console.log('🚀 Initializing Inala Holdings Management System...');
        await authManager.initialize();
        console.log('✅ Authentication initialized');
    }

    initialize() {
        this.currentUser = authManager.getCurrentUser();
        console.log('✅ User authenticated:', this.currentUser.email);
        
        this.setupNavigation();
        this.setupFooterLinks();
        this.sales.initialize();
        this.expenditure.initialize();
        this.reports.initialize();
        this.whatsapp.initialize();
        this.finances.initialize();
        this.personalBudget.initialize();
        this.admin.initialize();
        this.loanManager.initialize();
        this.creditors.initialize(); // ✅ ADDED
        
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
        const footer = document.querySelector('.footer');
        if (footer) {
            const footerLinks = document.createElement('div');
            footerLinks.style.cssText = 'text-align: center; padding: 1rem 0; border-top: 1px solid #e5e7eb; display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;';
            footerLinks.innerHTML = `
                <button onclick="window.app.showSection('personal-budget')" 
                        style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.875rem; text-decoration: underline;">
                    💳 My Personal Finances
                </button>
                <button onclick="window.app.showSection('loans')" 
                        style="background: none; border: none; color: #10b981; cursor: pointer; font-size: 0.875rem; text-decoration: underline;">
                    💵 Loans (Dev)
                </button>
            `;
            footer.insertBefore(footerLinks, footer.firstChild);
        }
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
            'admin': () => this.admin.loadAdminData(),
            'loans': () => this.loanManager.initialize()
        };
        
        if (sectionActions[sectionId]) sectionActions[sectionId]();
        console.log(`🔍 Switched to ${sectionId} section`);
    }
}

window.app = new App();
window.app.init();
export { App };
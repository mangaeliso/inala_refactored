// ui.js - Enhanced UIManager with integration for modern Reports system

class UIManager {
    constructor() {
        this.currentTab = 'sales';
        this.initializeEventListeners();
    }

    // Initialize global event listeners
    initializeEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Automatically link report refresh when Reports tab is active
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-refresh-reports]')) {
                if (window.reports && typeof window.reports.updateOverview === 'function') {
                    window.reports.updateOverview();
                }
            }
        });
    }

    // Show alert message
    showAlert(message, type = 'success') {
        const container = document.getElementById('alert-container');
        if (!container) return console.warn('Alert container not found');

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} fade-in`;
        alert.innerHTML = `
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
            <span>${this.escapeHtml(message)}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(alert);

        setTimeout(() => alert.remove(), 5000);
    }

    // Set today's date on all inputs that support it
    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value && !input.hasAttribute('data-no-auto-date')) input.value = today;
        });
    }

    // Switch between tabs
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

        const targetTab = document.getElementById(`${tabName}-content`);
        if (targetTab) targetTab.classList.remove('hidden');

        const activeNav = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        if (activeNav) activeNav.classList.add('active');

        this.currentTab = tabName;
        this.setTodayDate();
        this.onTabChange(tabName);
    }

    // Tab change callback
    onTabChange(tabName) {
        console.log(`Tab changed to: ${tabName}`);

        // Auto-refresh Reports overview when switching to Reports tab
        if (tabName === 'reports' && window.reports && typeof window.reports.updateOverview === 'function') {
            window.reports.updateOverview();
        }
    }

    // Render main navigation
    renderNavigation() {
        const nav = document.getElementById('main-nav');
        if (!nav) return;

        nav.innerHTML = `
            <button class="nav-tab active" data-tab="sales">💰 Sales</button>
            <button class="nav-tab" data-tab="expenditure">💸 Expenditure</button>
            <button class="nav-tab" data-tab="reports">📊 Reports</button>
            <button class="nav-tab" data-tab="creditors">🏢 Creditors</button>
            <button class="nav-tab" id="admin-tab" data-tab="admin" style="display:none;">⚙️ Admin</button>
        `;

        nav.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });
    }

    showAdminTab() {
        const adminTab = document.getElementById('admin-tab');
        if (adminTab) adminTab.style.display = 'flex';
    }

    hideAdminTab() {
        const adminTab = document.getElementById('admin-tab');
        if (adminTab) {
            adminTab.style.display = 'none';
            if (this.currentTab === 'admin') this.switchTab('sales');
        }
    }

    // Format currency (used by reports.js)
    formatCurrency(amount) {
        const num = parseFloat(amount);
        if (isNaN(num)) return 'R0.00';
        return `R${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    }

    // Modal and alert utilities
    showLoading(containerId) {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = `<div class="loading"><p>Loading...</p><div class="spinner"></div></div>`;
        }
    }

    hideLoading(containerId) {
        const el = document.getElementById(containerId);
        const loading = el?.querySelector('.loading');
        if (loading) loading.remove();
    }

    showModal(content, { size = 'medium', closeOnOutsideClick = true } = {}) {
        this.closeModal();
        const modal = document.createElement('div');
        modal.id = 'app-modal';
        modal.className = 'modal fade-in';
        modal.innerHTML = `
            <div class="modal-content modal-${size}">
                <button class="modal-close" onclick="ui.closeModal()">&times;</button>
                ${content}
            </div>
        `;
        document.body.appendChild(modal);

        if (closeOnOutsideClick) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        this.trapFocus(modal);
        return modal;
    }

    closeModal() {
        const modal = document.getElementById('app-modal');
        if (modal) {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        }
    }

    // Modal prompt
    async promptInput(message, defaultValue = '', title = 'Input Required') {
        return new Promise((resolve) => {
            const html = `
                <h3>${this.escapeHtml(title)}</h3>
                <p>${this.escapeHtml(message)}</p>
                <input type="text" id="prompt-input" value="${this.escapeHtml(defaultValue)}" class="form-input">
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="ui.closeModal();resolve(null)">Cancel</button>
                    <button class="btn btn-primary" onclick="ui.closeModal();resolve(document.getElementById('prompt-input').value)">OK</button>
                </div>
            `;
            const modal = this.showModal(html, { size: 'small' });
            setTimeout(() => modal.querySelector('#prompt-input')?.focus(), 100);
        });
    }

    // Focus trap for modal accessibility
    trapFocus(modal) {
        const focusable = modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        });
        first.focus();
    }

    // Escape HTML safely
    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Helper DOM utilities
    clearForm(formId) {
        document.getElementById(formId)?.reset();
    }

    toggleElement(id, show) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !show);
    }

    updateElementText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    updateElementHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }
}

// Export singleton
export const ui = new UIManager();
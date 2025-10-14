class UIManager {
    constructor() {
        this.currentTab = 'sales';
    }

    // Show alert message
    showAlert(message, type = 'success') {
        const container = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => alert.remove(), 5000);
    }

    // Set today's date on date inputs
    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) {
                input.value = today;
            }
        });
    }

    // Switch between tabs
    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Remove active class from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const targetTab = document.getElementById(`${tabName}-content`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }
        
        // Add active class to clicked nav tab
        const activeNavTab = Array.from(document.querySelectorAll('.nav-tab'))
            .find(tab => tab.textContent.toLowerCase().includes(tabName));
        if (activeNavTab) {
            activeNavTab.classList.add('active');
        }
        
        this.currentTab = tabName;
        this.setTodayDate();
        
        // Trigger tab-specific callbacks
        this.onTabChange(tabName);
    }

    // Tab change callback (override in app.js)
    onTabChange(tabName) {
        // This will be set in app.js
    }

    // Render navigation
    renderNavigation() {
        const nav = document.getElementById('main-nav');
        nav.innerHTML = `
            <button class="nav-tab active" data-tab="sales">💰 Sales</button>
            <button class="nav-tab" data-tab="expenditure">💸 Expenditure</button>
            <button class="nav-tab" data-tab="reports">📊 Reports</button>
            <button class="nav-tab" data-tab="creditors">🏢 Creditors</button>
            <button class="nav-tab" id="admin-tab" data-tab="admin" style="display: none;">⚙️ Admin</button>
        `;
        
        // Add click listeners
        nav.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    // Show admin tab
    showAdminTab() {
        const adminTab = document.getElementById('admin-tab');
        if (adminTab) {
            adminTab.style.display = 'flex';
        }
    }

    // Format currency
    formatCurrency(amount) {
        return `R${parseFloat(amount).toFixed(2)}`;
    }

    // Show loading state
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading"><p>Loading...</p><div class="spinner"></div></div>';
        }
    }

    // Show modal
    showModal(content) {
        // Remove existing modal if any
        this.closeModal();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'app-modal';
        modal.innerHTML = `
            <div class="modal-content">
                ${content}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('app-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Confirm action
    confirmAction(message) {
        return confirm(message);
    }

    // Prompt input
    promptInput(message, defaultValue = '') {
        return prompt(message, defaultValue);
    }
}

// Create and export singleton instance
export const ui = new UIManager();
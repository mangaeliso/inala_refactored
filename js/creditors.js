import { storage } from './storage.js';
import { ui } from './ui.js';

class CreditorsManager {
    constructor() {
        this.creditorsList = null;
        this.searchInput = null;
        this.filterSelect = null;
        this.monthFilterSelect = null;
        this.showAllDebtsCheckbox = null;
        this.isLoaded = false;
        this.currentCustomer = null;
        this.currentOutstanding = 0;
        this.selectedMonth = null;
        this.selectedYear = null;
        this.showAllDebts = false; // New flag for showing all debts
        this.useBusinessCycle = true;
        this.handleSearch = this.handleSearch.bind(this);
    }

    showNotification(message, type = 'info') {
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
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            color: ${color.text};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border-left: 4px solid ${color.border};
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 500;
        `;

        notification.innerHTML = `
            <span style="font-size: 1.5rem;">${color.icon}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: ${color.text}; opacity: 0.7; padding: 0; margin: 0; line-height: 1;">&times;</button>
        `;

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    initialize() {
        console.log('💰 Initializing Creditors Manager...');
        
        this.creditorsList = document.getElementById('creditors-list');
        this.searchInput = document.getElementById('creditor-search');
        this.filterSelect = document.getElementById('creditor-filter');
        
        // Add month filter and show all debts checkbox
        this.addMonthFilterControls();
        
        const refreshBtn = document.getElementById('refresh-creditors-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadCreditorsData());
        }
        
        if (this.searchInput) {
            this.searchInput.removeEventListener('keyup', this.handleSearch);
            this.searchInput.removeEventListener('input', this.handleSearch);
            this.searchInput.addEventListener('keyup', this.handleSearch);
            this.searchInput.addEventListener('input', this.handleSearch);
        }
        
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', () => this.filterCreditors());
        }
        
        this.getCurrentPeriod();
        if (!this.isLoaded) this.loadCreditorsData();
    }

    addMonthFilterControls() {
        // Find the search/filter container
        const searchContainer = this.searchInput?.parentElement?.parentElement;
        if (!searchContainer) return;

        // Check if controls already exist
        if (document.getElementById('month-filter-select')) return;

        // Create month filter dropdown
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        let monthOptionsHTML = '<option value="current">Current Period</option>';
        monthOptionsHTML += '<option value="all">All Time</option>';
        monthOptionsHTML += '<option disabled>──────────</option>';
        
        // Add last 12 months + next 3 months
        for (let i = -12; i <= 3; i++) {
            const date = new Date(currentYear, currentMonth - 1 + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const value = year + '-' + String(month).padStart(2, '0');
            monthOptionsHTML += `<option value="${value}">${monthName}</option>`;
        }

        // Create the filter controls HTML
        const filterControlsHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                <div style="flex: 1;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
                        Filter by Period
                    </label>
                    <select id="month-filter-select" style="width: 100%; padding: 0.625rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; background: white;">
                        ${monthOptionsHTML}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
                        &nbsp;
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer;">
                        <input type="checkbox" id="show-all-debts-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-size: 0.875rem; color: #374151;">Show All Outstanding Debts</span>
                    </label>
                </div>
            </div>
        `;

        // Insert before the search input
        searchContainer.insertAdjacentHTML('afterbegin', filterControlsHTML);

        // Add event listeners
        this.monthFilterSelect = document.getElementById('month-filter-select');
        this.showAllDebtsCheckbox = document.getElementById('show-all-debts-checkbox');

        if (this.monthFilterSelect) {
            this.monthFilterSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                
                if (value === 'current') {
                    this.getCurrentPeriod();
                    this.showAllDebts = false;
                    if (this.showAllDebtsCheckbox) this.showAllDebtsCheckbox.checked = false;
                } else if (value === 'all') {
                    this.selectedMonth = null;
                    this.selectedYear = null;
                    this.showAllDebts = false;
                    if (this.showAllDebtsCheckbox) this.showAllDebtsCheckbox.checked = false;
                } else {
                    const [year, month] = value.split('-').map(Number);
                    this.selectedYear = year;
                    this.selectedMonth = month;
                    this.showAllDebts = false;
                    if (this.showAllDebtsCheckbox) this.showAllDebtsCheckbox.checked = false;
                }
                
                this.loadCreditorsData();
            });
        }

        if (this.showAllDebtsCheckbox) {
            this.showAllDebtsCheckbox.addEventListener('change', (e) => {
                this.showAllDebts = e.target.checked;
                
                if (this.showAllDebts) {
                    // When showing all debts, we'll aggregate across all periods
                    this.loadCreditorsData();
                } else {
                    // Revert to current filter
                    this.loadCreditorsData();
                }
            });
        }
    }

    handleSearch() {
        this.filterCreditors();
    }

    getCurrentPeriod() {
        const now = new Date();
        const currentDay = now.getDate();
        let currentMonth = now.getMonth() + 1;
        let currentYear = now.getFullYear();
        
        this.useBusinessCycle = true;
        
        if (currentDay < 5) {
            currentMonth = currentMonth - 1;
            if (currentMonth === 0) {
                currentMonth = 12;
                currentYear = currentYear - 1;
            }
        }
        
        this.selectedMonth = currentMonth;
        this.selectedYear = currentYear;
    }

    getBusinessMonth(date) {
        if (!date) return { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        
        const d = new Date(date);
        const day = d.getDate();
        let month = d.getMonth() + 1;
        let year = d.getFullYear();
        
        if (day < 5) {
            month = month - 1;
            if (month === 0) {
                month = 12;
                year = year - 1;
            }
        }
        
        return { month, year };
    }

    getPaymentPeriod(payment) {
        if (payment.applies_to_period && payment.applies_to_period.month && payment.applies_to_period.year) {
            return payment.applies_to_period;
        }
        return this.getBusinessMonth(payment.date);
    }

    filterByPeriod(items, type = 'sale') {
        if (!items) return [];
        
        // If showing all debts or no period filter, return all items
        if (this.showAllDebts || (!this.selectedMonth && !this.selectedYear)) {
            return items;
        }

        return items.filter(item => {
            if (!item || !item.date) return false;
            
            let itemMonth, itemYear;
            
            try {
                if (type === 'payment') {
                    const period = this.getPaymentPeriod(item);
                    itemMonth = period.month;
                    itemYear = period.year;
                } else {
                    const businessMonth = this.getBusinessMonth(item.date);
                    itemMonth = businessMonth.month;
                    itemYear = businessMonth.year;
                }
                
                return itemMonth === this.selectedMonth && itemYear === this.selectedYear;
            } catch (error) {
                console.error('Error filtering item:', error, item);
                return false;
            }
        });
    }

    getNormalizedCustomerKey(data) {
        return (data.customer_name || data.customer_id || data.to_customer || data.from_collector || 'unknown customer').trim().toLowerCase();
    }

    getPeriodDisplayName() {
        if (this.showAllDebts) {
            return 'All Outstanding Debts';
        }
        if (!this.selectedMonth || !this.selectedYear) {
            return 'All Time';
        }
        return new Date(this.selectedYear, this.selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    async loadCreditorsData() {
        if (this.creditorsList) {
            const periodName = this.getPeriodDisplayName();
            this.creditorsList.innerHTML = `<div style="text-align: center; padding: 3rem; color: #6b7280;">Loading credit data for ${periodName}...</div>`;
        }

        try {
            await storage.loadAllData();
            let allPayments = storage.getPayments() || [];
            let allSales = storage.getSales() || [];

            const allCreditSales = allSales.filter(sale => sale.payment_type === 'credit' || sale.payment === 'credit');
            
            let monthlyCreditSales, monthlyPayments;
            
            if (this.showAllDebts) {
                // When showing all debts, use ALL credit sales and payments
                monthlyCreditSales = allCreditSales;
                monthlyPayments = allPayments;
            } else {
                // Filter by period as normal
                monthlyCreditSales = this.filterByPeriod(allCreditSales, 'sale');
                monthlyPayments = this.filterByPeriod(allPayments, 'payment');
            }

            const creditSummary = {};
            const originalNames = {};

            // Process credit sales
            monthlyCreditSales.forEach(sale => {
                const normKey = this.getNormalizedCustomerKey(sale);
                const origName = sale.customer_name || sale.customer_id || 'Unknown Customer';
                originalNames[normKey] = origName;

                if (!creditSummary[normKey]) {
                    creditSummary[normKey] = {
                        name: origName,
                        totalCredit: 0,
                        totalPaid: 0,
                        outstandingAmount: 0,
                        transactions: [],
                        payments: [],
                        lastPurchase: null,
                        items: [],
                        createdBy: sale.created_by || 'system'
                    };
                }
                creditSummary[normKey].totalCredit += parseFloat(sale.total) || 0;
                creditSummary[normKey].transactions.push(sale);
                
                const productInfo = `${sale.product || 'Unknown'} (${sale.quantity || 0}x @ R${sale.price || 0})`;
                creditSummary[normKey].items.push(productInfo);
                
                if (!creditSummary[normKey].lastPurchase || new Date(sale.date) > new Date(creditSummary[normKey].lastPurchase)) {
                    creditSummary[normKey].lastPurchase = sale.date;
                }
            });

            // Process payments
            monthlyPayments.forEach(payment => {
                const normKey = this.getNormalizedCustomerKey(payment);
                const origName = payment.customer_name || payment.to_customer || payment.from_collector || 'Unknown Customer';
                if (!originalNames[normKey]) originalNames[normKey] = origName;

                if (creditSummary[normKey]) {
                    creditSummary[normKey].totalPaid += parseFloat(payment.amount) || 0;
                    creditSummary[normKey].payments.push(payment);
                }
            });

            // Calculate outstanding amounts
            Object.keys(creditSummary).forEach(normKey => {
                const totalCredit = parseFloat(creditSummary[normKey].totalCredit) || 0;
                const totalPaid = parseFloat(creditSummary[normKey].totalPaid) || 0;
                creditSummary[normKey].outstandingAmount = Math.max(0, totalCredit - totalPaid);
            });

            const customersWithDebt = {};
            Object.entries(creditSummary).forEach(([normKey, data]) => {
                if (data.outstandingAmount > 0.01) {
                    customersWithDebt[normKey] = data;
                }
            });

            const totalClients = Object.keys(creditSummary).length;
            const totalPaidThisMonth = Object.values(creditSummary).reduce((sum, cust) => {
                return sum + (parseFloat(cust.totalPaid) || 0);
            }, 0);
            const totalOutstanding = Object.values(customersWithDebt).reduce((sum, cust) => {
                return sum + (parseFloat(cust.outstandingAmount) || 0);
            }, 0);
            const clientsWithDebtCount = Object.keys(customersWithDebt).length;

            this.updateStats(totalClients, totalOutstanding, totalPaidThisMonth, clientsWithDebtCount);
            
            if (Object.keys(customersWithDebt).length === 0) {
                this.renderNoActivity(totalClients, totalPaidThisMonth);
                return;
            }

            this.renderCreditorsList(customersWithDebt);
            this.isLoaded = true;
            
            setTimeout(() => {
                this.searchInput = document.getElementById('creditor-search');
                this.filterSelect = document.getElementById('creditor-filter');
                
                if (this.searchInput) {
                    this.searchInput.removeEventListener('keyup', this.handleSearch);
                    this.searchInput.removeEventListener('input', this.handleSearch);
                    this.handleSearch = () => this.filterCreditors();
                    this.searchInput.addEventListener('keyup', this.handleSearch);
                    this.searchInput.addEventListener('input', this.handleSearch);
                }
                
                if (this.filterSelect) {
                    this.filterSelect.addEventListener('change', () => this.filterCreditors());
                }
                
                this.filterCreditors();
            }, 100);
        } catch (error) {
            console.error('Error loading creditors data:', error);
            this.showNotification('Error loading credit data: ' + error.message, 'error');
            if (this.creditorsList) {
                this.creditorsList.innerHTML = '<div style="text-align: center; padding: 3rem; color: #ef4444;">Error loading data. Please refresh.</div>';
            }
        }
    }

    updateStats(totalClients, totalOutstanding, totalPaidThisMonth, clientsWithDebtCount) {
        const safeOutstanding = parseFloat(totalOutstanding) || 0;
        const safePaid = parseFloat(totalPaidThisMonth) || 0;
        const safeClients = parseInt(totalClients) || 0;
        const safeDebtCount = parseInt(clientsWithDebtCount) || 0;

        const clientsEl = document.getElementById('total-credit-clients');
        const outstandingEl = document.getElementById('total-amount-owed');
        const paidEl = document.getElementById('total-amount-paid');
        const debtClientsEl = document.getElementById('outstanding-debts');

        if (clientsEl) clientsEl.textContent = safeClients;
        if (outstandingEl) outstandingEl.textContent = ui.formatCurrency(safeOutstanding);
        if (paidEl) paidEl.textContent = ui.formatCurrency(safePaid);
        if (debtClientsEl) debtClientsEl.textContent = safeDebtCount;
    }

    renderCreditorsList(customersWithDebt) {
        const periodName = this.getPeriodDisplayName();
        let creditHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 1.5rem; padding: 1rem 0;">';

        Object.entries(customersWithDebt).forEach(([normKey, data]) => {
            const customerName = data.name;
            const outstanding = parseFloat(data.outstandingAmount) || 0;
            const totalCredit = parseFloat(data.totalCredit) || 0;
            const totalPaid = parseFloat(data.totalPaid) || 0;
            const progressPercent = totalCredit > 0 ? Math.round((totalPaid / totalCredit) * 100) : 0;
            const isUrgent = outstanding > 500;
            const lastActivity = data.lastPurchase ? new Date(data.lastPurchase).toLocaleDateString() : 'N/A';

            let purchaseHistory = '';
            if (data.items && data.items.length > 0) {
                purchaseHistory = `
                    <div style="margin-top: 1rem; padding: 1rem; background: #f9fafb; border-radius: 6px; max-height: 200px; overflow-y: auto;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: #374151; display: flex; justify-content: space-between;">
                            <span>Purchase History</span>
                            <span style="background: #3b82f6; color: white; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem;">${data.items.length} items</span>
                        </div>
                        <div style="font-size: 0.8125rem; color: #6b7280;">
                            ${data.items.map((item, idx) => `
                                <div style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 0.5rem;">
                                    <span style="color: #9ca3af; min-width: 1.5rem;">${idx + 1}.</span>
                                    <span>${item}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            creditHTML += `
                <div class="credit-card" style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 1.5rem; border-left: 4px solid ${isUrgent ? '#ef4444' : '#3b82f6'};" 
                     data-customer-name="${customerName.toLowerCase()}" 
                     data-outstanding="${outstanding}">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: #1f2937; margin: 0;">${customerName}</h3>
                        ${isUrgent ? '<span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">⚠️ URGENT</span>' : ''}
                    </div>
                    
                    <div style="background: ${outstanding > 500 ? '#fef3c7' : '#dbeafe'}; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <div style="font-size: 0.875rem; color: ${outstanding > 500 ? '#92400e' : '#1e40af'}; margin-bottom: 0.25rem;">Outstanding Balance</div>
                        <div style="font-size: 2rem; font-weight: 700; color: ${outstanding > 500 ? '#92400e' : '#1e40af'};">R${outstanding.toFixed(2)}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.875rem;">
                        <div>
                            <span style="color: #6b7280; display: block; margin-bottom: 0.25rem;">Period</span>
                            <span style="color: #1f2937; font-weight: 600;">${periodName}</span>
                        </div>
                        <div>
                            <span style="color: #6b7280; display: block; margin-bottom: 0.25rem;">Last Purchase</span>
                            <span style="color: #1f2937; font-weight: 600;">${lastActivity}</span>
                        </div>
                        <div>
                            <span style="color: #6b7280; display: block; margin-bottom: 0.25rem;">Total Credit</span>
                            <span style="color: #3b82f6; font-weight: 600;">R${totalCredit.toFixed(2)}</span>
                        </div>
                        <div>
                            <span style="color: #6b7280; display: block; margin-bottom: 0.25rem;">Amount Paid</span>
                            <span style="color: #10b981; font-weight: 600;">R${totalPaid.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.875rem;">
                            <span style="color: #6b7280;">Payment Progress</span>
                            <span style="color: ${progressPercent >= 50 ? '#10b981' : progressPercent > 0 ? '#f59e0b' : '#ef4444'}; font-weight: 600;">${progressPercent}%</span>
                        </div>
                        <div style="width: 100%; background: #e5e7eb; border-radius: 9999px; height: 8px; overflow: hidden;">
                            <div style="width: ${progressPercent}%; background: ${progressPercent >= 50 ? '#10b981' : progressPercent > 0 ? '#f59e0b' : '#ef4444'}; height: 100%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                    
                    ${purchaseHistory}
                    
                    <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                        <button style="flex: 1; padding: 0.75rem; background: white; border: 2px solid #3b82f6; color: #3b82f6; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem; transition: all 0.2s;" 
                                onmouseover="this.style.background='#eff6ff'"
                                onmouseout="this.style.background='white'"
                                onclick="window.app.creditors.openPaymentModal('${this.escapeString(customerName)}', ${outstanding}, 'partial')">
                            💵 Partial
                        </button>
                        <button style="flex: 1; padding: 0.75rem; background: #3b82f6; border: 2px solid #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem; transition: all 0.2s;" 
                                onmouseover="this.style.background='#2563eb'"
                                onmouseout="this.style.background='#3b82f6'"
                                onclick="window.app.creditors.openPaymentModal('${this.escapeString(customerName)}', ${outstanding}, 'full')">
                            ✅ Full Payment
                        </button>
                    </div>
                </div>
            `;
        });

        creditHTML += '</div>';

        if (this.creditorsList) {
            this.creditorsList.innerHTML = creditHTML;
        }
    }

    renderNoActivity(totalClients, totalPaidThisMonth) {
        const periodName = this.getPeriodDisplayName();
        let message = '';
        if (totalClients > 0) {
            message = `
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">All Clear! 🎉</h3>
                <p style="color: #6b7280;">${totalClients} customer${totalClients > 1 ? 's' : ''} paid in full. Collected R${totalPaidThisMonth.toFixed(2)} in ${periodName}.</p>
            `;
        } else {
            message = `
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">No Credit Activity</h3>
                <p style="color: #6b7280;">No credit sales recorded for ${periodName}.</p>
            `;
        }

        if (this.creditorsList) {
            this.creditorsList.innerHTML = `
                <div style="text-align: center; padding: 4rem; color: #10b981;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                    ${message}
                </div>
            `;
        }
    }

    openPaymentModal(customerName, outstandingAmount, paymentType) {
        this.currentCustomer = customerName;
        this.currentOutstanding = outstandingAmount;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        let monthOptionsHTML = '';
        for (let i = -12; i <= 3; i++) {
            const date = new Date(currentYear, currentMonth - 1 + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const value = year + '-' + String(month).padStart(2, '0');
            const isCurrentMonth = year === this.selectedYear && month === this.selectedMonth;
            monthOptionsHTML += `<option value="${value}"${isCurrentMonth ? ' selected' : ''}>${monthName}</option>`;
        }

        const modalHTML = `
        <div id="payment-modal-custom" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 0; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                <div style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">Record Payment - ${customerName}</h3>
                    <button id="close-payment-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div style="padding: 1.5rem; overflow-y: auto; max-height: calc(90vh - 140px);">
                    <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #f59e0b;">
                        <div style="font-weight: 600; color: #92400e;">Outstanding for ${this.getPeriodDisplayName()}</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #92400e;">${ui.formatCurrency(outstandingAmount)}</div>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Amount *</label>
                        <input type="number" id="payment-amount-input" step="0.01" min="0" ${paymentType === 'full' ? `value="${outstandingAmount}"` : 'placeholder="Enter payment amount"'} style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" required>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Period *</label>
                        <select id="payment-period-input" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" required>
                            ${monthOptionsHTML}
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Method *</label>
                        <select id="payment-method-input" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" required>
                            <option value="">Select Payment Method</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="transfer">Bank Transfer</option>
                            <option value="mobile">Mobile Money</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Date *</label>
                        <input type="date" id="payment-date-input" value="${now.toISOString().split('T')[0]}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" required>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Received By *</label>
                        <input type="text" id="payment-received-by-input" placeholder="Who received this payment?" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" required>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Notes (Optional)</label>
                        <textarea id="payment-notes-input" rows="3" placeholder="Any additional notes about this payment..." style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;"></textarea>
                    </div>
                </div>
                <div style="padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.75rem; justify-content: flex-end;">
                    <button id="cancel-payment-btn" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500;">Cancel</button>
                    <button id="save-payment-btn" style="padding: 0.75rem 1.5rem; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600;">💾 Save Payment</button>
                </div>
            </div>
        </div>`;

        const existingModal = document.getElementById('payment-modal-custom');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        setTimeout(() => {
            const closeButton = document.getElementById('close-payment-modal');
            const cancelButton = document.getElementById('cancel-payment-btn');
            const saveButton = document.getElementById('save-payment-btn');
            const modal = document.getElementById('payment-modal-custom');

            const closeModal = () => {
                if (modal && modal.parentElement) {
                    modal.remove();
                }
            };

            if (closeButton) {
                closeButton.addEventListener('click', closeModal);
            }

            if (cancelButton) {
                cancelButton.addEventListener('click', closeModal);
            }

            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    this.savePayment();
                });
            }

            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal();
                    }
                });
            }

            const amountInput = document.getElementById('payment-amount-input');
            if (amountInput) {
                amountInput.focus();
                if (paymentType === 'full') {
                    amountInput.select();
                }
            }
        }, 100);
    }

    async savePayment() {
        const amountEl = document.getElementById('payment-amount-input');
        const methodEl = document.getElementById('payment-method-input');
        const dateEl = document.getElementById('payment-date-input');
        const receivedByEl = document.getElementById('payment-received-by-input');
        const notesEl = document.getElementById('payment-notes-input');
        const periodEl = document.getElementById('payment-period-input');

        if (!amountEl || !methodEl || !dateEl || !receivedByEl || !periodEl) {
            this.showNotification('Error: Payment form elements not found', 'error');
            return;
        }

        if (!amountEl.value || !methodEl.value || !dateEl.value || !receivedByEl.value || !periodEl.value) {
            this.showNotification('Please fill all required fields', 'warning');
            return;
        }

        const paymentAmount = parseFloat(amountEl.value);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            this.showNotification('Please enter a valid payment amount', 'error');
            return;
        }

        if (paymentAmount > this.currentOutstanding) {
            this.showNotification(
                `Payment amount (R${paymentAmount.toFixed(2)}) cannot exceed outstanding balance (R${this.currentOutstanding.toFixed(2)})`, 
                'warning'
            );
            return;
        }

        const [year, month] = periodEl.value.split('-').map(Number);
        
        const paymentData = {
            id: 'payment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            customer_name: this.currentCustomer,
            to_customer: this.currentCustomer,
            amount: paymentAmount,
            date: dateEl.value,
            applies_to_period: { month, year },
            type: 'payment',
            payment_method: methodEl.value,
            received_by: receivedByEl.value.trim(),
            notes: (notesEl.value || '').trim(),
            created_at: new Date().toISOString(),
            status: 'completed',
            created_by: 'system'
        };

        const saveButton = document.getElementById('save-payment-btn');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '💾 Saving...';
            saveButton.style.opacity = '0.6';
        }

        try {
            console.log('💾 Saving payment:', paymentData);
            
            let firebaseSuccess = false;
            if (typeof storage.savePaymentToFirebase === 'function') {
                try {
                    console.log('☁️ Attempting Firebase save...');
                    firebaseSuccess = await storage.savePaymentToFirebase(paymentData);
                    console.log('☁️ Firebase save result:', firebaseSuccess);
                } catch (firebaseError) {
                    console.error('❌ Firebase save error:', firebaseError);
                }
            } else {
                console.warn('⚠️ Firebase save function not available');
            }

            let payments = [];
            try {
                const paymentsData = localStorage.getItem('payments');
                payments = paymentsData ? JSON.parse(paymentsData) : [];
            } catch (parseError) {
                console.error('❌ Error parsing payments:', parseError);
                payments = [];
            }
            
            payments.push(paymentData);
            localStorage.setItem('payments', JSON.stringify(payments));
            console.log('✅ Saved to localStorage');

            if (typeof storage.savePayments === 'function') {
                try {
                    await storage.savePayments(payments);
                    console.log('✅ Storage module updated');
                } catch (storageError) {
                    console.error('❌ Storage module error:', storageError);
                }
            }

            if (typeof storage.clearCache === 'function') {
                storage.clearCache();
                console.log('🗑️ Cache cleared');
            }

            const modal = document.getElementById('payment-modal-custom');
            if (modal) {
                modal.remove();
            }

            let successMessage = `Payment of R${paymentAmount.toFixed(2)} recorded for ${this.currentCustomer}!`;
            if (firebaseSuccess) {
                successMessage += ' (Synced to Firebase ☁️)';
                this.showNotification(successMessage, 'success');
            } else {
                successMessage += ' (Saved locally - will sync when online)';
                this.showNotification(successMessage, 'warning');
            }

            this.isLoaded = false;
            
            setTimeout(async () => {
                console.log('🔄 Reloading creditors data...');
                
                if (typeof storage.loadAllData === 'function') {
                    try {
                        await storage.loadAllData(true);
                    } catch (loadError) {
                        console.error('❌ Error reloading data:', loadError);
                    }
                }
                
                await this.loadCreditorsData();
                console.log('✅ Data reloaded');
            }, firebaseSuccess ? 1000 : 500);
            
        } catch (error) {
            console.error('❌ Error saving payment:', error);
            this.showNotification('Error saving payment: ' + error.message, 'error');
            
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = '💾 Save Payment';
                saveButton.style.opacity = '1';
            }
        }
    }

    filterCreditors() {
        const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
        const filterType = this.filterSelect?.value || 'all';

        const cards = document.querySelectorAll('.credit-card');
        
        if (cards.length === 0) return;

        let visibleCount = 0;
        
        cards.forEach(card => {
            const name = (card.getAttribute('data-customer-name') || '').toLowerCase();
            const outstanding = parseFloat(card.getAttribute('data-outstanding') || 0);

            let show = true;
            
            if (searchTerm && !name.includes(searchTerm)) {
                show = false;
            }
            
            if (filterType === 'debt' && outstanding <= 0) {
                show = false;
            } else if (filterType === 'paid' && outstanding > 0) {
                show = false;
            }

            card.style.display = show ? 'block' : 'none';
            if (show) visibleCount++;
        });
    }

    escapeString(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    followUpCustomer(customerName) {
        this.showNotification('Follow-up reminder set for ' + customerName, 'info');
    }
}

const creditors = new CreditorsManager();
export { creditors };
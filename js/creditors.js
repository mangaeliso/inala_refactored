import { storage } from './storage.js';
import { ui } from './ui.js';

class CreditorsManager {
    constructor() {
        this.creditorsList = null;
        this.searchInput = null;
        this.filterSelect = null;
        this.isLoaded = false;
        this.currentCustomer = null;
        this.currentOutstanding = 0;
        this.selectedMonth = null;
        this.selectedYear = null;
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
        if (!this.selectedMonth || !this.selectedYear || !items) return items || [];

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
        if (!this.selectedMonth || !this.selectedYear) return 'Current Period';
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
            
            const monthlyCreditSales = this.filterByPeriod(allCreditSales, 'sale');
            const monthlyPayments = this.filterByPeriod(allPayments, 'payment');

            const creditSummary = {};
            const originalNames = {};

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
                
                const productInfo = `${sale.product || 'Unknown'} (${sale.quantity || 0}x R${sale.price || 0})`;
                creditSummary[normKey].items.push(productInfo);
                
                if (!creditSummary[normKey].lastPurchase || new Date(sale.date) > new Date(creditSummary[normKey].lastPurchase)) {
                    creditSummary[normKey].lastPurchase = sale.date;
                }
            });

            monthlyPayments.forEach(payment => {
                const normKey = this.getNormalizedCustomerKey(payment);
                const origName = payment.customer_name || payment.to_customer || payment.from_collector || 'Unknown Customer';
                if (!originalNames[normKey]) originalNames[normKey] = origName;

                if (creditSummary[normKey]) {
                    creditSummary[normKey].totalPaid += parseFloat(payment.amount) || 0;
                    creditSummary[normKey].payments.push(payment);
                }
            });

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
        let creditHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';

        Object.entries(customersWithDebt).forEach(([normKey, data]) => {
            const customerName = data.name;
            const outstanding = parseFloat(data.outstandingAmount) || 0;
            const totalCredit = parseFloat(data.totalCredit) || 0;
            const totalPaid = parseFloat(data.totalPaid) || 0;
            const progressPercent = totalCredit > 0 ? Math.round((totalPaid / totalCredit) * 100) : 0;
            const isUrgent = outstanding > 500;
            const lastActivity = data.lastPurchase ? new Date(data.lastPurchase).toLocaleDateString() : 'N/A';

            creditHTML += `
                <div class="credit-card bg-white rounded-lg shadow-md p-6 border-l-4 ${isUrgent ? 'border-red-500' : 'border-blue-500'}" 
                     data-customer-name="${customerName.toLowerCase()}" 
                     data-outstanding="${outstanding}">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${customerName}</h3>
                    <div class="space-y-2 text-sm">
                        <div><span class="font-medium">Period:</span> <span class="text-gray-600">${periodName}</span></div>
                        <div><span class="font-medium">Credit Sales:</span> <span class="text-blue-600">R${totalCredit.toFixed(2)}</span></div>
                        <div><span class="font-medium">Paid:</span> <span class="text-green-600">R${totalPaid.toFixed(2)}</span></div>
                        <div><span class="font-medium">Outstanding:</span> <span class="text-red-600 font-bold text-lg">R${outstanding.toFixed(2)}</span></div>
                        <div><span class="font-medium">Payment Progress:</span> <span class="text-${progressPercent >= 50 ? 'green' : progressPercent > 0 ? 'yellow' : 'red'}-600">${progressPercent}%</span></div>
                        <div><span class="font-medium">Last activity:</span> ${lastActivity}</div>
                        ${data.items && data.items.length > 0 ? `
                            <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <span class="font-medium">Recent:</span> ${data.items.slice(-2).join(', ')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-outline" 
                                onclick="window.app.creditors.openPaymentModal('${this.escapeString(customerName)}', ${outstanding}, 'partial')">
                            Partial
                        </button>
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.app.creditors.openPaymentModal('${this.escapeString(customerName)}', ${outstanding}, 'full')">
                            Full Payment
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
            this.showNotification(`Payment amount (R${paymentAmount.toFixed(2)}) cannot exceed outstanding balance (R${this.currentOutstanding.toFixed(2)})`, 'warning');
            return;
        }

        const [year, month] = periodEl.value.split('-').map(Number);
        
        const paymentData = {
            id: 'payment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            customer_name: this.currentCustomer,
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

        try {
            let payments = [];
            try {
                const paymentsData = localStorage.getItem('payments');
                payments = paymentsData ? JSON.parse(paymentsData) : [];
            } catch (parseError) {
                console.error('Error parsing payments:', parseError);
                payments = [];
            }
            
            payments.push(paymentData);
            localStorage.setItem('payments', JSON.stringify(payments));
            
            if (typeof storage.savePayments === 'function') {
                await storage.savePayments(payments);
            }

            let firebaseSuccess = false;
            if (typeof storage.savePaymentToFirebase === 'function') {
                try {
                    firebaseSuccess = await storage.savePaymentToFirebase(paymentData);
                } catch (firebaseError) {
                    console.error('Error saving to Firebase:', firebaseError);
                }
            }

            if (typeof storage.clearCache === 'function') {
                storage.clearCache();
            }

            const modal = document.getElementById('payment-modal-custom');
            if (modal) {
                modal.remove();
            }

            if (firebaseSuccess) {
                this.showNotification(`Payment of R${paymentAmount.toFixed(2)} recorded for ${this.currentCustomer}! (Saved to Firebase)`, 'success');
            } else {
                this.showNotification(`Payment of R${paymentAmount.toFixed(2)} recorded for ${this.currentCustomer}! (Saved locally)`, 'success');
            }
            
            setTimeout(() => {
                this.loadCreditorsData();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Error saving payment:', error);
            this.showNotification('Error saving payment: ' + error.message, 'error');
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

// ✅ CORRECT EXPORT - Create instance and export it
const creditors = new CreditorsManager();
export { creditors };
import { storage } from './storage.js';
import { ui } from './ui.js';

// Business categories are unused; consider removing or integrating if needed elsewhere.

class ReportsManager {
    constructor() {
        this.reportsDisplay = null;
        this.selectedMonth = null;
        this.selectedYear = null;
        this.useBusinessCycle = true;
        this.currentPaymentId = null;
        this.data = { sales: [], expenses: [], payments: [] };
        this.eventListeners = [];
        this.isLoading = false;
        this.lastLoadTime = 0;
    }

    async initialize() {
        this.reportsDisplay = document.getElementById('reports-display');
        if (!this.reportsDisplay) {
            console.error('❌ reports-display element not found!');
            this.showNotification('Reports section not found in HTML', 'error');
            return;
        }
        this.useBusinessCycle = true;
        
        this.initializeManageCreditsButton();
        this.setupEventDelegation();
        this.addMonthFilterUI();
        this.getCurrentMonthData();
        await this.updateOverview();
        console.log('✅ ReportsManager initialized');
    }

    initializeManageCreditsButton() {
        let btn = document.getElementById('manage-credit-btn') || 
                  document.getElementById('manage-credits-btn') ||
                  document.querySelector('[data-action="manage-credits"]');
        
        if (!btn) {
            const allButtons = document.querySelectorAll('button');
            for (let button of allButtons) {
                const text = button.textContent.toLowerCase();
                if (text.includes('manage credit') || text.includes('💳')) {
                    btn = button;
                    break;
                }
            }
        }
        
        if (btn) {
            btn.onclick = null;
            btn.removeAttribute('onclick');
            
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ Manage Credits clicked!');
                this.showCreditManagement();
            };
            btn.addEventListener('click', handler);
            this.eventListeners.push({ element: btn, type: 'click', handler });
            console.log('✅ Manage Credits button initialized');
        } else {
            console.error('❌ Manage Credits button not found!');
        }
    }

    setupEventDelegation() {
        const container = document.body;
        const handler = async (e) => {
            if (e.target.id === 'creditors-report-btn') {
                await this.generateCreditorsReport();
            } else if (e.target.id === 'all-transactions-btn') {
                await this.generateAllTransactions();
            } else if (e.target.id === 'collection-report-btn') {
                await this.generateCollectionReport();
            } else if (e.target.id === 'month-comparison-btn') {
                await this.generateMonthComparison();
            }
        };
        container.addEventListener('click', handler);
        this.eventListeners.push({ element: container, type: 'click', handler });
    }

    async loadData() {
        const now = Date.now();
        if (this.data.sales.length === 0 && this.data.expenses.length === 0 && this.data.payments.length === 0 && 
            !this.isLoading && (now - this.lastLoadTime > 1000)) {
            this.isLoading = true;
            try {
                await storage.loadAllData();
                this.data.sales = storage.getSales() || [];
                this.data.expenses = storage.getExpenditures() || [];
                this.data.payments = storage.getPayments() || [];
                this.lastLoadTime = now;
                console.log('✅ Data loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load data:', error);
                this.showNotification('Error loading data', 'error');
            } finally {
                this.isLoading = false;
            }
        }
    }

    getCurrentMonthData() {
        const now = new Date();
        const currentDay = now.getDate();
        let currentMonth = now.getMonth() + 1;
        let currentYear = now.getFullYear();
        
        if (this.useBusinessCycle && currentDay < 5) {
            currentMonth = currentMonth - 1;
            if (currentMonth === 0) {
                currentMonth = 12;
                currentYear = currentYear - 1;
            }
        }
        
        this.selectedMonth = currentMonth;
        this.selectedYear = currentYear;
        this.updateFilterStatus();
    }

    getBusinessMonth(dateStr) {
        const d = new Date(dateStr);
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
        const fragment = document.createDocumentFragment();
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

        fragment.appendChild(notification);
        document.body.appendChild(fragment);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showCreditManagement() {
        console.log('📋 Loading credit management...');
        
        const creditorsContent = document.getElementById('creditors-content');
        if (!creditorsContent) {
            console.error('❌ Creditors content element not found!');
            this.showNotification('Creditors section not found in HTML', 'error');
            return;
        }

        if (!window.app?.creditors) {
            console.error('❌ Creditors module not available!');
            this.showNotification('Creditors module not loaded', 'error');
            return;
        }

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        creditorsContent.classList.remove('hidden');
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        window.app.creditors.creditorsList = document.getElementById('creditors-list');
        window.app.creditors.searchInput = document.getElementById('creditor-search');
        window.app.creditors.filterSelect = document.getElementById('creditor-filter');
        
        if (!window.app.creditors.creditorsList || !window.app.creditors.searchInput || !window.app.creditors.filterSelect) {
            console.error('❌ Required creditors UI elements not found!');
            this.showNotification('Creditors UI elements missing', 'error');
            return;
        }

        const refreshBtn = document.getElementById('refresh-creditors-btn');
        if (refreshBtn) {
            refreshBtn.onclick = null;
            const handler = () => {
                if (typeof window.app.creditors.loadCreditorsData === 'function') {
                    console.log('🔄 Refreshing creditors data...');
                    window.app.creditors.loadCreditorsData();
                } else {
                    console.error('❌ loadCreditorsData is not a function!');
                    this.showNotification('Failed to load creditors data', 'error');
                }
            };
            refreshBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: refreshBtn, type: 'click', handler });
        }
        
        if (typeof window.app.creditors.loadCreditorsData === 'function') {
            console.log('🔄 Loading creditors data...');
            window.app.creditors.loadCreditorsData();
        } else {
            console.error('❌ loadCreditorsData not available!');
            this.showNotification('Creditors data loading failed', 'error');
        }
        console.log('✅ Creditors manager UI loaded');
    }

    addMonthFilterUI() {
        const reportsHeader = document.querySelector('.reports-header') || document.querySelector('#reports-display')?.parentElement;
        if (!reportsHeader) {
            console.error('❌ Reports header not found!');
            this.showNotification('Reports header not found', 'error');
            return;
        }

        const existingFilter = document.getElementById('month-filter');
        if (existingFilter) return;

        const filterHTML = `
            <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <label style="font-weight: 600; color: #374151;">Filter Period:</label>
                    <select id="month-filter" class="form-select" style="width: 150px;">
                        <option value="all">All Time</option>
                        <option value="current" selected>Current Month</option>
                        <option value="custom">Custom Month</option>
                    </select>
                    <input type="month" id="custom-month" class="form-input" style="width: 180px; display: none;">
                    <button id="apply-filter-btn" class="btn btn-primary" style="display: none;">Apply</button>
                    <button id="clear-filter-btn" class="btn btn-secondary" style="display: none;">Clear Filter</button>
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-left: 1rem;">
                        <input type="checkbox" id="business-cycle-toggle" style="width: auto;" checked>
                        <span style="font-size: 0.875rem; color: #374151;">Use Business Cycle (5th-4th)</span>
                    </label>
                    <span id="filter-status" style="color: #6b7280; font-size: 0.875rem;"></span>
                </div>
            </div>
        `;

        const filterContainer = document.createElement('div');
        filterContainer.innerHTML = filterHTML;
        const filterElement = filterContainer.firstElementChild;
        reportsHeader.insertBefore(filterElement, reportsHeader.firstChild);

        const checkbox = document.getElementById('business-cycle-toggle');
        if (checkbox) {
            checkbox.checked = true;
            const handler = (e) => {
                this.useBusinessCycle = e.target.checked;
                this.getCurrentMonthData();
                this.updateFilterStatus();
                this.updateOverview();
            };
            checkbox.addEventListener('change', handler);
            this.eventListeners.push({ element: checkbox, type: 'change', handler });
        }

        const monthFilter = document.getElementById('month-filter');
        if (monthFilter) {
            const handler = (e) => {
                const customMonth = document.getElementById('custom-month');
                const applyBtn = document.getElementById('apply-filter-btn');
                const clearBtn = document.getElementById('clear-filter-btn');

                if (e.target.value === 'custom') {
                    if (customMonth) customMonth.style.display = 'block';
                    if (applyBtn) applyBtn.style.display = 'inline-block';
                    if (clearBtn) clearBtn.style.display = 'inline-block';
                } else {
                    if (customMonth) customMonth.style.display = 'none';
                    if (applyBtn) applyBtn.style.display = 'none';
                    if (clearBtn) clearBtn.style.display = 'inline-block';
                    
                    if (e.target.value === 'current') {
                        this.getCurrentMonthData();
                    } else {
                        this.selectedMonth = null;
                        this.selectedYear = null;
                    }
                    this.updateFilterStatus();
                    this.updateOverview();
                }
            };
            monthFilter.addEventListener('change', handler);
            this.eventListeners.push({ element: monthFilter, type: 'change', handler });
        }

        const applyFilterBtn = document.getElementById('apply-filter-btn');
        if (applyFilterBtn) {
            const handler = () => {
                const monthInput = document.getElementById('custom-month');
                if (monthInput && monthInput.value) {
                    const [year, month] = monthInput.value.split('-');
                    this.selectedYear = parseInt(year);
                    this.selectedMonth = parseInt(month);
                    this.updateFilterStatus();
                    this.updateOverview();
                }
            };
            applyFilterBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: applyFilterBtn, type: 'click', handler });
        }

        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (clearFilterBtn) {
            const handler = () => {
                this.selectedMonth = null;
                this.selectedYear = null;
                const monthFilter = document.getElementById('month-filter');
                const customMonth = document.getElementById('custom-month');
                const applyBtn = document.getElementById('apply-filter-btn');
                const clearBtn = document.getElementById('clear-filter-btn');
                
                if (monthFilter) monthFilter.value = 'all';
                if (customMonth) customMonth.style.display = 'none';
                if (applyBtn) applyBtn.style.display = 'none';
                if (clearBtn) clearBtn.style.display = 'none';
                this.updateFilterStatus();
                this.updateOverview();
            };
            clearFilterBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: clearFilterBtn, type: 'click', handler });
        }

        this.updateFilterStatus();
    }

    updateFilterStatus() {
        const statusEl = document.getElementById('filter-status');
        if (!statusEl) {
            console.error('❌ Filter status element not found!');
            return;
        }
        
        if (this.selectedMonth && this.selectedYear) {
            const monthName = new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            if (this.useBusinessCycle) {
                const startDay = 5;
                const startDate = new Date(this.selectedYear, this.selectedMonth - 1, startDay);
                let endMonth = this.selectedMonth;
                let endYear = this.selectedYear;
                if (endMonth === 12) {
                    endMonth = 1;
                    endYear += 1;
                } else {
                    endMonth += 1;
                }
                const endDate = new Date(endYear, endMonth - 1, 4);
                const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
                statusEl.textContent = `Showing: ${monthName} (Business: ${formatDate(startDate)}-${formatDate(endDate)})`;
            } else {
                statusEl.textContent = `Showing: ${monthName} (Calendar Month)`;
            }
            
            statusEl.style.color = '#3b82f6';
            statusEl.style.fontWeight = '600';
        } else {
            statusEl.textContent = 'Showing: All Time';
            statusEl.style.color = '#6b7280';
        }
    }

    filterDataByPeriod(data, type) {
        if (!this.selectedMonth || !this.selectedYear) return data;

        return data.filter(item => {
            if (!item.date) return false;
            
            let itemMonth, itemYear;
            if (type === 'payment') {
                const period = this.getPaymentPeriod(item);
                itemMonth = period.month;
                itemYear = period.year;
            } else if (this.useBusinessCycle) {
                const businessMonth = this.getBusinessMonth(item.date);
                itemMonth = businessMonth.month;
                itemYear = businessMonth.year;
            } else {
                const itemDate = new Date(item.date);
                itemMonth = itemDate.getMonth() + 1;
                itemYear = itemDate.getFullYear();
            }
            
            return itemMonth === this.selectedMonth && itemYear === this.selectedYear;
        });
    }

    async updateOverview() {
        if (!this.reportsDisplay) {
            console.error('❌ reportsDisplay not available!');
            return;
        }
        await this.loadData();
        
        let sales = this.filterDataByPeriod(this.data.sales);
        let expenses = this.filterDataByPeriod(this.data.expenses);
        
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const netProfit = totalSales - totalExpenses;
        const totalTransactions = sales.length + expenses.length;
        
        const reportTotalSales = document.getElementById('report-total-sales');
        const reportTotalExpenses = document.getElementById('report-total-expenses');
        const reportNetProfit = document.getElementById('report-net-profit');
        const reportTransactions = document.getElementById('report-transactions');
        
        if (reportTotalSales) reportTotalSales.textContent = ui.formatCurrency(totalSales);
        if (reportTotalExpenses) reportTotalExpenses.textContent = ui.formatCurrency(totalExpenses);
        if (reportNetProfit) reportNetProfit.textContent = ui.formatCurrency(netProfit);
        if (reportTransactions) reportTransactions.textContent = totalTransactions.toString();
        console.log('✅ Overview updated');
    }

    async generateCreditorsReport(pageSize = 50) {
        if (!this.reportsDisplay) {
            console.error('❌ reportsDisplay not available!');
            this.showNotification('Reports display not found', 'error');
            return;
        }
        console.log('📋 Generating creditors report...');
        
        await this.loadData();
        let allPayments = this.filterDataByPeriod(this.data.payments, 'payment');
        let allSales = this.data.sales.filter(sale => sale.payment_type === 'credit' || sale.payment === 'credit');
        allSales = this.filterDataByPeriod(allSales);

        const creditSummary = {};
        const originalNames = {};
        const monthlyData = {};

        allSales.forEach(sale => {
            const normKey = (sale.customer_name || sale.customer_id || 'unknown').trim().toLowerCase();
            const origName = sale.customer_name || sale.customer_id || 'Unknown Customer';
            originalNames[normKey] = origName;

            if (!creditSummary[normKey]) {
                creditSummary[normKey] = {
                    name: origName,
                    totalCredit: 0,
                    totalPaid: 0,
                    transactions: [],
                    payments: [],
                    lastPurchase: null,
                    contact: sale.customer_contact || 'Not Provided',
                    address: sale.customer_address || 'Not Provided'
                };
            }
            creditSummary[normKey].totalCredit += parseFloat(sale.total) || 0;
            creditSummary[normKey].transactions.push(sale);
            
            if (!creditSummary[normKey].lastPurchase || new Date(sale.date) > new Date(creditSummary[normKey].lastPurchase)) {
                creditSummary[normKey].lastPurchase = sale.date;
            }

            const saleMonth = this.getBusinessMonth(sale.date);
            const monthKey = `${saleMonth.year}-${String(saleMonth.month).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { sales: 0, payments: 0 };
            }
            monthlyData[monthKey].sales += parseFloat(sale.total) || 0;
        });

        allPayments.forEach(payment => {
            const normKey = (payment.customer_name || payment.to_customer || 'unknown').trim().toLowerCase();
            if (creditSummary[normKey]) {
                creditSummary[normKey].totalPaid += parseFloat(payment.amount) || 0;
                creditSummary[normKey].payments.push(payment);
            }

            const paymentPeriod = this.getPaymentPeriod(payment);
            const monthKey = `${paymentPeriod.year}-${String(paymentPeriod.month).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { sales: 0, payments: 0 };
            }
            monthlyData[monthKey].payments += parseFloat(payment.amount) || 0;
        });

        const htmlFragments = [
            `<div style="padding: 2rem; background: #f9fafb;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">Creditors Report</h2>
                <button id="back-btn" style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Back</button>
                <script>
                    document.getElementById('back-btn').addEventListener('click', () => {
                        window.history.back();
                    });
                </script>`
        ];

        const sortedMonths = Object.keys(monthlyData).sort().reverse();

        if (sortedMonths.length === 0) {
            htmlFragments.push(`<div style="text-align: center; padding: 2rem; color: #6b7280;">No credit data found.</div>`);
        } else {
            sortedMonths.forEach(monthKey => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const data = monthlyData[monthKey];
                const outstanding = data.sales - data.payments;

                htmlFragments.push(`
                    <div style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h3 style="font-size: 1rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">${monthName}</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem;">
                            <div><span style="color: #6b7280;">Credit Sales:</span> <span style="color: #3b82f6;">R${data.sales.toFixed(2)}</span></div>
                            <div><span style="color: #6b7280;">Payments:</span> <span style="color: #10b981;">R${data.payments.toFixed(2)}</span></div>
                            <div><span style="color: #6b7280;">Outstanding:</span> <span style="${outstanding > 0 ? 'color: #ef4444' : 'color: #6b7280'};">R${outstanding.toFixed(2)}</span></div>
                        </div>
                    </div>
                `);
            });

            const sortedCreditors = Object.entries(creditSummary)
                .map(([key, data]) => ({
                    ...data,
                    outstanding: Math.max(0, data.totalCredit - data.totalPaid)
                }))
                .sort((a, b) => b.outstanding - a.outstanding)
                .slice(0, pageSize);

            htmlFragments.push(`
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-top: 1rem; margin-bottom: 0.5rem;">Customer Summary (Top ${sortedCreditors.length})</h3>
                <div style="background: white; border-radius: 8px; overflow: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Customer</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Credit</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Paid</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Outstanding</th>
                                <th style="padding: 0.5rem; text-align: center; font-weight: 600; color: #374151;">Txns</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Last Purchase</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Contact</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Address</th>
                            </tr>
                        </thead>
                        <tbody>`);

            sortedCreditors.forEach((customer, index) => {
                const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
                htmlFragments.push(`
                    <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 0.25rem; color: #1f2937;">${customer.name}</td>
                        <td style="padding: 0.25rem; text-align: right; color: #3b82f6;">R${customer.totalCredit.toFixed(2)}</td>
                        <td style="padding: 0.25rem; text-align: right; color: #10b981;">R${customer.totalPaid.toFixed(2)}</td>
                        <td style="padding: 0.25rem; text-align: right; color: ${customer.outstanding > 0 ? '#ef4444' : '#6b7280'};">R${customer.outstanding.toFixed(2)}</td>
                        <td style="padding: 0.25rem; text-align: center; color: #6b7280;">${customer.transactions.length}</td>
                        <td style="padding: 0.25rem; color: #6b7280;">${customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : 'N/A'}</td>
                        <td style="padding: 0.25rem; color: #6b7280; white-space: nowrap;">${customer.contact}</td>
                        <td style="padding: 0.25rem; color: #6b7280;">${customer.address}</td>
                    </tr>
                `);
            });

            const totalCredit = sortedCreditors.reduce((sum, c) => sum + c.totalCredit, 0);
            const totalPaid = sortedCreditors.reduce((sum, c) => sum + c.totalPaid, 0);
            const totalOutstanding = sortedCreditors.reduce((sum, c) => sum + c.outstanding, 0);

            htmlFragments.push(`
                    <tr style="background: #f3f4f6; font-weight: 700;">
                        <td style="padding: 0.5rem; color: #1f2937;">TOTALS</td>
                        <td style="padding: 0.5rem; text-align: right; color: #3b82f6;">R${totalCredit.toFixed(2)}</td>
                        <td style="padding: 0.5rem; text-align: right; color: #10b981;">R${totalPaid.toFixed(2)}</td>
                        <td style="padding: 0.5rem; text-align: right; color: #ef4444;">R${totalOutstanding.toFixed(2)}</td>
                        <td style="padding: 0.5rem; text-align: center; color: #6b7280;">${sortedCreditors.length}</td>
                        <td style="padding: 0.5rem;"></td>
                        <td style="padding: 0.5rem;"></td>
                        <td style="padding: 0.5rem;"></td>
                    </tr>
                </tbody></table></div>`);
        }

        htmlFragments.push(`</div>`);

        this.reportsDisplay.innerHTML = htmlFragments.join('');
        console.log('✅ Creditors report generated');
    }

    async generateAllTransactions(pageSize = 100) {
        if (!this.reportsDisplay) {
            console.error('❌ reportsDisplay not available!');
            this.showNotification('Reports display not found', 'error');
            return;
        }
        console.log('📄 Generating all transactions...');
        
        await this.loadData();
        let sales = this.filterDataByPeriod(this.data.sales);
        let expenses = this.filterDataByPeriod(this.data.expenses);
        let payments = this.filterDataByPeriod(this.data.payments, 'payment');

        let allTransactions = [
            ...sales.map(s => ({ ...s, type: 'Sale', amount: s.total })),
            ...expenses.map(e => ({ ...e, type: 'Expense', amount: e.amount })),
            ...payments.map(p => ({ ...p, type: 'Payment', amount: p.amount }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, pageSize);

        const monthName = this.selectedMonth && this.selectedYear 
            ? new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'All Time';

        const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        const htmlFragments = [
            `<div style="padding: 2rem; background: #f9fafb;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">All Transactions - ${monthName}</h2>
                <button id="back-btn" style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Back</button>
                <script>
                    document.getElementById('back-btn').addEventListener('click', () => {
                        window.history.back();
                    });
                </script>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 0.875rem; color: #6b7280;">Total Sales</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">R${totalSales.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${sales.length} txns</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 0.875rem; color: #6b7280;">Total Expenses</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #ef4444;">R${totalExpenses.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${expenses.length} txns</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="font-size: 0.875rem; color: #6b7280;">Total Payments</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">R${totalPayments.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${payments.length} txns</div>
                    </div>
                </div>`
        ];

        if (allTransactions.length === 0) {
            htmlFragments.push(`<div style="text-align: center; padding: 2rem; color: #6b7280;">No transactions found.</div>`);
        } else {
            htmlFragments.push(`
                <div style="background: white; border-radius: 8px; overflow: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Date</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Type</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Description</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Amount</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Details</th>
                            </tr>
                        </thead>
                        <tbody>`);

            allTransactions.forEach((transaction, index) => {
                const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
                const typeColor = transaction.type === 'Sale' ? '#10b981' : transaction.type === 'Payment' ? '#3b82f6' : '#ef4444';
                const description = transaction.type === 'Sale' 
                    ? `${transaction.product || 'Product'} (${transaction.quantity || 0}x)`
                    : transaction.type === 'Payment'
                    ? `Payment from ${transaction.customer_name || 'Customer'}`
                    : transaction.description || 'Expense';
                
                const details = transaction.type === 'Sale'
                    ? `${transaction.customer_name || 'Cash Sale'} - ${transaction.payment_type || transaction.payment || 'cash'}`
                    : transaction.type === 'Payment'
                    ? `Method: ${transaction.payment_method || 'N/A'}, Collector: ${transaction.received_by || 'N/A'}`
                    : `Category: ${transaction.category || 'N/A'}`;

                htmlFragments.push(`
                    <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 0.25rem; color: #6b7280;">${new Date(transaction.date).toLocaleDateString()}</td>
                        <td style="padding: 0.25rem;"><span style="padding: 0.25rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: ${typeColor}20; color: ${typeColor};">${transaction.type}</span></td>
                        <td style="padding: 0.25rem; color: #1f2937;">${description}</td>
                        <td style="padding: 0.25rem; text-align: right; font-weight: 600; color: ${typeColor};">R${(transaction.amount || 0).toFixed(2)}</td>
                        <td style="padding: 0.25rem; color: #6b7280;">${details}</td>
                    </tr>
                `);
            });

            htmlFragments.push(`</tbody></table></div>`);
        }

        htmlFragments.push(`</div>`);

        this.reportsDisplay.innerHTML = htmlFragments.join('');
        console.log('✅ All transactions generated');
    }

    async generateCollectionReport() {
        if (!this.reportsDisplay) {
            console.error('❌ reportsDisplay not available!');
            this.showNotification('Reports display not found', 'error');
            return;
        }
        console.log('💰 Generating collection report...');
        
        await this.loadData();
        let payments = this.filterDataByPeriod(this.data.payments, 'payment');

        const monthName = this.selectedMonth && this.selectedYear 
            ? new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'All Time';

        const collectionByCustomer = {};
        const collectionByMethod = {};
        const collectionByCollector = {};

        payments.forEach(payment => {
            const customer = payment.customer_name || payment.to_customer || 'Unknown';
            const method = payment.payment_method || 'Unknown';
            const collector = payment.received_by || 'Unknown';
            const amount = parseFloat(payment.amount) || 0;

            collectionByCustomer[customer] = (collectionByCustomer[customer] || 0) + amount;
            collectionByMethod[method] = (collectionByMethod[method] || 0) + amount;
            collectionByCollector[collector] = (collectionByCollector[collector] || 0) + amount;
        });

        const totalCollected = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        const htmlFragments = [
            `<div style="padding: 2rem; background: #f9fafb;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">Payment Collection - ${monthName}</h2>
                <button id="back-btn" style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Back</button>
                <script>
                    document.getElementById('back-btn').addEventListener('click', () => {
                        window.history.back();
                    });
                </script>
                <div style="background: #d1fae5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #10b981;">
                    <div style="font-size: 0.875rem; color: #065f46;">Total Collected</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #065f46;">R${totalCollected.toFixed(2)}</div>
                    <div style="font-size: 0.75rem; color: #065f46;">${payments.length} payments</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">`
        ];

        // By Collector with Transaction Details and Editable Month
        htmlFragments.push(`<div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="font-size: 1rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">By Collector</h3>`);
        Object.entries(collectionByCollector)
            .sort((a, b) => b[1] - a[1])
            .forEach(([collector, amount], index) => {
                const percentage = totalCollected > 0 ? ((amount / totalCollected) * 100).toFixed(1) : '0.0';
                const collectorPayments = payments.filter(p => (p.received_by || 'Unknown') === collector);
                const transactionCount = collectorPayments.length;
                htmlFragments.push(`
                    <div style="margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #374151;">${collector}</span>
                            <span style="color: #10b981;">R${amount.toFixed(2)}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${percentage}% (${transactionCount} txns)</div>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">Transactions:</div>
                `);
                collectorPayments.forEach((p, pIndex) => {
                    const paymentPeriod = this.getPaymentPeriod(p);
                    const paymentId = p.id || pIndex + '_' + index; // Assume payment has an 'id' field; fallback to generated ID
                    htmlFragments.push(`
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <span>${new Date(p.date).toLocaleDateString()} - R${parseFloat(p.amount).toFixed(2)}</span>
                            <select id="month-select-${paymentId}" style="padding: 0.25rem; border-radius: 4px; border: 1px solid #d1d5db;">
                                <option value="${paymentPeriod.month}-${paymentPeriod.year}" selected>${paymentPeriod.month}/${paymentPeriod.year}</option>
                                <option value="1-2025">1/2025</option>
                                <option value="2-2025">2/2025</option>
                                <option value="3-2025">3/2025</option>
                                <option value="4-2025">4/2025</option>
                                <option value="5-2025">5/2025</option>
                                <option value="6-2025">6/2025</option>
                                <option value="7-2025">7/2025</option>
                                <option value="8-2025">8/2025</option>
                                <option value="9-2025">9/2025</option>
                                <option value="10-2025">10/2025</option>
                                <option value="11-2025">11/2025</option>
                                <option value="12-2025">12/2025</option>
                                <option value="1-2026">1/2026</option>
                                <option value="2-2026">2/2026</option>
                                <option value="3-2026">3/2026</option>
                                <option value="4-2026">4/2026</option>
                                <option value="5-2026">5/2026</option>
                                <option value="6-2026">6/2026</option>
                                <option value="7-2026">7/2026</option>
                                <option value="8-2026">8/2026</option>
                                <option value="9-2026">9/2026</option>
                                <option value="10-2026">10/2026</option>
                                <option value="11-2026">11/2026</option>
                                <option value="12-2026">12/2026</option>
                            </select>
                            <button onclick="reports.savePaymentMonth('${paymentId}', document.getElementById('month-select-${paymentId}').value, ${pIndex}, '${collector}')">Save</button>
                        </div>
                    `);
                });
                htmlFragments.push(`</div>`);
            });
        htmlFragments.push(`</div>`);

        // By Customer
        htmlFragments.push(`<div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="font-size: 1rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">By Customer</h3>`);
        Object.entries(collectionByCustomer)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([customer, amount]) => {
                const percentage = totalCollected > 0 ? ((amount / totalCollected) * 100).toFixed(1) : '0.0';
                htmlFragments.push(`
                    <div style="margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #374151;">${customer}</span>
                            <span style="color: #10b981;">R${amount.toFixed(2)}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${percentage}%</div>
                    </div>
                `);
            });
        htmlFragments.push(`</div>`);

        // By Method
        htmlFragments.push(`<div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="font-size: 1rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">By Method</h3>`);
        Object.entries(collectionByMethod)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([method, amount]) => {
                const percentage = totalCollected > 0 ? ((amount / totalCollected) * 100).toFixed(1) : '0.0';
                htmlFragments.push(`
                    <div style="margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #374151;">${method}</span>
                            <span style="color: #10b981;">R${amount.toFixed(2)}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${percentage}%</div>
                    </div>
                `);
            });
        htmlFragments.push(`</div>`);

        htmlFragments.push(`</div></div>`);

        this.reportsDisplay.innerHTML = htmlFragments.join('');
        console.log('✅ Collection report generated');
    }

    savePaymentMonth(paymentId, newPeriodStr, pIndex, collector) {
        const [month, year] = newPeriodStr.split('-').map(Number);
        const payment = this.data.payments.find(p => p.id === paymentId);
        if (payment) {
            payment.applies_to_period = { month, year };
            storage.updatePayment(payment).then(() => {
                this.showNotification('Payment month updated successfully', 'success');
                this.generateCollectionReport(); // Refresh the report
            }).catch(error => {
                console.error('❌ Failed to update payment month:', error);
                this.showNotification('Error updating payment month', 'error');
            });
        } else {
            console.error('❌ Payment not found for update');
        }
    }

    async generateMonthComparison() {
        if (!this.reportsDisplay) {
            console.error('❌ reportsDisplay not available!');
            this.showNotification('Reports display not found', 'error');
            return;
        }
        console.log('📈 Generating Month Comparison...');
        
        await this.loadData();
        let allSales = this.data.sales;
        let allExpenses = this.data.expenses;

        const monthlyData = {};

        allSales.forEach(sale => {
            const businessMonth = this.getBusinessMonth(sale.date);
            const monthKey = `${businessMonth.year}-${String(businessMonth.month).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: businessMonth.month,
                    year: businessMonth.year,
                    sales: 0,
                    expenses: 0,
                    transactions: 0
                };
            }
            monthlyData[monthKey].sales += sale.total || 0;
            monthlyData[monthKey].transactions++;
        });

        allExpenses.forEach(expense => {
            const businessMonth = this.getBusinessMonth(expense.date);
            const monthKey = `${businessMonth.year}-${String(businessMonth.month).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: businessMonth.month,
                    year: businessMonth.year,
                    sales: 0,
                    expenses: 0,
                    transactions: 0
                };
            }
            monthlyData[monthKey].expenses += expense.amount || 0;
        });

        const sortedMonths = Object.keys(monthlyData).sort().reverse();

        const htmlFragments = [
            `<div style="padding: 2rem; background: #f9fafb;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem;">Month-to-Month Comparison</h2>
                <button id="back-btn" style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Back</button>
                <script>
                    document.getElementById('back-btn').addEventListener('click', () => {
                        window.history.back();
                    });
                </script>`
        ];

        if (sortedMonths.length === 0) {
            htmlFragments.push(`<div style="text-align: center; padding: 2rem; color: #6b7280;">No data available.</div>`);
        } else {
            htmlFragments.push(`
                <div style="background: white; border-radius: 8px; overflow: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 600; color: #374151;">Month</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Sales</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Expenses</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Profit</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 600; color: #374151;">Margin</th>
                                <th style="padding: 0.5rem; text-align: center; font-weight: 600; color: #374151;">Txns</th>
                            </tr>
                        </thead>
                        <tbody>`);

            sortedMonths.forEach((monthKey, index) => {
                const data = monthlyData[monthKey];
                const profit = data.sales - data.expenses;
                const margin = data.sales > 0 ? ((profit / data.sales) * 100) : 0;
                const monthName = new Date(data.year, data.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';

                htmlFragments.push(`
                    <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 0.25rem; color: #1f2937;">${monthName}</td>
                        <td style="padding: 0.25rem; text-align: right; color: #10b981;">R${data.sales.toFixed(2)}</td>
                        <td style="padding: 0.25rem; text-align: right; color: #ef4444;">R${data.expenses.toFixed(2)}</td>
                        <td style="padding: 0.25rem; text-align: right; color: ${profit >= 0 ? '#10b981' : '#ef4444'};">R${profit.toFixed(2)}</td>
                        <td style="padding: 0.25rem; text-align: right; color: ${margin >= 0 ? '#10b981' : '#ef4444'};">${margin.toFixed(1)}%</td>
                        <td style="padding: 0.25rem; text-align: center; color: #6b7280;">${data.transactions}</td>
                    </tr>
                `);
            });

            const totalSales = Object.values(monthlyData).reduce((sum, d) => sum + d.sales, 0);
            const totalExpenses = Object.values(monthlyData).reduce((sum, d) => sum + d.expenses, 0);
            const totalProfit = totalSales - totalExpenses;
            const avgMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
            const totalTransactions = Object.values(monthlyData).reduce((sum, d) => sum + d.transactions, 0);

            htmlFragments.push(`
                    <tr style="background: #f3f4f6; font-weight: 700;">
                        <td style="padding: 0.5rem; color: #1f2937;">TOTALS</td>
                        <td style="padding: 0.5rem; text-align: right; color: #10b981;">R${totalSales.toFixed(2)}</td>
                        <td style="padding: 0.5rem; text-align: right; color: #ef4444;">R${totalExpenses.toFixed(2)}</td>
                        <td style="padding: 0.5rem; text-align: right; color: ${totalProfit >= 0 ? '#10b981' : '#ef4444'};">R${totalProfit.toFixed(2)}</td>
                        <td style="padding: 0.5rem; text-align: right; color: ${avgMargin >= 0 ? '#10b981' : '#ef4444'};">${avgMargin.toFixed(1)}%</td>
                        <td style="padding: 0.5rem; text-align: center; color: #6b7280;">${totalTransactions}</td>
                    </tr>
                </tbody></table></div>`);
        }

        htmlFragments.push(`</div>`);

        this.reportsDisplay.innerHTML = htmlFragments.join('');
        console.log('✅ Month comparison generated');
    }

    destroy() {
        this.eventListeners.forEach(({ element, type, handler }) => {
            element.removeEventListener(type, handler);
        });
        this.eventListeners = [];
        this.data = { sales: [], expenses: [], payments: [] };
        console.log('✅ ReportsManager destroyed');
    }
}

export const reports = new ReportsManager();

// Ensure initialization happens after DOM is ready
document.addEventListener('DOMContentLoaded', () => reports.initialize());
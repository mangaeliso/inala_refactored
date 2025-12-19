// reports.js - Complete Modern Reports Manager
import { storage } from './storage.js';
import { ui } from './ui.js';

class ReportsManager {
  constructor() {
    this.reportsDisplay = null;
    this.selectedMonth = null;
    this.selectedYear = null;
    this.useBusinessCycle = true;
    this.data = { sales: [], expenses: [], payments: [] };
    this.eventListeners = [];
    this.isLoading = false;
    this.lastLoadTime = 0;
  }

  async initialize() {
    try {
      this.reportsDisplay = document.getElementById('reports-display');
      if (!this.reportsDisplay) {
        console.error('reports-display element not found');
        return;
      }
      this.addStyles();
      this.setupEventDelegation();
      this.addMonthFilterUI();
      this.getCurrentMonthData();
      await this.updateOverview();
      
      setTimeout(() => {
        this.hideUnwantedButtons();
        this.ensureButtonsClickable();
      }, 100);
      
      window.reports = this;
      console.log('✅ ReportsManager initialized');
    } catch (e) {
      console.error('initialize error', e);
    }
  }

  ensureButtonsClickable() {
    const buttonIds = ['manage-credits-btn', 'creditors-report-btn', 'all-transactions-btn', 'collection-report-btn', 'month-comparison-btn'];
    buttonIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
      }
    });
  }

  addStyles() {
    if (document.getElementById('reports-manager-styles')) return;
    const css = `
      .modern-overview { background: transparent; padding: 0; margin-bottom: 24px; }
      .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
      .category-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: all 0.2s ease; }
      .category-card:hover { border-color: #d1d5db; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); }
      .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .category-name { font-size: 0.95rem; font-weight: 600; color: #1f2937; }
      .status-badge { padding: 4px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      .status-badge.profitable { background: #d1fae5; color: #065f46; }
      .status-badge.loss { background: #fee2e2; color: #991b1b; }
      .category-profit { font-size: 1.75rem; font-weight: 700; text-align: center; margin: 20px 0; }
      .category-profit.positive { color: #10b981; }
      .category-profit.negative { color: #ef4444; }
      .category-details { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .detail-item { text-align: left; }
      .detail-label { font-size: 0.65rem; color: #9ca3af; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.5px; }
      .detail-value { font-size: 0.95rem; font-weight: 700; color: #1f2937; }
      .category-footer { font-size: 0.75rem; color: #6b7280; padding-top: 12px; border-top: 1px solid #f3f4f6; }
      .section-title { font-size: 0.95rem; font-weight: 600; color: #1f2937; margin: 24px 0 16px 0; }
      button { cursor: pointer !important; pointer-events: auto !important; }
      button:hover { opacity: 0.9; }
      button:active { transform: scale(0.98); }
      .collector-details { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
      .collector-details.expanded { max-height: 5000px; transition: max-height 0.5s ease-in; }
      .collector-toggle { cursor: pointer; user-select: none; transition: all 0.2s; }
      .collector-toggle:hover { background: #f3f4f6 !important; }
      .toggle-icon { transition: transform 0.3s; display: inline-block; }
      .toggle-icon.expanded { transform: rotate(90deg); }
    `;
    const s = document.createElement('style');
    s.id = 'reports-manager-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  async loadData() {
    const now = Date.now();
    if (!this.isLoading && (now - this.lastLoadTime > 800)) {
      this.isLoading = true;
      try {
        if (typeof storage.loadAllData === 'function') await storage.loadAllData();
        this.data.sales = storage.getSales() || [];
        this.data.expenses = storage.getExpenditures() || [];
        this.data.payments = storage.getPayments() || [];
        this.lastLoadTime = now;
      } catch (err) {
        console.error('loadData failed', err);
      } finally {
        this.isLoading = false;
      }
    } else {
      try {
        this.data.sales = storage.getSales() || this.data.sales;
        this.data.expenses = storage.getExpenditures() || this.data.expenses;
        this.data.payments = storage.getPayments() || this.data.payments;
      } catch (e) {}
    }
  }

  getCurrentMonthData() {
    const now = new Date();
    let month = now.getMonth() + 1, year = now.getFullYear(), day = now.getDate();
    if (this.useBusinessCycle && day < 5) {
      month -= 1;
      if (month === 0) { month = 12; year -= 1; }
    }
    this.selectedMonth = month;
    this.selectedYear = year;
  }

  getBusinessMonth(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { month: this.selectedMonth || (new Date().getMonth()+1), year: this.selectedYear || new Date().getFullYear() };
    let month = d.getMonth()+1, year = d.getFullYear(), day = d.getDate();
    if (this.useBusinessCycle && day < 5) { 
      month -= 1; 
      if (month === 0) { month = 12; year -= 1; } 
    }
    return { month, year };
  }

  getPaymentPeriod(payment) {
    if (!payment) return this.getBusinessMonth(new Date());
    if (payment.applies_to_period && payment.applies_to_period.month && payment.applies_to_period.year) return payment.applies_to_period;
    return this.getBusinessMonth(payment.date);
  }

  filterByPeriod(arr, type = 'default') {
    if (!Array.isArray(arr)) return [];
    if (!this.selectedMonth || !this.selectedYear) return arr;
    return arr.filter(item => {
      if (!item || !item.date) return false;
      let m, y;
      if (type === 'payment') {
        const p = this.getPaymentPeriod(item); m = p.month; y = p.year;
      } else if (this.useBusinessCycle) {
        const b = this.getBusinessMonth(item.date); m = b.month; y = b.year;
      } else {
        const d = new Date(item.date); if (isNaN(d.getTime())) return false; m = d.getMonth()+1; y = d.getFullYear();
      }
      return (m === this.selectedMonth && y === this.selectedYear);
    });
  }

  fmt(v) {
    try { return ui.formatCurrency ? ui.formatCurrency(v) : `R${Number(v||0).toFixed(2)}`; }
    catch (e) { return `R${Number(v||0).toFixed(2)}`; }
  }

  expenseMatchesCategory(expense, key) {
    if (!expense || !key) return false;
    const k = key.toString().toLowerCase();
    const category = (expense.category || '').toString().toLowerCase();
    const description = (expense.description || '').toString().toLowerCase();
    const productName = (expense.product_name || '').toString().toLowerCase();
    if (category.includes(k) || description.includes(k) || productName.includes(k)) return true;
    const fields = [expense.for_products, expense.related_products, expense.allocation];
    for (const f of fields) {
      if (!f) continue;
      const s = (Array.isArray(f) ? f.join(' ') : f.toString()).toLowerCase();
      if (s.includes(k)) return true;
    }
    return false;
  }

  saleMatchesCategory(sale, key) {
    if (!sale || !key) return false;
    const k = key.toString().toLowerCase();
    const fields = [sale.category, sale.product, sale.products, sale.items, sale.description];
    for (const f of fields) {
      if (!f) continue;
      const s = (Array.isArray(f) ? f.join(' ') : f.toString()).toLowerCase();
      if (s.includes(k)) return true;
    }
    return false;
  }

  setupEventDelegation() {
    const handler = (e) => {
      if (!e.target) return;
      const button = e.target.closest('button');
      if (!button) return;
      const id = button.id;
      const text = button.textContent.toLowerCase();
      
      if (id === 'manage-credits-btn' || text.includes('manage credits')) {
        e.preventDefault();
        this.showCreditManagement();
        return;
      }
      if (id === 'creditors-report-btn' || text.includes('creditors report')) {
        e.preventDefault();
        this.generateCreditorsReport();
        return;
      }
      if (id === 'all-transactions-btn' || text.includes('all transactions')) {
        e.preventDefault();
        this.generateAllTransactions();
        return;
      }
      if (id === 'collection-report-btn' || text.includes('payment collection')) {
        e.preventDefault();
        this.generateCollectionReport();
        return;
      }
      if (id === 'month-comparison-btn' || text.includes('month comparison')) {
        e.preventDefault();
        this.generateMonthComparison();
        return;
      }
    };
    
    document.body.addEventListener('click', handler, true);
    this.eventListeners.push({ el: document.body, type: 'click', handler, capture: true });
    this.hideUnwantedButtons();
  }

  hideUnwantedButtons() {
    const buttonsToHide = ['advanced-reports-btn', 'export-csv-btn', 'export-pdf-btn', 'monthly-analysis-btn'];
    buttonsToHide.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = 'none';
    });
  }

  addMonthFilterUI() {
    try {
      const header = document.querySelector('.reports-header') || (this.reportsDisplay && this.reportsDisplay.parentElement);
      if (!header || document.getElementById('month-filter')) return;
      
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div class="filter-section">
          <div class="filter-controls">
            <label class="filter-label">Filter Period:</label>
            <select id="month-filter" class="filter-select">
              <option value="all">All Time</option>
              <option value="current" selected>Current Month</option>
            </select>
            <label style="display:flex;gap:8px;align-items:center">
              <input id="business-cycle-toggle" type="checkbox" checked>
              <span style="font-size:0.875rem;color:#374151">Use Business Cycle (5th-4th)</span>
            </label>
            <div id="filter-status" class="filter-status"></div>
          </div>
        </div>
      `;
      
      header.insertBefore(wrapper.firstElementChild, header.firstChild);
      
      const monthFilter = document.getElementById('month-filter');
      const toggle = document.getElementById('business-cycle-toggle');
      
      monthFilter.addEventListener('change', (e) => {
        if (e.target.value==='current') this.getCurrentMonthData();
        else { this.selectedMonth = null; this.selectedYear = null; }
        this.updateFilterStatus();
        this.updateOverview();
      });
      
      toggle.addEventListener('change', (e) => {
        this.useBusinessCycle = !!e.target.checked;
        this.getCurrentMonthData();
        this.updateFilterStatus();
        this.updateOverview();
      });
      
      this.updateFilterStatus();
    } catch (e) {
      console.error('addMonthFilterUI', e);
    }
  }

  updateFilterStatus() {
    const el = document.getElementById('filter-status');
    if (!el) return;
    
    if (this.selectedMonth && this.selectedYear) {
      const monthName = new Date(this.selectedYear, this.selectedMonth-1).toLocaleDateString('en-US', {month:'long', year:'numeric'});
      el.textContent = this.useBusinessCycle ? `Showing: ${monthName} (Business Cycle)` : `Showing: ${monthName} (Calendar Month)`;
    } else {
      el.textContent = 'Showing: All Time';
    }
  }

  getPeriodDisplayName() {
    if (!this.selectedMonth || !this.selectedYear) return 'All Time';
    return new Date(this.selectedYear, this.selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  async updateOverview() {
    if (!this.reportsDisplay) return;
    await this.loadData();
    
    const sales = this.filterByPeriod(this.data.sales || []);
    const expenses = this.filterByPeriod(this.data.expenses || []);
    const totalSales = sales.reduce((s,x)=>s+(parseFloat(x.total)||0),0);
    const totalExpenses = expenses.reduce((s,x)=>s+(parseFloat(x.amount)||0),0);
    const netProfit = totalSales - totalExpenses;
    const totalTransactions = sales.length + expenses.length;

    this.updateExternalCards(totalSales, totalExpenses, netProfit, totalTransactions);

    const html = `
      <div class="modern-overview">
        <div class="section-title">Business Category Performance - ${this.getPeriodDisplayName()}</div>
        <div class="category-grid">
          ${this.renderCategoryCard('Beef Products', 'beef', sales, expenses)}
          ${this.renderCategoryCard('Pork Products', 'pork', sales, expenses)}
          ${this.renderCategoryCard('Chicken Products', 'chicken', sales, expenses)}
        </div>
      </div>
    `;
    
    this.reportsDisplay.innerHTML = html;
  }

  updateExternalCards(totalSales, totalExpenses, netProfit, totalTransactions) {
    try {
      const statCards = document.querySelectorAll('#reports-content .stat-card');
      statCards.forEach(card => {
        const label = card.querySelector('.stat-label');
        const value = card.querySelector('.stat-value');
        if (!label || !value) return;
        const labelText = label.textContent.trim();
        if (labelText === 'Total Sales') value.textContent = this.fmt(totalSales);
        else if (labelText === 'Total Expenses') value.textContent = this.fmt(totalExpenses);
        else if (labelText === 'Net Profit') value.textContent = this.fmt(netProfit);
        else if (labelText === 'Transactions') value.textContent = totalTransactions.toString();
      });
    } catch (e) {}
  }

  renderCategoryCard(label, keyMatch, salesArr, expensesArr) {
    try {
      const key = (keyMatch || label.split(' ')[0]).toString().toLowerCase();
      const salesList = (salesArr || []).filter(s => this.saleMatchesCategory(s, key));
      const expensesList = (expensesArr || []).filter(e => this.expenseMatchesCategory(e, key));
      const salesTotal = salesList.reduce((acc,x)=>acc+(parseFloat(x.total)||0),0);
      const expensesTotal = expensesList.reduce((acc,x)=>acc+(parseFloat(x.amount)||0),0);
      const profit = salesTotal - expensesTotal;
      const margin = salesTotal > 0 ? ((profit / salesTotal) * 100).toFixed(1) : '0.0';
      const status = profit >= 0 ? 'profitable' : 'loss';
      const statusText = profit >= 0 ? 'PROFITABLE' : 'LOSS';
      
      const topProducts = salesList.slice(0, 3).map(s => {
        const product = s.product || s.description || 'Unknown';
        const qty = s.quantity || 1;
        return `${product} (${qty})`;
      }).join(', ') || 'No products';
      
      return `
        <div class="category-card">
          <div class="category-header">
            <div class="category-name">${label}</div>
            <span class="status-badge ${status}">${statusText}</span>
          </div>
          <div class="category-profit ${profit >= 0 ? 'positive' : 'negative'}">${this.fmt(profit)}</div>
          <div class="category-details">
            <div class="detail-item">
              <div class="detail-label">SALES</div>
              <div class="detail-value" style="color:#10b981">${this.fmt(salesTotal)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">EXPENSES</div>
              <div class="detail-value" style="color:#ef4444">${this.fmt(expensesTotal)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">TRANSACTIONS</div>
              <div class="detail-value">${salesList.length + expensesList.length}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">MARGIN</div>
              <div class="detail-value" style="color:${profit >= 0 ? '#10b981' : '#ef4444'}">${margin}%</div>
            </div>
          </div>
          <div class="category-footer"><strong>Top Products:</strong><br>${topProducts}</div>
        </div>
      `;
    } catch (e) {
      return `<div class="category-card">${label} - unable to compute</div>`;
    }
  }

  showCreditManagement() {
    try {
      const el = document.getElementById('creditors-content');
      if (el) {
        document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));
        el.classList.remove('hidden');
        if (window.app && window.app.creditors && typeof window.app.creditors.loadCreditorsData === 'function') {
          window.app.creditors.loadCreditorsData();
        }
      }
    } catch (e) {}
  }

  async generateCreditorsReport() {
    try {
      await this.loadData();
      const html = `
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="margin: 0;">📋 Creditors Report</h3>
            <button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">← Back</button>
          </div>
          <p>Creditors report coming soon...</p>
        </div>
      `;
      this.reportsDisplay.innerHTML = html;
    } catch (error) {
      console.error('generateCreditorsReport error:', error);
    }
  }

  async generateAllTransactions() {
    try {
      await this.loadData();
      const sales = this.filterByPeriod(this.data.sales || []);
      const expenses = this.filterByPeriod(this.data.expenses || []);
      const allTransactions = [
        ...sales.map(s => ({ ...s, type: 'Sale', amount: s.total })),
        ...expenses.map(e => ({ ...e, type: 'Expense' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      let html = `
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="margin: 0;">📊 All Transactions</h3>
            <button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">← Back</button>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left;">Date</th>
                <th style="padding: 12px; text-align: left;">Type</th>
                <th style="padding: 12px; text-align: left;">Description</th>
                <th style="padding: 12px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      allTransactions.forEach(t => {
        const color = t.type === 'Sale' ? '#10b981' : '#ef4444';
        const desc = t.description || t.product || t.category || 'N/A';
        html += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 12px;">${t.date}</td><td style="padding: 12px;"><span style="color: ${color}; font-weight: 600;">${t.type}</span></td><td style="padding: 12px;">${desc}</td><td style="padding: 12px; text-align: right; font-weight: 600; color: ${color};">${this.fmt(t.amount)}</td></tr>`;
      });
      
      html += `</tbody></table></div>`;
      this.reportsDisplay.innerHTML = html;
    } catch (error) {
      console.error('generateAllTransactions error:', error);
    }
  }

  async generateCollectionReport() {
    try {
      await this.loadData();
      const allPayments = this.data.payments || [];
      const allSales = this.data.sales || [];
      
      console.log('🔍 Total payments:', allPayments.length);
      console.log('🔍 Selected period:', this.selectedMonth, this.selectedYear);
      
      let payments = allPayments;
      if (this.selectedMonth && this.selectedYear) {
        payments = allPayments.filter(payment => {
          if (!payment || !payment.date) return false;
          const paymentDate = new Date(payment.date);
          const paymentMonth = paymentDate.getMonth() + 1;
          const paymentYear = paymentDate.getFullYear();
          return paymentMonth === this.selectedMonth && paymentYear === this.selectedYear;
        });
      }
      
      console.log('🔍 Filtered payments:', payments.length);
      
      if (payments.length === 0) {
        this.reportsDisplay.innerHTML = `
          <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px; text-align: center;">
            <h3>💰 Payment Collection Report</h3>
            <p style="color: #6b7280; margin: 16px 0;">No payments found for ${this.getPeriodDisplayName()}</p>
            <p style="color: #9ca3af; font-size: 0.875rem;">Total payments in system: ${allPayments.length}</p>
            <button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 16px;">← Back</button>
          </div>
        `;
        return;
      }
      
      const collectors = {};
      let totalCollected = 0;
      
      payments.forEach(payment => {
        const collector = payment.received_by || payment.from_collector || 'Unknown';
        const customerName = payment.customer_name || payment.to_customer || 'Unknown';
        const amount = parseFloat(payment.amount || 0);
        const appliesPeriod = payment.applies_to_period || this.getPaymentPeriod(payment);
        const periodKey = `${appliesPeriod.year}-${String(appliesPeriod.month).padStart(2, '0')}`;
        const periodName = new Date(appliesPeriod.year, appliesPeriod.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        totalCollected += amount;
        
        if (!collectors[collector]) {
          collectors[collector] = { name: collector, totalCollected: 0, paymentsCount: 0, customers: {} };
        }
        collectors[collector].totalCollected += amount;
        collectors[collector].paymentsCount++;
        
        if (!collectors[collector].customers[customerName]) {
          collectors[collector].customers[customerName] = { name: customerName, payments: [], totalPaid: 0, purchases: [], periodBreakdown: {} };
        }
        
        const paymentWithPeriod = { ...payment, periodKey, periodName, appliesPeriod };
        collectors[collector].customers[customerName].payments.push(paymentWithPeriod);
        collectors[collector].customers[customerName].totalPaid += amount;
        
        if (!collectors[collector].customers[customerName].periodBreakdown[periodKey]) {
          collectors[collector].customers[customerName].periodBreakdown[periodKey] = { periodName, payments: [], totalPaid: 0 };
        }
        collectors[collector].customers[customerName].periodBreakdown[periodKey].payments.push(paymentWithPeriod);
        collectors[collector].customers[customerName].periodBreakdown[periodKey].totalPaid += amount;
        
        const customerSales = allSales.filter(sale => {
          if (!(sale.payment_type === 'credit' || sale.payment === 'credit')) return false;
          const saleCustomerName = (sale.customer_name || sale.customer_id || '').toLowerCase();
          if (saleCustomerName !== customerName.toLowerCase()) return false;
          const saleBusinessMonth = this.getBusinessMonth(sale.date);
          return saleBusinessMonth.month === appliesPeriod.month && saleBusinessMonth.year === appliesPeriod.year;
        });
        
        customerSales.forEach(sale => {
          const purchaseInfo = {
            product: sale.product || 'Unknown',
            quantity: sale.quantity || 0,
            price: sale.price || 0,
            total: sale.total || 0,
            date: sale.date,
            periodKey,
            periodName
          };
          const exists = collectors[collector].customers[customerName].purchases.some(p => 
            p.product === purchaseInfo.product && p.date === purchaseInfo.date && p.total === purchaseInfo.total && p.periodKey === periodKey
          );
          if (!exists) {
            collectors[collector].customers[customerName].purchases.push(purchaseInfo);
          }
        });
      });
      
      const sortedCollectors = Object.values(collectors).sort((a, b) => b.totalCollected - a.totalCollected);
      
      let html = `
        <style>
          .collector-details { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
          .collector-details.expanded { max-height: 5000px; transition: max-height 0.5s ease-in; }
          .collector-toggle { cursor: pointer; user-select: none; transition: all 0.2s; }
          .collector-toggle:hover { background: #f3f4f6 !important; }
          .toggle-icon { transition: transform 0.3s; display: inline-block; }
          .toggle-icon.expanded { transform: rotate(90deg); }
        </style>
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
            <h3 style="margin: 0; font-size: 1.5rem; font-weight: 700;">💰 Payment Collection Report</h3>
            <button onclick="window.reports.updateOverview()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">← Back</button>
          </div>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; border-radius: 12px; margin-bottom: 32px;">
            <div style="color: rgba(255,255,255,0.9); font-size: 0.875rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Payments Received - ${this.getPeriodDisplayName()}</div>
            <div style="color: white; font-size: 3rem; font-weight: 700; margin-bottom: 12px;">${this.fmt(totalCollected)}</div>
            <div style="display: flex; gap: 32px; color: rgba(255,255,255,0.9); font-size: 0.875rem;">
              <div><span style="opacity: 0.8;">Collectors:</span><strong style="margin-left: 8px; font-size: 1.125rem;">${sortedCollectors.length}</strong></div>
              <div><span style="opacity: 0.8;">Payments:</span><strong style="margin-left: 8px; font-size: 1.125rem;">${payments.length}</strong></div>
            </div>
          </div>
          <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">📊 Click Collector to Expand</h4>
      `;
      
      sortedCollectors.forEach((collector, idx) => {
        const pct = ((collector.totalCollected / totalCollected) * 100).toFixed(1);
        const customersList = Object.values(collector.customers);
        const cid = `c${idx}`;
        
        html += `
          <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div class="collector-toggle" onclick="document.getElementById('${cid}').classList.toggle('expanded');document.getElementById('${cid}i').classList.toggle('expanded');" style="display: flex; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid #d1d5db;">
              <div style="display: flex; gap: 12px;">
                <span id="${cid}i" class="toggle-icon" style="font-size: 1.5rem;">▶</span>
                <div>
                  <div style="font-size: 1.25rem; font-weight: 700;">👤 ${collector.name}</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">${collector.paymentsCount} payments from ${customersList.length} customers</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.75rem; font-weight: 700; color: #10b981;">${this.fmt(collector.totalCollected)}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">${pct}%</div>
              </div>
            </div>
            <div style="margin: 16px 0;">
              <div style="width: 100%; background: #e5e7eb; border-radius: 9999px; height: 10px;">
                <div style="width: ${pct}%; background: linear-gradient(90deg, #10b981, #059669); height: 100%;"></div>
              </div>
            </div>
            <div id="${cid}" class="collector-details">
              <div style="display: grid; gap: 16px; margin-top: 20px;">
        `;
        
        customersList.forEach(customer => {
          html += `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <div><div style="font-size: 1rem; font-weight: 600;">${customer.name}</div><div style="font-size: 0.75rem; color: #6b7280;">${customer.payments.length} payments</div></div>
                <div style="text-align: right;"><div style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${this.fmt(customer.totalPaid)}</div></div>
              </div>
          `;
          
          if (Object.keys(customer.periodBreakdown).length > 0) {
            html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;"><div style="font-size: 0.8125rem; font-weight: 600; margin-bottom: 12px;">📅 By Credit Period</div>`;
            
            Object.entries(customer.periodBreakdown).forEach(([pk, pd]) => {
              html += `
                <div style="background: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="font-weight: 600; font-size: 0.875rem;">📆 ${pd.periodName}</div>
                    <div style="font-weight: 700; color: #10b981;">${this.fmt(pd.totalPaid)}</div>
                  </div>
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;"><div style="font-size: 0.75rem; font-weight: 600; color: #6b7280; margin-bottom: 4px;">💳 Payments</div>
              `;
              
              pd.payments.forEach(p => {
                html += `<div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #6b7280;"><span>${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${p.payment_method ? '• ' + p.payment_method : ''}</span><span style="font-weight: 600; color: #10b981;">${this.fmt(p.amount)}</span></div>`;
              });
              
              html += `</div></div>`;
            });
            
            html += `</div>`;
          }
          
          html += `</div>`;
        });
        
        html += `</div></div></div>`;
      });
      
      html += `</div>`;
      this.reportsDisplay.innerHTML = html;
    } catch (error) {
      console.error('Collection report error:', error);
      this.reportsDisplay.innerHTML = `<div style="padding: 24px;"><h3>Error</h3><p>${error.message}</p><button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">← Back</button></div>`;
    }
  }

  async generateMonthComparison() {
    try {
      await this.loadData();
      const now = new Date();
      const months = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const salesForMonth = this.data.sales.filter(s => {
          const sDate = new Date(s.date);
          return sDate.getMonth() + 1 === month && sDate.getFullYear() === year;
        });
        const expensesForMonth = this.data.expenses.filter(e => {
          const eDate = new Date(e.date);
          return eDate.getMonth() + 1 === month && eDate.getFullYear() === year;
        });
        const totalSales = salesForMonth.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
        const totalExpenses = expensesForMonth.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        months.push({ name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), sales: totalSales, expenses: totalExpenses, profit: totalSales - totalExpenses });
      }
      
      let html = `<div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;"><div style="display: flex; justify-content: space-between; margin-bottom: 20px;"><h3 style="margin: 0;">📈 Month Comparison</h3><button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">← Back</button></div><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f3f4f6;"><th style="padding: 12px; text-align: left;">Month</th><th style="padding: 12px; text-align: right;">Sales</th><th style="padding: 12px; text-align: right;">Expenses</th><th style="padding: 12px; text-align: right;">Profit</th></tr></thead><tbody>`;
      
      months.forEach(m => {
        const pc = m.profit >= 0 ? '#10b981' : '#ef4444';
        html += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 12px; font-weight: 600;">${m.name}</td><td style="padding: 12px; text-align: right; color: #10b981;">${this.fmt(m.sales)}</td><td style="padding: 12px; text-align: right; color: #ef4444;">${this.fmt(m.expenses)}</td><td style="padding: 12px; text-align: right; font-weight: 600; color: ${pc};">${this.fmt(m.profit)}</td></tr>`;
      });
      
      html += `</tbody></table></div>`;
      this.reportsDisplay.innerHTML = html;
    } catch (error) {
      console.error('Month comparison error:', error);
    }
  }

  destroy() {
    this.eventListeners.forEach(r => {
      try { 
        if (r.capture) r.el.removeEventListener(r.type, r.handler, true);
        else r.el.removeEventListener(r.type, r.handler);
      } catch (e) {}
    });
    this.eventListeners = [];
  }
}

export const reports = new ReportsManager();
document.addEventListener('DOMContentLoaded', () => reports.initialize());
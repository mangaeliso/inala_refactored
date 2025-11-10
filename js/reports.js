// reports.js - Modern Clean UI Design (Refined)
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
    this.TARGET_MARGIN = 0.25;
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
      
      // Hide unwanted buttons after a short delay to ensure DOM is ready
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
    // Find all report action buttons and ensure they're clickable
    const buttonIds = [
      'manage-credits-btn',
      'creditors-report-btn',
      'all-transactions-btn',
      'collection-report-btn',
      'month-comparison-btn'
    ];
    
    buttonIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
        console.log('✅ Button enabled:', id);
      } else {
        console.warn('⚠️ Button not found:', id);
      }
    });
  }

  addStyles() {
    if (document.getElementById('reports-manager-styles')) return;
    const css = `
      .modern-overview {
        background: transparent;
        padding: 0;
        margin-bottom: 24px;
      }
      
      .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      .category-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
        transition: all 0.2s ease;
      }
      .category-card:hover {
        border-color: #d1d5db;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        transform: translateY(-2px);
      }
      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .category-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #1f2937;
      }
      .status-badge {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-badge.profitable {
        background: #d1fae5;
        color: #065f46;
      }
      .status-badge.loss {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .category-profit {
        font-size: 1.75rem;
        font-weight: 700;
        text-align: center;
        margin: 20px 0;
      }
      .category-profit.positive { color: #10b981; }
      .category-profit.negative { color: #ef4444; }
      
      .category-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      .detail-item {
        text-align: left;
      }
      .detail-label {
        font-size: 0.65rem;
        color: #9ca3af;
        text-transform: uppercase;
        margin-bottom: 6px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .detail-value {
        font-size: 0.95rem;
        font-weight: 700;
        color: #1f2937;
      }
      
      .category-footer {
        font-size: 0.75rem;
        color: #6b7280;
        padding-top: 12px;
        border-top: 1px solid #f3f4f6;
      }
      
      .section-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #1f2937;
        margin: 24px 0 16px 0;
      }
      
      /* Make sure buttons are clickable */
      button {
        cursor: pointer !important;
        pointer-events: auto !important;
      }
      
      button:hover {
        opacity: 0.9;
      }
      
      button:active {
        transform: scale(0.98);
      }
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
      
      // Check if clicked element or its parent is a button
      const button = e.target.closest('button');
      if (!button) return;
      
      const id = button.id;
      const text = button.textContent.toLowerCase();
      
      console.log('Button clicked:', id, text);
      
      // Handle by ID
      if (id === 'manage-credits-btn') {
        e.preventDefault();
        this.showCreditManagement();
        return;
      }
      if (id === 'creditors-report-btn') {
        e.preventDefault();
        this.generateCreditorsReport();
        return;
      }
      if (id === 'all-transactions-btn') {
        e.preventDefault();
        this.generateAllTransactions();
        return;
      }
      if (id === 'collection-report-btn') {
        e.preventDefault();
        this.generateCollectionReport();
        return;
      }
      if (id === 'month-comparison-btn') {
        e.preventDefault();
        this.generateMonthComparison();
        return;
      }
      
      // Handle by text content (fallback)
      if (text.includes('manage credits')) {
        e.preventDefault();
        this.showCreditManagement();
        return;
      }
      if (text.includes('creditors report')) {
        e.preventDefault();
        this.generateCreditorsReport();
        return;
      }
      if (text.includes('all transactions')) {
        e.preventDefault();
        this.generateAllTransactions();
        return;
      }
      if (text.includes('payment collection')) {
        e.preventDefault();
        this.generateCollectionReport();
        return;
      }
      if (text.includes('month comparison')) {
        e.preventDefault();
        this.generateMonthComparison();
        return;
      }
      
      if (button.classList.contains('edit-payment-date-btn')) {
        e.stopPropagation();
        e.preventDefault();
        const paymentId = button.dataset.paymentId;
        this.editPaymentDate(paymentId);
      }
    };
    
    // Use capture phase to catch events earlier
    document.body.addEventListener('click', handler, true);
    this.eventListeners.push({ el: document.body, type: 'click', handler, capture: true });
    
    // Hide unwanted buttons on load
    this.hideUnwantedButtons();
  }

  hideUnwantedButtons() {
    // Hide these buttons if they exist
    const buttonsToHide = [
      'advanced-reports-btn',
      'export-csv-btn', 
      'export-pdf-btn',
      'monthly-analysis-btn'
    ];
    
    buttonsToHide.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = 'none';
    });
    
    // Also hide by button text content
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('advanced reports') || 
          text.includes('export csv') || 
          text.includes('export pdf') ||
          text.includes('monthly analysis')) {
        btn.style.display = 'none';
      }
    });
  }

  async editPaymentDate(paymentId) {
    const payment = this.data.payments.find(p => p.id === paymentId);
    if (!payment) {
      ui.showAlert('Payment not found', 'error');
      return;
    }

    const newDate = prompt(`Edit payment date for ${payment.customer_name || 'Unknown'}\n\nCurrent date: ${payment.date}\nEnter new date (YYYY-MM-DD):`, payment.date);
    
    if (!newDate || newDate === payment.date) return;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      ui.showAlert('Invalid date format. Use YYYY-MM-DD', 'error');
      return;
    }

    try {
      await storage.updatePayment(paymentId, { date: newDate });
      ui.showAlert(`✅ Payment date updated to ${newDate}`, 'success');
      await this.loadData();
      this.generateCollectionReport();
    } catch (error) {
      console.error('Error updating payment date:', error);
      ui.showAlert('Error updating payment date: ' + error.message, 'error');
    }
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
              <option value="custom">Custom</option>
            </select>
            <input id="custom-month" type="month" class="filter-select" style="display:none;">
            <button id="apply-filter-btn" class="modern-btn secondary" style="display:none">Apply</button>
            <button id="clear-filter-btn" class="modern-btn secondary" style="display:none">Clear</button>
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
      const custom = document.getElementById('custom-month');
      const apply = document.getElementById('apply-filter-btn');
      const clear = document.getElementById('clear-filter-btn');
      const toggle = document.getElementById('business-cycle-toggle');
      
      monthFilter.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          custom.style.display='inline-block';
          apply.style.display='inline-block';
          clear.style.display='inline-block';
        } else {
          custom.style.display='none';
          apply.style.display='none';
          clear.style.display='inline-block';
          if (e.target.value==='current') this.getCurrentMonthData();
          else { this.selectedMonth = null; this.selectedYear = null; }
          this.updateFilterStatus();
          this.updateOverview();
        }
      });
      
      apply.addEventListener('click', () => {
        if (custom.value) {
          const [y,m] = custom.value.split('-');
          this.selectedYear = parseInt(y,10);
          this.selectedMonth = parseInt(m,10);
          this.updateFilterStatus();
          this.updateOverview();
        }
      });
      
      clear.addEventListener('click', () => {
        monthFilter.value='all';
        custom.style.display='none';
        apply.style.display='none';
        clear.style.display='none';
        this.selectedMonth=null;
        this.selectedYear=null;
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
      if (this.useBusinessCycle) {
        el.textContent = `Showing: ${monthName} (Business Cycle)`;
      } else {
        el.textContent = `Showing: ${monthName} (Calendar Month)`;
      }
    } else {
      el.textContent = 'Showing: All Time';
    }
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

    // Update external dashboard cards if they exist
    this.updateExternalCards(totalSales, totalExpenses, netProfit, totalTransactions);

    const html = `
      <div class="modern-overview">
        <div class="section-title">Business Category Performance - October 2025</div>
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
      // Find and update the stat cards in the main reports section
      const statCards = document.querySelectorAll('#reports-content .stat-card');
      
      statCards.forEach(card => {
        const label = card.querySelector('.stat-label');
        const value = card.querySelector('.stat-value');
        
        if (!label || !value) return;
        
        const labelText = label.textContent.trim();
        
        if (labelText === 'Total Sales') {
          value.textContent = this.fmt(totalSales);
        } else if (labelText === 'Total Expenses') {
          value.textContent = this.fmt(totalExpenses);
        } else if (labelText === 'Net Profit') {
          value.textContent = this.fmt(netProfit);
        } else if (labelText === 'Transactions') {
          value.textContent = totalTransactions.toString();
        }
      });
      
      console.log('✅ Updated external dashboard cards');
    } catch (e) {
      console.error('Error updating external cards:', e);
    }
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
      
      // Get top products
      const topProducts = salesList
        .slice(0, 3)
        .map(s => {
          const product = s.product || s.description || 'Unknown';
          const qty = s.quantity || 1;
          return `${product} (${qty})`;
        })
        .join(', ') || 'No products';
      
      return `
        <div class="category-card">
          <div class="category-header">
            <div class="category-name">${label}</div>
            <span class="status-badge ${status}">${statusText}</span>
          </div>
          
          <div class="category-profit ${profit >= 0 ? 'positive' : 'negative'}">
            ${this.fmt(profit)}
          </div>
          
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
          
          <div class="category-footer">
            <strong>Top Products:</strong><br>
            ${topProducts}
          </div>
        </div>
      `;
    } catch (e) {
      console.error('renderCategoryCard', e);
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
    } catch (e) {
      console.error('showCreditManagement', e);
    }
  }

  async generateCreditorsReport() {
    try {
      await this.loadData();
      
      // Try to get creditors from the creditors module if it exists
      let creditorsData = [];
      
      if (window.app && window.app.creditors && typeof window.app.creditors.getCreditors === 'function') {
        creditorsData = window.app.creditors.getCreditors() || [];
      }
      
      // Also check expenses with credit terms as fallback
      const creditExpenses = this.data.expenses.filter(e => 
        e.payment_terms && e.payment_terms !== 'Cash' && e.payment_terms !== 'Immediate'
      );
      
      // If we have creditors from the creditors module, use that
      if (creditorsData.length > 0) {
        let html = `
          <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h3 style="margin: 0;">📋 Creditors Report</h3>
              <button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                ← Back to Dashboard
              </button>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Creditor Name</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Contact</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Credit Limit</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Current Balance</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Payment Terms</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Status</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        let totalBalance = 0;
        
        creditorsData.forEach(creditor => {
          const balance = parseFloat(creditor.current_balance || 0);
          const limit = parseFloat(creditor.credit_limit || 0);
          const usage = limit > 0 ? ((balance / limit) * 100).toFixed(1) : 0;
          const status = balance > limit * 0.9 ? 'High' : balance > limit * 0.5 ? 'Medium' : 'Low';
          const statusColor = status === 'High' ? '#ef4444' : status === 'Medium' ? '#f59e0b' : '#10b981';
          
          totalBalance += balance;
          
          html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px; font-weight: 600;">${creditor.name || 'Unknown'}</td>
              <td style="padding: 12px; color: #6b7280;">${creditor.contact || 'N/A'}</td>
              <td style="padding: 12px; text-align: right;">${this.fmt(limit)}</td>
              <td style="padding: 12px; text-align: right; font-weight: 600; color: #ef4444;">
                ${this.fmt(balance)}
                <div style="font-size: 0.75rem; color: #6b7280;">${usage}% used</div>
              </td>
              <td style="padding: 12px; text-align: center; color: #6b7280;">${creditor.payment_terms || 'N/A'}</td>
              <td style="padding: 12px; text-align: center;">
                <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                  ${status}
                </span>
              </td>
            </tr>
          `;
        });
        
        html += `
              </tbody>
              <tfoot>
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="3" style="padding: 12px;">TOTAL OUTSTANDING</td>
                  <td style="padding: 12px; text-align: right; color: #ef4444; font-size: 1.1rem;">
                    ${this.fmt(totalBalance)}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
        
        this.reportsDisplay.innerHTML = html;
        return;
      }
      
      // Fallback: Use expense data if no creditors module data
      if (creditExpenses.length === 0) {
        ui.showAlert('No credit transactions found', 'info');
        return;
      }
      
      // Group by creditor from expenses
      const creditors = {};
      creditExpenses.forEach(exp => {
        const creditor = exp.supplier || exp.creditor || 'Unknown Supplier';
        if (!creditors[creditor]) {
          creditors[creditor] = {
            name: creditor,
            transactions: [],
            totalOwed: 0
          };
        }
        creditors[creditor].transactions.push(exp);
        creditors[creditor].totalOwed += parseFloat(exp.amount || 0);
      });
      
      // Display report
      let html = `
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0;">📋 Creditors Report (From Expenses)</h3>
            <button onclick="window.reports.updateOverview()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
              ← Back to Dashboard
            </button>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Creditor</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total Owed</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Transactions</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      Object.values(creditors).forEach(creditor => {
        html += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; font-weight: 600;">${creditor.name}</td>
            <td style="padding: 12px; text-align: right; font-weight: 600; color: #ef4444;">${this.fmt(creditor.totalOwed)}</td>
            <td style="padding: 12px; text-align: center;">${creditor.transactions.length}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
          <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <strong>💡 Tip:</strong> For detailed creditor management, use the "Manage Credits" button or Business Finances tab.
          </div>
        </div>
      `;
      
      this.reportsDisplay.innerHTML = html;
      
    } catch (error) {
      console.error('generateCreditorsReport error:', error);
      ui.showAlert('Error generating creditors report: ' + error.message, 'error');
    }
  }

  async generateAllTransactions() {
    try {
      await this.loadData();
      
      const sales = this.filterByPeriod(this.data.sales || []);
      const expenses = this.filterByPeriod(this.data.expenses || []);
      
      // Combine and sort by date
      const allTransactions = [
        ...sales.map(s => ({ ...s, type: 'Sale', amount: s.total })),
        ...expenses.map(e => ({ ...e, type: 'Expense' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      let html = `
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <h3 style="margin-bottom: 20px;">📊 All Transactions</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Date</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Type</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      allTransactions.forEach(t => {
        const color = t.type === 'Sale' ? '#10b981' : '#ef4444';
        const desc = t.description || t.product || t.category || 'N/A';
        html += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">${t.date}</td>
            <td style="padding: 12px;">
              <span style="color: ${color}; font-weight: 600;">${t.type}</span>
            </td>
            <td style="padding: 12px;">${desc}</td>
            <td style="padding: 12px; text-align: right; font-weight: 600; color: ${color};">
              ${this.fmt(t.amount)}
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      this.reportsDisplay.innerHTML = html;
      
    } catch (error) {
      console.error('generateAllTransactions error:', error);
      ui.showAlert('Error generating transactions report', 'error');
    }
  }

  async generateCollectionReport() {
    try {
      await this.loadData();
      
      const payments = this.filterByPeriod(this.data.payments || [], 'payment');
      
      if (payments.length === 0) {
        ui.showAlert('No payment collections found for this period', 'info');
        return;
      }
      
      // Group by customer
      const customers = {};
      payments.forEach(payment => {
        const customer = payment.customer_name || 'Unknown Customer';
        if (!customers[customer]) {
          customers[customer] = {
            name: customer,
            payments: [],
            totalPaid: 0
          };
        }
        customers[customer].payments.push(payment);
        customers[customer].totalPaid += parseFloat(payment.amount || 0);
      });
      
      let html = `
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <h3 style="margin-bottom: 20px;">💰 Payment Collection Report</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Customer</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total Collected</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Payments</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      Object.values(customers).forEach(customer => {
        html += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">${customer.name}</td>
            <td style="padding: 12px; text-align: right; font-weight: 600; color: #10b981;">
              ${this.fmt(customer.totalPaid)}
            </td>
            <td style="padding: 12px; text-align: center;">${customer.payments.length}</td>
          </tr>
        `;
      });
      
      const totalCollected = Object.values(customers).reduce((sum, c) => sum + c.totalPaid, 0);
      
      html += `
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6; font-weight: bold;">
                <td style="padding: 12px;">TOTAL</td>
                <td style="padding: 12px; text-align: right; color: #10b981;">
                  ${this.fmt(totalCollected)}
                </td>
                <td style="padding: 12px; text-align: center;">${payments.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
      
      this.reportsDisplay.innerHTML = html;
      
    } catch (error) {
      console.error('generateCollectionReport error:', error);
      ui.showAlert('Error generating collection report', 'error');
    }
  }

  async generateMonthComparison() {
    try {
      await this.loadData();
      
      // Get last 6 months of data
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
        
        months.push({
          name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          sales: totalSales,
          expenses: totalExpenses,
          profit: totalSales - totalExpenses
        });
      }
      
      let html = `
        <div style="padding: 24px; background: white; border-radius: 12px; margin-top: 20px;">
          <h3 style="margin-bottom: 20px;">📈 Month Comparison (Last 6 Months)</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Month</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Sales</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Expenses</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Profit</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      months.forEach(m => {
        const profitColor = m.profit >= 0 ? '#10b981' : '#ef4444';
        html += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; font-weight: 600;">${m.name}</td>
            <td style="padding: 12px; text-align: right; color: #10b981;">${this.fmt(m.sales)}</td>
            <td style="padding: 12px; text-align: right; color: #ef4444;">${this.fmt(m.expenses)}</td>
            <td style="padding: 12px; text-align: right; font-weight: 600; color: ${profitColor};">
              ${this.fmt(m.profit)}
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      this.reportsDisplay.innerHTML = html;
      
    } catch (error) {
      console.error('generateMonthComparison error:', error);
      ui.showAlert('Error generating month comparison', 'error');
    }
  }

  destroy() {
    this.eventListeners.forEach(r => {
      try { 
        if (r.capture) {
          r.el.removeEventListener(r.type, r.handler, true); 
        } else {
          r.el.removeEventListener(r.type, r.handler);
        }
      } catch (e) {}
    });
    this.eventListeners = [];
  }
}

export const reports = new ReportsManager();
document.addEventListener('DOMContentLoaded', () => reports.initialize());
// loans.js - Professional Loan Management System with Compound Interest
import { ui } from './ui.js';
import { firebaseDb, firestore, isFirebaseAvailable } from './firebase.js';

class LoanManager {
    constructor() {
        this.loans = [];
        this.customers = [];
        this.payments = [];
        this.currentView = 'dashboard';
        this.selectedLoan = null;
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        
        console.log('🔄 Initializing Loan Manager...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadData();
            });
        } else {
            this.loadData();
        }
        
        this.isInitialized = true;
    }

    async loadData() {
        const container = document.getElementById('loans-content');
        if (!container) {
            console.error('❌ loans-content container not found');
            return;
        }

        try {
            // Show loading state
            container.innerHTML = this.renderLoadingState();

            if (isFirebaseAvailable()) {
                await this.loadFromFirebase();
            } else {
                await this.loadFromLocalStorage();
            }

            this.renderDashboard();
        } catch (error) {
            console.error('Error loading data:', error);
            this.renderErrorState(error);
        }
    }

    async loadFromFirebase() {
        const { collection, getDocs, orderBy, query } = firestore;
        
        // Load loans
        const loansSnapshot = await getDocs(query(collection(firebaseDb, 'loans'), orderBy('created_at', 'desc')));
        this.loans = loansSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.() || doc.data().created_at
        }));
        
        // Load payments
        const paymentsSnapshot = await getDocs(query(collection(firebaseDb, 'loan_payments'), orderBy('date', 'desc')));
        this.payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate?.() || doc.data().date
        }));

        console.log(`📊 Loaded ${this.loans.length} loans and ${this.payments.length} payments from Firebase`);
    }

    async loadFromLocalStorage() {
        this.loans = JSON.parse(localStorage.getItem('loans') || '[]');
        this.payments = JSON.parse(localStorage.getItem('loan_payments') || '[]');
        
        console.log(`📊 Loaded ${this.loans.length} loans and ${this.payments.length} payments from Local Storage`);
    }

    renderLoadingState() {
        return `
            <div class="content-card" style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                <h3 style="color: #6b7280; margin-bottom: 1rem;">Loading Loan Data...</h3>
                <div style="color: #9ca3af;">Please wait while we load your loan information</div>
            </div>
        `;
    }

    renderErrorState(error) {
        const container = document.getElementById('loans-content');
        container.innerHTML = `
            <div class="content-card" style="text-align: center; padding: 3rem; border-left: 4px solid #ef4444;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3 style="color: #dc2626; margin-bottom: 1rem;">Failed to Load Data</h3>
                <div style="color: #6b7280; margin-bottom: 2rem;">${error.message}</div>
                <button class="btn btn-primary" id="retry-load-btn">🔄 Retry</button>
            </div>
        `;

        document.getElementById('retry-load-btn')?.addEventListener('click', () => {
            this.loadData();
        });
    }

    // Compound Interest Calculation
    calculateCompoundInterest(principal, annualRate, months) {
        const monthlyRate = annualRate / 12 / 100;
        const totalAmount = principal * Math.pow(1 + monthlyRate, months);
        const interest = totalAmount - principal;
        const monthlyPayment = totalAmount / months;

        return {
            totalAmount: Math.round(totalAmount * 100) / 100,
            interest: Math.round(interest * 100) / 100,
            monthlyPayment: Math.round(monthlyPayment * 100) / 100
        };
    }

    calculateLoanDetails(loan) {
        if (!loan) return null;

        const principal = parseFloat(loan.principal) || 0;
        const rate = parseFloat(loan.interest_rate) || 0;
        const term = parseInt(loan.term_months) || 0;
        
        const calc = this.calculateCompoundInterest(principal, rate, term);
        
        // Calculate payments made
        const loanPayments = this.payments.filter(p => p.loan_id === loan.id);
        const totalPaid = loanPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const balance = Math.max(0, calc.totalAmount - totalPaid);
        
        // Calculate progress
        const progress = calc.totalAmount > 0 ? (totalPaid / calc.totalAmount) * 100 : 0;
        const status = this.getLoanStatus(loan, balance);
        
        return {
            ...calc,
            totalPaid: Math.round(totalPaid * 100) / 100,
            balance: Math.round(balance * 100) / 100,
            progress: Math.round(progress * 100) / 100,
            status,
            paymentsCount: loanPayments.length,
            isOverdue: this.isLoanOverdue(loan, balance)
        };
    }

    getLoanStatus(loan, balance) {
        if (balance <= 0) return 'paid';
        if (this.isLoanOverdue(loan, balance)) return 'overdue';
        return 'active';
    }

    isLoanOverdue(loan, balance) {
        if (!loan.next_payment_date || balance <= 0) return false;
        
        try {
            const nextDate = new Date(loan.next_payment_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            nextDate.setHours(0, 0, 0, 0);
            
            return nextDate < today;
        } catch (error) {
            console.error('Error checking overdue status:', error);
            return false;
        }
    }

    getDashboardStats() {
        const stats = {
            activeCount: 0,
            overdueCount: 0,
            paidCount: 0,
            totalLoaned: 0,
            totalExpected: 0,
            totalCollected: 0,
            totalOutstanding: 0,
            profitEarned: 0
        };

        this.loans.forEach(loan => {
            const details = this.calculateLoanDetails(loan);
            if (!details) return;

            stats.totalLoaned += parseFloat(loan.principal) || 0;
            stats.totalExpected += details.totalAmount || 0;
            stats.totalCollected += details.totalPaid || 0;
            stats.totalOutstanding += details.balance || 0;

            switch (details.status) {
                case 'active': stats.activeCount++; break;
                case 'overdue': stats.overdueCount++; break;
                case 'paid': stats.paidCount++; break;
            }
        });

        stats.profitEarned = stats.totalCollected - stats.totalLoaned;

        // Round all monetary values
        ['totalLoaned', 'totalExpected', 'totalCollected', 'totalOutstanding', 'profitEarned'].forEach(key => {
            stats[key] = Math.round(stats[key] * 100) / 100;
        });

        return stats;
    }

    // Main Dashboard Render
    renderDashboard() {
        const container = document.getElementById('loans-content');
        const stats = this.getDashboardStats();
        
        container.innerHTML = `
            <div class="content-card">
                <!-- Header -->
                <div class="loan-header">
                    <h2 class="card-title">💰 Loan Management System</h2>
                    <button class="btn btn-primary" id="new-loan-btn">
                        <span class="btn-icon">➕</span> New Loan
                    </button>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    ${this.renderStatCard('Active Loans', stats.activeCount, '#667eea', '#764ba2', '📊')}
                    ${this.renderStatCard('Overdue Loans', stats.overdueCount, '#f093fb', '#f5576c', '⚠️')}
                    ${this.renderStatCard('Paid Off', stats.paidCount, '#4facfe', '#00f2fe', '✅')}
                    ${this.renderStatCard('Total Loaned', `R${stats.totalLoaned.toFixed(2)}`, '#43e97b', '#38f9d7', '💰')}
                    ${this.renderStatCard('Total Collected', `R${stats.totalCollected.toFixed(2)}`, '#fa709a', '#fee140', '💳')}
                    ${this.renderStatCard('Outstanding', `R${stats.totalOutstanding.toFixed(2)}`, '#30cfd0', '#330867', '📈')}
                </div>

                <!-- Profit Summary -->
                <div class="profit-summary ${stats.profitEarned >= 0 ? 'profit-positive' : 'profit-negative'}">
                    <div class="profit-icon">${stats.profitEarned >= 0 ? '📊' : '⚠️'}</div>
                    <div class="profit-content">
                        <div class="profit-title">${stats.profitEarned >= 0 ? 'Total Profit Earned' : 'Net Loss'}</div>
                        <div class="profit-amount">R${Math.abs(stats.profitEarned).toFixed(2)}</div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button class="btn btn-secondary" id="calculator-btn">🧮 Loan Calculator</button>
                    <button class="btn btn-secondary" id="overdue-report-btn">⚠️ Overdue Report</button>
                    <button class="btn btn-secondary" id="collection-schedule-btn">📅 Collection Schedule</button>
                    <button class="btn btn-secondary" id="profit-analysis-btn">📊 Profit Analysis</button>
                </div>

                <!-- Loans List Section -->
                <div class="loans-section">
                    <div class="section-header">
                        <h3>All Loans</h3>
                        <div class="section-controls">
                            <input type="text" id="loan-search" placeholder="Search by customer name..." class="search-input">
                            <select id="loan-filter" class="filter-select">
                                <option value="all">All Loans</option>
                                <option value="active">Active Only</option>
                                <option value="overdue">Overdue Only</option>
                                <option value="paid">Paid Off</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="loans-list-container">
                        ${this.renderLoansList()}
                    </div>
                </div>
            </div>
        `;

        this.attachDashboardListeners();
    }

    renderStatCard(title, value, color1, color2, icon) {
        return `
            <div class="stat-card" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);">
                <div class="stat-icon">${icon}</div>
                <div class="stat-content">
                    <div class="stat-title">${title}</div>
                    <div class="stat-value">${value}</div>
                </div>
            </div>
        `;
    }

    renderLoansList() {
        if (this.loans.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">💰</div>
                    <h3>No Loans Yet</h3>
                    <p>Create your first loan to get started with loan management</p>
                    <button class="btn btn-primary" id="empty-new-loan-btn">Create First Loan</button>
                </div>
            `;
        }

        return this.loans.map(loan => this.renderLoanCard(loan)).join('');
    }

    renderLoanCard(loan) {
        const details = this.calculateLoanDetails(loan);
        if (!details) return '';

        const statusConfig = {
            active: { color: '#10b981', label: 'Active' },
            overdue: { color: '#ef4444', label: 'Overdue' },
            paid: { color: '#6b7280', label: 'Paid' }
        };

        const status = statusConfig[details.status] || statusConfig.active;

        return `
            <div class="loan-card" data-loan-id="${loan.id}" style="border-left-color: ${status.color}">
                <div class="loan-card-header">
                    <div class="loan-info">
                        <h4 class="customer-name">${this.escapeHtml(loan.customer_name)}</h4>
                        <div class="loan-meta">
                            Loan #${(loan.id || 'N/A').substring(0, 8)} • 
                            ${this.formatDate(loan.created_at)}
                        </div>
                    </div>
                    <div class="loan-status" style="background: ${status.color}">
                        ${status.label}
                    </div>
                </div>

                <div class="loan-stats">
                    <div class="loan-stat">
                        <label>Principal</label>
                        <div class="value">R${(parseFloat(loan.principal) || 0).toFixed(2)}</div>
                    </div>
                    <div class="loan-stat">
                        <label>Interest</label>
                        <div class="value">${(parseFloat(loan.interest_rate) || 0).toFixed(1)}%</div>
                    </div>
                    <div class="loan-stat">
                        <label>Total Due</label>
                        <div class="value">R${(details.totalAmount || 0).toFixed(2)}</div>
                    </div>
                    <div class="loan-stat">
                        <label>Balance</label>
                        <div class="value ${details.balance > 0 ? 'balance-due' : 'balance-paid'}">
                            R${(details.balance || 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div class="loan-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${details.progress}%; background: ${status.color};"></div>
                    </div>
                    <div class="progress-info">
                        ${details.progress.toFixed(1)}% paid • ${details.paymentsCount} payments
                    </div>
                </div>
            </div>
        `;
    }

    // New Loan Form
    showNewLoanForm() {
        const container = document.getElementById('loans-content');
        container.innerHTML = `
            <div class="content-card">
                <div class="form-header">
                    <h2 class="card-title">➕ New Loan Application</h2>
                    <button class="btn btn-secondary" id="back-to-dashboard-btn">← Back to Dashboard</button>
                </div>

                <form id="new-loan-form" class="loan-form">
                    <!-- Customer Information -->
                    <div class="form-section">
                        <h3 class="section-title">👤 Customer Information</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" class="form-input" name="customer_name" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" class="form-input" name="phone" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">ID Number</label>
                                <input type="text" class="form-input" name="id_number">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-input" name="email">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Address</label>
                            <textarea class="form-input" name="address" rows="2"></textarea>
                        </div>
                    </div>

                    <!-- Loan Details -->
                    <div class="form-section">
                        <h3 class="section-title">💰 Loan Details</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Loan Amount (R) *</label>
                                <input type="number" class="form-input" name="principal" id="loan-principal" 
                                       step="0.01" min="100" value="1000" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Interest Rate (% per year) *</label>
                                <select class="form-select" name="interest_rate" id="loan-rate" required>
                                    <option value="15">15% - Low Risk</option>
                                    <option value="20" selected>20% - Standard Rate</option>
                                    <option value="25">25% - Medium Risk</option>
                                    <option value="30">30% - High Risk</option>
                                    <option value="custom">Custom Rate</option>
                                </select>
                            </div>
                            <div class="form-group custom-rate-group" id="custom-rate-group" style="display: none;">
                                <label class="form-label">Custom Rate (%)</label>
                                <input type="number" class="form-input" id="custom-rate" step="0.1" min="0" max="100">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Loan Term (Months) *</label>
                                <select class="form-select" name="term_months" id="loan-term" required>
                                    <option value="3">3 Months</option>
                                    <option value="6">6 Months</option>
                                    <option value="12" selected>12 Months</option>
                                    <option value="24">24 Months</option>
                                    <option value="36">36 Months</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Start Date *</label>
                                <input type="date" class="form-input" name="start_date" id="loan-start-date" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Frequency *</label>
                                <select class="form-select" name="payment_frequency" required>
                                    <option value="monthly" selected>Monthly</option>
                                    <option value="bi-weekly">Bi-Weekly</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Live Calculator -->
                    <div id="loan-calculator-preview" class="calculator-preview">
                        <h3 class="calculator-title">📊 Loan Breakdown</h3>
                        <div class="calculator-stats">
                            <div class="calc-stat">
                                <div class="calc-label">Total Repayment</div>
                                <div class="calc-value" id="calc-total">R0.00</div>
                            </div>
                            <div class="calc-stat">
                                <div class="calc-label">Interest Amount</div>
                                <div class="calc-value" id="calc-interest">R0.00</div>
                            </div>
                            <div class="calc-stat">
                                <div class="calc-label">Monthly Payment</div>
                                <div class="calc-value" id="calc-monthly">R0.00</div>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Notes -->
                    <div class="form-group">
                        <label class="form-label">Notes / Terms & Conditions</label>
                        <textarea class="form-input" name="notes" rows="4" 
                                  placeholder="Additional terms, collateral, guarantor info, etc."></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary submit-btn">
                        ✅ Create Loan Agreement
                    </button>
                </form>
            </div>
        `;

        this.attachNewLoanFormListeners();
    }

    attachNewLoanFormListeners() {
        // Back button
        document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
            this.renderDashboard();
        });

        // Set default date
        const startDateInput = document.getElementById('loan-start-date');
        if (startDateInput) {
            const today = new Date();
            startDateInput.value = today.toISOString().split('T')[0];
            
            // Set min date to today
            startDateInput.min = today.toISOString().split('T')[0];
        }

        // Custom rate toggle
        document.getElementById('loan-rate')?.addEventListener('change', (e) => {
            const customGroup = document.getElementById('custom-rate-group');
            if (customGroup) {
                customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
            this.updateLoanCalculator();
        });

        // Live calculator updates
        const calcInputs = ['loan-principal', 'loan-rate', 'loan-term', 'custom-rate'];
        calcInputs.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateLoanCalculator());
            document.getElementById(id)?.addEventListener('change', () => this.updateLoanCalculator());
        });

        // Form submission
        document.getElementById('new-loan-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createLoan(new FormData(e.target));
        });

        // Initial calculator update
        this.updateLoanCalculator();
    }

    updateLoanCalculator() {
        const principal = parseFloat(document.getElementById('loan-principal')?.value) || 0;
        const rateSelect = document.getElementById('loan-rate')?.value;
        let rate = 0;

        if (rateSelect === 'custom') {
            rate = parseFloat(document.getElementById('custom-rate')?.value) || 0;
        } else {
            rate = parseFloat(rateSelect) || 0;
        }

        const term = parseInt(document.getElementById('loan-term')?.value) || 0;

        if (principal > 0 && rate > 0 && term > 0) {
            const calc = this.calculateCompoundInterest(principal, rate, term);
            document.getElementById('calc-total').textContent = `R${calc.totalAmount.toFixed(2)}`;
            document.getElementById('calc-interest').textContent = `R${calc.interest.toFixed(2)}`;
            document.getElementById('calc-monthly').textContent = `R${calc.monthlyPayment.toFixed(2)}`;
        } else {
            document.getElementById('calc-total').textContent = 'R0.00';
            document.getElementById('calc-interest').textContent = 'R0.00';
            document.getElementById('calc-monthly').textContent = 'R0.00';
        }
    }

    async createLoan(formData) {
        const submitBtn = document.querySelector('#new-loan-form .submit-btn');
        const originalText = submitBtn.innerHTML;

        try {
            // Show loading state
            submitBtn.innerHTML = '⏳ Creating Loan...';
            submitBtn.disabled = true;

            const rateValue = formData.get('interest_rate');
            const interestRate = rateValue === 'custom' 
                ? parseFloat(document.getElementById('custom-rate').value)
                : parseFloat(rateValue);

            const loanData = {
                customer_name: formData.get('customer_name').trim(),
                phone: formData.get('phone').trim(),
                id_number: formData.get('id_number')?.trim() || '',
                email: formData.get('email')?.trim() || '',
                address: formData.get('address')?.trim() || '',
                principal: parseFloat(formData.get('principal')),
                interest_rate: interestRate,
                term_months: parseInt(formData.get('term_months')),
                payment_frequency: formData.get('payment_frequency'),
                start_date: formData.get('start_date'),
                notes: formData.get('notes')?.trim() || '',
                created_at: new Date().toISOString(),
                status: 'active'
            };

            // Calculate next payment date
            const startDate = new Date(loanData.start_date);
            const nextPaymentDate = new Date(startDate);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            loanData.next_payment_date = nextPaymentDate.toISOString().split('T')[0];

            let loanId;
            if (isFirebaseAvailable()) {
                const { collection, addDoc } = firestore;
                const docRef = await addDoc(collection(firebaseDb, 'loans'), loanData);
                loanId = docRef.id;
            } else {
                loanId = 'loan_' + Date.now();
                loanData.id = loanId;
                this.loans.unshift(loanData);
                localStorage.setItem('loans', JSON.stringify(this.loans));
            }

            ui.showAlert('✅ Loan created successfully!', 'success');
            
            // Return to dashboard after short delay
            setTimeout(() => {
                this.renderDashboard();
            }, 1500);

        } catch (error) {
            console.error('Error creating loan:', error);
            ui.showAlert('❌ Error creating loan: ' + error.message, 'error');
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    attachDashboardListeners() {
        // New Loan Button
        document.getElementById('new-loan-btn')?.addEventListener('click', () => this.showNewLoanForm());
        
        // Empty state new loan button
        document.getElementById('empty-new-loan-btn')?.addEventListener('click', () => this.showNewLoanForm());

        // Loan card clicks
        document.querySelectorAll('.loan-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking interactive elements
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                
                const loanId = card.dataset.loanId;
                this.showLoanDetails(loanId);
            });
        });

        // Search and filter functionality
        this.attachSearchFilterListeners();

        // Action buttons
        document.getElementById('calculator-btn')?.addEventListener('click', () => this.showLoanCalculator());
        document.getElementById('overdue-report-btn')?.addEventListener('click', () => this.showOverdueReport());
        document.getElementById('collection-schedule-btn')?.addEventListener('click', () => this.showCollectionSchedule());
        document.getElementById('profit-analysis-btn')?.addEventListener('click', () => this.showProfitAnalysis());
    }

    attachSearchFilterListeners() {
        const searchInput = document.getElementById('loan-search');
        const filterSelect = document.getElementById('loan-filter');

        if (searchInput && filterSelect) {
            const updateList = () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filterValue = filterSelect.value;
                
                document.querySelectorAll('.loan-card').forEach(card => {
                    const customerName = card.querySelector('.customer-name').textContent.toLowerCase();
                    const statusElement = card.querySelector('.loan-status');
                    const status = statusElement ? statusElement.textContent.toLowerCase() : '';
                    
                    let matchesSearch = !searchTerm || customerName.includes(searchTerm);
                    let matchesFilter = filterValue === 'all' || status.includes(filterValue);
                    
                    card.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
                });
            };

            searchInput.addEventListener('input', updateList);
            filterSelect.addEventListener('change', updateList);
        }
    }

    // Utility Methods
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    // Placeholder methods for additional features
    showLoanDetails(loanId) {
        ui.showAlert(`Loan details for ${loanId} - Coming soon!`, 'info');
        // Implementation for detailed loan view
    }

    showLoanCalculator() {
        ui.showAlert('Advanced loan calculator - Coming soon!', 'info');
    }

    showOverdueReport() {
        ui.showAlert('Overdue report - Coming soon!', 'info');
    }

    showCollectionSchedule() {
        ui.showAlert('Collection schedule - Coming soon!', 'info');
    }

    showProfitAnalysis() {
        ui.showAlert('Profit analysis - Coming soon!', 'info');
    }
}

// Add CSS styles
const loanStyles = `
<style>
.loan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    padding: 1.5rem;
    border-radius: 12px;
    color: white;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 80px;
}

.stat-icon {
    font-size: 2rem;
    opacity: 0.9;
}

.stat-content {
    flex: 1;
}

.stat-title {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.profit-summary {
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-left: 4px solid;
}

.profit-positive {
    background: #f0fdf4;
    border-left-color: #10b981;
    color: #065f46;
}

.profit-negative {
    background: #fef2f2;
    border-left-color: #ef4444;
    color: #dc2626;
}

.profit-icon {
    font-size: 2rem;
}

.profit-content {
    flex: 1;
}

.profit-title {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.25rem;
}

.profit-amount {
    font-size: 1.5rem;
    font-weight: 700;
}

.action-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.loans-section {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 12px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.section-header h3 {
    font-size: 1.25rem;
    color: #374151;
    margin: 0;
}

.section-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.search-input {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
}

.filter-select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    background: white;
}

.loan-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-left: 4px solid;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.loan-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.loan-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
}

.customer-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.25rem;
}

.loan-meta {
    font-size: 0.875rem;
    color: #6b7280;
}

.loan-status {
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.loan-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.loan-stat label {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
    display: block;
}

.loan-stat .value {
    font-weight: 600;
    color: #111827;
}

.balance-due {
    color: #ef4444;
}

.balance-paid {
    color: #10b981;
}

.loan-progress {
    margin-top: 1rem;
}

.progress-bar {
    background: #e5e7eb;
    height: 8px;
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.progress-info {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: right;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-state h3 {
    color: #374151;
    margin-bottom: 0.5rem;
}

.empty-state p {
    margin-bottom: 2rem;
}

/* Form Styles */
.form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.loan-form {
    max-width: 800px;
    margin: 0 auto;
}

.form-section {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #374151;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
}

.form-input, .form-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: border-color 0.2s;
}

.form-input:focus, .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.custom-rate-group {
    grid-column: 1 / -1;
}

.calculator-preview {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    border-radius: 12px;
    color: white;
    margin-bottom: 2rem;
}

.calculator-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    text-align: center;
}

.calculator-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
}

.calc-stat {
    text-align: center;
}

.calc-label {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
}

.calc-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.submit-btn {
    width: 100%;
    font-size: 1.125rem;
    padding: 1rem;
    margin-top: 1rem;
}

.btn-icon {
    font-size: 1.25rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .loan-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .action-buttons {
        flex-direction: column;
    }
    
    .section-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .section-controls {
        flex-direction: column;
    }
    
    .loan-stats {
        grid-template-columns: 1fr 1fr;
    }
    
    .form-grid {
        grid-template-columns: 1fr;
    }
    
    .calculator-stats {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', loanStyles);

export const loanManager = new LoanManager();
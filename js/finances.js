import { storage } from './storage.js';
import { ui } from './ui.js';

class FinancesManager {
    constructor() {
        this.financesDisplay = null;
        this.selectedMonth = null;
        this.selectedYear = null;
    }

    initialize() {
        this.financesDisplay = document.getElementById('finances-display');
        // Default to September 2025
        this.selectedMonth = 9;
        this.selectedYear = 2025;
        this.loadFinancesData();
    }

    async loadFinancesData() {
        await storage.loadAllData();
        this.renderFinancesView();
    }

    changeMonth() {
        const picker = document.getElementById('finance-month-picker');
        const [year, month] = picker.value.split('-');
        this.selectedYear = parseInt(year);
        this.selectedMonth = parseInt(month);
        this.loadFinancesData();
    }

    filterDataByMonth(data) {
        return data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getMonth() + 1 === this.selectedMonth && 
                   itemDate.getFullYear() === this.selectedYear;
        });
    }

    getCurrentMonthLabel() {
        return new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    }

    async renderFinancesView() {
        const sales = this.filterDataByMonth(storage.getSales());
        const expenses = this.filterDataByMonth(storage.getExpenditures());
        
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const businessProfit = totalSales - totalExpenses;

        const householdBills = await storage.getHouseholdBills(this.selectedYear, this.selectedMonth) || [];
        const totalHouseholdBills = householdBills.reduce((sum, bill) => sum + bill.amount, 0);
        
        const netSavings = businessProfit - totalHouseholdBills;

        const savingsHistory = await this.calculateSavingsHistory();

        let html = `
            <style>
                .finance-card {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: transform 0.2s;
                }
                .finance-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .bill-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: #f9fafb;
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                    border: 1px solid #e5e7eb;
                }
                .bill-item:hover {
                    background: #f3f4f6;
                }
            </style>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="margin: 0; font-size: 1.75rem; color: #1f2937;">💰 Personal Finances</h2>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <input type="month" id="finance-month-picker" 
                           value="${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}"
                           class="form-input" style="width: 180px;">
                    <button onclick="window.app.finances.changeMonth()" class="btn btn-primary">Load Month</button>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px; padding: 2.5rem; margin-bottom: 2rem; text-align: center; box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);">
                <div style="font-size: 0.875rem; opacity: 0.95; margin-bottom: 0.5rem; letter-spacing: 1px; text-transform: uppercase;">
                    ${this.getCurrentMonthLabel()} - Projected Savings
                </div>
                <div style="font-size: 3.5rem; font-weight: 700; margin: 0.5rem 0;">
                    ${ui.formatCurrency(netSavings)}
                </div>
                <div style="font-size: 0.95rem; opacity: 0.9; margin-top: 0.5rem;">
                    ${netSavings >= 0 ? '✓ Positive savings this month' : '⚠ Spending exceeds profit'}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="finance-card" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">
                    <div style="font-size: 0.875rem; color: #065f46; margin-bottom: 0.5rem; font-weight: 600;">Business Profit</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #10b981;">${ui.formatCurrency(businessProfit)}</div>
                    <div style="font-size: 0.75rem; color: #059669; margin-top: 0.5rem;">
                        Sales: ${ui.formatCurrency(totalSales)} - Expenses: ${ui.formatCurrency(totalExpenses)}
                    </div>
                </div>

                <div class="finance-card" style="background: linear-gradient(135deg, #fee2e2, #fecaca);">
                    <div style="font-size: 0.875rem; color: #991b1b; margin-bottom: 0.5rem; font-weight: 600;">Household Bills</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #ef4444;">${ui.formatCurrency(totalHouseholdBills)}</div>
                    <div style="font-size: 0.75rem; color: #dc2626; margin-top: 0.5rem;">
                        ${householdBills.length} bill${householdBills.length !== 1 ? 's' : ''} this month
                    </div>
                </div>

                <div class="finance-card" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">
                    <div style="font-size: 0.875rem; color: #1e40af; margin-bottom: 0.5rem; font-weight: 600;">Total Saved (All Time)</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: #3b82f6;">${ui.formatCurrency(savingsHistory.totalSaved)}</div>
                    <div style="font-size: 0.75rem; color: #2563eb; margin-top: 0.5rem;">
                        Across ${savingsHistory.monthsTracked} month${savingsHistory.monthsTracked !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div class="finance-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0; font-size: 1.25rem; color: #1f2937;">Household Bills</h3>
                        <button onclick="window.app.finances.addBill()" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                            + Add Bill
                        </button>
                    </div>
                    
                    ${householdBills.length === 0 ? `
                        <div style="text-align: center; padding: 3rem 1rem; color: #9ca3af;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                            <p style="margin: 0;">No household bills added yet</p>
                            <p style="font-size: 0.875rem; margin-top: 0.5rem;">Click "Add Bill" to track your household expenses</p>
                        </div>
                    ` : householdBills.map(bill => `
                        <div class="bill-item">
                            <div>
                                <div style="font-weight: 600; color: #1f2937; font-size: 1rem;">${bill.name}</div>
                                ${bill.frequency !== 'once' ? `<div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">${this.getFrequencyLabel(bill.frequency)}</div>` : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="font-size: 1.25rem; font-weight: 700; color: #ef4444;">${ui.formatCurrency(bill.amount)}</div>
                                <button onclick="window.app.finances.editBill('${bill.id}')" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 1.25rem;">✏️</button>
                                <button onclick="window.app.finances.deleteBill('${bill.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.25rem;">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="finance-card">
                    <h3 style="margin: 0 0 1.5rem 0; font-size: 1.25rem; color: #1f2937;">Savings History</h3>
                    
                    ${savingsHistory.history.length === 0 ? `
                        <div style="text-align: center; padding: 3rem 1rem; color: #9ca3af;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                            <p style="margin: 0;">No savings history yet</p>
                            <p style="font-size: 0.875rem; margin-top: 0.5rem;">Your monthly savings will appear here</p>
                        </div>
                    ` : `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${savingsHistory.history.slice(0, 12).map((month, index) => {
                                const isCurrentMonth = month.year === this.selectedYear && month.month === this.selectedMonth;
                                return `
                                    <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; ${isCurrentMonth ? 'background: #f0f9ff; border-left: 3px solid #3b82f6;' : ''}">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <div style="font-weight: 600; color: #1f2937;">${month.label}</div>
                                                <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                                                    Profit: ${ui.formatCurrency(month.profit)} - Bills: ${ui.formatCurrency(month.bills)}
                                                </div>
                                            </div>
                                            <div style="font-size: 1.25rem; font-weight: 700; color: ${month.savings >= 0 ? '#10b981' : '#ef4444'};">
                                                ${ui.formatCurrency(month.savings)}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>

            <div class="finance-card" style="background: #fef3c7; border: 2px solid #fde68a;">
                <h3 style="margin: 0 0 1rem 0; color: #92400e; font-size: 1.125rem;">💡 Quick Tips</h3>
                <ul style="margin: 0; padding-left: 1.5rem; color: #78350f;">
                    <li style="margin-bottom: 0.5rem;">Add recurring bills like Nanny, Malume, and weekly Lunch expenses</li>
                    <li style="margin-bottom: 0.5rem;">Use the month picker to view past performance and plan ahead</li>
                    <li style="margin-bottom: 0.5rem;">Your savings history tracks month-over-month to show progress</li>
                    <li>Green means surplus, red means deficit - adjust accordingly</li>
                </ul>
            </div>
        `;

        this.financesDisplay.innerHTML = html;
    }

    getFrequencyLabel(frequency) {
        const labels = {
            'weekly': 'Weekly',
            'monthly': 'Monthly',
            'once': 'One-time'
        };
        return labels[frequency] || frequency;
    }

    async calculateSavingsHistory() {
        const allSales = storage.getSales();
        const allExpenses = storage.getExpenditures();
        const allBills = await storage.getAllHouseholdBills();

        const monthlyData = {};

        allSales.forEach(sale => {
            const date = new Date(sale.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { sales: 0, expenses: 0, bills: 0, year: date.getFullYear(), month: date.getMonth() + 1 };
            }
            monthlyData[key].sales += sale.total || 0;
        });

        allExpenses.forEach(exp => {
            const date = new Date(exp.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { sales: 0, expenses: 0, bills: 0, year: date.getFullYear(), month: date.getMonth() + 1 };
            }
            monthlyData[key].expenses += exp.amount || 0;
        });

        allBills.forEach(bill => {
            const key = `${bill.year}-${bill.month}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { sales: 0, expenses: 0, bills: 0, year: bill.year, month: bill.month };
            }
            monthlyData[key].bills += bill.amount;
        });

        const history = Object.keys(monthlyData)
            .sort()
            .reverse()
            .map(key => {
                const data = monthlyData[key];
                const profit = data.sales - data.expenses;
                const savings = profit - data.bills;
                const date = new Date(data.year, data.month - 1);
                return {
                    year: data.year,
                    month: data.month,
                    label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    profit,
                    bills: data.bills,
                    savings
                };
            });

        const totalSaved = history.reduce((sum, month) => sum + month.savings, 0);

        return {
            history,
            totalSaved,
            monthsTracked: history.length
        };
    }

    addBill() {
        const activities = [
            'Nanny',
            'Malume',
            'Lunch',
            'Electricity',
            'Water',
            'Internet',
            'Rent',
            'Transport',
            'Groceries',
            'School Fees',
            'Medical',
            'Other'
        ];

        const modalContent = `
            <div class="modal-header">
                <div class="modal-title">Add Household Bill</div>
                <button class="close-btn" onclick="window.app.ui.closeModal()">&times;</button>
            </div>
            <form id="bill-form">
                <div class="form-group">
                    <label class="form-label">Activity / Bill Name *</label>
                    <select class="form-select" name="name" id="activity-dropdown" required>
                        <option value="">-- Select Activity --</option>
                        ${activities.map(activity => `<option value="${activity}">${activity}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" id="custom-activity-group" style="display: none;">
                    <label class="form-label">Custom Activity Name *</label>
                    <input type="text" class="form-input" name="customName" id="custom-activity-input" placeholder="Enter custom activity name">
                </div>
                <div class="form-group">
                    <label class="form-label">Amount *</label>
                    <input type="number" class="form-input" name="amount" placeholder="0.00" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Frequency *</label>
                    <select class="form-select" name="frequency" required>
                        <option value="once">One-time (this month only)</option>
                        <option value="weekly">Weekly (multiply by 4)</option>
                        <option value="monthly">Monthly (recurring)</option>
                    </select>
                </div>
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="color: #0c4a6e; font-size: 0.875rem; margin: 0;">
                        <strong>Weekly bills:</strong> Enter the weekly amount (e.g., 500 for lunch), it will be multiplied by 4 automatically.
                    </p>
                </div>
                <button type="submit" class="btn btn-primary">Add Bill</button>
            </form>
        `;

        ui.showModal(modalContent);

        // Handle custom activity input
        const dropdown = document.getElementById('activity-dropdown');
        const customGroup = document.getElementById('custom-activity-group');
        const customInput = document.getElementById('custom-activity-input');

        dropdown.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                customGroup.style.display = 'block';
                customInput.required = true;
            } else {
                customGroup.style.display = 'none';
                customInput.required = false;
                customInput.value = '';
            }
        });

        document.getElementById('bill-form').addEventListener('submit', (e) => {
            this.handleAddBill(e);
        });
    }

    async handleAddBill(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        let amount = parseFloat(formData.get('amount'));
        const frequency = formData.get('frequency');
        
        if (frequency === 'weekly') {
            amount = amount * 4;
        }

        // Get the activity name (either from dropdown or custom input)
        let activityName = formData.get('name');
        if (activityName === 'Other') {
            activityName = formData.get('customName');
        }

        const billData = {
            name: activityName,
            amount: amount,
            frequency: frequency,
            year: this.selectedYear,
            month: this.selectedMonth
        };

        try {
            await storage.saveHouseholdBill(billData);
            ui.showAlert(`Bill "${billData.name}" added successfully!`);
            ui.closeModal();
            this.loadFinancesData();
        } catch (error) {
            ui.showAlert('Error adding bill: ' + error.message, 'error');
        }
    }

    async editBill(billId) {
        const bill = await storage.getHouseholdBillById(billId);
        if (!bill) return;

        const modalContent = `
            <div class="modal-header">
                <div class="modal-title">Edit Household Bill</div>
                <button class="close-btn" onclick="window.app.ui.closeModal()">&times;</button>
            </div>
            <form id="edit-bill-form">
                <div class="form-group">
                    <label class="form-label">Bill Name *</label>
                    <input type="text" class="form-input" name="name" value="${bill.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount *</label>
                    <input type="number" class="form-input" name="amount" value="${bill.amount}" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Frequency *</label>
                    <select class="form-select" name="frequency" required>
                        <option value="once" ${bill.frequency === 'once' ? 'selected' : ''}>One-time</option>
                        <option value="weekly" ${bill.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="monthly" ${bill.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Update Bill</button>
            </form>
        `;

        ui.showModal(modalContent);

        document.getElementById('edit-bill-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const updatedBill = {
                ...bill,
                name: formData.get('name'),
                amount: parseFloat(formData.get('amount')),
                frequency: formData.get('frequency')
            };

            try {
                await storage.updateHouseholdBill(billId, updatedBill);
                ui.showAlert('Bill updated successfully!');
                ui.closeModal();
                this.loadFinancesData();
            } catch (error) {
                ui.showAlert('Error updating bill: ' + error.message, 'error');
            }
        });
    }

    async deleteBill(billId) {
        if (!confirm('Are you sure you want to delete this bill?')) return;

        try {
            await storage.deleteHouseholdBill(billId);
            ui.showAlert('Bill deleted successfully!');
            this.loadFinancesData();
        } catch (error) {
            ui.showAlert('Error deleting bill: ' + error.message, 'error');
        }
    }
}

export const finances = new FinancesManager();
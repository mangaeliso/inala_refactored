import { storage } from './storage.js';
import { ui } from './ui.js';

class AdminManager {
    constructor() {
        this.isAdminUnlocked = false;
    }

    // Initialize admin module
    initialize() {
        const clearTestDataBtn = document.getElementById('clear-test-data-btn');
        const exportMonthlyBtn = document.getElementById('export-monthly-btn');
        const monthlyResetBtn = document.getElementById('monthly-reset-btn');
        const removeDuplicatesBtn = document.getElementById('remove-duplicates-btn');
        const manageExpendituresBtn = document.getElementById('manage-expenditures-btn');

        if (clearTestDataBtn) {
            clearTestDataBtn.addEventListener('click', () => this.clearTestData());
        }

        if (exportMonthlyBtn) {
            exportMonthlyBtn.addEventListener('click', () => this.exportMonthlyReport());
        }

        if (monthlyResetBtn) {
            monthlyResetBtn.addEventListener('click', () => this.monthlyReset());
        }

        if (removeDuplicatesBtn) {
            removeDuplicatesBtn.addEventListener('click', () => this.removeDuplicates());
        }

        if (manageExpendituresBtn) {
            manageExpendituresBtn.addEventListener('click', () => this.manageExpenditures());
        }

        // Listen for admin shortcut (Ctrl+Shift+A)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                this.unlockAdminPanel();
            }
        });
    }

    // Unlock admin panel
    unlockAdminPanel() {
        if (!this.isAdminUnlocked) {
            ui.showAdminTab();
            ui.showAlert('Admin panel unlocked! 🔓', 'success');
            this.isAdminUnlocked = true;
        }
    }

    // Load admin data and update stats
    async loadAdminData() {
        try {
            await storage.loadAllData();
            this.updateStats();
        } catch (error) {
            console.error('Error loading admin data:', error);
            ui.showAlert('Error loading admin data: ' + error.message, 'error');
        }
    }

    // Update admin stats
    updateStats() {
        const sales = storage.getSales();
        const expenses = storage.getExpenditures();
        const payments = storage.getPayments();

        const salesEl = document.getElementById('admin-total-sales');
        const expensesEl = document.getElementById('admin-total-expenses');
        const paymentsEl = document.getElementById('admin-total-payments');

        if (salesEl) salesEl.textContent = sales.length;
        if (expensesEl) expensesEl.textContent = expenses.length;
        if (paymentsEl) paymentsEl.textContent = payments.length;
    }

    // Clear all test data
    async clearTestData() {
        if (!ui.confirmAction('⚠️ WARNING: This will permanently delete ALL sales, expenditure, and payment records.\n\nCustomer data will be preserved.\n\nType "DELETE" to confirm:')) {
            return;
        }

        const confirmation = ui.promptInput('Type "DELETE" to confirm data deletion:');
        if (confirmation !== 'DELETE') {
            ui.showAlert('Data deletion cancelled', 'error');
            return;
        }

        try {
            await storage.clearAllTransactions();
            ui.showAlert('🗑️ Test data cleared successfully! Sales, expenses, and payments deleted, customers preserved.', 'success');
            this.updateStats();

        } catch (error) {
            ui.showAlert('Error clearing data: ' + error.message, 'error');
        }
    }

    // Export monthly report
    async exportMonthlyReport() {
        await storage.loadAllData();

        const sales = storage.getSales();
        const expenses = storage.getExpenditures();
        const payments = storage.getPayments();

        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const netProfit = totalSales - totalExpenses;

        const reportText = `
INALA HOLDINGS - Monthly Report
Generated: ${new Date().toLocaleString()}
Period: ${currentMonth}

=== FINANCIAL SUMMARY ===
Total Sales: R${totalSales.toFixed(2)}
Total Expenses: R${totalExpenses.toFixed(2)}
Total Payments Received: R${totalPayments.toFixed(2)}
Net Profit: R${netProfit.toFixed(2)}

=== TRANSACTION SUMMARY ===
Total Transactions: ${sales.length + expenses.length}
Sales Transactions: ${sales.length}
Expense Transactions: ${expenses.length}
Payment Records: ${payments.length}
Credit Sales: ${sales.filter(s => s.payment === 'credit').length}

=== DETAILED TRANSACTIONS ===
SALES:
${sales.map(sale =>
            `${sale.date} | ${sale.product} | Qty: ${sale.quantity} | R${sale.total} | ${sale.payment}${sale.customer_name ? ' | ' + sale.customer_name : ''}`
        ).join('\n')}

EXPENSES:
${expenses.map(expense =>
            `${expense.date} | ${expense.business_unit} | ${expense.category} | R${expense.amount} | ${expense.payment_method}`
        ).join('\n')}

PAYMENTS RECEIVED:
${payments.map(payment =>
            `${payment.date} | ${payment.customer_name} | R${payment.amount} | ${payment.payment_method} | Received by: ${payment.received_by}`
        ).join('\n')}

=== END REPORT ===
        `;

        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `INALA-HOLDINGS-Report-${currentMonth.replace(' ', '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        ui.showAlert(`📊 Monthly report generated and downloaded! File: INALA-HOLDINGS-Report-${currentMonth.replace(' ', '-')}.txt`, 'success');
    }

    // Monthly reset
    async monthlyReset() {
        if (!ui.confirmAction('🗓️ MONTHLY RESET\n\nThis will:\n1. Generate monthly report\n2. Clear all transactions\n3. Preserve customer data\n4. Reset dashboard to zero\n\nProceed?')) {
            return;
        }

        try {
            // Export report first
            await this.exportMonthlyReport();

            // Wait a moment for download
            setTimeout(async () => {
                // Clear transactions
                await storage.clearAllTransactions();

                ui.showAlert('🗓️ Monthly reset complete! Data archived and cleared for new month.', 'success');
                this.updateStats();
            }, 1000);

        } catch (error) {
            ui.showAlert('Error during monthly reset: ' + error.message, 'error');
        }
    }

    // NEW: Manage all expenditures with edit/delete capabilities
    async manageExpenditures() {
        try {
            await storage.loadAllData();
            const expenses = storage.getExpenditures() || [];
            
            if (expenses.length === 0) {
                ui.showAlert('No expenditures found in the system.', 'info');
                return;
            }

            this.showExpenditureManagementModal(expenses);
            
        } catch (error) {
            console.error('Error loading expenditures:', error);
            ui.showAlert('Error loading expenditures: ' + error.message, 'error');
        }
    }

    // Show expenditure management modal
    showExpenditureManagementModal(expenses) {
        // Sort by date (newest first)
        const sortedExpenses = [...expenses].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        let modalHTML = `
        <div id="expenditure-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 2rem;">
            <div style="background: white; border-radius: 12px; max-width: 1400px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 2px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.5rem; color: white;">💸 Expenditure Management</h2>
                        <p style="margin: 0.5rem 0 0 0; color: rgba(255,255,255,0.9); font-size: 0.9rem;">View, edit, or delete expenditure entries</p>
                    </div>
                    <button onclick="document.getElementById('expenditure-modal').remove()" style="background: rgba(255,255,255,0.2); border: none; font-size: 1.5rem; cursor: pointer; color: white; padding: 0.5rem; border-radius: 6px; width: 40px; height: 40px;">&times;</button>
                </div>
                
                <div style="padding: 1rem 1.5rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <input type="text" id="expenditure-search" placeholder="🔍 Search by business unit, category, description, or amount..." style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem;">
                </div>
                
                <div id="expenditure-list" style="padding: 1.5rem; overflow-y: auto; flex: 1; background: #fafafa;">
                    ${this.renderExpenditureList(sortedExpenses)}
                </div>
                
                <div style="padding: 1rem 1.5rem; border-top: 2px solid #e5e7eb; display: flex; gap: 1rem; justify-content: space-between; align-items: center; background: #f9fafb;">
                    <div style="color: #6b7280; font-size: 0.875rem;">
                        <strong>${expenses.length}</strong> total expenditure(s) | <strong>R${expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}</strong> total amount
                    </div>
                    <button onclick="document.getElementById('expenditure-modal').remove()" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        </div>`;

        // Remove existing modal if any
        const existingModal = document.getElementById('expenditure-modal');
        if (existingModal) existingModal.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Store expenses for manipulation
        window.adminExpenditureData = [...expenses];

        // Add search functionality
        document.getElementById('expenditure-search').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = sortedExpenses.filter(exp => {
                return (
                    exp.business_unit?.toLowerCase().includes(searchTerm) ||
                    exp.category?.toLowerCase().includes(searchTerm) ||
                    exp.description?.toLowerCase().includes(searchTerm) ||
                    exp.amount?.toString().includes(searchTerm) ||
                    exp.date?.includes(searchTerm) ||
                    exp.payment_method?.toLowerCase().includes(searchTerm)
                );
            });
            document.getElementById('expenditure-list').innerHTML = this.renderExpenditureList(filtered);
        });
    }

    // Render expenditure list
    renderExpenditureList(expenses) {
        if (expenses.length === 0) {
            return '<div style="text-align: center; padding: 3rem; color: #9ca3af;">No expenditures match your search.</div>';
        }

        return expenses.map((expense, index) => `
            <div id="expense-item-${index}" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                            <span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; font-weight: 600;">
                                ${expense.business_unit || 'N/A'}
                            </span>
                            <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; font-weight: 600;">
                                ${expense.category || 'N/A'}
                            </span>
                            <span style="color: #6b7280; font-size: 0.875rem;">
                                📅 ${expense.date}
                            </span>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #dc2626; margin-bottom: 0.5rem;">
                            R${parseFloat(expense.amount || 0).toFixed(2)}
                        </div>
                        <div style="color: #4b5563; font-size: 0.875rem; margin-bottom: 0.25rem;">
                            <strong>Payment:</strong> ${expense.payment_method || 'N/A'}
                        </div>
                        ${expense.description ? `
                            <div style="color: #6b7280; font-size: 0.875rem; font-style: italic; margin-top: 0.5rem; padding-left: 0.5rem; border-left: 3px solid #e5e7eb;">
                                ${expense.description}
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                        <button onclick="window.admin.editExpenditure(${index})" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            ✏️ Edit
                        </button>
                        <button onclick="window.admin.deleteExpenditure(${index})" style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Edit expenditure
    async editExpenditure(index) {
        const expense = window.adminExpenditureData[index];
        if (!expense) return;

        const editModalHTML = `
        <div id="edit-expense-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 11000; padding: 2rem;">
            <div style="background: white; border-radius: 12px; max-width: 600px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 2px solid #e5e7eb; background: #3b82f6; color: white;">
                    <h2 style="margin: 0; font-size: 1.25rem;">✏️ Edit Expenditure</h2>
                </div>
                
                <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Date</label>
                        <input type="date" id="edit-date" value="${expense.date}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Business Unit</label>
                        <input type="text" id="edit-business-unit" value="${expense.business_unit || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Category</label>
                        <input type="text" id="edit-category" value="${expense.category || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Amount (R)</label>
                        <input type="number" id="edit-amount" value="${expense.amount || 0}" step="0.01" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Payment Method</label>
                        <input type="text" id="edit-payment-method" value="${expense.payment_method || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Description</label>
                        <textarea id="edit-description" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; min-height: 80px; resize: vertical;">${expense.description || ''}</textarea>
                    </div>
                </div>
                
                <div style="padding: 1rem 1.5rem; border-top: 2px solid #e5e7eb; display: flex; gap: 1rem; justify-content: flex-end; background: #f9fafb;">
                    <button onclick="document.getElementById('edit-expense-modal').remove()" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        Cancel
                    </button>
                    <button onclick="window.admin.saveEditedExpenditure(${index})" style="padding: 0.75rem 1.5rem; border: none; background: #3b82f6; color: white; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        💾 Save Changes
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', editModalHTML);
    }

    // Save edited expenditure
    async saveEditedExpenditure(index) {
        try {
            const updatedExpense = {
                ...window.adminExpenditureData[index],
                date: document.getElementById('edit-date').value,
                business_unit: document.getElementById('edit-business-unit').value,
                category: document.getElementById('edit-category').value,
                amount: parseFloat(document.getElementById('edit-amount').value),
                payment_method: document.getElementById('edit-payment-method').value,
                description: document.getElementById('edit-description').value
            };

            // Update in array
            window.adminExpenditureData[index] = updatedExpense;

            // Save to storage using the correct method
            await storage.saveToFirebase('expenditures', window.adminExpenditureData);

            // Close edit modal
            document.getElementById('edit-expense-modal').remove();

            // Refresh the list
            await storage.loadAllData();
            const expenses = storage.getExpenditures();
            document.getElementById('expenditure-list').innerHTML = this.renderExpenditureList(expenses);
            window.adminExpenditureData = [...expenses];

            ui.showAlert('✅ Expenditure updated successfully!', 'success');
            this.updateStats();

        } catch (error) {
            console.error('Error saving expenditure:', error);
            ui.showAlert('Error saving expenditure: ' + error.message, 'error');
        }
    }

    // Delete expenditure
    async deleteExpenditure(index) {
        const expense = window.adminExpenditureData[index];
        if (!expense) return;

        if (!confirm(`⚠️ Are you sure you want to delete this expenditure?\n\nBusiness Unit: ${expense.business_unit}\nCategory: ${expense.category}\nAmount: R${expense.amount}\nDate: ${expense.date}\n\nThis action cannot be undone!`)) {
            return;
        }

        try {
            ui.showAlert('🔄 Deleting expenditure...', 'info');

            // Get fresh data from storage to ensure we have the latest
            await storage.loadAllData();
            const allExpenses = storage.getExpenditures();
            
            // Find the exact expense to delete by matching all fields
            const indexToDelete = allExpenses.findIndex(exp => 
                exp.date === expense.date &&
                exp.business_unit === expense.business_unit &&
                exp.category === expense.category &&
                parseFloat(exp.amount) === parseFloat(expense.amount) &&
                exp.payment_method === expense.payment_method &&
                (exp.description || '') === (expense.description || '')
            );

            if (indexToDelete === -1) {
                ui.showAlert('❌ Could not find expenditure to delete. Please refresh and try again.', 'error');
                return;
            }

            // Remove the item
            allExpenses.splice(indexToDelete, 1);

            // Save to Firebase and wait for confirmation
            await storage.saveToFirebase('expenditures', allExpenses);
            
            // Wait a moment for Firebase to process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Close the modal
            const modal = document.getElementById('expenditure-modal');
            if (modal) modal.remove();
            
            // Force reload from Firebase
            await storage.loadAllData();
            this.updateStats();

            ui.showAlert('✅ Expenditure deleted successfully! Data refreshed.', 'success');

        } catch (error) {
            console.error('Error deleting expenditure:', error);
            ui.showAlert('❌ Error deleting expenditure: ' + error.message, 'error');
        }
    }

    // Show duplicate management interface
    async removeDuplicates() {
        try {
            ui.showAlert('🔍 Scanning for duplicates in sales and expenditures...', 'info');
            
            await storage.loadAllData();
            const sales = storage.getSales() || [];
            const expenses = storage.getExpenditures() || [];
            
            // Find duplicate sales
            const salesDuplicates = this.findDuplicates(sales, 'sale');
            
            // Find duplicate expenses
            const expensesDuplicates = this.findDuplicates(expenses, 'expense');
            
            if (salesDuplicates.length === 0 && expensesDuplicates.length === 0) {
                ui.showAlert('✅ No duplicates found! Your data is clean.', 'success');
                return;
            }

            // Show duplicate management modal
            this.showDuplicateManagementModal(salesDuplicates, expensesDuplicates, sales, expenses);
            
        } catch (error) {
            console.error('Error scanning duplicates:', error);
            ui.showAlert('Error scanning duplicates: ' + error.message, 'error');
        }
    }

    // Find duplicates in a dataset
    findDuplicates(items, type) {
        const itemMap = new Map();
        const duplicateGroups = [];

        items.forEach((item, index) => {
            let signature;
            
            if (type === 'sale') {
                // Include customer name in signature to avoid false positives
                signature = [
                    item.date,
                    item.product?.toLowerCase().trim(),
                    parseFloat(item.quantity || 0),
                    parseFloat(item.price || 0),
                    parseFloat(item.total || 0),
                    item.payment?.toLowerCase().trim(),
                    item.customer_name?.toLowerCase().trim() || ''
                ].join('|');
            } else {
                // For expenses, include payment method and description for better matching
                signature = [
                    item.date,
                    item.business_unit?.toLowerCase().trim(),
                    item.category?.toLowerCase().trim(),
                    parseFloat(item.amount || 0).toFixed(2),
                    item.payment_method?.toLowerCase().trim() || '',
                    item.description?.toLowerCase().trim().substring(0, 50) || ''
                ].join('|');
            }

            if (itemMap.has(signature)) {
                const group = itemMap.get(signature);
                group.duplicates.push({ ...item, index });
            } else {
                itemMap.set(signature, {
                    original: { ...item, index },
                    duplicates: [],
                    signature
                });
            }
        });

        // Get only groups that have duplicates
        itemMap.forEach(group => {
            if (group.duplicates.length > 0) {
                duplicateGroups.push(group);
            }
        });

        return duplicateGroups;
    }

    // Show duplicate management modal
    showDuplicateManagementModal(salesDuplicates, expensesDuplicates, allSales, allExpenses) {
        const totalDuplicates = salesDuplicates.reduce((sum, g) => sum + g.duplicates.length, 0) +
                               expensesDuplicates.reduce((sum, g) => sum + g.duplicates.length, 0);

        let modalHTML = `
        <div id="duplicate-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; overflow-y: auto; padding: 2rem;">
            <div style="background: white; border-radius: 12px; max-width: 1200px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 2px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.5rem; color: #111827;">🧹 Duplicate Management</h2>
                        <p style="margin: 0.5rem 0 0 0; color: #6b7280; font-size: 0.9rem;">Found ${totalDuplicates} potential duplicates. Review and select items to delete.</p>
                    </div>
                    <button onclick="document.getElementById('duplicate-modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; padding: 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">`;

        // Sales Duplicates Section
        if (salesDuplicates.length > 0) {
            modalHTML += `
                <div style="margin-bottom: 2rem;">
                    <h3 style="color: #059669; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>💰</span> Sales Duplicates (${salesDuplicates.length} groups)
                    </h3>`;
            
            salesDuplicates.forEach((group, groupIndex) => {
                const original = group.original;
                modalHTML += `
                    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <div style="font-weight: 600; color: #166534; margin-bottom: 0.5rem;">
                            📦 ${original.product} | ${original.date} | R${parseFloat(original.total).toFixed(2)}
                        </div>
                        <div style="font-size: 0.875rem; color: #15803d; margin-bottom: 1rem;">
                            Qty: ${original.quantity} × R${original.price} | Payment: ${original.payment}
                        </div>
                        <div style="background: white; border-radius: 6px; padding: 1rem;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #dc2626;">Select duplicates to DELETE:</div>`;
                
                group.duplicates.forEach((dup, dupIndex) => {
                    modalHTML += `
                        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: 4px; margin-bottom: 0.25rem;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'">
                            <input type="checkbox" class="delete-checkbox" data-type="sale" data-index="${dup.index}" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1; font-size: 0.875rem;">
                                Duplicate ${dupIndex + 1}: ${dup.date} | ${dup.product} | Qty: ${dup.quantity} | R${parseFloat(dup.total).toFixed(2)} | ${dup.payment}
                                ${dup.customer_name ? ` | Customer: ${dup.customer_name}` : ''}
                            </span>
                        </label>`;
                });
                
                modalHTML += `
                        </div>
                    </div>`;
            });
            
            modalHTML += `</div>`;
        }

        // Expenses Duplicates Section
        if (expensesDuplicates.length > 0) {
            modalHTML += `
                <div style="margin-bottom: 2rem;">
                    <h3 style="color: #dc2626; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>💸</span> Expenditure Duplicates (${expensesDuplicates.length} groups)
                    </h3>`;
            
            expensesDuplicates.forEach((group, groupIndex) => {
                const original = group.original;
                modalHTML += `
                    <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <div style="font-weight: 600; color: #991b1b; margin-bottom: 0.5rem;">
                            🏢 ${original.business_unit} - ${original.category} | ${original.date} | R${parseFloat(original.amount).toFixed(2)}
                        </div>
                        <div style="font-size: 0.875rem; color: #b91c1c; margin-bottom: 1rem;">
                            Payment: ${original.payment_method} ${original.description ? `| ${original.description}` : ''}
                        </div>
                        <div style="background: white; border-radius: 6px; padding: 1rem;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #dc2626;">Select duplicates to DELETE:</div>`;
                
                group.duplicates.forEach((dup, dupIndex) => {
                    modalHTML += `
                        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: 4px; margin-bottom: 0.25rem;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'">
                            <input type="checkbox" class="delete-checkbox" data-type="expense" data-index="${dup.index}" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1; font-size: 0.875rem;">
                                Duplicate ${dupIndex + 1}: ${dup.date} | ${dup.business_unit} | ${dup.category} | R${parseFloat(dup.amount).toFixed(2)} | ${dup.payment_method}
                                ${dup.description ? ` | ${dup.description}` : ''}
                            </span>
                        </label>`;
                });
                
                modalHTML += `
                        </div>
                    </div>`;
            });
            
            modalHTML += `</div>`;
        }

        modalHTML += `
                </div>
                
                <div style="padding: 1rem 1.5rem; border-top: 2px solid #e5e7eb; display: flex; gap: 1rem; justify-content: space-between; align-items: center; background: #f9fafb;">
                    <div style="color: #6b7280; font-size: 0.875rem;">
                        <span id="selected-count">0</span> items selected for deletion
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="document.getElementById('duplicate-modal').remove()" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                        <button onclick="window.admin.deleteSelectedDuplicates()" style="padding: 0.75rem 1.5rem; border: none; background: #dc2626; color: white; border-radius: 6px; font-weight: 600; cursor: pointer;">
                            🗑️ Delete Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        // Remove existing modal if any
        const existingModal = document.getElementById('duplicate-modal');
        if (existingModal) existingModal.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners for checkboxes
        document.querySelectorAll('.delete-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const count = document.querySelectorAll('.delete-checkbox:checked').length;
                document.getElementById('selected-count').textContent = count;
            });
        });

        // Store data for deletion
        window.adminDuplicateData = { allSales, allExpenses };
    }

    // Delete selected duplicates
    async deleteSelectedDuplicates() {
        const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
        
        if (checkboxes.length === 0) {
            ui.showAlert('Please select at least one item to delete.', 'warning');
            return;
        }

        if (!confirm(`⚠️ Are you sure you want to delete ${checkboxes.length} selected item(s)?\n\nThis action cannot be undone!`)) {
            return;
        }

        try {
            const { allSales, allExpenses } = window.adminDuplicateData;
            const salesToDelete = new Set();
            const expensesToDelete = new Set();

            // Collect indices to delete
            checkboxes.forEach(checkbox => {
                const type = checkbox.getAttribute('data-type');
                const index = parseInt(checkbox.getAttribute('data-index'));
                
                if (type === 'sale') {
                    salesToDelete.add(index);
                } else {
                    expensesToDelete.add(index);
                }
            });

            // Filter out deleted items
            const newSales = allSales.filter((_, index) => !salesToDelete.has(index));
            const newExpenses = allExpenses.filter((_, index) => !expensesToDelete.has(index));

            // Save to storage
            if (salesToDelete.size > 0) {
                await storage.saveToFirebase('sales', newSales);
            }
            if (expensesToDelete.size > 0) {
                await storage.saveToFirebase('expenditures', newExpenses);
            }

            // Close modal
            document.getElementById('duplicate-modal').remove();

            // Show success message
            ui.showAlert(
                `✅ Successfully deleted ${checkboxes.length} duplicate item(s)!\n\n` +
                `Sales deleted: ${salesToDelete.size}\n` +
                `Expenses deleted: ${expensesToDelete.size}`,
                'success'
            );

            // Reload data
            await storage.loadAllData();
            this.updateStats();

        } catch (error) {
            console.error('Error deleting duplicates:', error);
            ui.showAlert('Error deleting duplicates: ' + error.message, 'error');
        }
    }
}

// Create and export singleton instance
export const admin = new AdminManager();

// Expose to window for onclick handlers
window.admin = admin;
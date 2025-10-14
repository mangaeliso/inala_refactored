import { businessCategories } from './config.js';
import { storage } from './storage.js';
import { ui } from './ui.js';

class ExpenditureManager {
    constructor() {
        this.form = null;
        this.businessUnitSelect = null;
        this.categorySelect = null;
    }

    // Initialize expenditure module
    initialize() {
        this.form = document.getElementById('expenditure-form');
        this.businessUnitSelect = document.getElementById('business-unit-select');
        this.categorySelect = document.getElementById('category-select');

        this.attachEventListeners();
    }

    // Attach event listeners
    attachEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.businessUnitSelect) {
            this.businessUnitSelect.addEventListener('change', () => this.updateCategories());
        }
    }

    // Update categories based on business unit
    updateCategories() {
        const selectedUnit = this.businessUnitSelect.value;
        
        this.categorySelect.innerHTML = '<option value="">Select category</option>';
        
        if (selectedUnit && businessCategories[selectedUnit]) {
            businessCategories[selectedUnit].forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                this.categorySelect.appendChild(option);
            });
        }
    }

    // Handle form submission
    async handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);

        const expenseData = {
            type: 'expenditure',
            date: formData.get('date'),
            business_unit: formData.get('business_unit'),
            category: formData.get('category'),
            amount: parseFloat(formData.get('amount')),
            payment_method: formData.get('payment_method'),
            description: formData.get('description') || '',
            created_by: window.app.currentUser.email,
            created_by_name: window.app.currentUser.displayName || window.app.currentUser.email,
            created_at: new Date().toISOString()
        };

        try {
            await storage.saveData('expenditure', expenseData);
            ui.showAlert('Expenditure saved successfully!');
            this.form.reset();
            ui.setTodayDate();
        } catch (error) {
            ui.showAlert('Error saving expenditure: ' + error.message, 'error');
        }
    }
}

// Create and export singleton instance
export const expenditure = new ExpenditureManager();

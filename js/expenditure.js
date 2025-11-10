import { businessCategories } from './config.js';
import { storage } from './storage.js';
import { ui } from './ui.js';

class ExpenditureManager {
    constructor() {
        this.form = null;
        this.businessUnitSelect = null;
        this.categorySelect = null;
        this.isSubmitting = false; // NEW: Prevent double submission
        this.initialized = false; // NEW: Prevent double initialization
        this.lastSubmissionTime = 0; // NEW: Track last submission time
        this.submissionAttempts = new Set(); // NEW: Track submission attempts
    }

    // Initialize expenditure module
    initialize() {
        // Prevent multiple initializations
        if (this.initialized) {
            console.warn('⚠️ ExpenditureManager already initialized');
            return;
        }

        this.form = document.getElementById('expenditure-form');
        this.businessUnitSelect = document.getElementById('business-unit-select');
        this.categorySelect = document.getElementById('category-select');

        this.attachEventListeners();
        this.initialized = true;
        console.log('✅ ExpenditureManager initialized');
    }

    // Attach event listeners
    attachEventListeners() {
        if (this.form) {
            // Remove old listener if exists by cloning the form
            const newForm = this.form.cloneNode(true);
            this.form.parentNode.replaceChild(newForm, this.form);
            this.form = newForm;
            
            // Attach new listener with duplicate prevention
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Re-get form elements after cloning
            this.businessUnitSelect = document.getElementById('business-unit-select');
            this.categorySelect = document.getElementById('category-select');
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

    // Handle form submission - FIXED WITH DUPLICATE PREVENTION
    async handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling

        // Create a unique submission ID based on form data
        const formData = new FormData(this.form);
        const submissionId = this.createSubmissionId(formData);
        
        // Check if this exact form submission is already in progress
        if (this.submissionAttempts.has(submissionId)) {
            console.warn('⚠️ Identical expenditure submission already in progress, blocking');
            ui.showAlert('This expenditure is already being processed...', 'warning');
            return;
        }

        const now = Date.now();
        if (this.isSubmitting || (now - this.lastSubmissionTime < 5000)) {
            console.warn('⚠️ Expenditure submission blocked - rate limiting');
            ui.showAlert('Please wait before submitting another expenditure', 'warning');
            return;
        }

        // Mark this submission as in progress
        this.isSubmitting = true;
        this.lastSubmissionTime = now;
        this.submissionAttempts.add(submissionId);
        
        console.log('🔒 Expenditure submission locked with ID:', submissionId);

        try {
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

            // Validate required fields
            if (!expenseData.date || !expenseData.business_unit || !expenseData.category || !expenseData.amount) {
                ui.showAlert('Please fill in all required fields', 'error');
                return;
            }

            if (expenseData.amount <= 0) {
                ui.showAlert('Please enter a valid amount', 'error');
                return;
            }

            // Save expenditure - this will now be blocked if duplicate
            const result = await storage.saveData('expenditure', expenseData);
            
            if (result !== null) {
                ui.showAlert('Expenditure saved successfully!', 'success');
                this.resetForm();
            } else {
                ui.showAlert('This expenditure appears to be a duplicate and was not saved', 'warning');
            }

        } catch (error) {
            console.error('❌ Error saving expenditure:', error);
            ui.showAlert('Error saving expenditure: ' + error.message, 'error');
        } finally {
            // Clean up
            setTimeout(() => {
                this.isSubmitting = false;
                this.submissionAttempts.delete(submissionId);
                console.log('🔓 Expenditure submission unlocked');
            }, 3000);
        }
    }

    // NEW: Create unique submission ID based on form data
    createSubmissionId(formData) {
        const date = formData.get('date');
        const businessUnit = formData.get('business_unit');
        const category = formData.get('category');
        const amount = formData.get('amount');
        const description = formData.get('description') || '';
        
        return `expenditure_${date}_${businessUnit}_${category}_${amount}_${description}_${Date.now()}`;
    }

    // NEW: Proper form reset
    resetForm() {
        this.form.reset();
        ui.setTodayDate();
        
        // Reset category dropdown
        this.categorySelect.innerHTML = '<option value="">Select category</option>';
    }
}

// Create and export singleton instance
export const expenditure = new ExpenditureManager();
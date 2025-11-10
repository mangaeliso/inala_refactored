import { products } from './config.js';
import { storage } from './storage.js';
import { ui } from './ui.js';

class SalesManager {
    constructor() {
        this.form = null;
        this.productSelect = null;
        this.priceSelect = null;
        this.quantityInput = null;
        this.totalAmountField = null;
        this.paymentTypeSelect = null;
        this.customerNameInput = null;
        this.customerDropdown = null;
        this.isSubmitting = false;
        this.initialized = false;
        this.lastSubmissionTime = 0;
        this.submissionAttempts = new Set();
    }

    initialize() {
        if (this.initialized) {
            console.warn('⚠️ SalesManager already initialized');
            return;
        }

        this.form = document.getElementById('sales-form');
        this.productSelect = document.getElementById('product-select');
        this.priceSelect = document.getElementById('price-select');
        this.quantityInput = document.getElementById('quantity-input');
        this.totalAmountField = document.getElementById('total-amount');
        this.paymentTypeSelect = document.getElementById('payment-type');
        this.customerNameInput = document.getElementById('customer-name');
        this.customerDropdown = document.getElementById('customer-dropdown');

        this.renderProductOptions();
        this.attachEventListeners();
        
        this.initialized = true;
        console.log('✅ SalesManager initialized');
    }

    renderProductOptions() {
        if (!this.productSelect) return;

        this.productSelect.innerHTML = '<option value="">Select product</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name;
            option.dataset.price = product.price;
            option.textContent = product.name;
            this.productSelect.appendChild(option);
        });
    }

    attachEventListeners() {
        if (this.form) {
            // Remove any existing listeners by cloning the form
            const newForm = this.form.cloneNode(true);
            this.form.parentNode.replaceChild(newForm, this.form);
            this.form = newForm;
            
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Re-get form elements
            this.productSelect = document.getElementById('product-select');
            this.priceSelect = document.getElementById('price-select');
            this.quantityInput = document.getElementById('quantity-input');
            this.totalAmountField = document.getElementById('total-amount');
            this.paymentTypeSelect = document.getElementById('payment-type');
            this.customerNameInput = document.getElementById('customer-name');
            this.customerDropdown = document.getElementById('customer-dropdown');
        }

        if (this.productSelect) {
            this.productSelect.addEventListener('change', () => this.updatePrice());
        }

        if (this.priceSelect) {
            this.priceSelect.addEventListener('change', () => this.calculateTotal());
        }

        if (this.quantityInput) {
            this.quantityInput.addEventListener('input', () => this.calculateTotal());
        }

        if (this.paymentTypeSelect) {
            this.paymentTypeSelect.addEventListener('change', () => this.toggleCreditField());
        }

        if (this.customerNameInput) {
            this.customerNameInput.addEventListener('input', () => this.searchCustomers());
            this.customerNameInput.addEventListener('focus', () => this.showDropdown());
            this.customerNameInput.addEventListener('blur', () => this.hideDropdown());
        }
    }

    updatePrice() {
        const selectedOption = this.productSelect.options[this.productSelect.selectedIndex];
        const price = selectedOption.dataset.price;

        this.priceSelect.innerHTML = '';
        if (price) {
            this.priceSelect.innerHTML = `<option value="${price}">R${price}</option>`;
        } else {
            this.priceSelect.innerHTML = '<option value="">Select price</option>';
        }

        this.calculateTotal();
    }

    calculateTotal() {
        const quantity = parseFloat(this.quantityInput.value) || 0;
        const price = parseFloat(this.priceSelect.value) || 0;

        if (quantity && price) {
            const total = quantity * price;
            this.totalAmountField.value = ui.formatCurrency(total);
        } else {
            this.totalAmountField.value = 'R0.00';
        }
    }

    toggleCreditField() {
        const creditGroup = document.getElementById('credit-customer-group');
        const isCredit = this.paymentTypeSelect.value === 'credit';

        if (isCredit) {
            creditGroup.style.display = 'block';
            this.customerNameInput.required = true;
            this.loadCustomers();
        } else {
            creditGroup.style.display = 'none';
            this.customerNameInput.required = false;
            this.customerNameInput.value = '';
            this.hideDropdown();
        }
    }

    async loadCustomers() {
        try {
            await storage.loadAllData();
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    searchCustomers() {
        const searchTerm = this.customerNameInput.value.toLowerCase().trim();

        if (searchTerm.length < 1) {
            this.hideDropdown();
            return;
        }

        const customers = storage.getCustomers();
        const filteredCustomers = customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm)
        );

        let dropdownHTML = '';

        filteredCustomers.slice(0, 5).forEach(customer => {
            dropdownHTML += `
                <div class="customer-option existing-customer" data-customer-id="${customer.id}" data-customer-name="${customer.name}">
                    <div>${customer.name}</div>
                    <div class="customer-details">Last purchase: ${customer.lastPurchase || 'N/A'}</div>
                </div>
            `;
        });

        const exactMatch = customers.some(customer =>
            customer.name.toLowerCase() === searchTerm
        );

        if (!exactMatch && searchTerm.length >= 2) {
            dropdownHTML += `
                <div class="customer-option new-customer" data-customer-id="new" data-customer-name="${this.customerNameInput.value}">
                    <div>+ Add "${this.customerNameInput.value}" as new customer</div>
                </div>
            `;
        }

        this.customerDropdown.innerHTML = dropdownHTML;
        this.showDropdown();

        this.customerDropdown.querySelectorAll('.customer-option').forEach(option => {
            option.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const name = option.dataset.customerName;
                const id = option.dataset.customerId;
                this.selectCustomer(name, id);
            });
        });
    }

    selectCustomer(name, id) {
        this.customerNameInput.value = name;
        this.customerNameInput.dataset.customerId = id;
        this.hideDropdown();
    }

    showDropdown() {
        if (this.customerDropdown) {
            this.customerDropdown.classList.add('show');
        }
    }

    hideDropdown() {
        setTimeout(() => {
            if (this.customerDropdown) {
                this.customerDropdown.classList.remove('show');
            }
        }, 200);
    }

    async handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();

        const formData = new FormData(this.form);
        const submissionId = this.createSubmissionId(formData);
        
        if (this.submissionAttempts.has(submissionId)) {
            console.warn('⚠️ Identical form submission already in progress, blocking');
            ui.showAlert('This sale is already being processed...', 'warning');
            return;
        }

        const now = Date.now();
        if (this.isSubmitting || (now - this.lastSubmissionTime < 5000)) {
            console.warn('⚠️ Form submission blocked - rate limiting');
            ui.showAlert('Please wait before submitting another sale', 'warning');
            return;
        }

        this.isSubmitting = true;
        this.lastSubmissionTime = now;
        this.submissionAttempts.add(submissionId);
        
        console.log('🔒 Form submission locked with ID:', submissionId);

        try {
            const paymentType = formData.get('payment');
            const customerName = this.customerNameInput.value.trim();
            const customerId = this.customerNameInput.dataset.customerId;

            const quantity = parseInt(formData.get('quantity'));
            const price = parseFloat(formData.get('price'));
            const total = quantity * price;

            if (!formData.get('product') || !formData.get('price') || !quantity) {
                ui.showAlert('Please fill in all required fields', 'error');
                return;
            }

            if (quantity <= 0) {
                ui.showAlert('Please enter a valid quantity', 'error');
                return;
            }

            const saleData = {
                type: 'sale',
                date: formData.get('date'),
                product: formData.get('product'),
                quantity: quantity,
                price: price,
                total: total,
                payment: paymentType,
                customer_name: customerName || '',
                created_by: window.app.currentUser.email,
                created_by_name: window.app.currentUser.displayName || window.app.currentUser.email,
                created_at: new Date().toISOString()
            };

            if (paymentType === 'credit') {
                if (!customerName) {
                    ui.showAlert('Please enter customer name for credit sales', 'error');
                    return;
                }

                saleData.customer_id = customerId;

                if (customerId === 'new' || !customerId) {
                    const customers = storage.getCustomers();
                    const existingCustomer = customers.find(c =>
                        c.name.toLowerCase() === customerName.toLowerCase()
                    );

                    if (!existingCustomer) {
                        const newCustomer = {
                            name: customerName,
                            totalCredit: saleData.total,
                            lastPurchase: saleData.date,
                            salesCount: 1,
                            created_by: window.app.currentUser.email,
                            created_by_name: window.app.currentUser.displayName || window.app.currentUser.email,
                            created_at: new Date().toISOString()
                        };
                        await storage.saveData('customers', newCustomer);
                        ui.showAlert(`New customer "${customerName}" added to database!`);
                    }
                }
            }

            const result = await storage.saveData('sales', saleData);
            
            if (result !== null) {
                ui.showAlert(`${paymentType === 'credit' ? 'Credit sale' : 'Sale'} saved successfully!`, 'success');
                this.resetForm();
            } else {
                ui.showAlert('This sale appears to be a duplicate and was not saved', 'warning');
            }

        } catch (error) {
            console.error('❌ Error saving sale:', error);
            ui.showAlert('Error saving sale: ' + error.message, 'error');
        } finally {
            setTimeout(() => {
                this.isSubmitting = false;
                this.submissionAttempts.delete(submissionId);
                console.log('🔓 Form submission unlocked');
            }, 3000);
        }
    }

    createSubmissionId(formData) {
        const product = formData.get('product');
        const quantity = formData.get('quantity');
        const price = formData.get('price');
        const date = formData.get('date');
        const customer = this.customerNameInput.value.trim();
        
        return `sale_${date}_${product}_${quantity}_${price}_${customer}_${Date.now()}`;
    }

    resetForm() {
        this.form.reset();
        ui.setTodayDate();
        
        document.getElementById('credit-customer-group').style.display = 'none';
        this.customerNameInput.required = false;
        this.customerNameInput.dataset.customerId = '';
        this.hideDropdown();
        
        this.totalAmountField.value = 'R0.00';
    }
}

const sales = new SalesManager();
export { sales };
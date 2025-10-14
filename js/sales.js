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
    }

    // Initialize sales module
    initialize() {
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
    }

    // Render product options
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

    // Attach event listeners
    attachEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
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

    // Update price based on product selection
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

    // Calculate total amount
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

    // Toggle credit customer field
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

    // Load customers for autocomplete
    async loadCustomers() {
        await storage.loadAllData();
    }

    // Search customers with autocomplete
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

        // Show existing customers
        filteredCustomers.slice(0, 5).forEach(customer => {
            dropdownHTML += `
                <div class="customer-option existing-customer" data-customer-id="${customer.id}" data-customer-name="${customer.name}">
                    <div>${customer.name}</div>
                    <div class="customer-details">Last purchase: ${customer.lastPurchase || 'N/A'}</div>
                </div>
            `;
        });

        // Show "Add new" option if no exact match
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

        // Add click listeners to options
        this.customerDropdown.querySelectorAll('.customer-option').forEach(option => {
            option.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const name = option.dataset.customerName;
                const id = option.dataset.customerId;
                this.selectCustomer(name, id);
            });
        });
    }

    // Select customer from dropdown
    selectCustomer(name, id) {
        this.customerNameInput.value = name;
        this.customerNameInput.dataset.customerId = id;
        this.hideDropdown();
    }

    // Show dropdown
    showDropdown() {
        if (this.customerDropdown) {
            this.customerDropdown.classList.add('show');
        }
    }

    // Hide dropdown
    hideDropdown() {
        setTimeout(() => {
            if (this.customerDropdown) {
                this.customerDropdown.classList.remove('show');
            }
        }, 200);
    }

    // Handle form submission
    async handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const paymentType = formData.get('payment');
        const customerName = this.customerNameInput.value.trim();
        const customerId = this.customerNameInput.dataset.customerId;

        const quantity = parseInt(formData.get('quantity'));
        const price = parseFloat(formData.get('price'));
        const total = quantity * price;

        // Build the complete sale data object
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

        // Handle credit sales
        if (paymentType === 'credit') {
            if (!customerName) {
                ui.showAlert('Please enter customer name for credit sales', 'error');
                return;
            }

            saleData.customer_id = customerId;

            // Add new customer if needed
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

        // Save sale
        try {
            await storage.saveData('sales', saleData);
            ui.showAlert(`${paymentType === 'credit' ? 'Credit sale' : 'Sale'} saved successfully!`);
            this.form.reset();
            ui.setTodayDate();

            // Hide credit field
            document.getElementById('credit-customer-group').style.display = 'none';
            this.customerNameInput.required = false;

        } catch (error) {
            ui.showAlert('Error saving sale: ' + error.message, 'error');
        }
    }
}

// Create and export singleton instance
export const sales = new SalesManager();

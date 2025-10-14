import { storage } from './storage.js';
import { ui } from './ui.js';
import { firebaseDb, firestore, isFirebaseAvailable } from './firebase.js';

class WhatsAppNotifications {
    constructor() {
        this.customerContacts = {};
    }

    async initialize() {
        await this.loadCustomerContacts();
    }

    async loadCustomerContacts() {
        if (isFirebaseAvailable()) {
            try {
                const { collection, getDocs } = firestore;
                const snapshot = await getDocs(collection(firebaseDb, 'customer_contacts'));
                snapshot.forEach(doc => {
                    this.customerContacts[doc.id] = doc.data();
                });
            } catch (error) {
                console.error('Error loading contacts:', error);
                const stored = localStorage.getItem('customer_contacts');
                this.customerContacts = stored ? JSON.parse(stored) : {};
            }
        } else {
            const stored = localStorage.getItem('customer_contacts');
            this.customerContacts = stored ? JSON.parse(stored) : {};
        }
    }

    async saveCustomerContact(customerName, phoneNumber) {
        const contactData = {
            name: customerName,
            phone: phoneNumber,
            updated_at: new Date().toISOString()
        };

        this.customerContacts[customerName] = contactData;

        if (isFirebaseAvailable()) {
            try {
                const { doc, setDoc } = firestore;
                await setDoc(doc(firebaseDb, 'customer_contacts', customerName), contactData);
            } catch (error) {
                console.error('Error saving contact:', error);
            }
        }
        
        localStorage.setItem('customer_contacts', JSON.stringify(this.customerContacts));
    }

    getCustomerPhone(customerName) {
        return this.customerContacts[customerName]?.phone || null;
    }

    generateWhatsAppLink(phoneNumber, message) {
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : '+268' + cleanPhone;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
    }

    generatePaymentReminder(customerName, balance) {
        return `Hi ${customerName}, this is a friendly reminder about your outstanding balance of R${balance.toFixed(2)} at Inala Holdings. Please arrange payment at your earliest convenience. Thank you!`;
    }

    generateStockAnnouncement(productName, description = '') {
        return `🥩 Fresh ${productName} now available at Inala Holdings! ${description ? description + ' ' : ''}Contact us to place your order. Limited stock!`;
    }

    generateOrderConfirmation(customerName, items, total) {
        return `Hi ${customerName}, your order is confirmed! Items: ${items}. Total: R${total.toFixed(2)}. Thank you for your business!`;
    }

    showWhatsAppRemindersPanel() {
        const sales = storage.getSales();
        const payments = storage.getPayments();
        
        const creditSales = sales.filter(sale => sale.payment === 'credit');
        const customerDebts = {};
        
        creditSales.forEach(sale => {
            const name = sale.customer_name;
            if (!customerDebts[name]) {
                customerDebts[name] = { owed: 0, paid: 0 };
            }
            customerDebts[name].owed += sale.total;
        });

        payments.forEach(payment => {
            const name = payment.customer_name;
            if (customerDebts[name]) {
                customerDebts[name].paid += payment.amount;
            }
        });

        const customersWithDebt = Object.entries(customerDebts)
            .map(([name, data]) => ({
                name,
                balance: data.owed - data.paid,
                phone: this.getCustomerPhone(name)
            }))
            .filter(c => c.balance > 0)
            .sort((a, b) => b.balance - a.balance);

        this.renderWhatsAppPanel(customersWithDebt);
    }

    renderWhatsAppPanel(customers) {
        const panel = document.createElement('div');
        panel.className = 'content-card';
        panel.style.cssText = 'max-width: 1200px; margin: 0 auto;';

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div>
                    <h3 style="margin: 0;">📱 WhatsApp Payment Reminders</h3>
                    <p style="margin: 0.5rem 0 0 0; color: #6b7280; font-size: 0.875rem;">
                        Send payment reminders via WhatsApp with one click
                    </p>
                </div>
                <button onclick="window.app.whatsapp.showStockAnnouncementForm()" class="btn btn-primary">
                    📢 Stock Announcement
                </button>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: start; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">ℹ️</span>
                    <div style="font-size: 0.875rem;">
                        <strong>How it works:</strong> Click "Send Reminder" to open WhatsApp with a pre-filled message. 
                        Review and click Send in WhatsApp. Add missing phone numbers by clicking "Add Contact".
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 1rem; background: #f9fafb; border-radius: 8px;">
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Total Outstanding</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">
                        ${ui.formatCurrency(customers.reduce((sum, c) => sum + c.balance, 0))}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Customers with Debt</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">
                        ${customers.length}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280;">With Phone Numbers</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">
                        ${customers.filter(c => c.phone).length}
                    </div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f9fafb;">
                        <th style="padding: 0.75rem; text-align: left;">Customer</th>
                        <th style="padding: 0.75rem; text-align: left;">Phone</th>
                        <th style="padding: 0.75rem; text-align: right;">Balance</th>
                        <th style="padding: 0.75rem; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        customers.forEach((customer, index) => {
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            const hasPhone = customer.phone && customer.phone.length > 0;
            
            html += `
                <tr style="background: ${bgColor};">
                    <td style="padding: 0.75rem; font-weight: 600;">${customer.name}</td>
                    <td style="padding: 0.75rem;">
                        ${hasPhone 
                            ? `<span style="color: #10b981;">✓ ${customer.phone}</span>`
                            : `<span style="color: #ef4444;">No contact</span>`
                        }
                    </td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: #dc2626;">
                        ${ui.formatCurrency(customer.balance)}
                    </td>
                    <td style="padding: 0.75rem; text-align: center;">
                        <div style="display: flex; gap: 0.5rem; justify-content: center;">
                            ${hasPhone
                                ? `<a href="${this.generateWhatsAppLink(customer.phone, this.generatePaymentReminder(customer.name, customer.balance))}" 
                                     target="_blank" 
                                     class="btn btn-sm" 
                                     style="background: #25D366; color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.25rem;">
                                    📱 Send Reminder
                                   </a>`
                                : `<button onclick="window.app.whatsapp.showAddContactForm('${customer.name}')" 
                                           class="btn btn-sm btn-secondary" 
                                           style="padding: 0.5rem 1rem;">
                                    + Add Contact
                                   </button>`
                            }
                            ${hasPhone
                                ? `<button onclick="window.app.whatsapp.showAddContactForm('${customer.name}')" 
                                           class="btn btn-sm btn-outline" 
                                           style="padding: 0.5rem 0.75rem;">
                                    ✏️
                                   </button>`
                                : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>

            <div style="margin-top: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                <h4 style="margin: 0 0 0.5rem 0; color: #065f46;">💡 Tips for Effective Reminders</h4>
                <ul style="margin: 0; padding-left: 1.5rem; color: #047857; font-size: 0.875rem;">
                    <li>Send reminders in the morning (8-10 AM) for best response</li>
                    <li>Be polite and professional - customers appreciate courtesy</li>
                    <li>Follow up after 3-5 days if no response</li>
                    <li>Offer payment plans for large balances</li>
                </ul>
            </div>
        `;

        panel.innerHTML = html;
        
        const reportsDisplay = document.getElementById('reports-display');
        if (reportsDisplay) {
            reportsDisplay.innerHTML = '';
            reportsDisplay.appendChild(panel);
        }
    }

    showAddContactForm(customerName) {
        const existingPhone = this.getCustomerPhone(customerName);
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 400px; width: 90%;">
                <h3 style="margin: 0 0 1rem 0;">${existingPhone ? 'Update' : 'Add'} Contact for ${customerName}</h3>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Phone Number</label>
                    <input type="tel" 
                           id="customer-phone-input" 
                           placeholder="e.g., 78901234 or +26878901234"
                           value="${existingPhone || ''}"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                    <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                        Enter local number (78901234) or with country code (+26878901234)
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button onclick="this.closest('div[style*=fixed]').remove()" 
                            class="btn btn-secondary">
                        Cancel
                    </button>
                    <button onclick="window.app.whatsapp.saveContactAndClose('${customerName}')" 
                            class="btn btn-primary">
                        Save Contact
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('customer-phone-input').focus();
    }

    async saveContactAndClose(customerName) {
        const phoneInput = document.getElementById('customer-phone-input');
        const phone = phoneInput.value.trim();
        
        if (!phone) {
            ui.showAlert('Please enter a phone number', 'error');
            return;
        }

        const cleanPhone = phone.replace(/[^\d+]/g, '');
        if (cleanPhone.length < 8) {
            ui.showAlert('Please enter a valid phone number', 'error');
            return;
        }

        await this.saveCustomerContact(customerName, phone);
        ui.showAlert('Contact saved successfully!', 'success');
        
        document.querySelector('div[style*="position: fixed"]').remove();
        this.showWhatsAppRemindersPanel();
    }

    showStockAnnouncementForm() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
                <h3 style="margin: 0 0 1rem 0;">📢 Create Stock Announcement</h3>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Product Name</label>
                    <input type="text" 
                           id="stock-product-input" 
                           placeholder="e.g., Beef, Pork, Chicken"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Additional Details (Optional)</label>
                    <textarea id="stock-details-input" 
                              placeholder="e.g., Premium quality, Special price R50/kg"
                              rows="3"
                              style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
                </div>

                <div style="background: #f0fdf4; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: #065f46;">Preview:</div>
                    <div id="message-preview" style="color: #047857; font-size: 0.875rem; white-space: pre-wrap;">
                        🥩 Fresh [Product] now available at Inala Holdings! [Details] Contact us to place your order. Limited stock!
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button onclick="this.closest('div[style*=fixed]').remove()" 
                            class="btn btn-secondary">
                        Cancel
                    </button>
                    <button onclick="window.app.whatsapp.generateBulkAnnouncementLinks()" 
                            class="btn btn-primary">
                        Generate WhatsApp Links
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const productInput = document.getElementById('stock-product-input');
        const detailsInput = document.getElementById('stock-details-input');
        const preview = document.getElementById('message-preview');
        
        const updatePreview = () => {
            const product = productInput.value || '[Product]';
            const details = detailsInput.value;
            preview.textContent = this.generateStockAnnouncement(product, details);
        };
        
        productInput.addEventListener('input', updatePreview);
        detailsInput.addEventListener('input', updatePreview);
        productInput.focus();
    }

    generateBulkAnnouncementLinks() {
        const productInput = document.getElementById('stock-product-input');
        const detailsInput = document.getElementById('stock-details-input');
        
        const product = productInput.value.trim();
        if (!product) {
            ui.showAlert('Please enter a product name', 'error');
            return;
        }

        const message = this.generateStockAnnouncement(product, detailsInput.value.trim());
        
        const customersWithPhones = Object.entries(this.customerContacts)
            .filter(([name, data]) => data.phone)
            .map(([name, data]) => ({ name, phone: data.phone }));

        document.querySelector('div[style*="position: fixed"]').remove();
        this.showBulkAnnouncementLinks(customersWithPhones, message, product);
    }

    showBulkAnnouncementLinks(customers, message, product) {
        const panel = document.createElement('div');
        panel.className = 'content-card';
        panel.style.cssText = 'max-width: 1200px; margin: 0 auto;';

        let html = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0;">📢 Bulk Stock Announcement: ${product}</h3>
                <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                    Click each customer to send the announcement via WhatsApp
                </p>
            </div>

            <div style="background: #dbeafe; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #3b82f6;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Message to send:</div>
                <div style="font-size: 0.875rem; white-space: pre-wrap;">${message}</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        `;

        customers.forEach(customer => {
            const link = this.generateWhatsAppLink(customer.phone, message);
            html += `
                <a href="${link}" 
                   target="_blank" 
                   style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 8px; text-decoration: none; color: inherit; transition: all 0.2s;"
                   onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4'"
                   onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white'">
                    <div>
                        <div style="font-weight: 600; color: #374151;">${customer.name}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${customer.phone}</div>
                    </div>
                    <div style="background: #25D366; color: white; padding: 0.5rem; border-radius: 50%; font-size: 1.25rem;">
                        📱
                    </div>
                </a>
            `;
        });

        html += `
            </div>

            <div style="display: flex; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 8px;">
                <button onclick="window.app.whatsapp.showWhatsAppRemindersPanel()" class="btn btn-secondary">
                    ← Back to Reminders
                </button>
                <div style="flex: 1; text-align: center; color: #6b7280; font-size: 0.875rem; display: flex; align-items: center; justify-content: center;">
                    Sending to ${customers.length} customer(s)
                </div>
            </div>
        `;

        panel.innerHTML = html;
        
        const reportsDisplay = document.getElementById('reports-display');
        if (reportsDisplay) {
            reportsDisplay.innerHTML = '';
            reportsDisplay.appendChild(panel);
        }
    }
}

export const whatsapp = new WhatsAppNotifications();
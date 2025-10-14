import { storage } from './storage.js';
import { ui } from './ui.js';
import { authManager } from './auth.js';

class FollowUpManager {
    constructor() {
        this.followupDisplay = null;
    }

    initialize() {
        this.followupDisplay = document.getElementById('followup-display');
        if (this.followupDisplay) {
            this.loadFollowUps();
        }
    }

    async loadFollowUps() {
        await storage.loadAllData();
        this.renderFollowUpDashboard();
    }

    renderFollowUpDashboard() {
        const currentUser = authManager.getCurrentUser();
        const sales = storage.getSales();
        const payments = storage.getPayments();

        // Filter credit sales by current user
        const myCreditSales = sales.filter(sale => 
            sale.payment === 'credit' && 
            sale.created_by === currentUser.email
        );

        // Calculate customer balances
        const customerData = {};
        
        myCreditSales.forEach(sale => {
            const customerName = sale.customer_name;
            if (!customerData[customerName]) {
                customerData[customerName] = {
                    totalOwed: 0,
                    totalPaid: 0,
                    lastSaleDate: sale.date,
                    lastPaymentDate: null,
                    transactions: []
                };
            }
            customerData[customerName].totalOwed += sale.total;
            customerData[customerName].transactions.push(sale);
            if (sale.date > customerData[customerName].lastSaleDate) {
                customerData[customerName].lastSaleDate = sale.date;
            }
        });

        // Add payments
        payments.forEach(payment => {
            if (customerData[payment.customer_name]) {
                customerData[payment.customer_name].totalPaid += payment.amount;
                if (!customerData[payment.customer_name].lastPaymentDate || 
                    payment.date > customerData[payment.customer_name].lastPaymentDate) {
                    customerData[payment.customer_name].lastPaymentDate = payment.date;
                }
            }
        });

        // Separate customers by status
        const needsFollowUp = [];
        const upToDate = [];
        const today = new Date();

        Object.entries(customerData).forEach(([name, data]) => {
            const balance = data.totalOwed - data.totalPaid;
            const lastActivity = data.lastPaymentDate || data.lastSaleDate;
            const daysSinceActivity = Math.floor((today - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
            
            const customer = {
                name,
                balance,
                daysSinceActivity,
                lastActivity,
                ...data
            };

            if (balance > 0 && daysSinceActivity > 7) {
                needsFollowUp.push(customer);
            } else if (balance > 0) {
                upToDate.push(customer);
            }
        });

        needsFollowUp.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
        upToDate.sort((a, b) => b.balance - a.balance);

        let html = `
            <div style="margin-bottom: 2rem;">
                <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem;">My Follow-Ups</h2>
                <p style="color: #6b7280; font-size: 0.875rem;">Customers you added that need attention</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 1.5rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.875rem; opacity: 0.9;">Urgent Follow-ups</div>
                    <div style="font-size: 3rem; font-weight: 700;">${needsFollowUp.length}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">Customers >7 days</div>
                </div>
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 1.5rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.875rem; opacity: 0.9;">Active Customers</div>
                    <div style="font-size: 3rem; font-weight: 700;">${upToDate.length}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">Recent activity</div>
                </div>
                <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 1.5rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.875rem; opacity: 0.9;">Total Outstanding</div>
                    <div style="font-size: 3rem; font-weight: 700;">${ui.formatCurrency(needsFollowUp.concat(upToDate).reduce((sum, c) => sum + c.balance, 0))}</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">From your customers</div>
                </div>
            </div>

            ${this.renderUrgentFollowUps(needsFollowUp)}
            ${this.renderActiveCustomers(upToDate)}
        `;

        this.followupDisplay.innerHTML = html;
    }

    renderUrgentFollowUps(customers) {
        if (customers.length === 0) {
            return `
                <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 2rem; text-align: center; margin-bottom: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                    <h3 style="color: #15803d; margin: 0;">All Caught Up!</h3>
                    <p style="color: #166534; margin-top: 0.5rem;">No urgent follow-ups needed right now.</p>
                </div>
            `;
        }

        return `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h3 style="color: #dc2626; margin: 0 0 1rem 0; font-size: 1.25rem;">🚨 Urgent Follow-Ups (${customers.length})</h3>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${customers.map(customer => this.renderCustomerCard(customer, true)).join('')}
                </div>
            </div>
        `;
    }

    renderActiveCustomers(customers) {
        if (customers.length === 0) return '';

        return `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="color: #f59e0b; margin: 0 0 1rem 0; font-size: 1.25rem;">📋 Active Customers (${customers.length})</h3>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${customers.map(customer => this.renderCustomerCard(customer, false)).join('')}
                </div>
            </div>
        `;
    }

    renderCustomerCard(customer, isUrgent) {
        const urgencyColor = isUrgent ? '#fee2e2' : '#fef3c7';
        const urgencyBorder = isUrgent ? '#ef4444' : '#f59e0b';
        const urgencyBadge = customer.daysSinceActivity > 30 ? 
            `<span style="background: #dc2626; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">OVERDUE ${customer.daysSinceActivity} days</span>` :
            `<span style="background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">${customer.daysSinceActivity} days ago</span>`;

        return `
            <div style="background: ${urgencyColor}; border-left: 4px solid ${urgencyBorder}; border-radius: 8px; padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 1.125rem; color: #1f2937;">${customer.name}</h4>
                        <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                            Last activity: ${customer.lastActivity}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">${ui.formatCurrency(customer.balance)}</div>
                        ${urgencyBadge}
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="window.app.followups.callCustomer('${customer.name}')" 
                            style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem;">
                        📞 Call Now
                    </button>
                    <button onclick="window.app.followups.whatsappCustomer('${customer.name}')" 
                            style="background: #25D366; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem;">
                        💬 WhatsApp
                    </button>
                    <button onclick="window.app.followups.markContacted('${customer.name}')" 
                            style="background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem;">
                        ✓ Mark Contacted
                    </button>
                    <button onclick="window.app.creditors.recordPayment('${customer.name}')" 
                            style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem;">
                        💰 Record Payment
                    </button>
                </div>

                <details style="margin-top: 1rem;">
                    <summary style="cursor: pointer; color: #6b7280; font-size: 0.875rem;">View History (${customer.transactions.length} transactions)</summary>
                    <div style="margin-top: 0.75rem; font-size: 0.875rem;">
                        <div style="color: #374151;">
                            <strong>Total Credit Given:</strong> ${ui.formatCurrency(customer.totalOwed)}
                        </div>
                        <div style="color: #059669; margin-top: 0.25rem;">
                            <strong>Total Paid:</strong> ${ui.formatCurrency(customer.totalPaid)}
                        </div>
                    </div>
                </details>
            </div>
        `;
    }

    callCustomer(customerName) {
        ui.showAlert(`Opening phone dialer for ${customerName}...`, 'info');
        // In a real app, this would open the phone dialer
        // window.location.href = `tel:${customerPhone}`;
    }

    whatsappCustomer(customerName) {
        const message = encodeURIComponent(`Hi ${customerName}, this is a friendly reminder about your outstanding balance. Please let me know when you can make a payment. Thank you!`);
        ui.showAlert(`Opening WhatsApp for ${customerName}...`, 'info');
        // In a real app, this would open WhatsApp
        // window.open(`https://wa.me/${customerPhone}?text=${message}`, '_blank');
    }

    async markContacted(customerName) {
        // Save contact attempt to Firebase/localStorage
        const contactLog = {
            customer: customerName,
            contacted_by: authManager.getCurrentUser().email,
            contacted_at: new Date().toISOString(),
            type: 'follow_up'
        };

        // TODO: Save to database
        ui.showAlert(`Marked ${customerName} as contacted`, 'success');
        setTimeout(() => this.loadFollowUps(), 1000);
    }
}

export const followups = new FollowUpManager();
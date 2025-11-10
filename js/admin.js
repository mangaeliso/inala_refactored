// admin.js - Clean Email System with Auto Credit Alerts
console.log('📧 Loading Email Admin System...');

class EmailAdminSystem {
    constructor() {
        // Prevent duplicate initialization
        if (window.emailAdminInstance) {
            console.warn('⚠️ EmailAdminSystem already exists');
            return window.emailAdminInstance;
        }

        this.selectedReport = 'weekly-sales';
        this.selectedPeriod = 'this-week';
        this.emailRecipients = ['mangaliso.s@gmail.com'];
        
        this.emailjsConfig = {
            serviceID: 'inala.holdingz_butchery',
            templateID: 'template_hioixfm',
            publicKey: '8JZlr3oJZ3Q7BGEPI'
        };

        this.emailjsReady = false;
        this.autoAlertEnabled = true;
        this.creditThreshold = 5000;
        this.lastCreditCheck = 0;
        
        window.emailAdminInstance = this;
        this.init();
    }

    init() {
        console.log('⚙️ Initializing Email Admin System...');
        this.waitForEmailJS();
        this.setupEventListeners();
        this.loadAdminStats();
        this.loadAutoAlertSettings();
        console.log('✅ Email Admin System ready!');
    }

    waitForEmailJS() {
        const checkEmailJS = () => {
            if (typeof emailjs !== 'undefined') {
                this.emailjsReady = true;
                console.log('✅ EmailJS loaded and ready');
            } else {
                setTimeout(checkEmailJS, 500);
            }
        };
        checkEmailJS();
    }

    setupEventListeners() {
        // Test Email Button
        const testBtn = document.getElementById('admin-email-test-btn');
        if (testBtn) {
            testBtn.replaceWith(testBtn.cloneNode(true));
            const newTestBtn = document.getElementById('admin-email-test-btn');
            newTestBtn.addEventListener('click', () => this.testEmail());
        }

        // Report Selection
        document.querySelectorAll('.report-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                document.querySelectorAll('.report-option').forEach(o => o.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                this.selectedReport = e.currentTarget.dataset.report;
                this.updatePreview();
            });
        });

        // Period Selection
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                this.selectedPeriod = e.currentTarget.dataset.period;
                this.updatePreview();
            });
        });

        // Remove recipient
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-recipient')) {
                const item = e.target.closest('.recipient-item');
                const email = item.querySelector('span').textContent;
                this.emailRecipients = this.emailRecipients.filter(r => r !== email);
                item.remove();
                this.updateAutoAlertRecipients();
                this.showNotification('Email recipient removed', 'success');
            }
        });

        // Add recipient on Enter
        const emailInput = document.getElementById('new-email');
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addEmailRecipient();
                }
            });
        }

        // Auto alert checkbox
        const autoAlertCheckbox = document.getElementById('auto-credit-alert');
        if (autoAlertCheckbox) {
            autoAlertCheckbox.addEventListener('change', (e) => {
                this.autoAlertEnabled = e.target.checked;
                this.saveAutoAlertSettings();
                this.showNotification(
                    `Auto credit alerts ${this.autoAlertEnabled ? 'enabled' : 'disabled'}`,
                    'success'
                );
            });
        }

        console.log('✅ Event listeners connected');
    }

    async testEmail() {
        if (!navigator.onLine) {
            this.showNotification('❌ No internet connection', 'error');
            return;
        }

        if (!this.emailjsReady) {
            this.showNotification('⚠️ EmailJS not ready yet, please wait...', 'warning');
            return;
        }

        this.showNotification('🧪 Sending test email...', 'info');

        try {
            const params = {
                to_email: 'mangaliso.s@gmail.com',
                to_name: 'Mangaliso',
                from_name: 'INALA HOLDINGS',
                from_email: 'inala.holdingz@gmail.com',
                subject: '🧪 INALA HOLDINGS - Email Test',
                message: 'This is a test email from your business system. EmailJS is working correctly!',
                business_name: 'INALA HOLDINGS',
                report_type: 'System Test',
                period: 'Test Period',
                report_date: new Date().toLocaleDateString(),
                total_sales: 'R0.00',
                total_expenses: 'R0.00',
                net_profit: 'R0.00',
                transaction_count: '0',
                credit_sales_count: '0',
                outstanding_amount: 'R0.00'
            };

            await emailjs.send(
                this.emailjsConfig.serviceID,
                this.emailjsConfig.templateID,
                params
            );

            this.showNotification('✅ Test email sent successfully!', 'success');

        } catch (error) {
            console.error('Test email failed:', error);
            let errorMsg = 'Failed to send test email';
            
            if (error.text) {
                if (error.text.includes('offline')) {
                    errorMsg = 'No internet connection';
                } else if (error.text.includes('Template')) {
                    errorMsg = 'Email template configuration error';
                } else {
                    errorMsg = error.text;
                }
            }
            
            this.showNotification(`❌ ${errorMsg}`, 'error');
        }
    }

    addEmailRecipient() {
        const input = document.getElementById('new-email');
        if (!input) return;

        const email = input.value.trim();
        
        if (!email) {
            this.showNotification('Please enter an email address', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        if (this.emailRecipients.includes(email)) {
            this.showNotification('Email already added', 'warning');
            return;
        }

        this.emailRecipients.push(email);
        
        const container = document.getElementById('email-recipients');
        if (container) {
            const item = document.createElement('div');
            item.className = 'recipient-item';
            item.innerHTML = `
                <span>${email}</span>
                <div class="recipient-actions">
                    <button class="remove-recipient" data-type="email">&times;</button>
                </div>
            `;
            container.appendChild(item);
        }

        input.value = '';
        this.updateAutoAlertRecipients();
        this.showNotification('Email recipient added', 'success');
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async sendReport() {
        if (this.emailRecipients.length === 0) {
            this.showNotification('❌ No email recipients added', 'error');
            return;
        }

        if (!this.emailjsReady) {
            this.showNotification('⚠️ EmailJS not ready yet', 'warning');
            return;
        }

        this.showNotification(`📤 Sending report to ${this.emailRecipients.length} recipient(s)...`, 'info');

        try {
            const reportData = this.getReportData();
            let successCount = 0;

            for (const email of this.emailRecipients) {
                try {
                    const params = {
                        to_email: email,
                        to_name: email.split('@')[0],
                        from_name: 'INALA HOLDINGS',
                        from_email: 'inala.holdingz@gmail.com',
                        subject: `INALA HOLDINGS - ${reportData.title}`,
                        message: reportData.message,
                        business_name: 'INALA HOLDINGS',
                        report_type: reportData.title,
                        period: reportData.period,
                        report_date: new Date().toLocaleDateString(),
                        total_sales: reportData.stats[0]?.value || 'R0.00',
                        total_expenses: reportData.stats[1]?.value || 'R0.00',
                        net_profit: reportData.stats[2]?.value || 'R0.00',
                        transaction_count: reportData.stats[3]?.value || '0',
                        credit_sales_count: '0',
                        outstanding_amount: 'R0.00'
                    };

                    await emailjs.send(
                        this.emailjsConfig.serviceID,
                        this.emailjsConfig.templateID,
                        params
                    );

                    successCount++;
                    console.log(`✅ Sent to ${email}`);

                } catch (error) {
                    console.error(`Failed to send to ${email}:`, error);
                }
            }

            if (successCount === this.emailRecipients.length) {
                this.showNotification(`✅ Report sent to all ${successCount} recipients!`, 'success');
            } else if (successCount > 0) {
                this.showNotification(`⚠️ Report sent to ${successCount} of ${this.emailRecipients.length} recipients`, 'warning');
            } else {
                this.showNotification('❌ Failed to send report', 'error');
            }

        } catch (error) {
            console.error('Send report error:', error);
            this.showNotification('❌ Failed to send report', 'error');
        }
    }

    async checkCreditThreshold(totalOutstanding) {
        if (!this.autoAlertEnabled) return;
        if (totalOutstanding < this.creditThreshold) return;
        if (totalOutstanding === this.lastCreditCheck) return;

        console.log(`🔔 Credit threshold exceeded: R${totalOutstanding}`);
        this.lastCreditCheck = totalOutstanding;

        await this.sendCreditAlert(totalOutstanding);
    }

    async sendCreditAlert(amount) {
        if (!this.emailjsReady || this.emailRecipients.length === 0) return;

        console.log('🚨 Sending credit alert emails...');

        try {
            for (const email of this.emailRecipients) {
                const params = {
                    to_email: email,
                    to_name: email.split('@')[0],
                    from_name: 'INALA HOLDINGS',
                    from_email: 'inala.holdingz@gmail.com',
                    subject: '🚨 INALA HOLDINGS - Credit Alert',
                    message: `ALERT: Total outstanding credit has exceeded R${this.creditThreshold.toFixed(2)}`,
                    business_name: 'INALA HOLDINGS',
                    report_type: 'Credit Alert',
                    period: 'Current',
                    report_date: new Date().toLocaleDateString(),
                    total_sales: 'N/A',
                    total_expenses: 'N/A',
                    net_profit: 'N/A',
                    transaction_count: 'N/A',
                    credit_sales_count: 'N/A',
                    outstanding_amount: `R${amount.toFixed(2)}`
                };

                await emailjs.send(
                    this.emailjsConfig.serviceID,
                    this.emailjsConfig.templateID,
                    params
                );

                console.log(`✅ Credit alert sent to ${email}`);
            }

            this.showNotification('🚨 Credit alert emails sent!', 'warning');

        } catch (error) {
            console.error('Credit alert failed:', error);
        }
    }

    getReportData() {
        const reports = {
            'weekly-sales': {
                title: 'Weekly Sales Report',
                period: this.getPeriodText(),
                message: 'Your weekly sales performance report with detailed breakdown.',
                stats: [
                    { value: 'R15,230', label: 'Total Sales', detail: '+12% from last week', trend: 'positive' },
                    { value: 'R8,450', label: 'Expenses', detail: 'Within budget', trend: '' },
                    { value: 'R6,780', label: 'Net Profit', detail: '45% margin', trend: 'positive' },
                    { value: '23', label: 'Transactions', detail: '5 credit sales', trend: '' }
                ]
            },
            'monthly-expenses': {
                title: 'Monthly Expenses Report',
                period: this.getPeriodText(),
                message: 'Your monthly expense breakdown and analysis.',
                stats: [
                    { value: 'R49,279', label: 'Total Expenses', detail: '119.2% of revenue', trend: 'negative' },
                    { value: 'R8,200', label: 'Butchery', detail: '16.6% of total', trend: '' },
                    { value: 'R5,100', label: 'Perfumes', detail: '10.3% of total', trend: '' },
                    { value: 'R35,979', label: 'Consumables', detail: '73.1% of total', trend: '' }
                ]
            },
            'credit-status': {
                title: 'Credit Status Report',
                period: this.getPeriodText(),
                message: 'Current credit and outstanding payments overview.',
                stats: [
                    { value: 'R40,990', label: 'Credit Sales', detail: '95 pending sales', trend: '' },
                    { value: '15', label: 'Active Debtors', detail: '3 overdue', trend: 'negative' },
                    { value: 'R12,450', label: 'Total Owed', detail: 'R8,210 collectible', trend: '' },
                    { value: '76', label: 'Payments', detail: 'This period', trend: '' }
                ]
            },
            'profit-loss': {
                title: 'Profit & Loss Statement',
                period: this.getPeriodText(),
                message: 'Complete financial statement and performance analysis.',
                stats: [
                    { value: 'R41,340', label: 'Total Revenue', detail: 'All income sources', trend: '' },
                    { value: 'R49,279', label: 'Total Expenses', detail: '119.2% of revenue', trend: 'negative' },
                    { value: '-R7,939', label: 'Net Loss', detail: '-19.2% margin', trend: 'negative' },
                    { value: '52', label: 'Customers', detail: 'This period', trend: '' }
                ]
            }
        };

        return reports[this.selectedReport] || reports['weekly-sales'];
    }

    getPeriodText() {
        const periods = {
            'this-week': 'This Week',
            'last-week': 'Last Week',
            'this-month': 'This Month',
            'last-month': 'Last Month'
        };
        return periods[this.selectedPeriod] || 'Current Period';
    }

    updatePreview() {
        const preview = document.querySelector('.preview-content');
        if (!preview) return;

        const data = this.getReportData();
        
        preview.innerHTML = `
            <strong>${data.title}</strong><br>
            Period: ${data.period}<br><br>
            
            <div class="quick-stats">
                ${data.stats.map(stat => `
                    <div class="quick-stat">
                        <div class="stat-figure ${stat.trend}">${stat.value}</div>
                        <div class="stat-label">${stat.label}</div>
                        <div class="stat-detail">${stat.detail}</div>
                    </div>
                `).join('')}
            </div>
            
            <br>
            <em>Full report with detailed breakdown will be included.</em>
        `;
    }

    loadAdminStats() {
        const stats = {
            totalSales: 96,
            totalExpenses: 19,
            totalPayments: 76,
            totalCustomers: 3
        };

        const elements = {
            'admin-total-sales': stats.totalSales,
            'admin-total-expenses': stats.totalExpenses,
            'admin-total-payments': stats.totalPayments,
            'admin-total-customers': stats.totalCustomers
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    loadAutoAlertSettings() {
        const saved = localStorage.getItem('autoAlertSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.autoAlertEnabled = settings.enabled;
            this.creditThreshold = settings.threshold || 5000;
            
            const checkbox = document.getElementById('auto-credit-alert');
            if (checkbox) checkbox.checked = this.autoAlertEnabled;
        }
    }

    saveAutoAlertSettings() {
        const settings = {
            enabled: this.autoAlertEnabled,
            threshold: this.creditThreshold
        };
        localStorage.setItem('autoAlertSettings', JSON.stringify(settings));
    }

    updateAutoAlertRecipients() {
        const recipientsEl = document.getElementById('auto-alert-recipients');
        if (recipientsEl) {
            recipientsEl.textContent = this.emailRecipients.join(', ');
        }
    }

    showNotification(message, type = 'info') {
        document.querySelectorAll('.admin-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentNode.remove()">&times;</button>
        `;

        if (!document.querySelector('#admin-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'admin-notification-styles';
            styles.textContent = `
                .admin-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 10000;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    animation: slideIn 0.3s ease;
                    font-size: 14px;
                    font-weight: 500;
                }
                .admin-notification.success { background: linear-gradient(135deg, #10b981, #059669); }
                .admin-notification.error { background: linear-gradient(135deg, #ef4444, #dc2626); }
                .admin-notification.warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
                .admin-notification.info { background: linear-gradient(135deg, #3b82f6, #2563eb); }
                .admin-notification button {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .admin-notification button:hover {
                    background: rgba(255,255,255,0.3);
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize
const emailAdmin = new EmailAdminSystem();
window.emailAdmin = emailAdmin;

// Global functions for HTML onclick
window.addEmailRecipient = () => emailAdmin.addEmailRecipient();
window.sendReport = () => emailAdmin.sendReport();

// Monitor credit levels (call this from your creditors system)
window.monitorCreditLevels = (totalOutstanding) => {
    emailAdmin.checkCreditThreshold(totalOutstanding);
};

export const adminPanel = emailAdmin;

console.log('✅ Email Admin System loaded!');
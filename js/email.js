// email.js - Corrected Email Service with Proper Exports
class EmailService {
    constructor() {
        // 🔧 CORRECT CREDENTIALS (Verified from your dashboard)
        this.emailjsConfig = {
            serviceID: 'inala.holdingz_butchery',    // ✅ Correct Service ID
            templateID: 'template_hioixfm',         // ✅ Your Template ID  
            publicKey: '8JZlr3oJZ3Q7BGEPI'         // ✅ Your Public Key
        };
        
        this.initialized = false;
        this.demoMode = false; // Ready for real emails!
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Initializing EmailJS with verified credentials...');
            
            // Load EmailJS library
            if (typeof emailjs === 'undefined') {
                await this.loadEmailJS();
            }
            
            // Initialize with your public key
            emailjs.init(this.emailjsConfig.publicKey);
            this.initialized = true;
            this.demoMode = false;
            
            console.log('✅ EmailJS Initialized Successfully!');
            console.log('📧 Service:', this.emailjsConfig.serviceID);
            console.log('📋 Template:', this.emailjsConfig.templateID);
            
        } catch (error) {
            console.error('❌ EmailJS Initialization Failed:', error);
            this.demoMode = true;
        }
    }

    loadEmailJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load EmailJS'));
            document.head.appendChild(script);
        });
    }

    isConfigured() {
        return this.initialized && !this.demoMode;
    }

    isDemoMode() {
        return this.demoMode;
    }

    // Test email configuration
    async testConfiguration() {
        console.group('🧪 TESTING EMAILJS CONFIGURATION');
        
        if (!this.isConfigured()) {
            const result = {
                success: false,
                message: '❌ EmailJS not properly configured',
                configured: false
            };
            console.groupEnd();
            return result;
        }

        try {
            console.log('📤 Sending test email to mangaliso.s@gmail.com...');
            
            const testParams = {
                to_email: 'mangaliso.s@gmail.com',
                to_name: 'Mangaliso',
                from_name: 'INALA HOLDINGS',
                from_email: 'inala.holdingz@gmail.com',
                subject: 'INALA HOLDINGS - EmailJS Test',
                message: 'This is a test email from your INALA HOLDINGS business system. If you receive this, EmailJS is working correctly!',
                business_name: 'INALA HOLDINGS',
                report_type: 'Configuration Test',
                date: new Date().toLocaleDateString()
            };

            const result = await emailjs.send(
                this.emailjsConfig.serviceID,
                this.emailjsConfig.templateID,
                testParams
            );

            const successResult = {
                success: true,
                message: '✅ EmailJS Working Perfectly! Test email sent to mangaliso.s@gmail.com',
                configured: true,
                result: result
            };
            
            console.log('🎉 Test Successful:', successResult);
            console.groupEnd();
            return successResult;

        } catch (error) {
            console.error('💥 Test Failed:', error);
            
            let userMessage = `❌ Email Error: ${error.text || error.message}`;
            
            if (error.text?.includes('Template ID not found')) {
                userMessage += '\n\n🔧 Issue: Template ID might be incorrect. Check your Email Templates.';
            } else if (error.status === 400) {
                userMessage += '\n\n🔧 Issue: Template variables might not match. Check your template setup.';
            }
            
            const errorResult = {
                success: false,
                message: userMessage,
                configured: false,
                error: error
            };
            
            console.log('Test Result:', errorResult);
            console.groupEnd();
            return errorResult;
        }
    }

    // Send sales receipt
    async sendSalesReceipt(saleData, recipientEmail) {
        console.log('📧 Sending receipt to:', recipientEmail);
        
        if (!this.isConfigured()) {
            await this.simulateDelay();
            return { 
                success: true, 
                message: `📨 [DEMO] Receipt would be sent to: ${recipientEmail}`,
                demo: true
            };
        }

        try {
            const templateParams = {
                to_email: recipientEmail,
                to_name: saleData.customerName || 'Customer',
                from_name: 'INALA HOLDINGS',
                from_email: 'inala.holdingz@gmail.com',
                subject: `INALA HOLDINGS - Receipt for ${saleData.product}`,
                customer_name: saleData.customerName || 'Valued Customer',
                sale_date: new Date(saleData.date).toLocaleDateString(),
                product_name: saleData.product || 'Product',
                quantity: saleData.quantity || 1,
                unit_price: this.formatCurrency(saleData.price || 0),
                total_amount: this.formatCurrency(saleData.totalAmount || 0),
                payment_method: saleData.paymentType || 'Cash',
                business_name: 'INALA HOLDINGS'
            };

            const result = await emailjs.send(
                this.emailjsConfig.serviceID,
                this.emailjsConfig.templateID,
                templateParams
            );

            return { 
                success: true, 
                message: `✅ Receipt sent to ${recipientEmail}`
            };

        } catch (error) {
            console.error('Receipt email failed:', error);
            throw new Error(`Failed to send receipt: ${error.text || error.message}`);
        }
    }

    // Send business report
    async sendCustomReport(reportType, reportData, recipientEmail) {
        console.log('📊 Sending report to:', recipientEmail);
        
        if (!this.isConfigured()) {
            await this.simulateDelay();
            return { 
                success: true, 
                message: `📨 [DEMO] ${reportType} report would be sent to: ${recipientEmail}`,
                demo: true
            };
        }

        try {
            const templateParams = {
                to_email: recipientEmail,
                to_name: 'Recipient',
                from_name: 'INALA HOLDINGS',
                from_email: 'inala.holdingz@gmail.com',
                subject: `INALA HOLDINGS - ${this.formatReportType(reportType)}`,
                report_type: this.formatReportType(reportType),
                period: reportData.period || 'Current Period',
                report_date: new Date().toLocaleDateString(),
                total_sales: this.formatCurrency(reportData.totalSales || 0),
                total_expenses: this.formatCurrency(reportData.totalExpenses || 0),
                net_profit: this.formatCurrency(reportData.netProfit || 0),
                transaction_count: reportData.transactions || 0,
                credit_sales_count: reportData.creditSales || 0,
                outstanding_amount: this.formatCurrency(reportData.outstanding || 0),
                business_name: 'INALA HOLDINGS'
            };

            const result = await emailjs.send(
                this.emailjsConfig.serviceID,
                this.emailjsConfig.templateID,
                templateParams
            );

            return { 
                success: true, 
                message: `✅ ${reportType} report sent to ${recipientEmail}`
            };

        } catch (error) {
            console.error('Report email failed:', error);
            throw new Error(`Failed to send report: ${error.text || error.message}`);
        }
    }

    // Helper methods
    formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return 'R' + num.toFixed(2);
    }

    formatReportType(type) {
        const types = {
            'weekly-sales': 'Weekly Sales Report',
            'monthly-expenses': 'Monthly Expenses Report', 
            'credit-status': 'Credit Status Report',
            'profit-loss': 'Profit & Loss Statement'
        };
        return types[type] || type;
    }

    simulateDelay() {
        return new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Get configuration status
    getConfigStatus() {
        return {
            configured: this.isConfigured(),
            serviceID: this.emailjsConfig.serviceID,
            templateID: this.emailjsConfig.templateID,
            publicKey: '✓ Set',
            status: this.isConfigured() ? '✅ Ready' : '❌ Not Ready'
        };
    }
}

// ✅ FIXED: Create and export the instance properly
const emailService = new EmailService();

// Export as named export
export { emailService };

// Also export the class if needed elsewhere
export default EmailService;

console.log('📧 EmailService Status:', emailService.getConfigStatus());
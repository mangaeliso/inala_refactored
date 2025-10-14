import { ui } from './ui.js';

export class PersonalBudgetUI {
    constructor(manager) {
        this.manager = manager;
    }

    renderBudgetDashboard() {
        const { totalIncome, totalExpenses, totalSavings, netAmount } = this.manager.calculateTotals();
        
        const container = document.createElement('div');
        
        // Header
        const header = this.createHeader();
        
        // Metrics
        const metrics = this.createMetrics(totalIncome, totalExpenses, totalSavings, netAmount);
        
        // AI Chat
        const aiChat = this.createAIChatSection();
        
        container.appendChild(header);
        container.appendChild(metrics);
        container.appendChild(aiChat);
        
        this.manager.budgetDisplay.innerHTML = '';
        this.manager.budgetDisplay.appendChild(container);
    }

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 1.5rem;';
        header.innerHTML = '<h2 style="margin: 0;">My Personal Budget</h2>';
        
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 0.5rem;';
        
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary';
        prevBtn.textContent = '←';
        prevBtn.onclick = () => this.manager.previousMonth();
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = '→';
        nextBtn.onclick = () => this.manager.nextMonth();
        
        const setupBtn = document.createElement('button');
        setupBtn.className = 'btn btn-primary';
        setupBtn.textContent = 'Setup';
        setupBtn.onclick = () => this.manager.setupBudget();
        
        btnGroup.appendChild(prevBtn);
        btnGroup.appendChild(nextBtn);
        btnGroup.appendChild(setupBtn);
        header.appendChild(btnGroup);
        
        return header;
    }

    createMetrics(income, expenses, savings, balance) {
        const metrics = document.createElement('div');
        metrics.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;';
        metrics.innerHTML = this.createMetricsHTML(income, expenses, savings, balance);
        return metrics;
    }

    createMetricsHTML(income, expenses, savings, balance) {
        const balanceColor = balance >= 0 ? '#10b981' : '#f59e0b';
        return '<div style="background: #10b981; color: white; padding: 1rem; border-radius: 8px; text-align: center;"><div style="font-size: 0.75rem;">Income</div><div style="font-size: 1.5rem; font-weight: 700;">' + ui.formatCurrency(income) + '</div></div>' +
               '<div style="background: #ef4444; color: white; padding: 1rem; border-radius: 8px; text-align: center;"><div style="font-size: 0.75rem;">Expenses</div><div style="font-size: 1.5rem; font-weight: 700;">' + ui.formatCurrency(expenses) + '</div></div>' +
               '<div style="background: #3b82f6; color: white; padding: 1rem; border-radius: 8px; text-align: center;"><div style="font-size: 0.75rem;">Savings</div><div style="font-size: 1.5rem; font-weight: 700;">' + ui.formatCurrency(savings) + '</div></div>' +
               '<div style="background: ' + balanceColor + '; color: white; padding: 1rem; border-radius: 8px; text-align: center;"><div style="font-size: 0.75rem;">Balance</div><div style="font-size: 1.5rem; font-weight: 700;">' + ui.formatCurrency(balance) + '</div></div>';
    }

    createAIChatSection() {
        const chatDiv = document.createElement('div');
        chatDiv.style.cssText = 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem;';
        
        const chatHeader = document.createElement('div');
        chatHeader.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;';
        chatHeader.innerHTML = '<span style="font-size: 1.5rem;">🤖</span><h3 style="margin: 0; font-size: 1.125rem;">AI Financial Assistant</h3>';
        
        const messagesDiv = document.createElement('div');
        messagesDiv.id = 'ai-chat-messages';
        messagesDiv.style.cssText = 'background: rgba(255,255,255,0.1); border-radius: 6px; padding: 1rem; margin-bottom: 1rem; max-height: 200px; overflow-y: auto; min-height: 80px;';
        messagesDiv.innerHTML = '<div style="font-size: 0.9rem; opacity: 0.95;">Hi! Ask me about your budget, savings, or how to improve your finances.</div>';
        
        const inputDiv = this.createInputSection();
        const quickBtns = this.createQuickButtons();
        
        chatDiv.appendChild(chatHeader);
        chatDiv.appendChild(messagesDiv);
        chatDiv.appendChild(inputDiv);
        chatDiv.appendChild(quickBtns);
        
        return chatDiv;
    }

    createInputSection() {
        const inputDiv = document.createElement('div');
        inputDiv.style.cssText = 'display: flex; gap: 0.5rem;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'ai-chat-input';
        input.placeholder = 'Ask me anything...';
        input.style.cssText = 'flex: 1; padding: 0.75rem; border: none; border-radius: 6px;';
        input.onkeypress = (e) => { if(e.key === 'Enter') this.manager.ai.sendMessage(); };
        
        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send';
        sendBtn.style.cssText = 'background: white; color: #667eea; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 600; cursor: pointer;';
        sendBtn.onclick = () => this.manager.ai.sendMessage();
        
        inputDiv.appendChild(input);
        inputDiv.appendChild(sendBtn);
        
        return inputDiv;
    }

    createQuickButtons() {
        const btnsDiv = document.createElement('div');
        btnsDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;';
        
        const questions = ['How can I save more?', 'Where am I overspending?', 'How do I make more money?'];
        questions.forEach(q => {
            const btn = document.createElement('button');
            btn.textContent = q;
            btn.style.cssText = 'background: rgba(255,255,255,0.2); border: none; padding: 0.5rem 0.75rem; border-radius: 6px; color: white; font-size: 0.8rem; cursor: pointer;';
            btn.onclick = () => this.manager.ai.quickQuestion(q);
            btnsDiv.appendChild(btn);
        });
        
        return btnsDiv;
    }
}
export class PersonalBudgetAI {
    constructor(manager) {
        this.manager = manager;
    }

    quickQuestion(question) {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = question;
            this.sendMessage();
        }
    }

    sendMessage() {
        const input = document.getElementById('ai-chat-input');
        const messagesDiv = document.getElementById('ai-chat-messages');
        
        if (!input || !messagesDiv || !input.value.trim()) return;

        const userMessage = input.value.trim();
        input.value = '';

        this.displayUserMessage(messagesDiv, userMessage);
        
        setTimeout(() => {
            this.displayAIResponse(messagesDiv, userMessage);
        }, 500);
    }

    displayUserMessage(messagesDiv, message) {
        const userMsgDiv = document.createElement('div');
        userMsgDiv.style.cssText = 'background: rgba(255,255,255,0.3); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; text-align: right;';
        userMsgDiv.textContent = message;
        messagesDiv.appendChild(userMsgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    displayAIResponse(messagesDiv, question) {
        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.style.cssText = 'background: rgba(255,255,255,0.2); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; line-height: 1.5;';
        aiMsgDiv.innerHTML = this.generateResponse(question);
        messagesDiv.appendChild(aiMsgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    generateResponse(question) {
        const q = question.toLowerCase();
        const { totalIncome, totalExpenses, totalSavings, savingsRate } = this.manager.calculateTotals();

        if (q.includes('save') || q.includes('saving')) {
            return this.getSavingsAdvice(savingsRate, totalIncome);
        }

        if (q.includes('overspend') || q.includes('spending') || q.includes('expense')) {
            return this.getSpendingAdvice();
        }

        if (q.includes('income') || q.includes('money') || q.includes('earn')) {
            return this.getIncomeAdvice(totalIncome);
        }

        if (q.includes('budget') || q.includes('balance')) {
            return this.getBudgetAdvice(totalIncome, totalExpenses, totalSavings);
        }

        return this.getDefaultResponse(totalIncome, totalExpenses, savingsRate);
    }

    getSavingsAdvice(savingsRate, totalIncome) {
        if (savingsRate < 10) {
            const targetSavings = (totalIncome * 0.2).toFixed(0);
            return `You are saving ${savingsRate}% of your income. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings. Target saving R${targetSavings} per month.`;
        }
        return `Great job! You are saving ${savingsRate}%. To save even more: 1) Increase by 1% each month, 2) Try no-spend weekends, 3) Cancel unused subscriptions.`;
    }

    getSpendingAdvice() {
        const allExpenses = {...this.manager.budgetData.fixedExpenses, ...this.manager.budgetData.variableExpenses};
        const topExpenses = Object.entries(allExpenses)
            .sort((a, b) => b[1] - a[1])
            .filter(e => e[1] > 0)
            .slice(0, 3);
        
        if (topExpenses.length === 0) {
            return 'No expenses tracked yet. Start by adding your monthly expenses in the Setup section.';
        }
        
        const expenseText = topExpenses.map(e => `${e[0]}: R${e[1]}`).join(', ');
        return `Your top expenses are: ${expenseText}. Tips: 1) Meal prep to cut groceries, 2) Pack lunch 3x/week (save R600/month), 3) Cancel unused subscriptions.`;
    }

    getIncomeAdvice(totalIncome) {
        return `Ways to boost your R${totalIncome} income: 1) Freelance on Fiverr/Upwork (R2000-5000/month), 2) Sell unused items online, 3) Offer tutoring (R500-1000/hour), 4) Weekend side hustle. Start with ONE and commit 5 hours/week.`;
    }

    getBudgetAdvice(totalIncome, totalExpenses, totalSavings) {
        const net = totalIncome - totalExpenses - totalSavings;
        
        if (net < 0) {
            const cutAmount = (Math.abs(net) / 2).toFixed(0);
            return `You have a R${Math.abs(net).toFixed(0)} deficit. Action plan: 1) Cut R${cutAmount} from dining/entertainment, 2) Cancel 1-2 subscriptions this week, 3) Find one income boost, 4) Track every expense for 2 weeks.`;
        }
        
        return `Your budget is balanced with R${net.toFixed(0)} surplus! Move 50% to emergency fund, invest 30% in skills, save 20% for goals.`;
    }

    getDefaultResponse(totalIncome, totalExpenses, savingsRate) {
        return `I can help with: "How can I save more?", "Where am I overspending?", "How do I make more money?", "What about my budget?". Your stats: R${totalIncome} income, R${totalExpenses} expenses, ${savingsRate}% savings rate.`;
    }
}
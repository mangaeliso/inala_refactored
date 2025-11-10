// audit.js - Complete Audit Logging System for Inala Holdings
// This tracks WHO did WHAT and WHEN

class AuditLogger {
  constructor() {
    this.db = null;
    this.currentUser = null;
    this.enabled = true;
  }

  async initialize(firebaseDb, authInstance) {
    try {
      this.db = firebaseDb;
      
      // Get current user from auth
      if (authInstance && authInstance.currentUser) {
        this.currentUser = {
          email: authInstance.currentUser.email,
          uid: authInstance.currentUser.uid,
          displayName: authInstance.currentUser.displayName || authInstance.currentUser.email
        };
      }
      
      console.log('✅ Audit Logger initialized for user:', this.currentUser?.email || 'Unknown');
      return true;
    } catch (error) {
      console.error('❌ Audit Logger initialization failed:', error);
      return false;
    }
  }

  setCurrentUser(user) {
    if (user) {
      this.currentUser = {
        email: user.email,
        uid: user.uid,
        displayName: user.displayName || user.email
      };
      console.log('👤 Audit user set:', this.currentUser.email);
    }
  }

  async logAction(action, entityType, entityId, data = {}, oldData = null) {
    if (!this.enabled || !this.db) return;

    try {
      const auditEntry = {
        action: action, // 'create', 'update', 'delete'
        entityType: entityType, // 'sale', 'payment', 'expense'
        entityId: entityId,
        timestamp: new Date().toISOString(),
        timestampMillis: Date.now(),
        user: this.currentUser || { email: 'unknown', uid: 'unknown', displayName: 'Unknown User' },
        data: data,
        oldData: oldData,
        changes: this.getChanges(oldData, data),
        ipAddress: null, // Could be added if needed
        userAgent: navigator.userAgent
      };

      // Save to Firebase
      await this.db.collection('audit_logs').add(auditEntry);
      
      console.log(`📝 Audit logged: ${action} ${entityType} by ${this.currentUser?.email || 'unknown'}`);
      
      return auditEntry;
    } catch (error) {
      console.error('❌ Failed to log audit:', error);
      return null;
    }
  }

  getChanges(oldData, newData) {
    if (!oldData || !newData) return null;
    
    const changes = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }
    
    return Object.keys(changes).length > 0 ? changes : null;
  }

  // Convenience methods
  async logSaleCreated(saleId, saleData) {
    return this.logAction('create', 'sale', saleId, saleData);
  }

  async logSaleUpdated(saleId, newData, oldData) {
    return this.logAction('update', 'sale', saleId, newData, oldData);
  }

  async logSaleDeleted(saleId, oldData) {
    return this.logAction('delete', 'sale', saleId, null, oldData);
  }

  async logPaymentCreated(paymentId, paymentData) {
    return this.logAction('create', 'payment', paymentId, paymentData);
  }

  async logPaymentUpdated(paymentId, newData, oldData) {
    return this.logAction('update', 'payment', paymentId, newData, oldData);
  }

  async logPaymentDeleted(paymentId, oldData) {
    return this.logAction('delete', 'payment', paymentId, null, oldData);
  }

  async logExpenseCreated(expenseId, expenseData) {
    return this.logAction('create', 'expense', expenseId, expenseData);
  }

  async logExpenseUpdated(expenseId, newData, oldData) {
    return this.logAction('update', 'expense', expenseId, newData, oldData);
  }

  async logExpenseDeleted(expenseId, oldData) {
    return this.logAction('delete', 'expense', expenseId, null, oldData);
  }

  // Query audit logs
  async getRecentLogs(limit = 50) {
    if (!this.db) return [];
    
    try {
      const snapshot = await this.db.collection('audit_logs')
        .orderBy('timestampMillis', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Failed to fetch audit logs:', error);
      return [];
    }
  }

  async getLogsByUser(userEmail, limit = 50) {
    if (!this.db) return [];
    
    try {
      const snapshot = await this.db.collection('audit_logs')
        .where('user.email', '==', userEmail)
        .orderBy('timestampMillis', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Failed to fetch user logs:', error);
      return [];
    }
  }

  async getLogsByEntity(entityType, entityId) {
    if (!this.db) return [];
    
    try {
      const snapshot = await this.db.collection('audit_logs')
        .where('entityType', '==', entityType)
        .where('entityId', '==', entityId)
        .orderBy('timestampMillis', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Failed to fetch entity logs:', error);
      return [];
    }
  }

  async getLogsByDateRange(startDate, endDate) {
    if (!this.db) return [];
    
    try {
      const startMillis = new Date(startDate).getTime();
      const endMillis = new Date(endDate).getTime();
      
      const snapshot = await this.db.collection('audit_logs')
        .where('timestampMillis', '>=', startMillis)
        .where('timestampMillis', '<=', endMillis)
        .orderBy('timestampMillis', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Failed to fetch logs by date range:', error);
      return [];
    }
  }

  // Generate audit report
  async generateReport(options = {}) {
    const {
      startDate = null,
      endDate = null,
      userEmail = null,
      entityType = null,
      action = null,
      limit = 100
    } = options;

    let query = this.db.collection('audit_logs');

    if (startDate && endDate) {
      const startMillis = new Date(startDate).getTime();
      const endMillis = new Date(endDate).getTime();
      query = query.where('timestampMillis', '>=', startMillis)
                   .where('timestampMillis', '<=', endMillis);
    }

    if (userEmail) {
      query = query.where('user.email', '==', userEmail);
    }

    if (entityType) {
      query = query.where('entityType', '==', entityType);
    }

    if (action) {
      query = query.where('action', '==', action);
    }

    try {
      query = query.orderBy('timestampMillis', 'desc').limit(limit);
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
      return [];
    }
  }

  // Format log for display
  formatLog(log) {
    const date = new Date(log.timestamp).toLocaleString();
    const user = log.user.displayName || log.user.email;
    const action = log.action.toUpperCase();
    const entity = `${log.entityType}:${log.entityId}`;
    
    return `[${date}] ${user} ${action} ${entity}`;
  }

  // Export logs to CSV
  async exportToCSV(logs) {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Changes'];
    const rows = logs.map(log => [
      log.timestamp,
      log.user.email,
      log.action,
      log.entityType,
      log.entityId,
      JSON.stringify(log.changes || {})
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}

// Create singleton instance
export const auditLogger = new AuditLogger();

// Make it globally available for console access
if (typeof window !== 'undefined') {
  window.auditLogger = auditLogger;
}
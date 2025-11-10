// audit-viewer.js - UI for viewing audit logs

import { auditLogger } from './audit.js';

class AuditViewer {
  constructor() {
    this.container = null;
    this.logs = [];
    this.filters = {
      user: null,
      action: null,
      entityType: null,
      dateFrom: null,
      dateTo: null
    };
  }

  initialize() {
    // Add styles
    this.addStyles();
    console.log('📊 Audit Viewer initialized');
  }

  addStyles() {
    if (document.getElementById('audit-viewer-styles')) return;
    
    const css = `
      .audit-container {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        max-width: 1400px;
        margin: 20px auto;
      }
      .audit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #e2e8f0;
      }
      .audit-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: #0f172a;
      }
      .audit-filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
      }
      .audit-filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .audit-filter-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
      }
      .audit-filter-input {
        padding: 8px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      .audit-log-entry {
        padding: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 12px;
        transition: all 0.2s;
      }
      .audit-log-entry:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
      }
      .audit-log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .audit-user {
        font-weight: 700;
        color: #0f172a;
      }
      .audit-timestamp {
        font-size: 0.85rem;
        color: #64748b;
      }
      .audit-action {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .audit-action.create {
        background: #d1fae5;
        color: #065f46;
      }
      .audit-action.update {
        background: #dbeafe;
        color: #1e40af;
      }
      .audit-action.delete {
        background: #fee2e2;
        color: #991b1b;
      }
      .audit-details {
        margin-top: 12px;
        padding: 12px;
        background: #f8fafc;
        border-radius: 6px;
        font-size: 0.9rem;
        color: #475569;
      }
      .audit-changes {
        margin-top: 8px;
      }
      .audit-change-item {
        padding: 6px;
        margin: 4px 0;
        background: #fff;
        border-left: 3px solid #3b82f6;
        padding-left: 12px;
      }
      .audit-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .audit-stat-card {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
      }
      .audit-stat-value {
        font-size: 2rem;
        font-weight: 800;
      }
      .audit-stat-label {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-top: 4px;
      }
      .audit-btn {
        background: #3b82f6;
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }
      .audit-btn:hover {
        background: #2563eb;
        transform: translateY(-1px);
      }
      .audit-btn-secondary {
        background: #64748b;
      }
      .audit-btn-secondary:hover {
        background: #475569;
      }
      .audit-empty {
        text-align: center;
        padding: 60px 20px;
        color: #94a3b8;
      }
    `;
    
    const style = document.createElement('style');
    style.id = 'audit-viewer-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  async render(containerId = 'reports-display') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container not found:', containerId);
      return;
    }

    // Load logs
    await this.loadLogs();

    // Render UI
    this.container.innerHTML = `
      <div class="audit-container">
        <div class="audit-header">
          <h2 class="audit-title">📋 Audit Trail - Who Did What</h2>
          <div style="display: flex; gap: 10px;">
            <button class="audit-btn audit-btn-secondary" onclick="window.auditViewer.exportLogs()">
              📥 Export CSV
            </button>
            <button class="audit-btn" onclick="window.auditViewer.refresh()">
              🔄 Refresh
            </button>
          </div>
        </div>

        ${this.renderStats()}
        ${this.renderFilters()}
        ${this.renderLogs()}
      </div>
    `;

    // Make globally accessible
    window.auditViewer = this;
  }

  renderStats() {
    const totalLogs = this.logs.length;
    const users = [...new Set(this.logs.map(l => l.user.email))].length;
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.logs.filter(l => l.timestamp.startsWith(today)).length;

    return `
      <div class="audit-stats">
        <div class="audit-stat-card">
          <div class="audit-stat-value">${totalLogs}</div>
          <div class="audit-stat-label">Total Actions</div>
        </div>
        <div class="audit-stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <div class="audit-stat-value">${users}</div>
          <div class="audit-stat-label">Active Users</div>
        </div>
        <div class="audit-stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
          <div class="audit-stat-value">${todayLogs}</div>
          <div class="audit-stat-label">Today's Actions</div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    const users = [...new Set(this.logs.map(l => l.user.email))];
    const actions = ['create', 'update', 'delete'];
    const entityTypes = ['sale', 'payment', 'expense'];

    return `
      <div class="audit-filters">
        <div class="audit-filter-group">
          <label class="audit-filter-label">User</label>
          <select class="audit-filter-input" id="filter-user" onchange="window.auditViewer.applyFilters()">
            <option value="">All Users</option>
            ${users.map(u => `<option value="${u}">${u}</option>`).join('')}
          </select>
        </div>
        <div class="audit-filter-group">
          <label class="audit-filter-label">Action</label>
          <select class="audit-filter-input" id="filter-action" onchange="window.auditViewer.applyFilters()">
            <option value="">All Actions</option>
            ${actions.map(a => `<option value="${a}">${a.toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div class="audit-filter-group">
          <label class="audit-filter-label">Type</label>
          <select class="audit-filter-input" id="filter-type" onchange="window.auditViewer.applyFilters()">
            <option value="">All Types</option>
            ${entityTypes.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div class="audit-filter-group">
          <label class="audit-filter-label">From Date</label>
          <input type="date" class="audit-filter-input" id="filter-date-from" onchange="window.auditViewer.applyFilters()">
        </div>
        <div class="audit-filter-group">
          <label class="audit-filter-label">To Date</label>
          <input type="date" class="audit-filter-input" id="filter-date-to" onchange="window.auditViewer.applyFilters()">
        </div>
      </div>
    `;
  }

  renderLogs() {
    const filteredLogs = this.getFilteredLogs();

    if (filteredLogs.length === 0) {
      return `
        <div class="audit-empty">
          <div style="font-size: 3rem; margin-bottom: 16px;">📭</div>
          <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">No audit logs found</div>
          <div>Try adjusting your filters or perform some actions to create logs</div>
        </div>
      `;
    }

    return `
      <div class="audit-logs">
        ${filteredLogs.map(log => this.renderLogEntry(log)).join('')}
      </div>
    `;
  }

  renderLogEntry(log) {
    const date = new Date(log.timestamp);
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const changesHtml = log.changes ? this.renderChanges(log.changes) : '';

    return `
      <div class="audit-log-entry">
        <div class="audit-log-header">
          <div>
            <span class="audit-user">👤 ${log.user.displayName || log.user.email}</span>
            <span class="audit-action ${log.action}">${log.action}</span>
          </div>
          <span class="audit-timestamp">🕐 ${formattedDate}</span>
        </div>
        <div class="audit-details">
          <strong>📦 ${log.entityType.toUpperCase()}</strong>: ${log.entityId}
          ${changesHtml}
        </div>
      </div>
    `;
  }

  renderChanges(changes) {
    if (!changes || Object.keys(changes).length === 0) return '';

    const changesHtml = Object.entries(changes).map(([key, change]) => `
      <div class="audit-change-item">
        <strong>${key}:</strong> 
        <span style="color: #dc2626; text-decoration: line-through;">${JSON.stringify(change.old)}</span>
        → 
        <span style="color: #059669;">${JSON.stringify(change.new)}</span>
      </div>
    `).join('');

    return `<div class="audit-changes"><strong>Changes:</strong>${changesHtml}</div>`;
  }

  async loadLogs() {
    try {
      this.logs = await auditLogger.getRecentLogs(200);
      console.log(`✅ Loaded ${this.logs.length} audit logs`);
    } catch (error) {
      console.error('❌ Failed to load logs:', error);
      this.logs = [];
    }
  }

  getFilteredLogs() {
    return this.logs.filter(log => {
      if (this.filters.user && log.user.email !== this.filters.user) return false;
      if (this.filters.action && log.action !== this.filters.action) return false;
      if (this.filters.entityType && log.entityType !== this.filters.entityType) return false;
      
      if (this.filters.dateFrom) {
        const logDate = new Date(log.timestamp);
        const fromDate = new Date(this.filters.dateFrom);
        if (logDate < fromDate) return false;
      }
      
      if (this.filters.dateTo) {
        const logDate = new Date(log.timestamp);
        const toDate = new Date(this.filters.dateTo);
        toDate.setHours(23, 59, 59);
        if (logDate > toDate) return false;
      }
      
      return true;
    });
  }

  applyFilters() {
    this.filters.user = document.getElementById('filter-user')?.value || null;
    this.filters.action = document.getElementById('filter-action')?.value || null;
    this.filters.entityType = document.getElementById('filter-type')?.value || null;
    this.filters.dateFrom = document.getElementById('filter-date-from')?.value || null;
    this.filters.dateTo = document.getElementById('filter-date-to')?.value || null;

    this.render();
  }

  async refresh() {
    await this.loadLogs();
    this.render();
  }

  async exportLogs() {
    const filteredLogs = this.getFilteredLogs();
    const csv = await auditLogger.exportToCSV(filteredLogs);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const auditViewer = new AuditViewer();

// Make globally available
if (typeof window !== 'undefined') {
  window.auditViewer = auditViewer;
}
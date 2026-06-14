/* ============================================
   PARTS VILLAGE - ADMIN BACKOFFICE CSS
   Supabase Auth + Database Edition v3.0
   ============================================ */

:root {
    --pv-bg: #0a0a0a;
    --pv-surface: #1a1a1a;
    --pv-surface-elevated: #242424;
    --pv-border: #2a2a2a;
    --pv-border-light: #3a3a3a;
    --pv-gold: #d4af37;
    --pv-gold-light: #e8c547;
    --pv-gold-dark: #b8960c;
    --pv-text: #e0e0e0;
    --pv-text-secondary: #a0a0a0;
    --pv-text-muted: #666;
    --pv-success: #4caf50;
    --pv-warning: #ff9800;
    --pv-error: #f44336;
    --pv-info: #2196f3;
    --pv-radius: 12px;
    --pv-shadow: 0 4px 20px rgba(0,0,0,0.4);
    --pv-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: var(--pv-bg);
    color: var(--pv-text);
    min-height: 100vh;
    line-height: 1.6;
}

/* ============================================
   LOGIN SCREEN
   ============================================ */
.login-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    z-index: 1000;
}

.login-box {
    background: var(--pv-surface);
    border: 1px solid var(--pv-border);
    border-radius: var(--pv-radius);
    padding: 40px;
    width: 100%;
    max-width: 400px;
    box-shadow: var(--pv-shadow);
}

.login-logo {
    text-align: center;
    margin-bottom: 32px;
}

.login-logo-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, var(--pv-gold), var(--pv-gold-dark));
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.5em;
    color: #000;
    margin: 0 auto 16px;
}

.login-logo-text {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--pv-gold);
    letter-spacing: 2px;
}

.login-logo-sub {
    font-size: 0.9em;
    color: var(--pv-text-muted);
    margin-top: 4px;
}

.login-field { margin-bottom: 20px; }
.login-field label {
    display: block;
    font-size: 0.85em;
    color: var(--pv-text-secondary);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.login-field input {
    width: 100%;
    padding: 14px 16px;
    background: var(--pv-surface-elevated);
    border: 1px solid var(--pv-border);
    border-radius: 8px;
    color: var(--pv-text);
    font-size: 1em;
    transition: var(--pv-transition);
}

.login-field input:focus {
    outline: none;
    border-color: var(--pv-gold);
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
}

.login-error {
    color: var(--pv-error);
    font-size: 0.85em;
    margin-bottom: 16px;
    min-height: 20px;
}

.login-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, var(--pv-gold), var(--pv-gold-dark));
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 1em;
    font-weight: 700;
    cursor: pointer;
    transition: var(--pv-transition);
}

.login-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }

.login-hint {
    text-align: center;
    margin-top: 16px;
    font-size: 0.8em;
    color: var(--pv-text-muted);
}

/* ============================================
   ADMIN HEADER
   ============================================ */
.admin-header {
    background: var(--pv-surface);
    border-bottom: 1px solid var(--pv-border);
    padding: 16px 24px;
    position: sticky;
    top: 0;
    z-index: 100;
}

.admin-header-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
}

.admin-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
}

.admin-logo-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--pv-gold), var(--pv-gold-dark));
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #000;
}

.admin-logo-text {
    font-size: 1.1em;
    font-weight: 700;
    color: var(--pv-gold);
}

.admin-logo-sub {
    font-size: 0.75em;
    color: var(--pv-text-muted);
}

.admin-header-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
}

.admin-user-info {
    font-size: 0.8em;
    color: var(--pv-text-muted);
    margin-right: 8px;
}

.btn-export, .btn-import, .btn-logout {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.9em;
    font-weight: 600;
    cursor: pointer;
    transition: var(--pv-transition);
    border: none;
}

.btn-export { background: var(--pv-gold); color: #000; }
.btn-export:hover { background: var(--pv-gold-light); }

.btn-import { background: var(--pv-surface-elevated); color: var(--pv-text); border: 1px solid var(--pv-border); cursor: pointer; }
.btn-import:hover { background: var(--pv-border); }

.btn-logout { background: rgba(244, 67, 54, 0.1); color: var(--pv-error); border: 1px solid rgba(244, 67, 54, 0.3); }
.btn-logout:hover { background: rgba(244, 67, 54, 0.2); }

/* ============================================
   STATS
   ============================================ */
.admin-stats {
    display: flex;
    gap: 16px;
    padding: 20px 24px;
    max-width: 1400px;
    margin: 0 auto;
    flex-wrap: wrap;
}

.admin-stat {
    background: var(--pv-surface);
    border: 1px solid var(--pv-border);
    border-radius: var(--pv-radius);
    padding: 16px 24px;
    min-width: 120px;
    text-align: center;
}

.admin-stat-number {
    font-size: 1.6em;
    font-weight: 700;
    color: var(--pv-gold);
    line-height: 1;
}

.admin-stat-label {
    font-size: 0.75em;
    color: var(--pv-text-muted);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* ============================================
   MISSING DATA WARNING
   ============================================ */
.missing-data-warning {
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: var(--pv-radius);
    padding: 12px 20px;
    margin: 0 24px 16px;
    max-width: 1400px;
    display: flex;
    gap: 12px;
    align-items: center;
    color: var(--pv-warning);
    font-size: 0.9em;
}

.missing-data-warning .count {
    background: rgba(255, 152, 0, 0.2);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
    margin: 0 4px;
}

/* ============================================
   FILTERS
   ============================================ */
.admin-filters {
    display: flex;
    gap: 12px;
    padding: 0 24px 16px;
    max-width: 1400px;
    margin: 0 auto;
    flex-wrap: wrap;
}

.admin-search-input {
    flex: 1;
    min-width: 280px;
    padding: 12px 16px;
    background: var(--pv-surface);
    border: 1px solid var(--pv-border);
    border-radius: 8px;
    color: var(--pv-text);
    font-size: 0.95em;
}

.admin-search-input:focus { outline: none; border-color: var(--pv-gold); }

.admin-filter-select {
    padding: 12px 16px;
    background: var(--pv-surface);
    border: 1px solid var(--pv-border);
    border-radius: 8px;
    color: var(--pv-text);
    font-size: 0.95em;
    cursor: pointer;
    min-width: 180px;
}

/* ============================================
   TABLE
   ============================================ */
.admin-table-container {
    padding: 0 24px 40px;
    max-width: 1400px;
    margin: 0 auto;
    overflow-x: auto;
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--pv-surface);
    border: 1px solid var(--pv-border);
    border-radius: var(--pv-radius);
    overflow: hidden;
}

.admin-table th {
    background: var(--pv-surface-elevated);
    padding: 14px 16px;
    text-align: left;
    font-size: 0.8em;
    font-weight: 600;
    color: var(--pv-gold);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid var(--pv-border);
    white-space: nowrap;
}

.admin-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--pv-border);
    font-size: 0.9em;
    color: var(--pv-text-secondary);
    vertical-align: top;
}

.admin-table tr:hover { background: rgba(212, 175, 55, 0.03); }

.admin-table .item-code {
    color: var(--pv-gold);
    font-weight: 700;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    transition: var(--pv-transition);
}

.admin-table .item-code:hover { color: var(--pv-gold-light); text-decoration: underline; }

.admin-table .truncated {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.machine-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.machine-tag {
    background: rgba(212, 175, 55, 0.15);
    color: var(--pv-gold);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: 600;
}

.machine-tag.more { background: var(--pv-surface-elevated); color: var(--pv-text-muted); }

.status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.status-complete { background: rgba(76, 175, 80, 0.2); color: var(--pv-success); }
.status-needs-image { background: rgba(255, 152, 0, 0.2); color: var(--pv-warning); }
.status-needs-verification { background: rgba(33, 150, 243, 0.2); color: var(--pv-info); }
.status-draft { background: rgba(158, 158, 158, 0.2); color: var(--pv-text-muted); }

.btn-icon {
    background: none;
    border: none;
    color: var(--pv-text-muted);
    cursor: pointer;
    font-size: 1.1em;
    padding: 6px;
    border-radius: 6px;
    transition: var(--pv-transition);
    margin: 0 2px;
}

.btn-icon:hover { background: var(--pv-surface-elevated); color: var(--pv-gold); }

/* ============================================
   EDIT MODAL
   ============================================ */
.edit-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    opacity: 0;
    visibility: hidden;
    transition: var(--pv-transition);
}

.edit-modal-overlay.active { opacity: 1; visibility: visible; }

.edit-modal {
    background: var(--pv-surface);
    border: 1px solid var(--pv-border);
    border-radius: var(--pv-radius);
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--pv-shadow);
}

.edit-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--pv-border);
}

.edit-modal-header h2 {
    font-size: 1.2em;
    color: var(--pv-gold);
}

.edit-modal-close {
    background: none;
    border: none;
    color: var(--pv-text-muted);
    font-size: 1.5em;
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--pv-transition);
}

.edit-modal-close:hover { background: var(--pv-error); color: #fff; }

.edit-modal-body { padding: 24px; }

.edit-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--pv-border);
}

/* ============================================
   TABS
   ============================================ */
.edit-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--pv-border);
    padding-bottom: 1px;
}

.tab-btn {
    padding: 10px 20px;
    background: none;
    border: none;
    color: var(--pv-text-muted);
    font-size: 0.9em;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    transition: var(--pv-transition);
    position: relative;
}

.tab-btn:hover { color: var(--pv-text); }

.tab-btn.active {
    color: var(--pv-gold);
    background: rgba(212, 175, 55, 0.1);
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--pv-gold);
}

.tab-content { display: none; }
.tab-content.active { display: block; }

/* ============================================
   FORM
   ============================================ */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
}

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full-width { grid-column: 1 / -1; }

.form-group label {
    font-size: 0.8em;
    color: var(--pv-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
    padding: 10px 14px;
    background: var(--pv-surface-elevated);
    border: 1px solid var(--pv-border);
    border-radius: 8px;
    color: var(--pv-text);
    font-size: 0.95em;
    transition: var(--pv-transition);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--pv-gold);
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
}

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ============================================
   DYNAMIC FIELDS
   ============================================ */
.machine-input-row,
.alt-input-row,
.spec-row,
.dim-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
}

.machine-input-row input,
.alt-input-row input,
.spec-row input,
.dim-row input {
    flex: 1;
    padding: 8px 12px;
    background: var(--pv-surface-elevated);
    border: 1px solid var(--pv-border);
    border-radius: 6px;
    color: var(--pv-text);
    font-size: 0.9em;
}

.btn-remove {
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: var(--pv-error);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    transition: var(--pv-transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-remove:hover { background: rgba(244, 67, 54, 0.2); }

.btn-add {
    background: rgba(212, 175, 55, 0.1);
    border: 1px dashed var(--pv-gold);
    color: var(--pv-gold);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;
    transition: var(--pv-transition);
    margin-top: 8px;
}

.btn-add:hover { background: rgba(212, 175, 55, 0.2); }

.btn-save {
    background: linear-gradient(135deg, var(--pv-gold), var(--pv-gold-dark));
    color: #000;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.95em;
    font-weight: 700;
    cursor: pointer;
    transition: var(--pv-transition);
}

.btn-save:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); }

.btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.btn-cancel {
    background: var(--pv-surface-elevated);
    border: 1px solid var(--pv-border);
    color: var(--pv-text);
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.95em;
    font-weight: 600;
    cursor: pointer;
    transition: var(--pv-transition);
}

.btn-cancel:hover { background: var(--pv-border); }

/* ============================================
   IMAGE PREVIEW
   ============================================ */
#edit-image-preview {
    background: var(--pv-surface-elevated);
    border-radius: 8px;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 12px;
}

#edit-image-preview img {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
.toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.toast {
    padding: 14px 20px;
    border-radius: 8px;
    font-size: 0.9em;
    font-weight: 600;
    color: #fff;
    transform: translateX(120%);
    transition: transform 0.3s ease;
    box-shadow: var(--pv-shadow);
    max-width: 400px;
}

.toast.show { transform: translateX(0); }
.toast-success { background: var(--pv-success); }
.toast-error { background: var(--pv-error); }
.toast-info { background: var(--pv-info); }
.toast-warning { background: var(--pv-warning); }

/* ============================================
   LOADING SPINNER (Supabase async states)
   ============================================ */
.loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(212, 175, 55, 0.2);
    border-top-color: var(--pv-gold);
    border-radius: 50%;
    animation: spinner-rotate 0.8s linear infinite;
}

@keyframes spinner-rotate {
    to { transform: rotate(360deg); }
}

.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(4px);
    z-index: 1500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
}

.loading-overlay.hidden { display: none; }

.loading-overlay-text {
    color: var(--pv-gold);
    font-size: 1em;
    font-weight: 600;
    letter-spacing: 1px;
}

.btn-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-top-color: #000;
    border-radius: 50%;
    animation: spinner-rotate 0.8s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
}

/* Login loading state */
.login-btn.loading {
    opacity: 0.7;
    cursor: wait;
    pointer-events: none;
}

/* Save button loading state */
.btn-save.loading {
    opacity: 0.7;
    cursor: wait;
    pointer-events: none;
}

/* Table loading state */
.admin-table-loading {
    position: relative;
    min-height: 200px;
}

.admin-table-loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    margin: -20px 0 0 -20px;
    border: 3px solid rgba(212, 175, 55, 0.2);
    border-top-color: var(--pv-gold);
    border-radius: 50%;
    animation: spinner-rotate 0.8s linear infinite;
}

/* ============================================
   SCROLLBAR
   ============================================ */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--pv-bg); }
::-webkit-scrollbar-thumb { background: var(--pv-border-light); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--pv-gold); }

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
    .admin-header-inner { flex-direction: column; }
    .admin-stats { gap: 8px; }
    .admin-stat { min-width: 100px; padding: 12px 16px; }
    .admin-table-container { padding: 0 12px 20px; }
    .edit-modal { max-height: 95vh; }
    .form-grid { grid-template-columns: 1fr; }
    .login-box { padding: 24px; }
}

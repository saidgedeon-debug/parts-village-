/**
 * Parts Village - Clients, Quotations & Invoicing System
 * Complete client management, quotation generation, and invoicing module
 * All data persisted via localStorage
 */

const PVClientsApp = {
    // ---------- State ----------
    clients: [],
    quotations: [],
    invoices: [],
    cart: [],
    cartTaxRate: 0,
    currentTab: 'clients',
    selectedClientId: null,
    companySettings: null,
    editingClientId: null,
    viewingQuotationId: null,
    viewingInvoiceId: null,
    editingInvoiceId: null,
    invoiceFilter: 'all',
    invoiceClientFilter: '',

    // ---------- Keys ----------
    KEYS: {
        CLIENTS: 'pv_clients_data',
        QUOTATIONS: 'pv_quotations_data',
        INVOICES: 'pv_invoices_data',
        SETTINGS: 'pv_company_settings',
        CART: 'pv_quotation_cart'
    },

    // ---------- Currency Symbol ----------
    getCurrency() {
        return this.companySettings?.currency || '$';
    },

    // ---------- Initialization ----------
    init() {
        this.loadSettings();
        this.loadClients();
        this.loadQuotations();
        this.loadInvoices();
        this.loadCart();
        this.setupEventListeners();
        this.renderAll();
        this.showToast('Clients, Quotations & Invoicing loaded', 'success');
    },

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeCartPanel();
            }
        });
    },

    // ============================================================
    //  SETTINGS
    // ============================================================
    loadSettings() {
        const data = localStorage.getItem(this.KEYS.SETTINGS);
        if (data) {
            try {
                this.companySettings = JSON.parse(data);
            } catch(e) {
                this.companySettings = this.getDefaultSettings();
            }
        } else {
            this.companySettings = this.getDefaultSettings();
        }
        this.applySettingsToUI();
    },

    getDefaultSettings() {
        return {
            company_name: 'Parts Village',
            phone: '',
            email: '',
            website: '',
            address: '',
            bank_details: '',
            default_tax_rate: 0,
            currency: '$',
            default_notes: 'Payment Terms: Net 30 days from date of invoice.\nDelivery: Ex-works, shipping costs to be quoted separately.\nPlease make payment within the due date to avoid late fees.'
        };
    },

    saveSettings() {
        this.companySettings = {
            company_name: document.getElementById('setting-company-name').value.trim() || 'Parts Village',
            phone: document.getElementById('setting-company-phone').value.trim(),
            email: document.getElementById('setting-company-email').value.trim(),
            website: document.getElementById('setting-company-website').value.trim(),
            address: document.getElementById('setting-company-address').value.trim(),
            bank_details: document.getElementById('setting-bank-details').value.trim(),
            default_tax_rate: parseFloat(document.getElementById('setting-default-tax').value) || 0,
            currency: document.getElementById('setting-currency').value.trim() || '$',
            default_notes: document.getElementById('setting-default-notes').value.trim()
        };
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(this.companySettings));
        this.cartTaxRate = this.companySettings.default_tax_rate;
        this.updateCartUI();
        this.closeSettingsModal();
        this.showToast('Settings saved successfully', 'success');
    },

    applySettingsToUI() {
        const s = this.companySettings;
        document.getElementById('setting-company-name').value = s.company_name || '';
        document.getElementById('setting-company-phone').value = s.phone || '';
        document.getElementById('setting-company-email').value = s.email || '';
        document.getElementById('setting-company-website').value = s.website || '';
        document.getElementById('setting-company-address').value = s.address || '';
        document.getElementById('setting-bank-details').value = s.bank_details || '';
        document.getElementById('setting-default-tax').value = s.default_tax_rate || 0;
        document.getElementById('setting-currency').value = s.currency || '$';
        document.getElementById('setting-default-notes').value = s.default_notes || '';
    },

    openSettingsModal() {
        document.getElementById('settings-modal-overlay').classList.add('active');
    },

    closeSettingsModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('settings-modal-overlay').classList.remove('active');
    },

    confirmResetAll() {
        if (confirm('WARNING: This will delete ALL clients, quotations, invoices, and settings. This cannot be undone. Are you sure?')) {
            if (confirm('Are you absolutely sure? All data will be permanently lost.')) {
                this.resetAllData();
            }
        }
    },

    resetAllData() {
        localStorage.removeItem(this.KEYS.CLIENTS);
        localStorage.removeItem(this.KEYS.QUOTATIONS);
        localStorage.removeItem(this.KEYS.INVOICES);
        localStorage.removeItem(this.KEYS.SETTINGS);
        localStorage.removeItem(this.KEYS.CART);
        this.clients = [];
        this.quotations = [];
        this.invoices = [];
        this.cart = [];
        this.cartTaxRate = 0;
        this.companySettings = this.getDefaultSettings();
        this.applySettingsToUI();
        this.renderAll();
        this.showToast('All data has been reset', 'warning');
    },

    // ============================================================
    //  CLIENT CRUD
    // ============================================================
    loadClients() {
        const data = localStorage.getItem(this.KEYS.CLIENTS);
        if (data) {
            try { this.clients = JSON.parse(data); } catch(e) { this.clients = []; }
        }
        if (!Array.isArray(this.clients)) this.clients = [];
    },

    saveClients() {
        localStorage.setItem(this.KEYS.CLIENTS, JSON.stringify(this.clients));
    },

    getClient(id) {
        return this.clients.find(c => c.id === id);
    },

    getClientQuotationsCount(clientId) {
        return this.quotations.filter(q => q.client_id === clientId).length;
    },

    getClientInvoicesCount(clientId) {
        return this.invoices.filter(inv => inv.client_id === clientId).length;
    },

    generateClientId() {
        return 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    addClient(data) {
        const client = {
            id: this.generateClientId(),
            name: data.name.trim(),
            company: (data.company || '').trim(),
            phone: (data.phone || '').trim(),
            email: (data.email || '').trim(),
            address: (data.address || '').trim(),
            notes: (data.notes || '').trim(),
            created_at: new Date().toISOString()
        };
        this.clients.unshift(client);
        this.saveClients();
        this.renderClients();
        this.updateBadges();
        this.showToast('Client added successfully', 'success');
        return client;
    },

    editClient(id, data) {
        const idx = this.clients.findIndex(c => c.id === id);
        if (idx === -1) return null;
        this.clients[idx] = {
            ...this.clients[idx],
            name: data.name.trim(),
            company: (data.company || '').trim(),
            phone: (data.phone || '').trim(),
            email: (data.email || '').trim(),
            address: (data.address || '').trim(),
            notes: (data.notes || '').trim()
        };
        this.saveClients();
        this.renderClients();
        this.showToast('Client updated successfully', 'success');
        return this.clients[idx];
    },

    deleteClient(id) {
        const qCount = this.getClientQuotationsCount(id);
        const iCount = this.getClientInvoicesCount(id);
        let msg = 'Are you sure you want to delete this client?';
        if (qCount > 0 || iCount > 0) {
            const parts = [];
            if (qCount > 0) parts.push(`${qCount} quotation(s)`);
            if (iCount > 0) parts.push(`${iCount} invoice(s)`);
            msg += ` This will also remove ${parts.join(' and ')}.`;
        }
        if (!confirm(msg)) return;
        this.clients = this.clients.filter(c => c.id !== id);
        // Also delete associated quotations and invoices
        this.quotations = this.quotations.filter(q => q.client_id !== id);
        this.invoices = this.invoices.filter(inv => inv.client_id !== id);
        this.saveClients();
        this.saveQuotations();
        this.saveInvoices();
        this.renderAll();
        this.updateBadges();
        this.showToast('Client deleted', 'warning');
    },

    // ---------- Client Modal ----------
    openClientModal(isFromQuotationFlow) {
        this.editingClientId = null;
        document.getElementById('client-modal-title').textContent = 'Add New Client';
        document.getElementById('client-form').reset();
        document.getElementById('client-id').value = '';
        document.getElementById('client-modal-overlay').classList.add('active');
        this._clientModalFromQuotation = isFromQuotationFlow;
    },

    openEditClientModal(id, event) {
        if (event) event.stopPropagation();
        const client = this.getClient(id);
        if (!client) return;
        this.editingClientId = id;
        document.getElementById('client-modal-title').textContent = 'Edit Client';
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-company').value = client.company;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-email').value = client.email;
        document.getElementById('client-address').value = client.address;
        document.getElementById('client-notes').value = client.notes;
        document.getElementById('client-modal-overlay').classList.add('active');
        this._clientModalFromQuotation = false;
    },

    closeClientModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('client-modal-overlay').classList.remove('active');
        this.editingClientId = null;
    },

    saveClient() {
        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        if (!name || !phone) {
            this.showToast('Name and phone are required', 'error');
            return;
        }
        const data = {
            name: document.getElementById('client-name').value,
            company: document.getElementById('client-company').value,
            phone: document.getElementById('client-phone').value,
            email: document.getElementById('client-email').value,
            address: document.getElementById('client-address').value,
            notes: document.getElementById('client-notes').value
        };
        let client;
        if (this.editingClientId) {
            client = this.editClient(this.editingClientId, data);
        } else {
            client = this.addClient(data);
        }
        this.closeClientModal();
        // If opened from quotation flow, auto-select the new client
        if (this._clientModalFromQuotation && client) {
            this.populateClientSelect();
            document.getElementById('quotation-client-select').value = client.id;
            this.onClientSelectChange();
        }
    },

    // ---------- Client Detail Modal ----------
    openClientDetailModal(id) {
        const client = this.getClient(id);
        if (!client) return;
        const quotations = this.quotations.filter(q => q.client_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const invoices = this.invoices.filter(inv => inv.client_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const currency = this.getCurrency();
        const clientBalance = this.getClientBalance(id);

        let html = `
            <div class="pv-client-detail-header">
                <div class="pv-client-detail-avatar">${this.getInitials(client.name)}</div>
                <div class="pv-client-detail-info">
                    <h3>${this.escapeHtml(client.name)}</h3>
                    <p>${this.escapeHtml(client.company || 'No company')}</p>
                </div>
            </div>
            <div class="pv-detail-grid">
                <div class="pv-detail-item">
                    <span class="pv-detail-label">Phone</span>
                    <span class="pv-detail-value">${this.escapeHtml(client.phone || '-')}</span>
                </div>
                <div class="pv-detail-item">
                    <span class="pv-detail-label">Email</span>
                    <span class="pv-detail-value">${this.escapeHtml(client.email || '-')}</span>
                </div>
                <div class="pv-detail-item full-width">
                    <span class="pv-detail-label">Address</span>
                    <span class="pv-detail-value">${this.escapeHtml(client.address || '-')}</span>
                </div>
            </div>
        `;

        if (client.notes) {
            html += `
                <div style="margin-bottom:20px;">
                    <span class="pv-detail-label">Notes</span>
                    <div class="pv-detail-notes">${this.escapeHtml(client.notes)}</div>
                </div>
            `;
        }

        // Outstanding balance banner
        html += `
            <div class="pv-client-balance-banner ${clientBalance > 0 ? 'outstanding' : 'paid'}">
                <div>
                    <div class="pv-client-balance-label">Outstanding Balance</div>
                    <div class="pv-client-balance-amount">${currency}${this.formatNumber(clientBalance)}</div>
                </div>
                <div class="pv-client-balance-count">${invoices.length} invoice(s)</div>
            </div>
        `;

        // Quotations section
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin:20px 0 12px;">
                <span class="pv-detail-label">Quotations (${quotations.length})</span>
                <button class="pv-btn pv-btn-silver pv-btn-sm" onclick="app.startQuotationForClient('${id}')">+ New Quotation</button>
            </div>
            <div class="pv-client-quotations-list">
        `;

        if (quotations.length === 0) {
            html += `<div style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center;">No quotations yet</div>`;
        } else {
            quotations.forEach(q => {
                html += `
                    <div class="pv-mini-quotation-card" onclick="app.viewQuotation('${q.id}')">
                        <div>
                            <div class="pv-mini-quotation-id">${q.quotation_number}</div>
                            <div class="pv-mini-quotation-meta">${this.formatDate(q.created_at)} &middot; ${q.items.length} items</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="pv-mini-quotation-amount">${currency}${this.formatNumber(q.total)}</div>
                            <span class="pv-badge pv-badge-${q.status.toLowerCase()}">${q.status}</span>
                        </div>
                    </div>
                `;
            });
        }
        html += '</div>';

        // Invoices section
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin:24px 0 12px;">
                <span class="pv-detail-label">Invoices (${invoices.length})</span>
                <button class="pv-btn pv-btn-silver pv-btn-sm" onclick="app.startInvoiceForClient('${id}')">+ New Invoice</button>
            </div>
            <div class="pv-client-invoices-list">
        `;

        if (invoices.length === 0) {
            html += `<div style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center;">No invoices yet</div>`;
        } else {
            invoices.forEach(inv => {
                const statusClass = inv.status.toLowerCase().replace(/\s+/g, '-');
                html += `
                    <div class="pv-mini-invoice-card" onclick="app.viewInvoice('${inv.id}')">
                        <div>
                            <div class="pv-mini-invoice-id">${inv.invoice_number}</div>
                            <div class="pv-mini-invoice-meta">${this.formatDate(inv.created_at)} &middot; ${inv.items.length} items &middot; Due: ${this.formatDate(inv.due_date)}</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="pv-mini-invoice-amount">${currency}${this.formatNumber(inv.total)}</div>
                            <span class="pv-badge pv-badge-${statusClass}">${inv.status}</span>
                            ${inv.balance_due > 0 ? `<div style="font-size:0.75rem; color:var(--danger);">Bal: ${currency}${this.formatNumber(inv.balance_due)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        html += '</div>';

        document.getElementById('client-detail-body').innerHTML = html;
        document.getElementById('client-detail-modal-overlay').classList.add('active');
        this._selectedClientDetailId = id;
    },

    closeClientDetailModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('client-detail-modal-overlay').classList.remove('active');
        this._selectedClientDetailId = null;
    },

    // ============================================================
    //  TAB NAVIGATION
    // ============================================================
    switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.pv-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.pv-tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelector(`.pv-tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`tab-${tabName}`)?.classList.add('active');

        if (tabName === 'create-quotation') {
            this.populateClientSelect();
            this.populateCategoryFilter();
            this.renderCatalogForQuotation();
            document.getElementById('floating-cart-btn').style.display = 'block';
            this.updateStepIndicators();
        } else {
            document.getElementById('floating-cart-btn').style.display = 'none';
        }

        if (tabName === 'clients') {
            this.renderClients();
        }
        if (tabName === 'quotations') {
            this.populateQuotationFilters();
            this.renderQuotations();
        }
        if (tabName === 'invoices') {
            this.populateInvoiceFilters();
            this.renderInvoices();
        }
    },

    updateStepIndicators() {
        const hasClient = !!this.selectedClientId;
        const hasItems = this.cart.length > 0;

        // Step 1
        const s1 = document.getElementById('step-ind-1');
        s1.querySelector('.step-circle').className = 'step-circle ' + (hasClient ? 'done' : 'active');
        s1.classList.toggle('active', !hasClient);

        document.getElementById('step-conn-1').className = 'pv-step-connector' + (hasClient ? ' done' : '');

        // Step 2
        const s2 = document.getElementById('step-ind-2');
        s2.querySelector('.step-circle').className = 'step-circle ' + (hasItems ? 'done' : (hasClient ? 'active' : ''));
        s2.classList.toggle('active', hasClient && !hasItems);

        document.getElementById('step-conn-2').className = 'pv-step-connector' + (hasItems ? ' done' : '');

        // Step 3
        const s3 = document.getElementById('step-ind-3');
        s3.querySelector('.step-circle').className = 'step-circle ' + (hasItems ? 'active' : '');
        s3.classList.toggle('active', hasItems);
    },

    // ============================================================
    //  CLIENT SELECT (in quotation flow)
    // ============================================================
    populateClientSelect() {
        const select = document.getElementById('quotation-client-select');
        let html = '<option value="">-- Select a client --</option>';
        this.clients.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            html += `<option value="${c.id}">${this.escapeHtml(c.name)}${c.company ? ' (' + this.escapeHtml(c.company) + ')' : ''}</option>`;
        });
        select.innerHTML = html;
        if (this.selectedClientId) {
            select.value = this.selectedClientId;
        }
    },

    onClientSelectChange() {
        const id = document.getElementById('quotation-client-select').value;
        this.selectedClientId = id || null;
        this.updateCartUI();
        this.updateStepIndicators();
    },

    startQuotationForClient(clientId) {
        const id = clientId || this._selectedClientDetailId;
        if (!id) return;
        this.closeClientDetailModal();
        this.selectedClientId = id;
        this.populateClientSelect();
        this.switchTab('create-quotation');
        document.getElementById('flow-step-1').scrollIntoView({ behavior: 'smooth' });
    },

    // ============================================================
    //  CATALOG BROWSER FOR QUOTATION
    // ============================================================
    populateCategoryFilter() {
        const select = document.getElementById('catalog-category-filter');
        const items = window.PVCatalog?.items || [];
        const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
        let html = '<option value="">All Categories</option>';
        categories.forEach(cat => {
            html += `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`;
        });
        select.innerHTML = html;
    },

    renderCatalogForQuotation() {
        const search = (document.getElementById('catalog-search').value || '').toLowerCase();
        const category = document.getElementById('catalog-category-filter').value;
        const items = (window.PVCatalog?.items || []).filter(item => {
            const matchSearch = !search ||
                (item.product_name_en || '').toLowerCase().includes(search) ||
                (item.oem_part_number || '').toLowerCase().includes(search) ||
                (item.item_code || '').toLowerCase().includes(search);
            const matchCat = !category || item.category === category;
            return matchSearch && matchCat;
        });

        const grid = document.getElementById('catalog-grid-for-quotation');
        const currency = this.getCurrency();

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="pv-empty-state" style="grid-column:1/-1; padding:30px;">
                    <div style="font-size:2rem; margin-bottom:8px;">&#128269;</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary);">No items found</div>
                </div>`;
            return;
        }

        grid.innerHTML = items.map(item => {
            const inCart = this.cart.find(c => c.item_code === item.item_code);
            return `
                <div class="pv-catalog-card">
                    <div class="pv-catalog-card-image">
                        ${item.main_image ? `<img src="${item.main_image}" alt="" onerror="this.style.display='none'; this.parentNode.innerHTML='&#128230;';">` : '&#128230;'}
                    </div>
                    <div class="pv-catalog-card-code">${this.escapeHtml(item.item_code)}</div>
                    <div class="pv-catalog-card-name" title="${this.escapeHtml(item.product_name_en)}">${this.escapeHtml(item.product_name_en)}</div>
                    <div class="pv-catalog-card-oem">${this.escapeHtml(item.oem_part_number || '')}</div>
                    <div class="pv-catalog-card-price">${currency}${this.formatNumber(item.list_price || 0)}</div>
                    <button class="pv-btn pv-btn-silver pv-btn-sm" onclick="app.addToCart('${item.item_code}')" ${inCart ? 'disabled' : ''}>
                        ${inCart ? '&#10003; Added' : '+ Add to Quotation'}
                    </button>
                </div>
            `;
        }).join('');
    },

    // ============================================================
    //  CART SYSTEM
    // ============================================================
    loadCart() {
        const data = localStorage.getItem(this.KEYS.CART);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.cart = parsed.cart || [];
                this.cartTaxRate = parsed.taxRate || 0;
                this.selectedClientId = parsed.clientId || null;
            } catch(e) {
                this.cart = [];
                this.cartTaxRate = 0;
            }
        }
    },

    saveCart() {
        localStorage.setItem(this.KEYS.CART, JSON.stringify({
            cart: this.cart,
            taxRate: this.cartTaxRate,
            clientId: this.selectedClientId
        }));
    },

    addToCart(itemCode) {
        const item = (window.PVCatalog?.items || []).find(i => i.item_code === itemCode);
        if (!item) return;
        if (this.cart.find(c => c.item_code === itemCode)) return;

        this.cart.push({
            item_code: item.item_code,
            oem_part_number: item.oem_part_number || '',
            product_name_en: item.product_name_en || '',
            product_name_cn: item.product_name_cn || '',
            main_image: item.main_image || '',
            qty: 1,
            unit_price: parseFloat(item.list_price) || 0
        });
        this.saveCart();
        this.renderCatalogForQuotation();
        this.updateCartUI();
        this.updateStepIndicators();
        this.showToast(`${item.product_name_en} added to cart`, 'success');
    },

    removeFromCart(itemCode) {
        this.cart = this.cart.filter(c => c.item_code !== itemCode);
        this.saveCart();
        this.renderCatalogForQuotation();
        this.updateCartUI();
        this.updateStepIndicators();
    },

    updateCartQty(itemCode, qty) {
        const item = this.cart.find(c => c.item_code === itemCode);
        if (!item) return;
        qty = parseInt(qty);
        if (isNaN(qty) || qty < 1) qty = 1;
        item.qty = qty;
        this.saveCart();
        this.updateCartUI();
    },

    updateCartPrice(itemCode, price) {
        const item = this.cart.find(c => c.item_code === itemCode);
        if (!item) return;
        price = parseFloat(price);
        if (isNaN(price) || price < 0) price = 0;
        item.unit_price = price;
        this.saveCart();
        this.updateCartUI();
    },

    updateCartTaxRate() {
        const miniRate = document.getElementById('mini-cart-tax-rate');
        const panelRate = document.getElementById('cart-panel-tax-rate');
        const rate = parseFloat(miniRate.value) || 0;
        this.cartTaxRate = rate;
        miniRate.value = rate;
        panelRate.value = rate;
        this.saveCart();
        this.updateCartUI();
    },

    clearCart() {
        if (this.cart.length > 0 && !confirm('Clear all items from cart?')) return;
        this.cart = [];
        this.saveCart();
        this.renderCatalogForQuotation();
        this.updateCartUI();
        this.updateStepIndicators();
    },

    getCartTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        const taxAmount = subtotal * (this.cartTaxRate / 100);
        return { subtotal, taxAmount, total: subtotal + taxAmount };
    },

    updateCartUI() {
        const totals = this.getCartTotals();
        const currency = this.getCurrency();

        // Mini cart summary
        const miniItems = document.getElementById('mini-cart-items');
        if (this.cart.length === 0) {
            miniItems.innerHTML = `
                <div class="pv-cart-empty">
                    <div style="font-size:2rem; margin-bottom:8px;">&#128722;</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">Cart is empty</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Add items from catalog</div>
                </div>`;
        } else {
            miniItems.innerHTML = this.cart.map(item => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:0.8rem;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(item.product_name_en)}</div>
                        <div style="color:var(--text-muted); font-size:0.7rem;">${item.item_code} &middot; ${this.escapeHtml(item.oem_part_number)}</div>
                    </div>
                    <div style="text-align:right; margin-left:8px; flex-shrink:0;">
                        <div>${item.qty} x ${currency}${this.formatNumber(item.unit_price)}</div>
                        <div style="font-weight:700;">${currency}${this.formatNumber(item.qty * item.unit_price)}</div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('mini-cart-subtotal').textContent = currency + this.formatNumber(totals.subtotal);
        document.getElementById('mini-cart-tax-rate').value = this.cartTaxRate;
        document.getElementById('mini-cart-tax-amount').textContent = currency + this.formatNumber(totals.taxAmount);
        document.getElementById('mini-cart-total').textContent = currency + this.formatNumber(totals.total);

        // Generate button state
        const genBtn = document.getElementById('btn-generate-quotation');
        genBtn.disabled = !this.selectedClientId || this.cart.length === 0;
        if (genBtn.disabled) {
            genBtn.title = !this.selectedClientId ? 'Select a client first' : 'Add items to cart first';
        }

        // Client summary
        const clientSummary = document.getElementById('cart-summary-client');
        if (this.selectedClientId) {
            const client = this.getClient(this.selectedClientId);
            if (client) {
                clientSummary.innerHTML = `
                    <div style="font-weight:600; font-size:0.9rem;">${this.escapeHtml(client.name)}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">${this.escapeHtml(client.company || '')}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml(client.phone)}</div>
                `;
            }
        } else {
            clientSummary.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">No client selected</span>';
        }

        // Cart panel items
        const panelItems = document.getElementById('cart-panel-items');
        if (this.cart.length === 0) {
            panelItems.innerHTML = `
                <div class="pv-cart-empty">
                    <div style="font-size:2.5rem; margin-bottom:12px;">&#128722;</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:4px;">Your cart is empty</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Browse the catalog and add items</div>
                </div>`;
        } else {
            panelItems.innerHTML = this.cart.map(item => `
                <div class="pv-cart-item">
                    <div class="pv-cart-item-image">
                        ${item.main_image ? `<img src="${item.main_image}" alt="" onerror="this.parentNode.innerHTML='&#128230;'">` : '&#128230;'}
                    </div>
                    <div class="pv-cart-item-details">
                        <div class="pv-cart-item-code">${item.item_code}</div>
                        <div class="pv-cart-item-name" title="${this.escapeHtml(item.product_name_en)}">${this.escapeHtml(item.product_name_en)}</div>
                        <div class="pv-cart-item-oem">${this.escapeHtml(item.oem_part_number)}</div>
                        <div class="pv-cart-item-qty">
                            <button onclick="app.updateCartQty('${item.item_code}', ${item.qty - 1})">&#8722;</button>
                            <input type="number" value="${item.qty}" min="1" onchange="app.updateCartQty('${item.item_code}', this.value)">
                            <button onclick="app.updateCartQty('${item.item_code}', ${item.qty + 1})">+</button>
                        </div>
                    </div>
                    <div class="pv-cart-item-actions">
                        <div style="display:flex; align-items:center; gap:4px;">
                            <span style="font-size:0.75rem; color:var(--text-muted);">${currency}</span>
                            <input type="number" class="pv-cart-item-price-input" value="${item.unit_price}" min="0" step="0.01" onchange="app.updateCartPrice('${item.item_code}', this.value)">
                        </div>
                        <div class="pv-cart-item-total">${currency}${this.formatNumber(item.qty * item.unit_price)}</div>
                        <button class="pv-cart-item-remove" onclick="app.removeFromCart('${item.item_code}')">&#128465; Remove</button>
                    </div>
                </div>
            `).join('');
        }

        // Cart panel totals
        document.getElementById('cart-panel-count').textContent = this.cart.length;
        document.getElementById('cart-panel-subtotal').textContent = currency + this.formatNumber(totals.subtotal);
        document.getElementById('cart-panel-tax-rate').value = this.cartTaxRate;
        document.getElementById('cart-panel-tax-amount').textContent = currency + this.formatNumber(totals.taxAmount);
        document.getElementById('cart-panel-total').textContent = currency + this.formatNumber(totals.total);

        // Floating cart badge
        document.getElementById('floating-cart-count').textContent = this.cart.length;
        document.getElementById('floating-cart-btn').style.display =
            this.currentTab === 'create-quotation' ? 'block' : 'none';
    },

    toggleCartPanel() {
        document.getElementById('cart-panel').classList.toggle('active');
        document.getElementById('cart-panel-overlay').classList.toggle('active');
    },

    closeCartPanel() {
        document.getElementById('cart-panel').classList.remove('active');
        document.getElementById('cart-panel-overlay').classList.remove('active');
    },

    // ============================================================
    //  QUOTATION CRUD
    // ============================================================
    loadQuotations() {
        const data = localStorage.getItem(this.KEYS.QUOTATIONS);
        if (data) {
            try { this.quotations = JSON.parse(data); } catch(e) { this.quotations = []; }
        }
        if (!Array.isArray(this.quotations)) this.quotations = [];
    },

    saveQuotations() {
        localStorage.setItem(this.KEYS.QUOTATIONS, JSON.stringify(this.quotations));
    },

    generateQuotationNumber() {
        const year = new Date().getFullYear();
        const prefix = `QV-${year}-`;
        const existing = this.quotations
            .filter(q => q.quotation_number.startsWith(prefix))
            .map(q => {
                const match = q.quotation_number.match(/-(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            });
        const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
        const nextNum = String(maxNum + 1).padStart(3, '0');
        return `${prefix}${nextNum}`;
    },

    generateQuotationId() {
        return 'quotation-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    createQuotation() {
        const client = this.getClient(this.selectedClientId);
        if (!client) {
            this.showToast('Please select a client', 'error');
            return;
        }
        if (this.cart.length === 0) {
            this.showToast('Cart is empty', 'error');
            return;
        }

        const totals = this.getCartTotals();
        const quotation = {
            id: this.generateQuotationId(),
            quotation_number: this.generateQuotationNumber(),
            client_id: client.id,
            client_name: client.name,
            client_company: client.company,
            client_phone: client.phone,
            client_email: client.email,
            client_address: client.address,
            items: this.cart.map(item => ({
                item_code: item.item_code,
                oem_part_number: item.oem_part_number,
                product_name_en: item.product_name_en,
                product_name_cn: item.product_name_cn,
                main_image: item.main_image,
                qty: item.qty,
                unit_price: item.unit_price,
                total: item.qty * item.unit_price
            })),
            subtotal: totals.subtotal,
            tax_rate: this.cartTaxRate,
            tax_amount: totals.taxAmount,
            total: totals.total,
            notes: this.companySettings?.default_notes || '',
            status: 'Draft',
            created_at: new Date().toISOString(),
            sent_via: ''
        };

        this.quotations.unshift(quotation);
        this.saveQuotations();

        // Clear cart
        this.cart = [];
        this.selectedClientId = null;
        this.saveCart();

        this.updateBadges();
        this.updateCartUI();
        this.updateStepIndicators();
        this.renderCatalogForQuotation();

        // Reset client select
        document.getElementById('quotation-client-select').value = '';

        this.showToast(`Quotation ${quotation.quotation_number} created!`, 'success');

        // Auto-open quotation viewer
        this.viewQuotation(quotation.id);
    },

    deleteQuotation(id) {
        if (!confirm('Delete this quotation? This cannot be undone.')) return;
        this.quotations = this.quotations.filter(q => q.id !== id);
        this.saveQuotations();
        this.renderQuotations();
        this.updateBadges();
        this.showToast('Quotation deleted', 'warning');
    },

    updateQuotationStatus(id, status) {
        const q = this.quotations.find(q => q.id === id);
        if (!q) return;
        q.status = status;
        this.saveQuotations();
        this.renderQuotations();
        if (this.viewingQuotationId === id) {
            this.viewQuotation(id);
        }
        this.showToast(`Status updated to ${status}`, 'success');
    },

    // ============================================================
    //  QUOTATION VIEWER
    // ============================================================
    viewQuotation(id) {
        const quotation = this.quotations.find(q => q.id === id);
        if (!quotation) return;
        this.viewingQuotationId = id;
        const html = this.renderQuotationViewerHTML(quotation);
        document.getElementById('quotation-viewer-body').innerHTML = html;
        this.renderQuotationActions(quotation);
        document.getElementById('quotation-viewer-overlay').classList.add('active');
    },

    closeQuotationViewer(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('quotation-viewer-overlay').classList.remove('active');
        this.viewingQuotationId = null;
    },

    renderQuotationViewerHTML(quotation) {
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        let itemsHtml = quotation.items.map((item, idx) => `
            <tr>
                <td class="col-num">${idx + 1}</td>
                <td>${this.escapeHtml(item.item_code)}</td>
                <td>${this.escapeHtml(item.oem_part_number || '-')}</td>
                <td>${this.escapeHtml(item.product_name_en)}</td>
                <td class="col-qty">${item.qty}</td>
                <td class="col-price">${currency}${this.formatNumber(item.unit_price)}</td>
                <td class="col-total">${currency}${this.formatNumber(item.total)}</td>
            </tr>
        `).join('');

        return `
            <div class="pv-quotation-viewer" id="printable-quotation">
                <div class="pv-quotation-viewer-header">
                    <div class="pv-quotation-viewer-company">
                        <div class="pv-quotation-viewer-logo">PARTS<br>VILLAGE</div>
                        <div>
                            <h2>${this.escapeHtml(settings.company_name || 'Parts Village')}</h2>
                            ${settings.phone ? `<p>&#128222; ${this.escapeHtml(settings.phone)}</p>` : ''}
                            ${settings.email ? `<p>&#9993; ${this.escapeHtml(settings.email)}</p>` : ''}
                            ${settings.website ? `<p>&#127760; ${this.escapeHtml(settings.website)}</p>` : ''}
                            ${settings.address ? `<p>${this.escapeHtml(settings.address).replace(/\n/g, '<br>')}</p>` : ''}
                        </div>
                    </div>
                    <div class="pv-quotation-viewer-meta">
                        <h3>QUOTATION</h3>
                        <p><span class="pv-quotation-viewer-label">Quotation #:</span> ${quotation.quotation_number}</p>
                        <p><span class="pv-quotation-viewer-label">Date:</span> ${this.formatDate(quotation.created_at)}</p>
                        <p><span class="pv-quotation-viewer-label">Status:</span> ${quotation.status}</p>
                    </div>
                </div>

                <div class="pv-quotation-viewer-section">
                    <h4>Quotation To:</h4>
                    <div class="pv-quotation-viewer-client-box">
                        <p style="font-weight:700; font-size:1rem; margin-bottom:4px;">${this.escapeHtml(quotation.client_name)}</p>
                        ${quotation.client_company ? `<p>${this.escapeHtml(quotation.client_company)}</p>` : ''}
                        ${quotation.client_address ? `<p>${this.escapeHtml(quotation.client_address).replace(/\n/g, '<br>')}</p>` : ''}
                        <div style="margin-top:8px;">
                            ${quotation.client_phone ? `<p>&#128222; ${this.escapeHtml(quotation.client_phone)}</p>` : ''}
                            ${quotation.client_email ? `<p>&#9993; ${this.escapeHtml(quotation.client_email)}</p>` : ''}
                        </div>
                    </div>
                </div>

                <div class="pv-quotation-viewer-section">
                    <h4>Items:</h4>
                    <table class="pv-quotation-table">
                        <thead>
                            <tr>
                                <th class="col-num">#</th>
                                <th>Item Code</th>
                                <th>OEM Part Number</th>
                                <th>Description</th>
                                <th class="col-qty">Qty</th>
                                <th class="col-price">Unit Price</th>
                                <th class="col-total">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>

                <div class="pv-quotation-summary">
                    <div class="pv-quotation-summary-box">
                        <div class="pv-quotation-summary-row">
                            <span>Subtotal</span>
                            <span>${currency}${this.formatNumber(quotation.subtotal)}</span>
                        </div>
                        ${quotation.tax_rate > 0 ? `
                        <div class="pv-quotation-summary-row">
                            <span>Tax (${quotation.tax_rate}%)</span>
                            <span>${currency}${this.formatNumber(quotation.tax_amount)}</span>
                        </div>
                        ` : ''}
                        <div class="pv-quotation-summary-row grand-total">
                            <span>Grand Total</span>
                            <span>${currency}${this.formatNumber(quotation.total)}</span>
                        </div>
                    </div>
                </div>

                ${quotation.notes ? `
                <div class="pv-quotation-viewer-notes">
                    <h4>Terms & Notes</h4>
                    <div style="white-space:pre-line;">${this.escapeHtml(quotation.notes)}</div>
                </div>
                ` : ''}

                ${settings.bank_details ? `
                <div class="pv-quotation-viewer-bank">
                    <h4>Bank / Payment Details</h4>
                    <div style="white-space:pre-line;">${this.escapeHtml(settings.bank_details)}</div>
                </div>
                ` : ''}

                <div class="pv-quotation-viewer-footer-text">
                    Thank you for your business. This quotation is valid for 30 days from the date of issue.<br>
                    ${this.escapeHtml(settings.company_name || 'Parts Village')} &copy; ${new Date().getFullYear()}
                </div>
            </div>
        `;
    },

    renderQuotationActions(quotation) {
        const statuses = ['Draft', 'Sent', 'Approved', 'Rejected'];
        const statusOptions = statuses.map(s =>
            `<option value="${s}" ${quotation.status === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        document.getElementById('quotation-viewer-actions').innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.8rem; color:var(--text-muted);">Status:</label>
                <select class="pv-select" style="min-width:120px;" onchange="app.updateQuotationStatus('${quotation.id}', this.value)">
                    ${statusOptions}
                </select>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
                <button class="pv-btn pv-btn-silver" onclick="app.printQuotation('${quotation.id}')">
                    &#128424; Print / PDF
                </button>
                <button class="pv-btn pv-btn-success" onclick="app.shareWhatsApp('${quotation.id}')">
                    &#128241; WhatsApp
                </button>
                <button class="pv-btn pv-btn-outline" onclick="app.shareEmail('${quotation.id}')">
                    &#9993; Email
                </button>
                <button class="pv-btn pv-btn-outline" onclick="app.createInvoiceFromQuotation('${quotation.id}')">
                    &#128179; Convert to Invoice
                </button>
                <button class="pv-btn pv-btn-danger pv-btn-sm" onclick="app.deleteQuotation('${quotation.id}')">
                    &#128465; Delete
                </button>
            </div>
        `;
    },

    // ============================================================
    //  INVOICE CRUD
    // ============================================================
    loadInvoices() {
        const data = localStorage.getItem(this.KEYS.INVOICES);
        if (data) {
            try { this.invoices = JSON.parse(data); } catch(e) { this.invoices = []; }
        }
        if (!Array.isArray(this.invoices)) this.invoices = [];
    },

    saveInvoices() {
        localStorage.setItem(this.KEYS.INVOICES, JSON.stringify(this.invoices));
    },

    generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const existing = this.invoices
            .filter(inv => inv.invoice_number.startsWith(prefix))
            .map(inv => {
                const match = inv.invoice_number.match(/-(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            });
        const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
        const nextNum = String(maxNum + 1).padStart(3, '0');
        return `${prefix}${nextNum}`;
    },

    generateReceiptNumber() {
        const year = new Date().getFullYear();
        const prefix = `RC-${year}-`;
        const allReceipts = [];
        this.invoices.forEach(inv => {
            if (inv.payments && inv.payments.length > 0) {
                inv.payments.forEach(p => {
                    if (p.receipt_number && p.receipt_number.startsWith(prefix)) {
                        const match = p.receipt_number.match(/-(\d+)$/);
                        if (match) allReceipts.push(parseInt(match[1]));
                    }
                });
            }
        });
        const maxNum = allReceipts.length > 0 ? Math.max(...allReceipts) : 0;
        const nextNum = String(maxNum + 1).padStart(3, '0');
        return `${prefix}${nextNum}`;
    },

    generateInvoiceId() {
        return 'invoice-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    generatePaymentId() {
        return 'payment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    getDefaultDueDate() {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    },

    createInvoiceFromQuotation(quotationId) {
        const quotation = this.quotations.find(q => q.id === quotationId);
        if (!quotation) {
            this.showToast('Quotation not found', 'error');
            return;
        }

        const invoice = {
            id: this.generateInvoiceId(),
            invoice_number: this.generateInvoiceNumber(),
            quotation_id: quotation.id,
            quotation_number: quotation.quotation_number,
            client_id: quotation.client_id,
            client_name: quotation.client_name,
            client_company: quotation.client_company,
            client_phone: quotation.client_phone,
            client_email: quotation.client_email,
            client_address: quotation.client_address,
            items: quotation.items.map(item => ({ ...item })),
            subtotal: quotation.subtotal,
            tax_rate: quotation.tax_rate,
            tax_amount: quotation.tax_amount,
            total: quotation.total,
            amount_paid: 0,
            balance_due: quotation.total,
            status: 'Draft',
            due_date: this.getDefaultDueDate(),
            notes: quotation.notes || this.companySettings?.default_notes || '',
            created_at: new Date().toISOString(),
            payments: []
        };

        this.invoices.unshift(invoice);
        this.saveInvoices();
        this.updateBadges();
        this.showToast(`Invoice ${invoice.invoice_number} created from quotation!`, 'success');

        // Close quotation viewer if open and switch to invoice viewer
        this.closeQuotationViewer();
        this.viewInvoice(invoice.id);
        return invoice;
    },

    createDirectInvoice(clientId) {
        const client = this.getClient(clientId);
        if (!client) {
            this.showToast('Client not found', 'error');
            return;
        }

        const invoice = {
            id: this.generateInvoiceId(),
            invoice_number: this.generateInvoiceNumber(),
            quotation_id: '',
            quotation_number: '',
            client_id: client.id,
            client_name: client.name,
            client_company: client.company,
            client_phone: client.phone,
            client_email: client.email,
            client_address: client.address,
            items: [],
            subtotal: 0,
            tax_rate: this.companySettings?.default_tax_rate || 0,
            tax_amount: 0,
            total: 0,
            amount_paid: 0,
            balance_due: 0,
            status: 'Draft',
            due_date: this.getDefaultDueDate(),
            notes: this.companySettings?.default_notes || '',
            created_at: new Date().toISOString(),
            payments: []
        };

        this.invoices.unshift(invoice);
        this.saveInvoices();
        this.updateBadges();
        this.showToast(`Invoice ${invoice.invoice_number} created!`, 'success');
        this.viewInvoice(invoice.id);
        return invoice;
    },

    startInvoiceForClient(clientId) {
        const id = clientId || this._selectedClientDetailId;
        if (!id) return;
        this.closeClientDetailModal();
        this.createDirectInvoice(id);
    },

    saveInvoice(invoiceData) {
        const idx = this.invoices.findIndex(inv => inv.id === invoiceData.id);
        if (idx === -1) {
            this.showToast('Invoice not found', 'error');
            return;
        }

        // Recalculate totals
        const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        const tax_amount = subtotal * (invoiceData.tax_rate / 100);
        const total = subtotal + tax_amount;
        const amount_paid = this.invoices[idx].amount_paid;
        const balance_due = total - amount_paid;

        // Determine status based on payment
        let status = invoiceData.status;
        if (balance_due <= 0 && amount_paid > 0) {
            status = 'Paid';
        } else if (amount_paid > 0 && balance_due > 0) {
            status = 'Partially Paid';
        }

        this.invoices[idx] = {
            ...this.invoices[idx],
            ...invoiceData,
            subtotal,
            tax_amount,
            total,
            balance_due: Math.max(0, balance_due),
            status
        };

        this.saveInvoices();
        this.renderInvoices();
        this.updateBadges();
        this.showToast('Invoice saved successfully', 'success');
        return this.invoices[idx];
    },

    deleteInvoice(id) {
        if (!confirm('Delete this invoice? This cannot be undone.')) return;
        this.invoices = this.invoices.filter(inv => inv.id !== id);
        this.saveInvoices();
        this.renderInvoices();
        this.updateBadges();
        this.showToast('Invoice deleted', 'warning');
    },

    updateInvoiceStatus(id, status) {
        const inv = this.invoices.find(i => i.id === id);
        if (!inv) return;
        inv.status = status;
        this.saveInvoices();
        this.renderInvoices();
        if (this.viewingInvoiceId === id) {
            this.viewInvoice(id);
        }
        this.showToast(`Status updated to ${status}`, 'success');
    },

    // ---------- Invoice Item Management ----------
    addItemToInvoice(invoiceId, itemCode) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        const item = (window.PVCatalog?.items || []).find(i => i.item_code === itemCode);
        if (!item) return;
        if (invoice.items.find(i => i.item_code === itemCode)) {
            this.showToast('Item already in invoice', 'warning');
            return;
        }

        invoice.items.push({
            item_code: item.item_code,
            oem_part_number: item.oem_part_number || '',
            product_name_en: item.product_name_en || '',
            product_name_cn: item.product_name_cn || '',
            main_image: item.main_image || '',
            qty: 1,
            unit_price: parseFloat(item.list_price) || 0,
            total: parseFloat(item.list_price) || 0
        });

        this.recalculateInvoice(invoiceId);
        this.viewInvoice(invoiceId);
        this.showToast(`${item.product_name_en} added to invoice`, 'success');
    },

    removeItemFromInvoice(invoiceId, itemCode) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        invoice.items = invoice.items.filter(i => i.item_code !== itemCode);
        this.recalculateInvoice(invoiceId);
        this.viewInvoice(invoiceId);
        this.showToast('Item removed from invoice', 'warning');
    },

    updateInvoiceItemQty(invoiceId, itemCode, qty) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        const item = invoice.items.find(i => i.item_code === itemCode);
        if (!item) return;
        qty = parseInt(qty);
        if (isNaN(qty) || qty < 1) qty = 1;
        item.qty = qty;
        item.total = item.qty * item.unit_price;
        this.recalculateInvoice(invoiceId);
        this.viewInvoice(invoiceId);
    },

    updateInvoiceItemPrice(invoiceId, itemCode, price) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        const item = invoice.items.find(i => i.item_code === itemCode);
        if (!item) return;
        price = parseFloat(price);
        if (isNaN(price) || price < 0) price = 0;
        item.unit_price = price;
        item.total = item.qty * item.unit_price;
        this.recalculateInvoice(invoiceId);
        this.viewInvoice(invoiceId);
    },

    updateInvoiceTaxRate(invoiceId, rate) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        invoice.tax_rate = parseFloat(rate) || 0;
        this.recalculateInvoice(invoiceId);
        this.viewInvoice(invoiceId);
    },

    recalculateInvoice(invoiceId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        invoice.tax_amount = invoice.subtotal * (invoice.tax_rate / 100);
        invoice.total = invoice.subtotal + invoice.tax_amount;
        invoice.balance_due = Math.max(0, invoice.total - invoice.amount_paid);

        // Auto-update status based on payment
        if (invoice.amount_paid >= invoice.total && invoice.total > 0) {
            invoice.status = 'Paid';
        } else if (invoice.amount_paid > 0 && invoice.amount_paid < invoice.total) {
            invoice.status = 'Partially Paid';
        }

        this.saveInvoices();
        this.renderInvoices();
    },

    updateInvoiceDueDate(invoiceId, dueDate) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        invoice.due_date = dueDate;
        this.saveInvoices();
        this.renderInvoices();
    },

    updateInvoiceNotes(invoiceId, notes) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        invoice.notes = notes;
        this.saveInvoices();
    },

    // ============================================================
    //  PAYMENT & RECEIPT
    // ============================================================
    recordPayment(invoiceId, amount, method, date, notes) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) {
            this.showToast('Invoice not found', 'error');
            return null;
        }

        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return null;
        }

        const payment = {
            id: this.generatePaymentId(),
            amount: amount,
            method: method || 'Cash',
            date: date || new Date().toISOString().split('T')[0],
            notes: notes || '',
            receipt_number: this.generateReceiptNumber()
        };

        if (!invoice.payments) invoice.payments = [];
        invoice.payments.unshift(payment);
        invoice.amount_paid = (invoice.amount_paid || 0) + amount;
        invoice.balance_due = Math.max(0, invoice.total - invoice.amount_paid);

        // Update status
        if (invoice.balance_due <= 0) {
            invoice.status = 'Paid';
        } else {
            invoice.status = 'Partially Paid';
        }

        this.saveInvoices();
        this.renderInvoices();
        this.updateBadges();
        this.showToast(`Payment of ${this.getCurrency()}${this.formatNumber(amount)} recorded`, 'success');
        return payment;
    },

    deletePayment(invoiceId, paymentId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice || !invoice.payments) return;
        const payment = invoice.payments.find(p => p.id === paymentId);
        if (!payment) return;

        if (!confirm(`Delete payment of ${this.getCurrency()}${this.formatNumber(payment.amount)}? This will reverse the payment.`)) return;

        invoice.amount_paid = Math.max(0, (invoice.amount_paid || 0) - payment.amount);
        invoice.balance_due = invoice.total - invoice.amount_paid;
        invoice.payments = invoice.payments.filter(p => p.id !== paymentId);

        // Update status
        if (invoice.amount_paid <= 0) {
            invoice.status = invoice.payments.length === 0 ? 'Sent' : 'Draft';
        } else if (invoice.amount_paid < invoice.total) {
            invoice.status = 'Partially Paid';
        }

        this.saveInvoices();
        this.renderInvoices();
        this.updateBadges();
        this.showToast('Payment deleted', 'warning');
    },

    getClientBalance(clientId) {
        return this.invoices
            .filter(inv => inv.client_id === clientId)
            .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    },

    getTotalOutstanding() {
        return this.invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    },

    // ============================================================
    //  INVOICE VIEWER
    // ============================================================
    viewInvoice(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if (!invoice) return;
        this.viewingInvoiceId = id;
        const html = this.renderInvoiceViewerHTML(invoice);
        document.getElementById('invoice-viewer-body').innerHTML = html;
        this.renderInvoiceActions(invoice);
        document.getElementById('invoice-viewer-overlay').classList.add('active');
    },

    closeInvoiceViewer(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('invoice-viewer-overlay').classList.remove('active');
        this.viewingInvoiceId = null;
    },

    renderInvoiceViewerHTML(invoice) {
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';
        const isOverdue = invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.due_date && new Date(invoice.due_date) < new Date();

        let itemsHtml = '';
        const isDraft = invoice.status === 'Draft';
        if (invoice.items && invoice.items.length > 0) {
            itemsHtml = invoice.items.map((item, idx) => `
                <tr>
                    <td class="col-num">${idx + 1}</td>
                    <td>${this.escapeHtml(item.item_code)}</td>
                    <td>${this.escapeHtml(item.oem_part_number || '-')}</td>
                    <td>${this.escapeHtml(item.product_name_en)}</td>
                    <td class="col-qty">
                        ${isDraft ? `
                            <div class="pv-invoice-item-qty">
                                <button onclick="app.updateInvoiceItemQty('${invoice.id}', '${item.item_code}', ${item.qty - 1})">&#8722;</button>
                                <input type="number" value="${item.qty}" min="1" onchange="app.updateInvoiceItemQty('${invoice.id}', '${item.item_code}', this.value)">
                                <button onclick="app.updateInvoiceItemQty('${invoice.id}', '${item.item_code}', ${item.qty + 1})">+</button>
                            </div>
                        ` : item.qty}
                    </td>
                    <td class="col-price">
                        ${isDraft ? `
                            <div style="display:flex; align-items:center; gap:4px; justify-content:center;">
                                <span style="font-size:0.7rem; color:#888;">${currency}</span>
                                <input type="number" class="pv-invoice-price-input" value="${item.unit_price}" min="0" step="0.01" onchange="app.updateInvoiceItemPrice('${invoice.id}', '${item.item_code}', this.value)">
                            </div>
                        ` : currency + this.formatNumber(item.unit_price)}
                    </td>
                    <td class="col-total">${currency}${this.formatNumber(item.qty * item.unit_price)}${isDraft ? ` <button class="pv-action-btn danger" style="margin-left:6px;" onclick="app.removeItemFromInvoice('${invoice.id}', '${item.item_code}')" title="Remove">&#128465;</button>` : ''}</td>
                </tr>
            `).join('');
        } else {
            itemsHtml = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#888;">No items yet. Use the catalog below to add items.</td></tr>`;
        }

        // Payment history
        let paymentHtml = '';
        if (invoice.payments && invoice.payments.length > 0) {
            paymentHtml = `
                <div class="pv-invoice-payment-history">
                    <h4>Payment History</h4>
                    <table class="pv-payment-table">
                        <thead>
                            <tr>
                                <th>Receipt #</th>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Notes</th>
                                <th class="no-print"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.payments.map(p => `
                                <tr>
                                    <td class="col-receipt">${p.receipt_number}</td>
                                    <td>${this.formatDate(p.date)}</td>
                                    <td>${this.escapeHtml(p.method)}</td>
                                    <td class="col-amount" style="color:var(--success);">+${currency}${this.formatNumber(p.amount)}</td>
                                    <td>${this.escapeHtml(p.notes || '-')}</td>
                                    <td class="no-print">
                                        <button class="pv-action-btn" onclick="app.viewReceipt('${invoice.id}', '${p.id}')" title="View Receipt">&#128441;</button>
                                        <button class="pv-action-btn danger" onclick="app.deletePayment('${invoice.id}', '${p.id}')" title="Delete Payment">&#128465;</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Balance display
        const balanceColor = invoice.balance_due <= 0 ? 'paid' : (isOverdue ? 'overdue' : 'partial');

        return `
            <div class="pv-invoice-viewer" id="printable-invoice">
                <div class="pv-invoice-viewer-header">
                    <div class="pv-invoice-viewer-company">
                        <img src="../images/logo-wordmark-dark.png" class="doc-logo" onerror="this.style.display='none'; this.parentNode.insertAdjacentHTML('afterbegin', '<div class=\\'pv-quotation-viewer-logo\\'>PARTS<br>VILLAGE</div>');" alt="">
                        <div>
                            <h2>${this.escapeHtml(settings.company_name || 'Parts Village')}</h2>
                            ${settings.phone ? `<p>&#128222; ${this.escapeHtml(settings.phone)}</p>` : ''}
                            ${settings.email ? `<p>&#9993; ${this.escapeHtml(settings.email)}</p>` : ''}
                            ${settings.website ? `<p>&#127760; ${this.escapeHtml(settings.website)}</p>` : ''}
                            ${settings.address ? `<p>${this.escapeHtml(settings.address).replace(/\n/g, '<br>')}</p>` : ''}
                        </div>
                    </div>
                    <div class="pv-invoice-viewer-meta">
                        <h3>TAX INVOICE</h3>
                        <p><span class="pv-invoice-viewer-label">Invoice #:</span> ${invoice.invoice_number}</p>
                        ${invoice.quotation_number ? `<p><span class="pv-invoice-viewer-label">Quotation Ref:</span> ${invoice.quotation_number}</p>` : ''}
                        <p><span class="pv-invoice-viewer-label">Date:</span> ${this.formatDate(invoice.created_at)}</p>
                        <p><span class="pv-invoice-viewer-label">Due Date:</span> ${this.formatDate(invoice.due_date)}</p>
                        <p><span class="pv-invoice-viewer-label">Status:</span> <span class="pv-badge pv-badge-${invoice.status.toLowerCase().replace(/\s+/g, '-')}">${invoice.status}${isOverdue && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' ? ' (Overdue)' : ''}</span></p>
                    </div>
                </div>

                <div class="pv-invoice-viewer-section">
                    <h4>Bill To:</h4>
                    <div class="pv-invoice-viewer-client-box">
                        <p style="font-weight:700; font-size:1rem; margin-bottom:4px;">${this.escapeHtml(invoice.client_name)}</p>
                        ${invoice.client_company ? `<p>${this.escapeHtml(invoice.client_company)}</p>` : ''}
                        ${invoice.client_address ? `<p>${this.escapeHtml(invoice.client_address).replace(/\n/g, '<br>')}</p>` : ''}
                        <div style="margin-top:8px;">
                            ${invoice.client_phone ? `<p>&#128222; ${this.escapeHtml(invoice.client_phone)}</p>` : ''}
                            ${invoice.client_email ? `<p>&#9993; ${this.escapeHtml(invoice.client_email)}</p>` : ''}
                        </div>
                    </div>
                </div>

                <div class="pv-invoice-viewer-section">
                    <h4>Items:</h4>
                    <table class="pv-quotation-table">
                        <thead>
                            <tr>
                                <th class="col-num">#</th>
                                <th>Item Code</th>
                                <th>OEM Part Number</th>
                                <th>Description</th>
                                <th class="col-qty">Qty</th>
                                <th class="col-price">Unit Price</th>
                                <th class="col-total">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>

                <div class="pv-invoice-summary">
                    <div class="pv-invoice-summary-box">
                        <div class="pv-invoice-summary-row">
                            <span>Subtotal</span>
                            <span>${currency}${this.formatNumber(invoice.subtotal)}</span>
                        </div>
                        ${invoice.tax_rate > 0 ? `
                        <div class="pv-invoice-summary-row">
                            <span>Tax (${invoice.tax_rate}%)</span>
                            <span>${currency}${this.formatNumber(invoice.tax_amount)}</span>
                        </div>
                        ` : ''}
                        <div class="pv-invoice-summary-row grand-total">
                            <span>Total</span>
                            <span>${currency}${this.formatNumber(invoice.total)}</span>
                        </div>
                        <div class="pv-invoice-summary-row paid-row">
                            <span>Amount Paid</span>
                            <span style="color:var(--success);">${currency}${this.formatNumber(invoice.amount_paid)}</span>
                        </div>
                        <div class="pv-invoice-summary-row balance-row ${balanceColor}">
                            <span>Balance Due</span>
                            <span>${currency}${this.formatNumber(invoice.balance_due)}</span>
                        </div>
                    </div>
                </div>

                ${paymentHtml}

                ${invoice.notes ? `
                <div class="pv-invoice-viewer-notes">
                    <h4>Terms & Notes</h4>
                    <div style="white-space:pre-line;">${this.escapeHtml(invoice.notes)}</div>
                </div>
                ` : ''}

                ${settings.bank_details ? `
                <div class="pv-invoice-viewer-bank">
                    <h4>Bank / Payment Details</h4>
                    <div style="white-space:pre-line;">${this.escapeHtml(settings.bank_details)}</div>
                </div>
                ` : ''}

                <div class="pv-invoice-viewer-footer-text">
                    Thank you for your business.<br>
                    ${this.escapeHtml(settings.company_name || 'Parts Village')} &copy; ${new Date().getFullYear()}
                </div>

                <!-- Inline catalog browser for adding items (Draft only) -->
                ${invoice.status === 'Draft' ? `
                <div class="pv-invoice-catalog-section no-print">
                    <h4>Add Items from Catalog</h4>
                    <div class="pv-invoice-catalog-search">
                        <input type="text" class="pv-search-input" id="invoice-catalog-search" placeholder="Search catalog..." oninput="app.renderCatalogForInvoice('${invoice.id}')">
                    </div>
                    <div class="pv-invoice-catalog-grid" id="invoice-catalog-grid">
                        ${this.renderCatalogForInvoiceHTML(invoice.id)}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    },

    renderInvoiceActions(invoice) {
        const statuses = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];
        const statusOptions = statuses.map(s =>
            `<option value="${s}" ${invoice.status === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        const canEdit = invoice.status === 'Draft';
        const canPay = invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.status !== 'Draft';
        const canAddItems = invoice.status === 'Draft';

        document.getElementById('invoice-viewer-actions').innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.8rem; color:var(--text-muted);">Status:</label>
                <select class="pv-select" style="min-width:140px;" onchange="app.updateInvoiceStatus('${invoice.id}', this.value)">
                    ${statusOptions}
                </select>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
                ${canPay ? `
                <button class="pv-btn pv-btn-success" onclick="app.openPaymentModal('${invoice.id}')">
                    &#128179; Record Payment
                </button>
                ` : ''}
                ${invoice.payments && invoice.payments.length > 0 ? `
                <button class="pv-btn pv-btn-outline" onclick="app.viewLatestReceipt('${invoice.id}')">
                    &#128441; Latest Receipt
                </button>
                ` : ''}
                <button class="pv-btn pv-btn-silver" onclick="app.printInvoice('${invoice.id}')">
                    &#128424; Print / PDF
                </button>
                <button class="pv-btn pv-btn-success" onclick="app.shareInvoiceWhatsApp('${invoice.id}')">
                    &#128241; WhatsApp
                </button>
                <button class="pv-btn pv-btn-outline" onclick="app.shareInvoiceEmail('${invoice.id}')">
                    &#9993; Email
                </button>
                <button class="pv-btn pv-btn-danger pv-btn-sm" onclick="app.deleteInvoice('${invoice.id}')">
                    &#128465; Delete
                </button>
            </div>
        `;
    },

    renderCatalogForInvoiceHTML(invoiceId) {
        const items = (window.PVCatalog?.items || []).slice(0, 12);
        const invoice = this.invoices.find(i => i.id === invoiceId);
        const currency = this.getCurrency();

        if (!items || items.length === 0) {
            return '<div style="color:var(--text-muted); padding:20px; text-align:center;">No catalog items available</div>';
        }

        return items.map(item => {
            const inInvoice = invoice && invoice.items.find(i => i.item_code === item.item_code);
            return `
                <div class="pv-invoice-catalog-card">
                    <div class="pv-invoice-catalog-img">
                        ${item.main_image ? `<img src="${item.main_image}" alt="" onerror="this.style.display='none'; this.parentNode.innerHTML='&#128230;';">` : '&#128230;'}
                    </div>
                    <div class="pv-invoice-catalog-code">${this.escapeHtml(item.item_code)}</div>
                    <div class="pv-invoice-catalog-name" title="${this.escapeHtml(item.product_name_en)}">${this.escapeHtml(item.product_name_en)}</div>
                    <div class="pv-invoice-catalog-price">${currency}${this.formatNumber(item.list_price || 0)}</div>
                    <button class="pv-btn pv-btn-silver pv-btn-sm" onclick="app.addItemToInvoice('${invoiceId}', '${item.item_code}')" ${inInvoice ? 'disabled' : ''}>
                        ${inInvoice ? '&#10003; Added' : '+ Add'}
                    </button>
                </div>
            `;
        }).join('');
    },

    renderCatalogForInvoice(invoiceId) {
        const search = (document.getElementById('invoice-catalog-search').value || '').toLowerCase();
        const invoice = this.invoices.find(i => i.id === invoiceId);
        const currency = this.getCurrency();
        const items = (window.PVCatalog?.items || []).filter(item => {
            if (!search) return true;
            return (item.product_name_en || '').toLowerCase().includes(search) ||
                (item.oem_part_number || '').toLowerCase().includes(search) ||
                (item.item_code || '').toLowerCase().includes(search);
        }).slice(0, 20);

        const grid = document.getElementById('invoice-catalog-grid');
        if (!grid) return;

        if (items.length === 0) {
            grid.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center;">No items found</div>';
            return;
        }

        grid.innerHTML = items.map(item => {
            const inInvoice = invoice && invoice.items.find(i => i.item_code === item.item_code);
            return `
                <div class="pv-invoice-catalog-card">
                    <div class="pv-invoice-catalog-img">
                        ${item.main_image ? `<img src="${item.main_image}" alt="" onerror="this.style.display='none'; this.parentNode.innerHTML='&#128230;';">` : '&#128230;'}
                    </div>
                    <div class="pv-invoice-catalog-code">${this.escapeHtml(item.item_code)}</div>
                    <div class="pv-invoice-catalog-name" title="${this.escapeHtml(item.product_name_en)}">${this.escapeHtml(item.product_name_en)}</div>
                    <div class="pv-invoice-catalog-price">${currency}${this.formatNumber(item.list_price || 0)}</div>
                    <button class="pv-btn pv-btn-silver pv-btn-sm" onclick="app.addItemToInvoice('${invoiceId}', '${item.item_code}')" ${inInvoice ? 'disabled' : ''}>
                        ${inInvoice ? '&#10003; Added' : '+ Add'}
                    </button>
                </div>
            `;
        }).join('');
    },

    // ============================================================
    //  PAYMENT MODAL
    // ============================================================
    openPaymentModal(invoiceId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        this._paymentInvoiceId = invoiceId;

        document.getElementById('payment-modal-title').textContent = `Record Payment - ${invoice.invoice_number}`;
        document.getElementById('payment-amount').value = this.formatNumber(invoice.balance_due);
        document.getElementById('payment-method').value = 'Cash';
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('payment-notes').value = '';
        document.getElementById('payment-modal-overlay').classList.add('active');
    },

    closePaymentModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('payment-modal-overlay').classList.remove('active');
        this._paymentInvoiceId = null;
    },

    savePayment() {
        if (!this._paymentInvoiceId) return;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const method = document.getElementById('payment-method').value;
        const date = document.getElementById('payment-date').value;
        const notes = document.getElementById('payment-notes').value;

        if (isNaN(amount) || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        const payment = this.recordPayment(this._paymentInvoiceId, amount, method, date, notes);
        if (payment) {
            this.closePaymentModal();
            // Show receipt
            this.viewReceipt(this._paymentInvoiceId, payment.id);
        }
    },

    // ============================================================
    //  RECEIPT VIEWER
    // ============================================================
    viewReceipt(invoiceId, paymentId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice || !invoice.payments) return;
        const payment = invoice.payments.find(p => p.id === paymentId);
        if (!payment) return;

        this._viewingReceiptPaymentId = paymentId;
        this.viewingInvoiceId = invoiceId;

        const html = this.renderReceiptViewerHTML(payment, invoice);
        document.getElementById('receipt-viewer-body').innerHTML = html;

        // Update the print button to use the specific payment
        const actions = document.querySelector('#receipt-viewer-overlay .pv-quotation-actions');
        if (actions) {
            actions.innerHTML = `
                <button class="pv-btn pv-btn-silver" onclick="app.printReceipt('${paymentId}')">&#128424; Print Receipt</button>
                <button class="pv-btn pv-btn-outline" onclick="app.closeReceiptViewer()">Close</button>
            `;
        }

        document.getElementById('receipt-viewer-overlay').classList.add('active');
    },

    viewLatestReceipt(invoiceId) {
        const invoice = this.invoices.find(i => i.id === invoiceId);
        if (!invoice || !invoice.payments || invoice.payments.length === 0) return;
        this.viewReceipt(invoiceId, invoice.payments[0].id);
    },

    closeReceiptViewer(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('receipt-viewer-overlay').classList.remove('active');
        this._viewingReceiptPaymentId = null;
    },

    renderReceiptViewerHTML(payment, invoice) {
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        return `
            <div class="pv-receipt-viewer" id="printable-receipt">
                <div class="pv-receipt-header">
                    <img src="../images/logo-wordmark-dark.png" class="doc-logo" onerror="this.style.display='none'; this.parentNode.insertAdjacentHTML('afterbegin', '<div style=\\'display:flex; align-items:center; gap:12px;\\'><div class=\\'pv-quotation-viewer-logo\\'>PARTS<br>VILLAGE</div></div>');" alt="">
                    <div>
                        <h2>${this.escapeHtml(settings.company_name || 'Parts Village')}</h2>
                        ${settings.phone ? `<p>&#128222; ${this.escapeHtml(settings.phone)}</p>` : ''}
                        ${settings.email ? `<p>&#9993; ${this.escapeHtml(settings.email)}</p>` : ''}
                        ${settings.address ? `<p>${this.escapeHtml(settings.address).replace(/\n/g, '<br>')}</p>` : ''}
                    </div>
                </div>

                <div class="pv-receipt-title">PAYMENT RECEIPT</div>

                <div class="pv-receipt-meta">
                    <div class="pv-receipt-meta-row">
                        <span class="pv-receipt-label">Receipt #:</span>
                        <span>${payment.receipt_number}</span>
                    </div>
                    <div class="pv-receipt-meta-row">
                        <span class="pv-receipt-label">Date:</span>
                        <span>${this.formatDate(payment.date)}</span>
                    </div>
                    <div class="pv-receipt-meta-row">
                        <span class="pv-receipt-label">Invoice #:</span>
                        <span>${invoice.invoice_number}</span>
                    </div>
                    <div class="pv-receipt-meta-row">
                        <span class="pv-receipt-label">Payment Method:</span>
                        <span>${this.escapeHtml(payment.method)}</span>
                    </div>
                </div>

                <div class="pv-receipt-from">
                    <div class="pv-receipt-label" style="margin-bottom:6px;">Received From:</div>
                    <div style="font-weight:700; font-size:1.1rem;">${this.escapeHtml(invoice.client_name)}</div>
                    ${invoice.client_company ? `<div>${this.escapeHtml(invoice.client_company)}</div>` : ''}
                    ${invoice.client_phone ? `<div>&#128222; ${this.escapeHtml(invoice.client_phone)}</div>` : ''}
                    ${invoice.client_email ? `<div>&#9993; ${this.escapeHtml(invoice.client_email)}</div>` : ''}
                </div>

                <div class="pv-receipt-amount">
                    <div class="pv-receipt-label">Amount Received</div>
                    <div class="pv-receipt-amount-value">${currency}${this.formatNumber(payment.amount)}</div>
                </div>

                <div class="pv-receipt-balance">
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e0e0e0;">
                        <span>Invoice Total</span>
                        <span>${currency}${this.formatNumber(invoice.total)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e0e0e0;">
                        <span>Amount Paid</span>
                        <span style="color:var(--success);">${currency}${this.formatNumber(invoice.amount_paid)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; font-weight:700; font-size:1rem;">
                        <span>Balance Remaining</span>
                        <span>${currency}${this.formatNumber(invoice.balance_due)}</span>
                    </div>
                </div>

                ${payment.notes ? `
                <div class="pv-receipt-notes">
                    <strong>Notes:</strong> ${this.escapeHtml(payment.notes)}
                </div>
                ` : ''}

                <div class="pv-receipt-thanks">
                    Thank you for your payment!
                </div>

                <div class="pv-receipt-footer">
                    ${this.escapeHtml(settings.company_name || 'Parts Village')} &copy; ${new Date().getFullYear()}<br>
                    This is a computer-generated receipt and does not require a signature.
                </div>
            </div>
        `;
    },

    // ============================================================
    //  PRINT / SHARE / EXPORT (Invoices & Receipts)
    // ============================================================
    printInvoice(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if (!invoice) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this.showToast('Popup blocked. Please allow popups.', 'error');
            return;
        }

        const settings = this.companySettings || {};
        const currency = settings.currency || '$';
        const isOverdue = invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.due_date && new Date(invoice.due_date) < new Date();

        let itemsHtml = '';
        if (invoice.items && invoice.items.length > 0) {
            itemsHtml = invoice.items.map((item, idx) => `
                <tr>
                    <td style="text-align:center; border:1px solid #ccc; padding:8px;">${idx + 1}</td>
                    <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(item.item_code)}</td>
                    <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(item.oem_part_number || '-')}</td>
                    <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(item.product_name_en)}</td>
                    <td style="text-align:center; border:1px solid #ccc; padding:8px;">${item.qty}</td>
                    <td style="text-align:right; border:1px solid #ccc; padding:8px;">${currency}${this.formatNumber(item.unit_price)}</td>
                    <td style="text-align:right; border:1px solid #ccc; padding:8px; font-weight:600;">${currency}${this.formatNumber(item.qty * item.unit_price)}</td>
                </tr>
            `).join('');
        }

        let paymentHtml = '';
        if (invoice.payments && invoice.payments.length > 0) {
            paymentHtml = `
                <h3 style="font-size:1rem; margin:20px 0 10px; color:#333;">Payment History</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.8rem; margin-bottom:20px;">
                    <thead>
                        <tr style="background:#f0f0f0;">
                            <th style="border:1px solid #ccc; padding:8px; text-align:left;">Receipt #</th>
                            <th style="border:1px solid #ccc; padding:8px; text-align:left;">Date</th>
                            <th style="border:1px solid #ccc; padding:8px; text-align:left;">Method</th>
                            <th style="border:1px solid #ccc; padding:8px; text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.payments.map(p => `
                            <tr>
                                <td style="border:1px solid #ccc; padding:8px;">${p.receipt_number}</td>
                                <td style="border:1px solid #ccc; padding:8px;">${this.formatDate(p.date)}</td>
                                <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(p.method)}</td>
                                <td style="border:1px solid #ccc; padding:8px; text-align:right; color:#4caf50;">+${currency}${this.formatNumber(p.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.invoice_number}</title>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Segoe UI',Arial,sans-serif; padding:30px; color:#000; background:#fff; }
                    .header { display:flex; justify-content:space-between; border-bottom:3px solid #c0c0c0; padding-bottom:20px; margin-bottom:30px; }
                    .header-left { display:flex; align-items:center; gap:16px; }
                    .logo { width:60px; height:60px; background:#c0c0c0; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; text-align:center; color:#0a0a0a; }
                    .header-left h1 { font-size:1.4rem; letter-spacing:2px; text-transform:uppercase; }
                    .header-left p { font-size:0.8rem; color:#555; margin-top:2px; }
                    .header-right { text-align:right; }
                    .header-right h2 { font-size:1.3rem; color:#333; margin-bottom:6px; }
                    .header-right p { font-size:0.8rem; color:#666; }
                    .status-badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.7rem; font-weight:700; text-transform:uppercase; margin-top:6px; }
                    .client-box { background:#f8f8f8; border:1px solid #e0e0e0; padding:16px; border-radius:6px; margin-bottom:24px; }
                    .client-box p { margin-bottom:2px; font-size:0.85rem; color:#444; }
                    table { width:100%; border-collapse:collapse; font-size:0.8rem; margin-top:12px; }
                    th { background:#f0f0f0; border-top:2px solid #333; border-bottom:2px solid #333; padding:10px 8px; text-align:left; font-weight:700; }
                    td { border-bottom:1px solid #e0e0e0; padding:10px 8px; }
                    .summary { margin-top:20px; display:flex; justify-content:flex-end; }
                    .summary-box { width:300px; }
                    .summary-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e0e0e0; font-size:0.85rem; }
                    .summary-row.total { border-top:2px solid #333; border-bottom:2px solid #333; font-weight:700; font-size:1rem; }
                    .summary-row.balance { background:#fff3e0; font-weight:700; }
                    .notes { background:#fafafa; border:1px solid #e0e0e0; padding:16px; margin-top:24px; border-radius:6px; font-size:0.8rem; color:#555; white-space:pre-line; }
                    .footer { margin-top:30px; text-align:center; font-size:0.75rem; color:#888; padding-top:20px; border-top:1px solid #e0e0e0; }
                    @media print { body { padding:15px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <div class="logo">PARTS<br>VILLAGE</div>
                        <div>
                            <h1>${this.escapeHtml(settings.company_name || 'Parts Village')}</h1>
                            ${settings.phone ? `<p>Phone: ${this.escapeHtml(settings.phone)}</p>` : ''}
                            ${settings.email ? `<p>Email: ${this.escapeHtml(settings.email)}</p>` : ''}
                            ${settings.address ? `<p>${this.escapeHtml(settings.address).replace(/\n/g, ', ')}</p>` : ''}
                        </div>
                    </div>
                    <div class="header-right">
                        <h2>TAX INVOICE</h2>
                        <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
                        ${invoice.quotation_number ? `<p><strong>Quotation Ref:</strong> ${invoice.quotation_number}</p>` : ''}
                        <p><strong>Date:</strong> ${this.formatDate(invoice.created_at)}</p>
                        <p><strong>Due Date:</strong> ${this.formatDate(invoice.due_date)}</p>
                        <span class="status-badge" style="background:${invoice.status === 'Paid' ? '#e8f5e9' : invoice.status === 'Overdue' ? '#ffebee' : '#fff3e0'}; color:${invoice.status === 'Paid' ? '#2e7d32' : invoice.status === 'Overdue' ? '#c62828' : '#e65100'};">${invoice.status}${isOverdue ? ' (Overdue)' : ''}</span>
                    </div>
                </div>

                <div class="client-box">
                    <p style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px;">Bill To</p>
                    <p style="font-weight:700; font-size:1rem; margin-bottom:4px;">${this.escapeHtml(invoice.client_name)}</p>
                    ${invoice.client_company ? `<p>${this.escapeHtml(invoice.client_company)}</p>` : ''}
                    ${invoice.client_address ? `<p>${this.escapeHtml(invoice.client_address).replace(/\n/g, '<br>')}</p>` : ''}
                    <div style="margin-top:8px;">
                        ${invoice.client_phone ? `<p>Phone: ${this.escapeHtml(invoice.client_phone)}</p>` : ''}
                        ${invoice.client_email ? `<p>Email: ${this.escapeHtml(invoice.client_email)}</p>` : ''}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width:30px; text-align:center;">#</th>
                            <th>Item Code</th>
                            <th>OEM Part #</th>
                            <th>Description</th>
                            <th style="text-align:center;">Qty</th>
                            <th style="text-align:right;">Unit Price</th>
                            <th style="text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                <div class="summary">
                    <div class="summary-box">
                        <div class="summary-row"><span>Subtotal</span><span>${currency}${this.formatNumber(invoice.subtotal)}</span></div>
                        ${invoice.tax_rate > 0 ? `<div class="summary-row"><span>Tax (${invoice.tax_rate}%)</span><span>${currency}${this.formatNumber(invoice.tax_amount)}</span></div>` : ''}
                        <div class="summary-row total"><span>Total</span><span>${currency}${this.formatNumber(invoice.total)}</span></div>
                        <div class="summary-row" style="color:#4caf50;"><span>Amount Paid</span><span>${currency}${this.formatNumber(invoice.amount_paid)}</span></div>
                        <div class="summary-row balance" style="background:${invoice.balance_due > 0 ? '#fff3e0' : '#e8f5e9'};"><span>Balance Due</span><span>${currency}${this.formatNumber(invoice.balance_due)}</span></div>
                    </div>
                </div>

                ${paymentHtml}

                ${invoice.notes ? `<div class="notes"><strong>Terms & Notes</strong><br><br>${this.escapeHtml(invoice.notes).replace(/\n/g, '<br>')}</div>` : ''}
                ${settings.bank_details ? `<div class="notes" style="margin-top:12px;"><strong>Bank / Payment Details</strong><br><br>${this.escapeHtml(settings.bank_details).replace(/\n/g, '<br>')}</div>` : ''}

                <div class="footer">
                    Thank you for your business.<br>
                    ${this.escapeHtml(settings.company_name || 'Parts Village')} &copy; ${new Date().getFullYear()}
                </div>
                <script>window.onload=function(){window.print();}<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    printReceipt(paymentId) {
        // Find payment across all invoices
        let foundPayment = null;
        let foundInvoice = null;
        for (const inv of this.invoices) {
            if (inv.payments) {
                const p = inv.payments.find(pay => pay.id === paymentId);
                if (p) { foundPayment = p; foundInvoice = inv; break; }
            }
        }
        if (!foundPayment || !foundInvoice) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this.showToast('Popup blocked. Please allow popups.', 'error');
            return;
        }

        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt ${foundPayment.receipt_number}</title>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Segoe UI',Arial,sans-serif; padding:30px; color:#000; background:#fff; display:flex; justify-content:center; }
                    .receipt { max-width:500px; width:100%; border:2px solid #c0c0c0; border-radius:12px; padding:40px; }
                    .header { text-align:center; margin-bottom:30px; padding-bottom:20px; border-bottom:2px solid #c0c0c0; }
                    .logo { width:60px; height:60px; background:#c0c0c0; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; text-align:center; color:#0a0a0a; margin:0 auto 12px; }
                    .header h1 { font-size:1.3rem; letter-spacing:2px; text-transform:uppercase; }
                    .header p { font-size:0.8rem; color:#555; margin-top:2px; }
                    .title { text-align:center; font-size:1.8rem; font-weight:700; color:#c0c0c0; margin:20px 0; letter-spacing:3px; }
                    .meta { margin-bottom:20px; }
                    .meta-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e0e0e0; font-size:0.85rem; }
                    .meta-row .label { font-weight:700; color:#333; }
                    .from { background:#f8f8f8; border:1px solid #e0e0e0; padding:16px; border-radius:6px; margin-bottom:20px; }
                    .from p { margin-bottom:2px; font-size:0.85rem; color:#444; }
                    .amount { text-align:center; padding:30px; background:#f8f8f8; border:2px solid #c0c0c0; border-radius:8px; margin:20px 0; }
                    .amount-label { font-size:0.8rem; text-transform:uppercase; letter-spacing:2px; color:#888; margin-bottom:8px; }
                    .amount-value { font-size:2.5rem; font-weight:700; color:#0a0a0a; }
                    .balance { margin:20px 0; }
                    .balance-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e0e0e0; font-size:0.85rem; }
                    .balance-row:last-child { font-weight:700; font-size:1rem; border-top:2px solid #333; border-bottom:2px solid #333; }
                    .thanks { text-align:center; font-size:1.1rem; color:#c0c0c0; font-weight:600; margin:30px 0 20px; }
                    .footer { text-align:center; font-size:0.75rem; color:#888; padding-top:20px; border-top:1px solid #e0e0e0; }
                    @media print { body { padding:15px; } .receipt { border:none; } }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <div class="logo">PARTS<br>VILLAGE</div>
                        <h1>${this.escapeHtml(settings.company_name || 'Parts Village')}</h1>
                        ${settings.phone ? `<p>${this.escapeHtml(settings.phone)}</p>` : ''}
                        ${settings.address ? `<p>${this.escapeHtml(settings.address).replace(/\n/g, ', ')}</p>` : ''}
                    </div>
                    <div class="title">RECEIPT</div>
                    <div class="meta">
                        <div class="meta-row"><span class="label">Receipt #:</span><span>${foundPayment.receipt_number}</span></div>
                        <div class="meta-row"><span class="label">Date:</span><span>${this.formatDate(foundPayment.date)}</span></div>
                        <div class="meta-row"><span class="label">Invoice #:</span><span>${foundInvoice.invoice_number}</span></div>
                        <div class="meta-row"><span class="label">Payment Method:</span><span>${this.escapeHtml(foundPayment.method)}</span></div>
                    </div>
                    <div class="from">
                        <p style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px;">Received From</p>
                        <p style="font-weight:700; font-size:1rem;">${this.escapeHtml(foundInvoice.client_name)}</p>
                        ${foundInvoice.client_company ? `<p>${this.escapeHtml(foundInvoice.client_company)}</p>` : ''}
                        ${foundInvoice.client_phone ? `<p>Phone: ${this.escapeHtml(foundInvoice.client_phone)}</p>` : ''}
                    </div>
                    <div class="amount">
                        <div class="amount-label">Amount Received</div>
                        <div class="amount-value">${currency}${this.formatNumber(foundPayment.amount)}</div>
                    </div>
                    <div class="balance">
                        <div class="balance-row"><span>Invoice Total</span><span>${currency}${this.formatNumber(foundInvoice.total)}</span></div>
                        <div class="balance-row"><span>Amount Paid</span><span style="color:#4caf50;">${currency}${this.formatNumber(foundInvoice.amount_paid)}</span></div>
                        <div class="balance-row"><span>Balance Remaining</span><span>${currency}${this.formatNumber(foundInvoice.balance_due)}</span></div>
                    </div>
                    ${foundPayment.notes ? `<div class="notes" style="margin-top:16px; font-size:0.8rem; color:#555; background:#fafafa; padding:12px; border-radius:6px;"><strong>Notes:</strong> ${this.escapeHtml(foundPayment.notes)}</div>` : ''}
                    <div class="thanks">Thank you for your payment!</div>
                    <div class="footer">
                        This is a computer-generated receipt.<br>
                        ${this.escapeHtml(settings.company_name || 'Parts Village')} &copy; ${new Date().getFullYear()}
                    </div>
                </div>
                <script>window.onload=function(){window.print();}<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    shareInvoiceWhatsApp(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if (!invoice) return;
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        let text = `*Invoice ${invoice.invoice_number}*\n`;
        text += `${settings.company_name || 'Parts Village'}\n\n`;
        text += `*Bill To:* ${invoice.client_name}\n`;
        if (invoice.client_company) text += `*Company:* ${invoice.client_company}\n`;
        text += `*Date:* ${this.formatDate(invoice.created_at)}\n`;
        text += `*Due Date:* ${this.formatDate(invoice.due_date)}\n\n`;
        text += `*Items:*\n`;

        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item, idx) => {
                text += `${idx + 1}. ${item.item_code} - ${item.product_name_en}\n`;
                text += `   Qty: ${item.qty} x ${currency}${this.formatNumber(item.unit_price)} = ${currency}${this.formatNumber(item.qty * item.unit_price)}\n`;
            });
        }

        text += `\n*Subtotal:* ${currency}${this.formatNumber(invoice.subtotal)}\n`;
        if (invoice.tax_rate > 0) {
            text += `*Tax (${invoice.tax_rate}%):* ${currency}${this.formatNumber(invoice.tax_amount)}\n`;
        }
        text += `*Total:* ${currency}${this.formatNumber(invoice.total)}\n`;
        text += `*Amount Paid:* ${currency}${this.formatNumber(invoice.amount_paid)}\n`;
        text += `*Balance Due:* ${currency}${this.formatNumber(invoice.balance_due)}\n\n`;
        text += `Please make payment by the due date.`;

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');

        if (invoice.status === 'Draft') {
            this.updateInvoiceStatus(id, 'Sent');
        }
    },

    shareInvoiceEmail(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if (!invoice) return;
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        let body = `Dear ${invoice.client_name},\n\n`;
        body += `Please find your invoice below:\n\n`;
        body += `Invoice Number: ${invoice.invoice_number}\n`;
        body += `Date: ${this.formatDate(invoice.created_at)}\n`;
        body += `Due Date: ${this.formatDate(invoice.due_date)}\n\n`;

        if (invoice.items && invoice.items.length > 0) {
            body += `ITEMS:\n`;
            body += `----------------------------------------\n`;
            invoice.items.forEach((item, idx) => {
                body += `${idx + 1}. ${item.item_code} - ${item.product_name_en}\n`;
                body += `    Qty: ${item.qty} x ${currency}${this.formatNumber(item.unit_price)} = ${currency}${this.formatNumber(item.qty * item.unit_price)}\n`;
            });
            body += `----------------------------------------\n`;
        }

        body += `Subtotal: ${currency}${this.formatNumber(invoice.subtotal)}\n`;
        if (invoice.tax_rate > 0) {
            body += `Tax (${invoice.tax_rate}%): ${currency}${this.formatNumber(invoice.tax_amount)}\n`;
        }
        body += `TOTAL: ${currency}${this.formatNumber(invoice.total)}\n`;
        body += `Amount Paid: ${currency}${this.formatNumber(invoice.amount_paid)}\n`;
        body += `Balance Due: ${currency}${this.formatNumber(invoice.balance_due)}\n\n`;

        if (invoice.notes) {
            body += `NOTES:\n${invoice.notes}\n\n`;
        }

        if (settings.bank_details) {
            body += `PAYMENT DETAILS:\n${settings.bank_details}\n\n`;
        }

        body += `Please make payment by the due date.\n\n`;
        body += `Best regards,\n`;
        body += `${settings.company_name || 'Parts Village'}\n`;
        if (settings.phone) body += `Phone: ${settings.phone}\n`;
        if (settings.email) body += `Email: ${settings.email}\n`;

        const subject = `Invoice ${invoice.invoice_number} - ${settings.company_name || 'Parts Village'}`;
        const mailto = `mailto:${invoice.client_email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');

        if (invoice.status === 'Draft') {
            this.updateInvoiceStatus(id, 'Sent');
        }
    },

    // ============================================================
    //  INVOICE RENDERING
    // ============================================================
    populateInvoiceFilters() {
        const select = document.getElementById('invoice-filter-client');
        let html = '<option value="">All Clients</option>';
        [...this.clients].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            html += `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`;
        });
        select.innerHTML = html;
    },

    renderInvoices() {
        const tbody = document.getElementById('invoices-tbody');
        const empty = document.getElementById('invoices-empty');
        const tableWrap = document.getElementById('invoices-table-wrap');
        const statusFilter = document.getElementById('invoice-filter-status').value;
        const clientFilter = document.getElementById('invoice-filter-client').value;
        const search = (document.getElementById('invoice-search').value || '').toLowerCase();
        const currency = this.getCurrency();

        let list = [...this.invoices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (clientFilter) list = list.filter(inv => inv.client_id === clientFilter);
        if (statusFilter) list = list.filter(inv => inv.status === statusFilter);
        if (search) {
            list = list.filter(inv =>
                (inv.invoice_number || '').toLowerCase().includes(search) ||
                (inv.client_name || '').toLowerCase().includes(search) ||
                (inv.client_company || '').toLowerCase().includes(search)
            );
        }

        // Update status filter options to show counts
        const allStatuses = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];
        const statusCounts = {};
        allStatuses.forEach(s => statusCounts[s] = this.invoices.filter(inv => inv.status === s).length);

        if (list.length === 0) {
            tableWrap.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        tableWrap.style.display = 'block';
        empty.style.display = 'none';

        // Summary stats
        const totalOutstanding = this.getTotalOutstanding();
        const totalPaid = this.invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

        let summaryHtml = '';
        if (!search && !clientFilter && !statusFilter) {
            summaryHtml = `
                <div class="pv-invoice-stats">
                    <div class="pv-invoice-stat">
                        <div class="pv-invoice-stat-label">Total Outstanding</div>
                        <div class="pv-invoice-stat-value outstanding">${currency}${this.formatNumber(totalOutstanding)}</div>
                    </div>
                    <div class="pv-invoice-stat">
                        <div class="pv-invoice-stat-label">Total Collected</div>
                        <div class="pv-invoice-stat-value paid">${currency}${this.formatNumber(totalPaid)}</div>
                    </div>
                    <div class="pv-invoice-stat">
                        <div class="pv-invoice-stat-label">Total Invoices</div>
                        <div class="pv-invoice-stat-value">${this.invoices.length}</div>
                    </div>
                </div>
            `;
        }

        tbody.innerHTML = summaryHtml + list.map(inv => {
            const statusClass = inv.status.toLowerCase().replace(/\s+/g, '-');
            const isOverdue = inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.due_date && new Date(inv.due_date) < new Date();

            return `
                <tr onclick="app.viewInvoice('${inv.id}')">
                    <td class="col-number">${inv.invoice_number}</td>
                    <td>${this.escapeHtml(inv.client_name)}${inv.client_company ? '<br><small style="color:#888;">' + this.escapeHtml(inv.client_company) + '</small>' : ''}</td>
                    <td>${this.formatDate(inv.created_at)}</td>
                    <td>${this.formatDate(inv.due_date)}${isOverdue ? '<br><span class="pv-badge pv-badge-overdue" style="font-size:0.6rem;">OVERDUE</span>' : ''}</td>
                    <td class="col-amount">${currency}${this.formatNumber(inv.total)}</td>
                    <td class="col-amount" style="color:var(--success);">${currency}${this.formatNumber(inv.amount_paid)}</td>
                    <td class="col-amount" style="color:${inv.balance_due > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">${currency}${this.formatNumber(inv.balance_due)}</td>
                    <td><span class="pv-badge pv-badge-${statusClass}">${inv.status}</span></td>
                    <td class="no-print" style="text-align:center;" onclick="event.stopPropagation();">
                        <button class="pv-action-btn" onclick="app.viewInvoice('${inv.id}')" title="View">&#128065;</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    onInvoiceFilterChange() {
        this.renderInvoices();
    },

    searchInvoices() {
        this.renderInvoices();
    },

    // ---------- Create Invoice Modal ----------
    openCreateInvoiceModal() {
        const select = document.getElementById('create-invoice-client-select');
        let html = '<option value="">-- Select a client --</option>';
        this.clients.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            html += `<option value="${c.id}">${this.escapeHtml(c.name)}${c.company ? ' (' + this.escapeHtml(c.company) + ')' : ''}</option>`;
        });
        select.innerHTML = html;
        select.value = '';
        document.getElementById('create-invoice-modal-overlay').classList.add('active');
    },

    closeCreateInvoiceModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('create-invoice-modal-overlay').classList.remove('active');
    },

    confirmCreateInvoice() {
        const clientId = document.getElementById('create-invoice-client-select').value;
        if (!clientId) {
            this.showToast('Please select a client', 'error');
            return;
        }
        this.closeCreateInvoiceModal();
        this.createDirectInvoice(clientId);
    },

    // ============================================================
    //  PRINT / SHARE / EXPORT (Quotations - existing)
    // ============================================================
    printQuotation(id) {
        const quotation = this.quotations.find(q => q.id === id);
        if (!quotation) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this.showToast('Popup blocked. Please allow popups.', 'error');
            return;
        }

        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        let itemsHtml = quotation.items.map((item, idx) => `
            <tr>
                <td style="text-align:center; border:1px solid #ccc; padding:8px;">${idx + 1}</td>
                <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(item.item_code)}</td>
                <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(item.oem_part_number || '-')}</td>
                <td style="border:1px solid #ccc; padding:8px;">${this.escapeHtml(item.product_name_en)}</td>
                <td style="text-align:center; border:1px solid #ccc; padding:8px;">${item.qty}</td>
                <td style="text-align:right; border:1px solid #ccc; padding:8px;">${currency}${this.formatNumber(item.unit_price)}</td>
                <td style="text-align:right; border:1px solid #ccc; padding:8px; font-weight:600;">${currency}${this.formatNumber(item.total)}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Quotation ${quotation.quotation_number}</title>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Segoe UI',Arial,sans-serif; padding:30px; color:#000; background:#fff; }
                    .header { display:flex; justify-content:space-between; border-bottom:3px solid #c0c0c0; padding-bottom:20px; margin-bottom:30px; }
                    .header-left { display:flex; align-items:center; gap:16px; }
                    .logo { width:60px; height:60px; background:#c0c0c0; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; text-align:center; color:#0a0a0a; }
                    .header-left h1 { font-size:1.4rem; letter-spacing:2px; text-transform:uppercase; }
                    .header-left p { font-size:0.8rem; color:#555; margin-top:2px; }
                    .header-right { text-align:right; }
                    .header-right h2 { font-size:1.2rem; margin-bottom:6px; }
                    .header-right p { font-size:0.8rem; color:#666; }
                    .client-box { background:#f8f8f8; border:1px solid #e0e0e0; padding:16px; border-radius:6px; margin-bottom:24px; }
                    .client-box p { margin-bottom:2px; font-size:0.85rem; color:#444; }
                    table { width:100%; border-collapse:collapse; font-size:0.8rem; margin-top:12px; }
                    th { background:#f0f0f0; border-top:2px solid #333; border-bottom:2px solid #333; padding:10px 8px; text-align:left; font-weight:700; }
                    td { border-bottom:1px solid #e0e0e0; padding:10px 8px; }
                    .summary { margin-top:20px; display:flex; justify-content:flex-end; }
                    .summary-box { width:300px; }
                    .summary-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e0e0e0; font-size:0.85rem; }
                    .summary-row.total { border-top:2px solid #333; border-bottom:2px solid #333; font-weight:700; font-size:1rem; }
                    .notes { background:#fafafa; border:1px solid #e0e0e0; padding:16px; margin-top:24px; border-radius:6px; font-size:0.8rem; color:#555; white-space:pre-line; }
                    .footer { margin-top:30px; text-align:center; font-size:0.75rem; color:#888; padding-top:20px; border-top:1px solid #e0e0e0; }
                    @media print { body { padding:15px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <div class="logo">PARTS<br>VILLAGE</div>
                        <div>
                            <h1>${this.escapeHtml(settings.company_name || 'Parts Village')}</h1>
                            ${settings.phone ? `<p>Phone: ${this.escapeHtml(settings.phone)}</p>` : ''}
                            ${settings.email ? `<p>Email: ${this.escapeHtml(settings.email)}</p>` : ''}
                            ${settings.address ? `<p>${this.escapeHtml(settings.address).replace(/\n/g, ', ')}</p>` : ''}
                        </div>
                    </div>
                    <div class="header-right">
                        <h2>QUOTATION</h2>
                        <p><strong>#:</strong> ${quotation.quotation_number}</p>
                        <p><strong>Date:</strong> ${this.formatDate(quotation.created_at)}</p>
                    </div>
                </div>

                <div class="client-box">
                    <p style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px;">Quotation To</p>
                    <p style="font-weight:700; font-size:1rem; margin-bottom:4px;">${this.escapeHtml(quotation.client_name)}</p>
                    ${quotation.client_company ? `<p>${this.escapeHtml(quotation.client_company)}</p>` : ''}
                    ${quotation.client_address ? `<p>${this.escapeHtml(quotation.client_address).replace(/\n/g, '<br>')}</p>` : ''}
                    <div style="margin-top:8px;">
                        ${quotation.client_phone ? `<p>Phone: ${this.escapeHtml(quotation.client_phone)}</p>` : ''}
                        ${quotation.client_email ? `<p>Email: ${this.escapeHtml(quotation.client_email)}</p>` : ''}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width:30px; text-align:center;">#</th>
                            <th>Item Code</th>
                            <th>OEM Part #</th>
                            <th>Description</th>
                            <th style="text-align:center;">Qty</th>
                            <th style="text-align:right;">Unit Price</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                <div class="summary">
                    <div class="summary-box">
                        <div class="summary-row"><span>Subtotal</span><span>${currency}${this.formatNumber(quotation.subtotal)}</span></div>
                        ${quotation.tax_rate > 0 ? `<div class="summary-row"><span>Tax (${quotation.tax_rate}%)</span><span>${currency}${this.formatNumber(quotation.tax_amount)}</span></div>` : ''}
                        <div class="summary-row total"><span>Grand Total</span><span>${currency}${this.formatNumber(quotation.total)}</span></div>
                    </div>
                </div>

                ${quotation.notes ? `<div class="notes"><strong>Terms & Notes</strong><br><br>${this.escapeHtml(quotation.notes).replace(/\n/g, '<br>')}</div>` : ''}
                ${settings.bank_details ? `<div class="notes" style="margin-top:12px;"><strong>Bank / Payment Details</strong><br><br>${this.escapeHtml(settings.bank_details).replace(/\n/g, '<br>')}</div>` : ''}

                <div class="footer">
                    Thank you for your business. This quotation is valid for 30 days from the date of issue.<br>
                    ${this.escapeHtml(settings.company_name || 'Parts Village')} &copy; ${new Date().getFullYear()}
                </div>
                <script>window.onload=function(){window.print();}<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    shareWhatsApp(id) {
        const quotation = this.quotations.find(q => q.id === id);
        if (!quotation) return;
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        let text = `*Quotation ${quotation.quotation_number}*\n`;
        text += `${settings.company_name || 'Parts Village'}\n\n`;
        text += `*Client:* ${quotation.client_name}\n`;
        if (quotation.client_company) text += `*Company:* ${quotation.client_company}\n`;
        text += `*Date:* ${this.formatDate(quotation.created_at)}\n\n`;
        text += `*Items:*\n`;

        quotation.items.forEach((item, idx) => {
            text += `${idx + 1}. ${item.item_code} - ${item.product_name_en}\n`;
            if (item.oem_part_number) text += `   OEM: ${item.oem_part_number}\n`;
            text += `   Qty: ${item.qty} x ${currency}${this.formatNumber(item.unit_price)} = ${currency}${this.formatNumber(item.total)}\n\n`;
        });

        text += `*Subtotal:* ${currency}${this.formatNumber(quotation.subtotal)}\n`;
        if (quotation.tax_rate > 0) {
            text += `*Tax (${quotation.tax_rate}%):* ${currency}${this.formatNumber(quotation.tax_amount)}\n`;
        }
        text += `*Total:* ${currency}${this.formatNumber(quotation.total)}\n\n`;
        text += `Please confirm your order.\n`;
        if (quotation.notes) {
            text += `\n_Notes: ${quotation.notes.substring(0, 200)}_`;
        }

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');

        if (quotation.status === 'Draft') {
            this.updateQuotationStatus(id, 'Sent');
        }
        quotation.sent_via = 'WhatsApp';
        this.saveQuotations();
    },

    shareEmail(id) {
        const quotation = this.quotations.find(q => q.id === id);
        if (!quotation) return;
        const settings = this.companySettings || {};
        const currency = settings.currency || '$';

        let body = `Dear ${quotation.client_name},\n\n`;
        body += `Thank you for your interest. Please find our quotation below:\n\n`;
        body += `Quotation Number: ${quotation.quotation_number}\n`;
        body += `Date: ${this.formatDate(quotation.created_at)}\n\n`;
        body += `ITEMS:\n`;
        body += `----------------------------------------\n`;

        quotation.items.forEach((item, idx) => {
            body += `${idx + 1}. ${item.item_code} - ${item.product_name_en}\n`;
            body += `    OEM: ${item.oem_part_number || '-'} | Qty: ${item.qty} x ${currency}${this.formatNumber(item.unit_price)} = ${currency}${this.formatNumber(item.total)}\n\n`;
        });

        body += `----------------------------------------\n`;
        body += `Subtotal: ${currency}${this.formatNumber(quotation.subtotal)}\n`;
        if (quotation.tax_rate > 0) {
            body += `Tax (${quotation.tax_rate}%): ${currency}${this.formatNumber(quotation.tax_amount)}\n`;
        }
        body += `TOTAL: ${currency}${this.formatNumber(quotation.total)}\n\n`;

        if (quotation.notes) {
            body += `NOTES:\n${quotation.notes}\n\n`;
        }

        body += `Please confirm your order by replying to this email.\n\n`;
        body += `Best regards,\n`;
        body += `${settings.company_name || 'Parts Village'}\n`;
        if (settings.phone) body += `Phone: ${settings.phone}\n`;
        if (settings.email) body += `Email: ${settings.email}\n`;

        const subject = `Quotation ${quotation.quotation_number} - ${settings.company_name || 'Parts Village'}`;
        const mailto = `mailto:${quotation.client_email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');

        if (quotation.status === 'Draft') {
            this.updateQuotationStatus(id, 'Sent');
        }
        quotation.sent_via = 'Email';
        this.saveQuotations();
    },

    // ============================================================
    //  RENDERING
    // ============================================================
    renderAll() {
        this.renderClients();
        this.renderQuotations();
        this.renderInvoices();
        this.updateBadges();
        this.updateCartUI();
    },

    updateBadges() {
        document.getElementById('client-count-badge').textContent = this.clients.length;
        document.getElementById('quotation-count-badge').textContent = this.quotations.length;
        const invoiceBadge = document.getElementById('invoice-count-badge');
        if (invoiceBadge) invoiceBadge.textContent = this.invoices.length;
    },

    renderClients() {
        const grid = document.getElementById('clients-grid');
        const empty = document.getElementById('clients-empty');
        const search = (document.getElementById('client-search').value || '').toLowerCase();
        const currency = this.getCurrency();

        let clients = this.clients;
        if (search) {
            clients = clients.filter(c =>
                (c.name || '').toLowerCase().includes(search) ||
                (c.company || '').toLowerCase().includes(search) ||
                (c.phone || '').toLowerCase().includes(search) ||
                (c.email || '').toLowerCase().includes(search)
            );
        }

        // Sort by name
        clients = [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (clients.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            empty.querySelector('.pv-empty-state-title').textContent =
                this.clients.length === 0 ? 'No Clients Yet' : 'No matching clients';
            empty.querySelector('.pv-empty-state-desc').textContent =
                this.clients.length === 0 ? 'Add your first client to start creating quotations and invoices.' : 'Try a different search term.';
            return;
        }

        grid.style.display = 'grid';
        empty.style.display = 'none';

        grid.innerHTML = clients.map(client => {
            const qCount = this.getClientQuotationsCount(client.id);
            const iCount = this.getClientInvoicesCount(client.id);
            const balance = this.getClientBalance(client.id);

            return `
                <div class="pv-client-card" onclick="app.openClientDetailModal('${client.id}')">
                    <div class="pv-client-card-header">
                        <div class="pv-client-avatar">${this.getInitials(client.name)}</div>
                        <div class="pv-client-actions">
                            <button class="pv-action-btn" onclick="app.openEditClientModal('${client.id}', event)" title="Edit">
                                &#9998;
                            </button>
                            <button class="pv-action-btn danger" onclick="app.deleteClient('${client.id}'); event.stopPropagation();" title="Delete">
                                &#128465;
                            </button>
                        </div>
                    </div>
                    <div class="pv-client-name">${this.escapeHtml(client.name)}</div>
                    <div class="pv-client-company">${this.escapeHtml(client.company || 'No company')}</div>
                    <div class="pv-client-meta">
                        ${client.phone ? `<div class="pv-client-meta-item">&#128222; ${this.escapeHtml(client.phone)}</div>` : ''}
                        ${client.email ? `<div class="pv-client-meta-item">&#9993; ${this.escapeHtml(client.email)}</div>` : ''}
                    </div>
                    <div class="pv-client-footer">
                        <div class="pv-client-quotations-count">
                            <span>${qCount}</span> quote${qCount !== 1 ? 's' : ''} &middot; <span>${iCount}</span> inv${iCount !== 1 ? 's' : ''}
                            ${balance > 0 ? `<div style="color:var(--danger); font-size:0.75rem; margin-top:2px;">Bal: ${currency}${this.formatNumber(balance)}</div>` : ''}
                        </div>
                        <button class="pv-btn pv-btn-silver pv-btn-sm" onclick="app.startQuotationForClient('${client.id}'); event.stopPropagation();">
                            + Quote
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    searchClients() {
        this.renderClients();
    },

    populateQuotationFilters() {
        const select = document.getElementById('quotation-filter-client');
        let html = '<option value="">All Clients</option>';
        [...this.clients].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            html += `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`;
        });
        select.innerHTML = html;
    },

    renderQuotations() {
        const tbody = document.getElementById('quotations-tbody');
        const empty = document.getElementById('quotations-empty');
        const tableWrap = document.getElementById('quotations-table-wrap');
        const clientFilter = document.getElementById('quotation-filter-client').value;
        const statusFilter = document.getElementById('quotation-filter-status').value;

        let list = [...this.quotations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (clientFilter) list = list.filter(q => q.client_id === clientFilter);
        if (statusFilter) list = list.filter(q => q.status === statusFilter);

        if (list.length === 0) {
            tableWrap.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        tableWrap.style.display = 'block';
        empty.style.display = 'none';
        const currency = this.getCurrency();

        tbody.innerHTML = list.map(q => `
            <tr onclick="app.viewQuotation('${q.id}')">
                <td class="col-number">${q.quotation_number}</td>
                <td>${this.escapeHtml(q.client_name)}${q.client_company ? '<br><small style="color:#888;">' + this.escapeHtml(q.client_company) + '</small>' : ''}</td>
                <td>${this.formatDate(q.created_at)}</td>
                <td>${q.items.length}</td>
                <td class="col-amount">${currency}${this.formatNumber(q.total)}</td>
                <td><span class="pv-badge pv-badge-${q.status.toLowerCase()}">${q.status}</span></td>
                <td>${q.sent_via ? '<span style="font-size:0.8rem; color:#888;">' + q.sent_via + '</span>' : '-'}</td>
            </tr>
        `).join('');
    },

    // ============================================================
    //  UTILITIES
    // ============================================================
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    formatNumber(num) {
        const n = parseFloat(num) || 0;
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDate(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    },

    // ---------- Toast Notifications ----------
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `pv-toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ---------- Modal Helpers ----------
    closeAllModals() {
        document.querySelectorAll('.pv-modal-overlay').forEach(m => m.classList.remove('active'));
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = PVClientsApp;
    app.init();
});

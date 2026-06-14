/**
 * Parts Village - Suppliers & Inquiries Module
 * Standalone module for supplier management and inquiry generation
 * All data persists in localStorage
 */

const SuppliersApp = {
    // State
    suppliers: [],
    inquiries: [],
    inquiryCart: [],
    settings: {},
    currentTab: 'suppliers',
    selectedSupplierId: null,
    editingSupplierId: null,
    viewingInquiryId: null,
    supplierDetailId: null,

    // Keys
    STORAGE_KEYS: {
        suppliers: 'pv_suppliers',
        inquiries: 'pv_inquiries',
        settings: 'pv_company_settings',
        cart: 'pv_inquiry_cart'
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.loadSuppliers();
        this.loadInquiries();
        this.loadSettings();
        this.loadCart();
        this.populateCategoryFilter();
        this.renderSuppliers();
        this.renderInquiries();
        this.updateBadges();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();

        // Load catalog data
        if (window.PVCatalog) {
            window.PVCatalog.load();
            this.populateCategoryFilter();
        }

        // Check for pre-selected supplier from URL or localStorage
        const preselect = localStorage.getItem('pv_preselect_supplier');
        if (preselect) {
            localStorage.removeItem('pv_preselect_supplier');
            this.selectedSupplierId = preselect;
            this.switchTab('create-inquiry');
            this.updateSupplierSelect();
            document.getElementById('inquiry-supplier-select').value = preselect;
            this.onSupplierSelectChange();
        }
    },

    setupEventListeners() {
        // Category filter population when catalog is ready
        document.addEventListener('catalogLoaded', () => {
            this.populateCategoryFilter();
        });
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeCartPanel();
            }
        });
    },

    closeAllModals() {
        document.querySelectorAll('.pv-modal-overlay').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelectorAll('.pv-confirm-overlay').forEach(el => {
            el.classList.remove('active');
        });
    },

    // ============================================
    // DATA PERSISTENCE
    // ============================================

    loadSuppliers() {
        const data = localStorage.getItem(this.STORAGE_KEYS.suppliers);
        if (data) {
            try { this.suppliers = JSON.parse(data); } catch(e) { this.suppliers = []; }
        }
        if (!Array.isArray(this.suppliers)) this.suppliers = [];
    },

    saveSuppliers() {
        localStorage.setItem(this.STORAGE_KEYS.suppliers, JSON.stringify(this.suppliers));
    },

    loadInquiries() {
        const data = localStorage.getItem(this.STORAGE_KEYS.inquiries);
        if (data) {
            try { this.inquiries = JSON.parse(data); } catch(e) { this.inquiries = []; }
        }
        if (!Array.isArray(this.inquiries)) this.inquiries = [];
    },

    saveInquiries() {
        localStorage.setItem(this.STORAGE_KEYS.inquiries, JSON.stringify(this.inquiries));
    },

    loadSettings() {
        const data = localStorage.getItem(this.STORAGE_KEYS.settings);
        if (data) {
            try { this.settings = JSON.parse(data); } catch(e) { this.settings = {}; }
        }
        // Apply settings to form
        if (this.settings.company_name) document.getElementById('setting-company-name').value = this.settings.company_name;
        if (this.settings.phone) document.getElementById('setting-company-phone').value = this.settings.phone;
        if (this.settings.email) document.getElementById('setting-company-email').value = this.settings.email;
        if (this.settings.website) document.getElementById('setting-company-website').value = this.settings.website;
        if (this.settings.address) document.getElementById('setting-company-address').value = this.settings.address;
        if (this.settings.default_notes) document.getElementById('setting-default-notes').value = this.settings.default_notes;
    },

    saveSettings() {
        this.settings = {
            company_name: document.getElementById('setting-company-name').value || 'Parts Village',
            phone: document.getElementById('setting-company-phone').value || '',
            email: document.getElementById('setting-company-email').value || '',
            website: document.getElementById('setting-company-website').value || '',
            address: document.getElementById('setting-company-address').value || '',
            default_notes: document.getElementById('setting-default-notes').value || ''
        };
        localStorage.setItem(this.STORAGE_KEYS.settings, JSON.stringify(this.settings));
        this.showToast('Settings saved', 'success');
        this.closeSettingsModal();
    },

    loadCart() {
        const data = localStorage.getItem(this.STORAGE_KEYS.cart);
        if (data) {
            try { this.inquiryCart = JSON.parse(data); } catch(e) { this.inquiryCart = []; }
        }
        if (!Array.isArray(this.inquiryCart)) this.inquiryCart = [];
        this.updateCartUI();
    },

    saveCart() {
        localStorage.setItem(this.STORAGE_KEYS.cart, JSON.stringify(this.inquiryCart));
    },

    // ============================================
    // TAB SWITCHING
    // ============================================

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.pv-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.pv-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`tab-${tab}`);
        if (activeContent) activeContent.classList.add('active');

        // Tab-specific logic
        if (tab === 'create-inquiry') {
            this.updateSupplierSelect();
            this.renderCatalogForInquiry();
            this.updateStepIndicators();
        } else if (tab === 'suppliers') {
            this.renderSuppliers();
        } else if (tab === 'inquiries') {
            this.populateInquiryFilters();
            this.renderInquiries();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateStepIndicators() {
        // Step 1: supplier selected
        const hasSupplier = !!this.selectedSupplierId;
        document.getElementById('step-ind-1').classList.toggle('active', true);
        document.querySelector('#step-ind-1 .step-circle').classList.toggle('completed', hasSupplier);
        document.querySelector('#step-ind-1 .step-circle').classList.toggle('active', !hasSupplier);
        document.getElementById('step-conn-1').classList.toggle('completed', hasSupplier);

        // Step 2: items in cart
        const hasItems = this.inquiryCart.length > 0;
        document.getElementById('step-ind-2').classList.toggle('active', hasSupplier && !hasItems);
        document.getElementById('step-ind-2').classList.toggle('completed', hasItems);
        document.querySelector('#step-ind-2 .step-circle').classList.toggle('completed', hasItems);
        document.querySelector('#step-ind-2 .step-circle').classList.toggle('active', hasSupplier && !hasItems);
        document.getElementById('step-conn-2').classList.toggle('completed', hasItems);

        // Step 3: ready to generate
        const ready = hasSupplier && hasItems;
        document.getElementById('step-ind-3').classList.toggle('active', ready);
        document.querySelector('#step-ind-3 .step-circle').classList.toggle('active', ready);

        // Enable/disable generate button
        document.getElementById('btn-generate-inquiry').disabled = !ready;
    },

    // ============================================
    // SUPPLIER CRUD
    // ============================================

    addSupplier(data) {
        const supplier = {
            id: 'sup-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            ...data,
            created_at: new Date().toISOString()
        };
        this.suppliers.push(supplier);
        this.saveSuppliers();
        this.renderSuppliers();
        this.updateBadges();
        return supplier;
    },

    editSupplier(id, data) {
        const idx = this.suppliers.findIndex(s => s.id === id);
        if (idx === -1) return null;
        this.suppliers[idx] = { ...this.suppliers[idx], ...data, updated_at: new Date().toISOString() };
        this.saveSuppliers();
        this.renderSuppliers();
        return this.suppliers[idx];
    },

    deleteSupplier(id) {
        // Check if supplier has inquiries
        const hasInquiries = this.inquiries.some(i => i.supplier_id === id);
        if (hasInquiries) {
            this.showToast('Cannot delete: supplier has inquiries', 'error');
            return false;
        }
        this.suppliers = this.suppliers.filter(s => s.id !== id);
        this.saveSuppliers();
        this.renderSuppliers();
        this.updateBadges();
        return true;
    },

    getSupplier(id) {
        return this.suppliers.find(s => s.id === id) || null;
    },

    getSupplierInquiryCount(id) {
        return this.inquiries.filter(i => i.supplier_id === id).length;
    },

    // ============================================
    // SUPPLIER MODAL
    // ============================================

    openSupplierModal(fromInquiryFlow) {
        this.editingSupplierId = null;
        document.getElementById('supplier-modal-title').textContent = 'Add New Supplier';
        document.getElementById('supplier-form').reset();
        document.getElementById('supplier-id').value = '';
        document.getElementById('supplier-modal-overlay').classList.add('active');

        // If opened from inquiry flow, track it
        if (fromInquiryFlow) {
            this._supplierModalFromFlow = true;
        } else {
            this._supplierModalFromFlow = false;
        }
    },

    openEditSupplierModal(id) {
        const supplier = this.getSupplier(id);
        if (!supplier) return;

        this.editingSupplierId = id;
        document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
        document.getElementById('supplier-id').value = id;
        document.getElementById('supplier-name').value = supplier.name || '';
        document.getElementById('supplier-company').value = supplier.company || '';
        document.getElementById('supplier-phone').value = supplier.phone || '';
        document.getElementById('supplier-email').value = supplier.email || '';
        document.getElementById('supplier-code').value = supplier.supplier_code || '';
        document.getElementById('supplier-specialty').value = supplier.specialty || '';
        document.getElementById('supplier-address').value = supplier.address || '';
        document.getElementById('supplier-notes').value = supplier.notes || '';
        document.getElementById('supplier-modal-overlay').classList.add('active');
        this._supplierModalFromFlow = false;
    },

    closeSupplierModal() {
        document.getElementById('supplier-modal-overlay').classList.remove('active');
        this.editingSupplierId = null;
    },

    saveSupplier() {
        const name = document.getElementById('supplier-name').value.trim();
        const company = document.getElementById('supplier-company').value.trim();
        const phone = document.getElementById('supplier-phone').value.trim();

        if (!name || !company || !phone) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }

        const data = {
            name,
            company,
            phone,
            email: document.getElementById('supplier-email').value.trim(),
            supplier_code: document.getElementById('supplier-code').value,
            specialty: document.getElementById('supplier-specialty').value.trim(),
            address: document.getElementById('supplier-address').value.trim(),
            notes: document.getElementById('supplier-notes').value.trim()
        };

        if (this.editingSupplierId) {
            this.editSupplier(this.editingSupplierId, data);
            this.showToast('Supplier updated', 'success');
        } else {
            const supplier = this.addSupplier(data);
            this.showToast('Supplier added', 'success');

            // If opened from inquiry flow, select it
            if (this._supplierModalFromFlow) {
                this.selectedSupplierId = supplier.id;
                this.updateSupplierSelect();
                document.getElementById('inquiry-supplier-select').value = supplier.id;
                this.onSupplierSelectChange();
            }
        }

        this.closeSupplierModal();
        this.renderSuppliers();
        this.updateBadges();
    },

    // ============================================
    // SUPPLIER RENDERING
    // ============================================

    renderSuppliers(searchTerm) {
        const grid = document.getElementById('suppliers-grid');
        const empty = document.getElementById('suppliers-empty');

        let list = [...this.suppliers];
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(s =>
                (s.name || '').toLowerCase().includes(term) ||
                (s.company || '').toLowerCase().includes(term) ||
                (s.phone || '').toLowerCase().includes(term) ||
                (s.specialty || '').toLowerCase().includes(term) ||
                (s.email || '').toLowerCase().includes(term)
            );
        }

        if (list.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            empty.querySelector('.pv-empty-state-icon').textContent = searchTerm ? '🔍' : '🏭';
            empty.querySelector('.pv-empty-state-title').textContent = searchTerm ? 'No Matches' : 'No Suppliers Yet';
            empty.querySelector('.pv-empty-state-desc').textContent = searchTerm
                ? 'No suppliers match your search.'
                : 'Add your first supplier to start creating inquiries.';
            return;
        }

        grid.style.display = 'grid';
        empty.style.display = 'none';

        grid.innerHTML = list.map(s => {
            const inquiryCount = this.getSupplierInquiryCount(s.id);
            return `
                <div class="pv-supplier-card" onclick="app.viewSupplierDetail('${s.id}')">
                    <div class="pv-supplier-card-header">
                        <div>
                            <div class="pv-supplier-card-name">${this.escapeHtml(s.name)}</div>
                            <div class="pv-supplier-card-company">${this.escapeHtml(s.company)}</div>
                        </div>
                        ${s.supplier_code ? `<div class="pv-supplier-card-code">Code: ${this.escapeHtml(s.supplier_code)}</div>` : ''}
                    </div>
                    <div class="pv-supplier-card-body">
                        <div class="pv-supplier-card-info">
                            <span class="icon">📞</span> ${this.escapeHtml(s.phone)}
                        </div>
                        ${s.email ? `<div class="pv-supplier-card-info"><span class="icon">✉️</span> ${this.escapeHtml(s.email)}</div>` : ''}
                        ${s.specialty ? `<span class="pv-supplier-card-specialty">${this.escapeHtml(s.specialty)}</span>` : ''}
                    </div>
                    <div class="pv-supplier-card-footer">
                        <span class="pv-supplier-card-inquiries">
                            <span class="pv-supplier-card-inquiries-count">${inquiryCount}</span> inquiry${inquiryCount !== 1 ? 'ies' : 'y'}
                        </span>
                        <button class="pv-btn pv-btn-outline pv-btn-sm" onclick="event.stopPropagation(); app.openEditSupplierModal('${s.id}')">
                            ✏️ Edit
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    searchSuppliers() {
        const term = document.getElementById('supplier-search').value.trim();
        this.renderSuppliers(term);
    },

    // ============================================
    // SUPPLIER DETAIL MODAL
    // ============================================

    viewSupplierDetail(id) {
        const supplier = this.getSupplier(id);
        if (!supplier) return;

        this.supplierDetailId = id;
        const body = document.getElementById('supplier-detail-body');
        const inquiryCount = this.getSupplierInquiryCount(id);
        const supplierInquiries = this.inquiries
            .filter(i => i.supplier_id === id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        body.innerHTML = `
            <div class="pv-supplier-detail-header">
                <div class="pv-supplier-detail-icon">🏭</div>
                <div class="pv-supplier-detail-title-block">
                    <div class="pv-supplier-detail-name">${this.escapeHtml(supplier.name)}</div>
                    <div class="pv-supplier-detail-company">${this.escapeHtml(supplier.company)}</div>
                    <div class="pv-supplier-detail-meta">
                        ${supplier.supplier_code ? `<span>🏷️ Code: ${this.escapeHtml(supplier.supplier_code)}</span>` : ''}
                        ${supplier.specialty ? `<span>⚙️ ${this.escapeHtml(supplier.specialty)}</span>` : ''}
                        <span>📋 ${inquiryCount} inquiry${inquiryCount !== 1 ? 'ies' : 'y'}</span>
                    </div>
                </div>
            </div>

            <div class="pv-supplier-detail-section">
                <div class="pv-supplier-detail-section-title">Contact Information</div>
                <div class="pv-supplier-detail-info-grid">
                    <div class="pv-supplier-detail-info-item">
                        <div class="pv-supplier-detail-info-label">Phone</div>
                        <div class="pv-supplier-detail-info-value">${this.escapeHtml(supplier.phone)}</div>
                    </div>
                    ${supplier.email ? `
                    <div class="pv-supplier-detail-info-item">
                        <div class="pv-supplier-detail-info-label">Email</div>
                        <div class="pv-supplier-detail-info-value">${this.escapeHtml(supplier.email)}</div>
                    </div>` : ''}
                    ${supplier.address ? `
                    <div class="pv-supplier-detail-info-item">
                        <div class="pv-supplier-detail-info-label">Address</div>
                        <div class="pv-supplier-detail-info-value">${this.escapeHtml(supplier.address)}</div>
                    </div>` : ''}
                </div>
            </div>

            ${supplier.notes ? `
            <div class="pv-supplier-detail-section">
                <div class="pv-supplier-detail-section-title">Notes</div>
                <div style="background:var(--bg-elevated); padding:12px; border-radius:var(--radius-sm); font-size:0.9em; color:var(--text-secondary); line-height:1.6;">
                    ${this.escapeHtml(supplier.notes).replace(/\n/g, '<br>')}
                </div>
            </div>` : ''}

            <div class="pv-supplier-detail-section pv-supplier-detail-inquiries">
                <div class="pv-supplier-detail-section-title">Inquiries (${inquiryCount})</div>
                ${supplierInquiries.length > 0 ? `
                    <div class="pv-supplier-detail-inquiries-list">
                        ${supplierInquiries.map(iq => `
                            <div class="pv-supplier-detail-inquiry-item" onclick="app.viewInquiry('${iq.id}')">
                                <div>
                                    <div style="font-weight:600; font-size:0.9em;">${iq.inquiry_number}</div>
                                    <div style="font-size:0.8em; color:var(--text-muted);">${this.formatDate(iq.created_at)} · ${iq.total_items} items</div>
                                </div>
                                <div style="text-align:right;">
                                    <span class="pv-badge pv-badge-${iq.status.toLowerCase()}">${iq.status}</span>
                                    <div style="font-size:0.85em; color:var(--silver); font-weight:600; margin-top:4px;">$${this.formatNumber(iq.total_cost)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div style="color:var(--text-muted); font-size:0.9em; padding:12px; text-align:center;">No inquiries yet</div>'}
            </div>
        `;

        document.getElementById('supplier-detail-modal-overlay').classList.add('active');
    },

    closeSupplierDetailModal() {
        document.getElementById('supplier-detail-modal-overlay').classList.remove('active');
        this.supplierDetailId = null;
    },

    deleteSupplierFromDetail() {
        if (!this.supplierDetailId) return;
        const supplier = this.getSupplier(this.supplierDetailId);
        if (!supplier) return;

        this.confirmAction(
            `Delete ${this.escapeHtml(supplier.name)}?`,
            'This cannot be undone. Supplier must have no inquiries.',
            () => {
                if (this.deleteSupplier(this.supplierDetailId)) {
                    this.showToast('Supplier deleted', 'success');
                    this.closeSupplierDetailModal();
                }
            }
        );
    },

    startInquiryForSupplier() {
        if (!this.supplierDetailId) return;
        this.selectedSupplierId = this.supplierDetailId;
        this.closeSupplierDetailModal();
        this.switchTab('create-inquiry');
    },

    // ============================================
    // SUPPLIER SELECT (Inquiry Flow)
    // ============================================

    updateSupplierSelect() {
        const select = document.getElementById('inquiry-supplier-select');
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Select a supplier --</option>' +
            this.suppliers
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(s => `<option value="${s.id}">${this.escapeHtml(s.name)} · ${this.escapeHtml(s.company)}${s.supplier_code ? ' (Code: ' + s.supplier_code + ')' : ''}</option>`)
                .join('');
        if (currentVal) select.value = currentVal;
    },

    onSupplierSelectChange() {
        const select = document.getElementById('inquiry-supplier-select');
        this.selectedSupplierId = select.value || null;
        this.updateStepIndicators();
        this.updateCartSupplierInfo();
        this.renderCatalogForInquiry(); // Re-render to show cost detection
    },

    updateCartSupplierInfo() {
        const container = document.getElementById('cart-summary-supplier');
        if (!this.selectedSupplierId) {
            container.innerHTML = '<span class="pv-cart-supplier-placeholder">No supplier selected</span>';
            return;
        }
        const supplier = this.getSupplier(this.selectedSupplierId);
        if (!supplier) {
            container.innerHTML = '<span class="pv-cart-supplier-placeholder">No supplier selected</span>';
            return;
        }
        container.innerHTML = `
            <div class="pv-cart-supplier-name">${this.escapeHtml(supplier.name)}</div>
            <div class="pv-cart-supplier-company">${this.escapeHtml(supplier.company)}${supplier.supplier_code ? ' · Code: ' + supplier.supplier_code : ''}</div>
        `;
    },

    // ============================================
    // CATALOG FOR INQUIRY
    // ============================================

    populateCategoryFilter() {
        const select = document.getElementById('catalog-category-filter');
        if (!select || !window.PVCatalog) return;

        const categories = [...new Set(window.PVCatalog.items.map(item => item.category).filter(Boolean))].sort();
        const currentVal = select.value;
        select.innerHTML = '<option value="">All Categories</option>' +
            categories.map(c => `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c)}</option>`).join('');
        select.value = currentVal;
    },

    renderCatalogForInquiry() {
        const grid = document.getElementById('catalog-grid-for-inquiry');
        if (!window.PVCatalog || !window.PVCatalog.items.length) {
            grid.innerHTML = '<div class="pv-cart-empty" style="grid-column:1/-1; padding:40px;"><div style="font-size:2em; margin-bottom:8px;">📦</div><div>Catalog data not available</div><div style="font-size:0.8em; color:var(--text-muted); margin-top:4px;">Make sure the catalog has been loaded</div></div>';
            return;
        }

        const searchTerm = (document.getElementById('catalog-search').value || '').toLowerCase().trim();
        const category = document.getElementById('catalog-category-filter').value;

        let items = [...window.PVCatalog.items];

        if (searchTerm) {
            items = items.filter(item =>
                (item.item_code || '').toLowerCase().includes(searchTerm) ||
                (item.oem_part_number || '').toLowerCase().includes(searchTerm) ||
                (item.product_name_en || '').toLowerCase().includes(searchTerm) ||
                (item.product_name_cn || '').toLowerCase().includes(searchTerm) ||
                (item.description || '').toLowerCase().includes(searchTerm)
            );
        }

        if (category) {
            items = items.filter(item => item.category === category);
        }

        if (items.length === 0) {
            grid.innerHTML = '<div class="pv-cart-empty" style="grid-column:1/-1; padding:40px;"><div style="font-size:2em; margin-bottom:8px;">🔍</div><div>No items found</div></div>';
            return;
        }

        const supplier = this.selectedSupplierId ? this.getSupplier(this.selectedSupplierId) : null;
        const supplierCode = supplier ? supplier.supplier_code : null;

        // Pagination - show first 50 items for performance
        const displayItems = items.slice(0, 50);
        const hasMore = items.length > 50;

        grid.innerHTML = displayItems.map(item => {
            const inCart = this.inquiryCart.some(c => c.item_code === item.item_code);
            const cost = supplierCode ? this.getSupplierCost(item, supplierCode) : 0;
            const hasCost = cost > 0;

            return `
                <div class="pv-catalog-item">
                    <img src="${item.main_image || '../images/placeholder-part.png'}" class="pv-catalog-item-image" alt="" onerror="this.src='../images/placeholder-part.png'">
                    <div class="pv-catalog-item-info">
                        <div class="pv-catalog-item-code">${this.escapeHtml(item.item_code || '')}</div>
                        <div class="pv-catalog-item-name">${this.escapeHtml(item.product_name_en || item.product_name || '')}</div>
                        <div class="pv-catalog-item-partno">${this.escapeHtml(item.oem_part_number || '')}</div>
                        ${supplierCode ? `<div class="pv-catalog-item-cost ${hasCost ? '' : 'missing'}">${hasCost ? 'Cost: $' + this.formatNumber(cost) : 'No cost data'}</div>` : ''}
                    </div>
                    <div class="pv-catalog-item-actions">
                        ${inCart
                            ? '<span class="pv-btn-added">✓ Added</span>'
                            : `<button class="pv-btn-add" onclick="app.addToInquiryCart('${item.item_code}')" ${!this.selectedSupplierId ? 'disabled' : ''}>+ Add</button>`
                        }
                    </div>
                </div>
            `;
        }).join('') + (hasMore ? `
            <div style="grid-column:1/-1; text-align:center; padding:16px; color:var(--text-muted); font-size:0.85em;">
                Showing 50 of ${items.length} items. Refine search to see more.
            </div>
        ` : '');
    },

    // ============================================
    // COST AUTO-DETECTION (KEY FEATURE)
    // ============================================

    getSupplierCost(item, supplierCode) {
        if (!supplierCode) return 0;
        const field = 'cost_price_supplier_' + supplierCode.toLowerCase();
        const cost = item[field];
        if (cost && cost !== '' && cost !== '0' && cost !== 'N/A' && cost !== 0) {
            const parsed = parseFloat(cost);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    },

    // ============================================
    // INQUIRY CART
    // ============================================

    addToInquiryCart(itemCode) {
        if (!this.selectedSupplierId) {
            this.showToast('Please select a supplier first', 'warning');
            return;
        }

        const item = window.PVCatalog.items.find(i => i.item_code === itemCode);
        if (!item) {
            this.showToast('Item not found in catalog', 'error');
            return;
        }

        if (this.inquiryCart.some(c => c.item_code === itemCode)) {
            this.showToast('Item already in inquiry', 'warning');
            return;
        }

        const supplier = this.getSupplier(this.selectedSupplierId);
        const supplierCode = supplier ? supplier.supplier_code : null;
        const unitCost = supplierCode ? this.getSupplierCost(item, supplierCode) : 0;

        const cartItem = {
            item_code: item.item_code || '',
            oem_part_number: item.oem_part_number || '',
            product_name_en: item.product_name_en || item.product_name || '',
            product_name_cn: item.product_name_cn || '',
            main_image: item.main_image || '../images/placeholder-part.png',
            qty: 1,
            unit_cost: unitCost,
            total: unitCost,
            notes: ''
        };

        this.inquiryCart.push(cartItem);
        this.saveCart();
        this.updateCartUI();
        this.renderCatalogForInquiry(); // Update "Added" buttons
        this.updateStepIndicators();

        const costMsg = unitCost > 0 ? `Auto-filled cost: $${this.formatNumber(unitCost)}` : 'No cost data - enter manually';
        this.showToast(`Added ${itemCode}. ${costMsg}`, 'success');
    },

    removeFromCart(index) {
        this.inquiryCart.splice(index, 1);
        this.saveCart();
        this.updateCartUI();
        this.renderCatalogForInquiry();
        this.updateStepIndicators();
    },

    updateCartItemQty(index, qty) {
        qty = parseInt(qty) || 1;
        if (qty < 1) qty = 1;
        this.inquiryCart[index].qty = qty;
        this.inquiryCart[index].total = qty * this.inquiryCart[index].unit_cost;
        this.saveCart();
        this.updateCartUI();
    },

    updateCartItemCost(index, cost) {
        cost = parseFloat(cost) || 0;
        this.inquiryCart[index].unit_cost = cost;
        this.inquiryCart[index].total = this.inquiryCart[index].qty * cost;
        this.saveCart();
        this.updateCartUI();
    },

    updateCartItemNotes(index, notes) {
        this.inquiryCart[index].notes = notes;
        this.saveCart();
    },

    clearCart() {
        if (this.inquiryCart.length === 0) return;
        this.confirmAction(
            'Clear all items?',
            'This will remove all items from the current inquiry cart.',
            () => {
                this.inquiryCart = [];
                this.saveCart();
                this.updateCartUI();
                this.renderCatalogForInquiry();
                this.updateStepIndicators();
                this.showToast('Cart cleared', 'info');
            }
        );
    },

    getCartTotal() {
        return this.inquiryCart.reduce((sum, item) => sum + item.total, 0);
    },

    // ============================================
    // CART UI
    // ============================================

    updateCartUI() {
        const itemCount = this.inquiryCart.length;
        const total = this.getCartTotal();

        // Update badges
        document.getElementById('cart-panel-count').textContent = itemCount;
        document.getElementById('floating-cart-count').textContent = itemCount;
        document.getElementById('mini-cart-item-count').textContent = itemCount;

        // Update totals
        const totalStr = '$' + this.formatNumber(total);
        document.getElementById('mini-cart-total').textContent = totalStr;
        document.getElementById('cart-panel-total').textContent = totalStr;

        // Show/hide floating button
        document.getElementById('floating-cart-btn').style.display = itemCount > 0 ? 'block' : 'none';

        // Render mini cart
        const miniCart = document.getElementById('mini-cart-items');
        if (itemCount === 0) {
            miniCart.innerHTML = `
                <div class="pv-cart-empty">
                    <div style="font-size:2rem; margin-bottom:8px;">&#128203;</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">No items added</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Add items from catalog</div>
                </div>`;
        } else {
            miniCart.innerHTML = this.inquiryCart.map((item, idx) => `
                <div class="pv-cart-item">
                    <img src="${item.main_image || '../images/placeholder-part.png'}" class="pv-cart-item-image" alt="" onerror="this.src='../images/placeholder-part.png'">
                    <div class="pv-cart-item-details">
                        <div class="pv-cart-item-code">${this.escapeHtml(item.item_code)}</div>
                        <div class="pv-cart-item-name">${this.escapeHtml(item.product_name_en)}</div>
                        <div class="pv-cart-item-price-row">
                            <input type="number" class="pv-cart-item-qty" value="${item.qty}" min="1" onchange="app.updateCartItemQty(${idx}, this.value)" title="Quantity">
                            <span style="color:var(--text-muted); font-size:0.75em;">×</span>
                            <input type="number" class="pv-cart-item-unit-cost" value="${item.unit_cost}" min="0" step="0.01" onchange="app.updateCartItemCost(${idx}, this.value)" title="Unit cost">
                            <span class="pv-cart-item-total">$${this.formatNumber(item.total)}</span>
                        </div>
                        <input type="text" class="pv-cart-item-notes" placeholder="Notes..." value="${this.escapeHtml(item.notes)}" onchange="app.updateCartItemNotes(${idx}, this.value)">
                    </div>
                    <button class="pv-cart-item-remove" onclick="app.removeFromCart(${idx})" title="Remove">🗑</button>
                </div>
            `).join('');
        }

        // Render panel cart (same content but with full width)
        const panelItems = document.getElementById('cart-panel-items');
        if (itemCount === 0) {
            panelItems.innerHTML = `
                <div class="pv-cart-empty">
                    <div style="font-size:2.5rem; margin-bottom:12px;">&#128203;</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:4px;">No items added</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Browse the catalog and add items</div>
                </div>`;
        } else {
            panelItems.innerHTML = this.inquiryCart.map((item, idx) => `
                <div class="pv-cart-item">
                    <img src="${item.main_image || '../images/placeholder-part.png'}" class="pv-cart-item-image" alt="" onerror="this.src='../images/placeholder-part.png'">
                    <div class="pv-cart-item-details">
                        <div class="pv-cart-item-code">${this.escapeHtml(item.item_code)}</div>
                        <div class="pv-cart-item-name">${this.escapeHtml(item.product_name_en)}</div>
                        <div class="pv-cart-item-price-row">
                            <input type="number" class="pv-cart-item-qty" value="${item.qty}" min="1" onchange="app.updateCartItemQty(${idx}, this.value)" title="Quantity">
                            <span style="color:var(--text-muted); font-size:0.75em;">×</span>
                            <input type="number" class="pv-cart-item-unit-cost" value="${item.unit_cost}" min="0" step="0.01" onchange="app.updateCartItemCost(${idx}, this.value)" title="Unit cost">
                            <span class="pv-cart-item-total">$${this.formatNumber(item.total)}</span>
                        </div>
                        <input type="text" class="pv-cart-item-notes" placeholder="Notes..." value="${this.escapeHtml(item.notes)}" onchange="app.updateCartItemNotes(${idx}, this.value)">
                    </div>
                    <button class="pv-cart-item-remove" onclick="app.removeFromCart(${idx})" title="Remove">🗑</button>
                </div>
            `).join('');
        }
    },

    toggleCartPanel() {
        document.getElementById('cart-panel').classList.toggle('active');
        document.getElementById('cart-panel-overlay').classList.toggle('active');
    },

    closeCartPanel() {
        document.getElementById('cart-panel').classList.remove('active');
        document.getElementById('cart-panel-overlay').classList.remove('active');
    },

    // ============================================
    // INQUIRY GENERATION
    // ============================================

    generateInquiryNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const prefix = `SQ-${year}-`;

        // Find existing inquiries this year and get max number
        const existing = this.inquiries
            .filter(i => i.inquiry_number && i.inquiry_number.startsWith(prefix))
            .map(i => {
                const match = i.inquiry_number.match(/-(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            });

        const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
        const nextNum = String(maxNum + 1).padStart(3, '0');
        return prefix + nextNum;
    },

    createInquiry() {
        if (!this.selectedSupplierId) {
            this.showToast('Please select a supplier', 'warning');
            return;
        }
        if (this.inquiryCart.length === 0) {
            this.showToast('Please add at least one item', 'warning');
            return;
        }

        const supplier = this.getSupplier(this.selectedSupplierId);
        if (!supplier) {
            this.showToast('Supplier not found', 'error');
            return;
        }

        const inquiryNumber = this.generateInquiryNumber();
        const totalCost = this.getCartTotal();
        const totalItems = this.inquiryCart.reduce((sum, item) => sum + item.qty, 0);

        const inquiry = {
            id: 'inquiry-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            inquiry_number: inquiryNumber,
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            supplier_company: supplier.company,
            supplier_phone: supplier.phone,
            supplier_email: supplier.email || '',
            supplier_address: supplier.address || '',
            supplier_code: supplier.supplier_code || '',
            items: this.inquiryCart.map(item => ({
                item_code: item.item_code,
                oem_part_number: item.oem_part_number,
                product_name_en: item.product_name_en,
                qty: item.qty,
                unit_cost: item.unit_cost,
                total: item.total,
                notes: item.notes
            })),
            total_items: totalItems,
            total_cost: totalCost,
            notes: this.settings.default_notes || '',
            status: 'Draft',
            created_at: new Date().toISOString(),
            sent_via: ''
        };

        this.inquiries.push(inquiry);
        this.saveInquiries();

        // Clear cart
        this.inquiryCart = [];
        this.saveCart();
        this.selectedSupplierId = null;
        document.getElementById('inquiry-supplier-select').value = '';

        this.updateCartUI();
        this.updateCartSupplierInfo();
        this.renderCatalogForInquiry();
        this.updateStepIndicators();
        this.updateBadges();

        this.showToast(`Inquiry ${inquiryNumber} created`, 'success');

        // Show the inquiry
        this.viewInquiry(inquiry.id);

        // Refresh inquiries tab
        this.renderInquiries();
    },

    // ============================================
    // INQUIRY VIEWER
    // ============================================

    viewInquiry(id) {
        const inquiry = this.inquiries.find(i => i.id === id);
        if (!inquiry) return;

        this.viewingInquiryId = id;
        const body = document.getElementById('inquiry-viewer-body');

        body.innerHTML = this.renderInquiryDocument(inquiry);

        // Action buttons
        const actions = document.getElementById('inquiry-viewer-actions');
        actions.innerHTML = `
            <button class="pv-action-btn pv-action-btn-print" onclick="app.printInquiry('${inquiry.id}')">
                🖨️ Print PDF
            </button>
            <button class="pv-action-btn pv-action-btn-whatsapp" onclick="app.shareInquiryWhatsApp('${inquiry.id}')">
                📱 WhatsApp
            </button>
            <button class="pv-action-btn pv-action-btn-email" onclick="app.shareInquiryEmail('${inquiry.id}')">
                ✉️ Email
            </button>
            <select class="pv-status-select" onchange="app.updateInquiryStatus('${inquiry.id}', this.value)">
                <option value="Draft" ${inquiry.status === 'Draft' ? 'selected' : ''}>Mark: Draft</option>
                <option value="Sent" ${inquiry.status === 'Sent' ? 'selected' : ''}>Mark: Sent</option>
                <option value="Responded" ${inquiry.status === 'Responded' ? 'selected' : ''}>Mark: Responded</option>
                <option value="Ordered" ${inquiry.status === 'Ordered' ? 'selected' : ''}>Mark: Ordered</option>
                <option value="Closed" ${inquiry.status === 'Closed' ? 'selected' : ''}>Mark: Closed</option>
            </select>
        `;

        document.getElementById('inquiry-viewer-overlay').classList.add('active');
    },

    renderInquiryDocument(inquiry) {
        const companyName = this.settings.company_name || 'Parts Village';
        const companyPhone = this.settings.phone || '';
        const companyEmail = this.settings.email || '';
        const companyAddress = this.settings.address || '';
        const companyWebsite = this.settings.website || '';

        return `
            <div class="pv-inquiry-document" id="inquiry-document-${inquiry.id}">
                <div class="pv-inquiry-doc-header">
                    <img src="../images/logo-wordmark-dark.png" class="doc-logo" alt="Parts Village" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div style="display:none; width:60px; height:60px; background:linear-gradient(135deg,#c0c0c0,#808080); border-radius:12px; align-items:center; justify-content:center; font-weight:800; color:#000; font-size:1.2em;">PV</div>
                    <div class="pv-inquiry-doc-type">
                        <h1>Supplier Inquiry</h1>
                        <div class="pv-inquiry-doc-meta">
                            <div><strong>Inquiry #:</strong> ${inquiry.inquiry_number}</div>
                            <div><strong>Date:</strong> ${this.formatDateLong(inquiry.created_at)}</div>
                            ${inquiry.supplier_code ? `<div><strong>Supplier Code:</strong> ${this.escapeHtml(inquiry.supplier_code)}</div>` : ''}
                        </div>
                    </div>
                </div>

                <div class="pv-inquiry-doc-parties">
                    <div class="pv-inquiry-doc-to">
                        <div class="pv-inquiry-doc-label">To (Supplier)</div>
                        <div class="pv-inquiry-doc-party-name">${this.escapeHtml(inquiry.supplier_name)}</div>
                        <div class="pv-inquiry-doc-party-company">${this.escapeHtml(inquiry.supplier_company)}</div>
                        <div class="pv-inquiry-doc-party-detail">
                            ${inquiry.supplier_phone ? `📞 ${this.escapeHtml(inquiry.supplier_phone)}<br>` : ''}
                            ${inquiry.supplier_email ? `✉️ ${this.escapeHtml(inquiry.supplier_email)}<br>` : ''}
                            ${inquiry.supplier_address ? `📍 ${this.escapeHtml(inquiry.supplier_address)}<br>` : ''}
                        </div>
                    </div>
                    <div class="pv-inquiry-doc-from">
                        <div class="pv-inquiry-doc-label">From</div>
                        <div class="pv-inquiry-doc-party-name">${this.escapeHtml(companyName)}</div>
                        <div class="pv-inquiry-doc-party-detail">
                            ${companyPhone ? `📞 ${this.escapeHtml(companyPhone)}<br>` : ''}
                            ${companyEmail ? `✉️ ${this.escapeHtml(companyEmail)}<br>` : ''}
                            ${companyWebsite ? `🌐 ${this.escapeHtml(companyWebsite)}<br>` : ''}
                            ${companyAddress ? `📍 ${this.escapeHtml(companyAddress)}<br>` : ''}
                        </div>
                    </div>
                </div>

                <div class="pv-inquiry-doc-items-title">Items Requested</div>
                <table class="pv-inquiry-doc-table">
                    <thead>
                        <tr>
                            <th class="col-num">#</th>
                            <th class="col-code">Item Code</th>
                            <th class="col-partno">OEM Part Number</th>
                            <th>Description</th>
                            <th class="col-qty">Qty</th>
                            <th class="col-price">Unit Cost</th>
                            <th class="col-total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inquiry.items.map((item, idx) => `
                            <tr>
                                <td class="col-num">${idx + 1}</td>
                                <td class="col-code">${this.escapeHtml(item.item_code)}</td>
                                <td class="col-partno">${this.escapeHtml(item.oem_part_number)}</td>
                                <td>${this.escapeHtml(item.product_name_en)}${item.notes ? '<br><small style="color:#888;">' + this.escapeHtml(item.notes) + '</small>' : ''}</td>
                                <td class="col-qty">${item.qty}</td>
                                <td class="col-price">$${this.formatNumber(item.unit_cost)}</td>
                                <td class="col-total">$${this.formatNumber(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="pv-inquiry-doc-summary">
                    <div class="pv-inquiry-doc-summary-box">
                        <div class="pv-inquiry-doc-summary-row">
                            <span>Total Items</span>
                            <span>${inquiry.total_items}</span>
                        </div>
                        <div class="pv-inquiry-doc-summary-row total">
                            <span>Estimated Total</span>
                            <span>$${this.formatNumber(inquiry.total_cost)}</span>
                        </div>
                    </div>
                </div>

                ${inquiry.notes ? `
                <div class="pv-inquiry-doc-notes-section">
                    <div class="pv-inquiry-doc-notes-title">Notes / Instructions</div>
                    <div class="pv-inquiry-doc-notes-content">${this.escapeHtml(inquiry.notes)}</div>
                </div>
                ` : ''}

                <div class="pv-inquiry-doc-footer">
                    <div>This inquiry was generated by Parts Village Supplier Management System</div>
                    <div style="margin-top:4px;">${this.formatDateLong(inquiry.created_at)}</div>
                </div>
            </div>
        `;
    },

    closeInquiryViewer() {
        document.getElementById('inquiry-viewer-overlay').classList.remove('active');
        this.viewingInquiryId = null;
    },

    // ============================================
    // INQUIRY ACTIONS
    // ============================================

    printInquiry(id) {
        const inquiry = this.inquiries.find(i => i.id === id);
        if (!inquiry) return;

        // Open in new window for clean printing
        const companyName = this.settings.company_name || 'Parts Village';
        const companyPhone = this.settings.phone || '';
        const companyEmail = this.settings.email || '';
        const companyAddress = this.settings.address || '';
        const companyWebsite = this.settings.website || '';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Inquiry ${inquiry.inquiry_number}</title>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Segoe UI',Arial,sans-serif; color:#1a1a1a; line-height:1.6; padding:40px; max-width:900px; margin:0 auto; }
                    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:24px; border-bottom:3px solid #c0c0c0; }
                    .header-right { text-align:right; }
                    h1 { font-size:1.6em; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
                    .meta { font-size:0.85em; color:#555; }
                    .meta strong { color:#c0c0c0; }
                    .parties { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:32px; }
                    .party { padding:16px; background:#f9f9f9; border-radius:8px; }
                    .party-label { font-size:0.75em; text-transform:uppercase; letter-spacing:1px; color:#888; font-weight:700; margin-bottom:8px; }
                    .party-name { font-size:1.1em; font-weight:700; margin-bottom:4px; }
                    .party-company { font-size:0.9em; color:#c0c0c0; font-weight:600; margin-bottom:8px; }
                    .party-detail { font-size:0.85em; color:#555; line-height:1.8; }
                    .section-title { font-size:1em; font-weight:700; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #c0c0c0; }
                    table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:0.9em; }
                    th { background:#f5f5f5; padding:10px 12px; text-align:left; font-weight:700; font-size:0.8em; text-transform:uppercase; letter-spacing:0.5px; color:#555; border-bottom:2px solid #c0c0c0; }
                    td { padding:10px 12px; border-bottom:1px solid #e8e8e8; vertical-align:top; }
                    .col-num { width:30px; text-align:center; }
                    .col-code { font-family:'Courier New',monospace; font-weight:600; color:#c0c0c0; }
                    .col-partno { font-family:'Courier New',monospace; font-size:0.9em; }
                    .col-qty { width:50px; text-align:center; font-weight:700; }
                    .col-price { width:100px; text-align:right; font-weight:600; }
                    .col-total { width:100px; text-align:right; font-weight:700; }
                    .summary { display:flex; justify-content:flex-end; margin-bottom:32px; }
                    .summary-box { background:#f9f9f9; border-radius:8px; padding:16px 24px; min-width:280px; }
                    .summary-row { display:flex; justify-content:space-between; padding:6px 0; font-size:0.9em; color:#555; }
                    .summary-row.total { border-top:2px solid #c0c0c0; margin-top:8px; padding-top:10px; font-size:1.1em; font-weight:700; color:#1a1a1a; }
                    .notes-section { background:#f9f9f9; border-radius:8px; padding:20px; margin-bottom:24px; }
                    .notes-title { font-size:0.85em; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:8px; }
                    .notes-content { font-size:0.9em; color:#555; line-height:1.7; white-space:pre-wrap; }
                    .doc-footer { text-align:center; font-size:0.8em; color:#888; padding-top:24px; border-top:1px solid #e8e8e8; }
                    @media print { body { padding:0; } }
                    @media (max-width:600px) { .parties { grid-template-columns:1fr; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <img src="../images/logo-wordmark-dark.png" style="max-height:60px;" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\'width:60px;height:60px;background:linear-gradient(135deg,#c0c0c0,#808080);border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:1.2em;\\'>PV</div>'">
                    </div>
                    <div class="header-right">
                        <h1>Supplier Inquiry</h1>
                        <div class="meta">
                            <div><strong>Inquiry #:</strong> ${inquiry.inquiry_number}</div>
                            <div><strong>Date:</strong> ${this.formatDateLong(inquiry.created_at)}</div>
                            ${inquiry.supplier_code ? `<div><strong>Supplier Code:</strong> ${this.escapeHtml(inquiry.supplier_code)}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="parties">
                    <div class="party">
                        <div class="party-label">To (Supplier)</div>
                        <div class="party-name">${this.escapeHtml(inquiry.supplier_name)}</div>
                        <div class="party-company">${this.escapeHtml(inquiry.supplier_company)}</div>
                        <div class="party-detail">
                            ${inquiry.supplier_phone ? `📞 ${this.escapeHtml(inquiry.supplier_phone)}<br>` : ''}
                            ${inquiry.supplier_email ? `✉️ ${this.escapeHtml(inquiry.supplier_email)}<br>` : ''}
                            ${inquiry.supplier_address ? `📍 ${this.escapeHtml(inquiry.supplier_address)}<br>` : ''}
                        </div>
                    </div>
                    <div class="party">
                        <div class="party-label">From</div>
                        <div class="party-name">${this.escapeHtml(companyName)}</div>
                        <div class="party-detail">
                            ${companyPhone ? `📞 ${this.escapeHtml(companyPhone)}<br>` : ''}
                            ${companyEmail ? `✉️ ${this.escapeHtml(companyEmail)}<br>` : ''}
                            ${companyWebsite ? `🌐 ${this.escapeHtml(companyWebsite)}<br>` : ''}
                            ${companyAddress ? `📍 ${this.escapeHtml(companyAddress)}<br>` : ''}
                        </div>
                    </div>
                </div>
                <div class="section-title">Items Requested</div>
                <table>
                    <thead>
                        <tr><th class="col-num">#</th><th class="col-code">Item Code</th><th class="col-partno">OEM Part Number</th><th>Description</th><th class="col-qty">Qty</th><th class="col-price">Unit Cost</th><th class="col-total">Total</th></tr>
                    </thead>
                    <tbody>
                        ${inquiry.items.map((item, idx) => `
                            <tr>
                                <td class="col-num">${idx + 1}</td>
                                <td class="col-code">${this.escapeHtml(item.item_code)}</td>
                                <td class="col-partno">${this.escapeHtml(item.oem_part_number)}</td>
                                <td>${this.escapeHtml(item.product_name_en)}${item.notes ? '<br><small style="color:#888;">' + this.escapeHtml(item.notes) + '</small>' : ''}</td>
                                <td class="col-qty">${item.qty}</td>
                                <td class="col-price">$${this.formatNumber(item.unit_cost)}</td>
                                <td class="col-total">$${this.formatNumber(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="summary">
                    <div class="summary-box">
                        <div class="summary-row"><span>Total Items</span><span>${inquiry.total_items}</span></div>
                        <div class="summary-row total"><span>Estimated Total</span><span>$${this.formatNumber(inquiry.total_cost)}</span></div>
                    </div>
                </div>
                ${inquiry.notes ? `
                <div class="notes-section">
                    <div class="notes-title">Notes / Instructions</div>
                    <div class="notes-content">${this.escapeHtml(inquiry.notes)}</div>
                </div>` : ''}
                <div class="doc-footer">
                    <div>This inquiry was generated by Parts Village</div>
                    <div>${this.formatDateLong(inquiry.created_at)}</div>
                </div>
                <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    shareInquiryWhatsApp(id) {
        const inquiry = this.inquiries.find(i => i.id === id);
        if (!inquiry) return;

        const companyName = this.settings.company_name || 'Parts Village';
        let text = `*Supplier Inquiry - ${inquiry.inquiry_number}*\n\n`;
        text += `*From:* ${companyName}\n`;
        text += `*To:* ${inquiry.supplier_name} (${inquiry.supplier_company})\n`;
        text += `*Date:* ${this.formatDate(inquiry.created_at)}\n\n`;
        text += `*Items Requested:*\n`;
        inquiry.items.forEach((item, idx) => {
            text += `${idx + 1}. ${item.item_code} - ${item.product_name_en}\n`;
            text += `   Qty: ${item.qty}`;
            if (item.unit_cost > 0) {
                text += ` | Target: $${this.formatNumber(item.unit_cost)}`;
            }
            text += '\n';
            if (item.oem_part_number) {
                text += `   OEM: ${item.oem_part_number}\n`;
            }
            text += '\n';
        });
        text += `\n*Total Items:* ${inquiry.total_items}\n`;
        if (inquiry.total_cost > 0) {
            text += `*Est. Total:* $${this.formatNumber(inquiry.total_cost)}\n`;
        }
        if (inquiry.notes) {
            text += `\n*Notes:* ${inquiry.notes}\n`;
        }
        text += `\n_Please reply with availability and pricing._`;

        const url = 'https://wa.me/?text=' + encodeURIComponent(text);
        window.open(url, '_blank');
    },

    shareInquiryEmail(id) {
        const inquiry = this.inquiries.find(i => i.id === id);
        if (!inquiry) return;

        const companyName = this.settings.company_name || 'Parts Village';
        const subject = encodeURIComponent(`Supplier Inquiry - ${inquiry.inquiry_number} - ${companyName}`);

        let body = `Dear ${inquiry.supplier_name},\n\n`;
        body += `Please find below our inquiry for the following items:\n\n`;
        body += `Inquiry #: ${inquiry.inquiry_number}\n`;
        body += `Date: ${this.formatDateLong(inquiry.created_at)}\n\n`;
        body += `ITEMS:\n`;
        body += `----------------------------------------\n`;
        inquiry.items.forEach((item, idx) => {
            body += `${idx + 1}. ${item.item_code} - ${item.product_name_en}\n`;
            body += `    OEM Part Number: ${item.oem_part_number}\n`;
            body += `    Quantity: ${item.qty}\n`;
            if (item.unit_cost > 0) {
                body += `    Target Price: $${this.formatNumber(item.unit_cost)}\n`;
            }
            if (item.notes) {
                body += `    Notes: ${item.notes}\n`;
            }
            body += '\n';
        });
        body += `----------------------------------------\n`;
        body += `Total Items: ${inquiry.total_items}\n`;
        if (inquiry.total_cost > 0) {
            body += `Estimated Total: $${this.formatNumber(inquiry.total_cost)}\n`;
        }
        if (inquiry.notes) {
            body += `\nNotes: ${inquiry.notes}\n`;
        }
        body += `\nPlease reply with availability, pricing, and lead time.\n\n`;
        body += `Best regards,\n${companyName}\n`;
        if (this.settings.phone) body += `Phone: ${this.settings.phone}\n`;
        if (this.settings.email) body += `Email: ${this.settings.email}\n`;

        const to = inquiry.supplier_email || '';
        window.open(`mailto:${to}?subject=${subject}&body=${encodeURIComponent(body)}`, '_blank');
    },

    updateInquiryStatus(id, status) {
        const inquiry = this.inquiries.find(i => i.id === id);
        if (!inquiry) return;

        inquiry.status = status;
        if (status === 'Sent') {
            inquiry.sent_via = 'Manual';
        }
        this.saveInquiries();
        this.renderInquiries();
        this.updateBadges();

        // Update status badge in viewer
        const select = document.querySelector('#inquiry-viewer-actions .pv-status-select');
        if (select) select.value = status;

        this.showToast(`Inquiry marked as ${status}`, 'success');
    },

    // ============================================
    // INQUIRIES LIST
    // ============================================

    renderInquiries() {
        const tbody = document.getElementById('inquiries-tbody');
        const tableWrap = document.getElementById('inquiries-table-wrap');
        const empty = document.getElementById('inquiries-empty');

        const supplierFilter = document.getElementById('inquiry-filter-supplier').value;
        const statusFilter = document.getElementById('inquiry-filter-status').value;

        let list = [...this.inquiries];
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (supplierFilter) {
            list = list.filter(i => i.supplier_id === supplierFilter);
        }
        if (statusFilter) {
            list = list.filter(i => i.status === statusFilter);
        }

        if (list.length === 0) {
            tableWrap.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        tableWrap.style.display = 'block';
        empty.style.display = 'none';

        tbody.innerHTML = list.map(iq => `
            <tr onclick="app.viewInquiry('${iq.id}')">
                <td><strong>${iq.inquiry_number}</strong></td>
                <td>
                    <div style="font-weight:600;">${this.escapeHtml(iq.supplier_name)}</div>
                    <div style="font-size:0.8em; color:var(--text-muted);">${this.escapeHtml(iq.supplier_company)}</div>
                </td>
                <td>${this.formatDate(iq.created_at)}</td>
                <td style="text-align:center;">${iq.total_items}</td>
                <td style="text-align:right; font-weight:600; color:var(--silver);">$${this.formatNumber(iq.total_cost)}</td>
                <td><span class="pv-badge pv-badge-${iq.status.toLowerCase()}">${iq.status}</span></td>
                <td>${iq.sent_via ? this.escapeHtml(iq.sent_via) : '<span style="color:var(--text-muted);">-</span>'}</td>
            </tr>
        `).join('');
    },

    populateInquiryFilters() {
        const select = document.getElementById('inquiry-filter-supplier');
        const currentVal = select.value;
        select.innerHTML = '<option value="">All Suppliers</option>' +
            this.suppliers
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(s => `<option value="${s.id}">${this.escapeHtml(s.name)} · ${this.escapeHtml(s.company)}</option>`)
                .join('');
        select.value = currentVal;
    },

    // ============================================
    // SETTINGS MODAL
    // ============================================

    openSettingsModal() {
        document.getElementById('settings-modal-overlay').classList.add('active');
    },

    closeSettingsModal() {
        document.getElementById('settings-modal-overlay').classList.remove('active');
    },

    // ============================================
    // BADGES
    // ============================================

    updateBadges() {
        document.getElementById('supplier-count-badge').textContent = this.suppliers.length;
        document.getElementById('inquiry-count-badge').textContent = this.inquiries.length;
    },

    // ============================================
    // CONFIRM DIALOG
    // ============================================

    confirmAction(title, message, onConfirm) {
        // Remove any existing confirm
        document.querySelectorAll('.pv-confirm-overlay').forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'pv-confirm-overlay';
        overlay.innerHTML = `
            <div class="pv-confirm-box">
                <h3>${this.escapeHtml(title)}</h3>
                <p>${this.escapeHtml(message)}</p>
                <div class="pv-confirm-buttons">
                    <button class="pv-btn pv-btn-outline" onclick="this.closest('.pv-confirm-overlay').remove()">Cancel</button>
                    <button class="pv-btn pv-btn-danger" id="confirm-yes-btn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => overlay.classList.add('active'));

        overlay.querySelector('#confirm-yes-btn').addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });
    },

    confirmResetAll() {
        this.confirmAction(
            'Reset All Data?',
            'This will permanently delete ALL suppliers, inquiries, and settings. This cannot be undone.',
            () => {
                localStorage.removeItem(this.STORAGE_KEYS.suppliers);
                localStorage.removeItem(this.STORAGE_KEYS.inquiries);
                localStorage.removeItem(this.STORAGE_KEYS.cart);
                this.suppliers = [];
                this.inquiries = [];
                this.inquiryCart = [];
                this.selectedSupplierId = null;
                this.saveCart();
                this.renderSuppliers();
                this.renderInquiries();
                this.updateCartUI();
                this.updateCartSupplierInfo();
                this.updateBadges();
                this.updateStepIndicators();
                this.closeSettingsModal();
                this.showToast('All data has been reset', 'warning');
            }
        );
    },

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `pv-toast ${type}`;
        toast.innerHTML = `
            <span class="pv-toast-icon">${icons[type]}</span>
            <span class="pv-toast-message">${this.escapeHtml(message)}</span>
            <button class="pv-toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // ============================================
    // UTILITIES
    // ============================================

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateLong(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    formatNumber(num) {
        const n = parseFloat(num);
        if (isNaN(n)) return '0.00';
        return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    generateId() {
        return 'pv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = SuppliersApp;
    SuppliersApp.init();
});

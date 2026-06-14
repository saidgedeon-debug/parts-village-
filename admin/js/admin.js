// ============================================
// PARTS VILLAGE ADMIN BACKOFFICE v3.1
// Features:
//   - Categories management (add/edit/delete with images)
//   - Multiple images per item with gallery
//   - Main image selector (choose and change anytime)
//   - Manual item code entry (obligatory)
//   - Standalone: localStorage + password auth
//   - Optional: Supabase sync when configured
// ============================================

const PVAdmin = {
    catalog: [],
    filteredItems: [],
    categories: [],
    editingItem: null,
    editingCategoryIndex: -1,
    isAuthenticated: false,
    exchangeRate: 7.25, // Default USD to RMB rate
    currentTab: 'basic',
    supabase: null,
    user: null,
    searchQuery: '',

    // Password
    get adminPassword() {
        return (window.ENV && window.ENV.ADMIN_PASSWORD) ? window.ENV.ADMIN_PASSWORD : 'admin123';
    },

    // ============================================
    // INIT - Server-side auth handles login
    // No client-side login needed - Basic Auth protects the route
    // ============================================
    async init() {
        this.isAuthenticated = true;
        this.showApp();
        this.loadExchangeRate();
        this.loadCategories();
        this.loadCatalog();
    },

    // ============================================
    // LOCAL AUTH
    // ============================================
    checkLocalSession() {
        const session = localStorage.getItem('pv_admin_session');
        if (!session) return false;
        try {
            const { expiry } = JSON.parse(session);
            if (Date.now() > expiry) {
                localStorage.removeItem('pv_admin_session');
                return false;
            }
            return true;
        } catch (e) { return false; }
    },

    createLocalSession() {
        localStorage.setItem('pv_admin_session', JSON.stringify({
            timestamp: Date.now(),
            expiry: Date.now() + 3600 * 1000
        }));
    },

    login() {
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.querySelector('.login-btn');

        if (!password) { errorEl.textContent = 'Please enter a password'; return; }

        btn.classList.add('loading');
        btn.textContent = 'Signing in...';
        errorEl.textContent = '';

        this.trySupabaseLogin(password).then(supabaseSuccess => {
            if (supabaseSuccess) return;
            if (password === this.adminPassword) {
                this.createLocalSession();
                this.isAuthenticated = true;
                errorEl.textContent = '';
                this.showApp();
                this.loadCategories();
                this.loadCatalog();
            } else {
                errorEl.textContent = 'Incorrect password. Please try again.';
                document.getElementById('login-password').value = '';
                document.getElementById('login-password').focus();
            }
        }).catch(() => {
            if (password === this.adminPassword) {
                this.createLocalSession();
                this.isAuthenticated = true;
                errorEl.textContent = '';
                this.showApp();
                this.loadCategories();
                this.loadCatalog();
            } else {
                errorEl.textContent = 'Incorrect password. Please try again.';
                document.getElementById('login-password').value = '';
                document.getElementById('login-password').focus();
            }
        }).finally(() => {
            btn.classList.remove('loading');
            btn.textContent = 'Login to Dashboard';
        });
    },

    async trySupabaseLogin(password) {
        const supabaseConfigured = window.supabaseClient &&
            window.ENV && window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');
        if (!supabaseConfigured) return false;
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: 'admin@partsvillage.com',
                password: password
            });
            if (!error && data.user) {
                this.user = data.user;
                this.isAuthenticated = true;
                this.showApp();
                this.loadCategories();
                await this.loadCatalog();
                return true;
            }
        } catch (e) {}
        return false;
    },

    logout() {
        // Clear localStorage
        localStorage.removeItem('pv_admin_session');
        this.isAuthenticated = false;
        this.user = null;
        // Force browser to forget Basic Auth credentials
        // Redirect to same URL with wrong credentials to clear auth cache
        const currentUrl = window.location.href;
        window.location.href = currentUrl.replace('://', '://logout:logout@');
    },

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    },

    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    },

    // ============================================
    // CATEGORIES MANAGEMENT
    // ============================================
    loadCategories() {
        const saved = localStorage.getItem('pv_categories');
        if (saved) {
            try { this.categories = JSON.parse(saved); } catch (e) { this.categories = []; }
        } else {
            this.categories = [];
        }
    },

    saveCategories() {
        localStorage.setItem('pv_categories', JSON.stringify(this.categories));
        this.renderCategoryDropdown();
    },

    openCategoriesModal() {
        document.getElementById('categories-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        this.renderCategoriesList();
        this.cancelCategoryEdit();
    },

    closeCategoriesModal() {
        document.getElementById('categories-modal').classList.remove('active');
        document.body.style.overflow = '';
        this.cancelCategoryEdit();
    },

    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!this.categories.length) {
            container.innerHTML = '<div class="empty-categories">No categories yet. Add one above.</div>';
            return;
        }
        container.innerHTML = this.categories.map((cat, index) => {
            const hasImage = cat.image && cat.image.trim() && !cat.image.includes('Manual');
            return '<div class="category-item">' +
                '<div class="category-item-info">' +
                (hasImage ? '<img src="' + cat.image + '" alt="" class="category-item-thumb">' : '<div class="category-item-thumb no-thumb">&#128451;</div>') +
                '<span class="category-item-name">' + cat.name + '</span>' +
                '</div>' +
                '<div class="category-item-actions">' +
                '<button class="btn-icon" onclick="PVAdmin.startEditCategory(' + index + ')" title="Edit">&#9998;&#65039;</button>' +
                '<button class="btn-icon" onclick="PVAdmin.deleteCategory(' + index + ')" title="Delete">&#128465;&#65039;</button>' +
                '</div>' +
                '</div>';
        }).join('');
    },

    renderCategoryDropdown() {
        const select = document.getElementById('edit-category');
        if (!select) return;
        let html = '<option value="">-- Select Category --</option>';
        this.categories.forEach(cat => {
            html += '<option value="' + cat.name + '">' + cat.name + '</option>';
        });
        html += '<option value="__other__">+ Other (type manually)</option>';
        select.innerHTML = html;

        // If we were editing an item, restore its category selection
        if (this.editingItem && this.editingItem.category) {
            const match = Array.from(select.options).find(o => o.value === this.editingItem.category);
            if (match) select.value = this.editingItem.category;
            else {
                // Category doesn't exist anymore, add it as a temporary option
                const otherOpt = select.querySelector('option[value="__other__"]');
                const tempOpt = document.createElement('option');
                tempOpt.value = this.editingItem.category;
                tempOpt.textContent = this.editingItem.category;
                select.insertBefore(tempOpt, otherOpt);
                select.value = this.editingItem.category;
            }
        }
    },

    saveCategory() {
        const nameInput = document.getElementById('category-name-input');
        const preview = document.getElementById('category-image-preview');
        const name = nameInput.value.trim();

        if (!name) {
            this.showToast('Category name is required', 'error');
            return;
        }

        const imgEl = preview.querySelector('img');
        const image = imgEl ? imgEl.src : '';

        if (this.editingCategoryIndex >= 0) {
            // Edit existing
            this.categories[this.editingCategoryIndex] = { name, image };
            this.showToast('Category updated', 'success');
        } else {
            // Add new
            const exists = this.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
            if (exists) {
                this.showToast('Category already exists', 'error');
                return;
            }
            this.categories.push({ name, image });
            this.showToast('Category added', 'success');
        }

        this.saveCategories();
        this.renderCategoriesList();
        this.cancelCategoryEdit();
    },

    startEditCategory(index) {
        const cat = this.categories[index];
        if (!cat) return;
        this.editingCategoryIndex = index;
        document.getElementById('category-name-input').value = cat.name;

        const preview = document.getElementById('category-image-preview');
        if (cat.image && cat.image.trim()) {
            preview.innerHTML = '<img src="' + cat.image + '" alt="" style="max-width:200px;max-height:200px;border-radius:8px;">';
        } else {
            preview.innerHTML = '<div class="no-image">No image</div>';
        }

        document.getElementById('category-save-btn').textContent = 'Update Category';
        document.getElementById('category-cancel-btn').style.display = '';
    },

    cancelCategoryEdit() {
        this.editingCategoryIndex = -1;
        document.getElementById('category-name-input').value = '';
        document.getElementById('category-image-preview').innerHTML = '<div class="no-image">No image</div>';
        document.getElementById('category-save-btn').textContent = 'Add Category';
        document.getElementById('category-cancel-btn').style.display = 'none';
    },

    deleteCategory(index) {
        const cat = this.categories[index];
        if (!cat) return;
        if (!confirm('Delete category "' + cat.name + '"?\n\nItems using this category will keep the name but it won\'t be in the dropdown anymore.')) return;
        this.categories.splice(index, 1);
        this.saveCategories();
        this.renderCategoriesList();
        this.showToast('Category deleted', 'success');
    },

    handleCategoryImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const preview = document.getElementById('category-image-preview');
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = '<img src="' + e.target.result + '" alt="" style="max-width:200px;max-height:200px;border-radius:8px;">';
        };
        reader.readAsDataURL(file);
    },

    // ============================================
    // EXCHANGE RATE
    // ============================================
    loadExchangeRate() {
        const saved = localStorage.getItem('pv_exchange_rate');
        const savedTime = localStorage.getItem('pv_exchange_rate_time');
        if (saved && savedTime) {
            const age = Date.now() - parseInt(savedTime);
            // Use cached rate if less than 24 hours old
            if (age < 24 * 3600 * 1000) {
                this.exchangeRate = parseFloat(saved);
                this.updateExchangeRateDisplay();
                return;
            }
        }
        this.fetchExchangeRate();
    },

    async fetchExchangeRate() {
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            if (data && data.rates && data.rates.CNY) {
                this.exchangeRate = data.rates.CNY;
                localStorage.setItem('pv_exchange_rate', this.exchangeRate);
                localStorage.setItem('pv_exchange_rate_time', Date.now().toString());
                this.updateExchangeRateDisplay();
                this.showToast('Exchange rate updated: 1 USD = ' + this.exchangeRate.toFixed(2) + ' RMB', 'success');
                return;
            }
        } catch (e) {}
        // Fallback: try another API
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            if (data && data.rates && data.rates.CNY) {
                this.exchangeRate = data.rates.CNY;
                localStorage.setItem('pv_exchange_rate', this.exchangeRate);
                localStorage.setItem('pv_exchange_rate_time', Date.now().toString());
                this.updateExchangeRateDisplay();
                this.showToast('Exchange rate updated: 1 USD = ' + this.exchangeRate.toFixed(2) + ' RMB', 'success');
                return;
            }
        } catch (e) {}
        this.updateExchangeRateDisplay();
    },

    updateExchangeRateDisplay() {
        const el = document.getElementById('exchange-rate-display');
        if (el) el.textContent = '1 USD = ' + this.exchangeRate.toFixed(2) + ' RMB';
    },

    convertCurrency(amount, fromCurrency) {
        const num = parseFloat(amount);
        if (isNaN(num)) return { usd: '', rmb: '' };
        if (fromCurrency === 'USD') {
            return { usd: num.toFixed(2), rmb: (num * this.exchangeRate).toFixed(2) };
        } else {
            return { usd: (num / this.exchangeRate).toFixed(2), rmb: num.toFixed(2) };
        }
    },

    // ============================================
    // COST PRICES CRUD
    // ============================================
    addCostPriceField(data) {
        const container = document.getElementById('cost-prices-container');
        const d = data || {};
        const idx = container.querySelectorAll('.cost-price-row').length;
        const div = document.createElement('div');
        div.className = 'cost-price-row';
        div.innerHTML =
            '<div class="pricing-row-grid">' +
            '<input type="text" class="cost-supplier" placeholder="Supplier name" value="' + (d.supplier_name || '') + '">' +
            '<input type="text" class="cost-quality" placeholder="Quality (e.g. OEM, Aftermarket)" value="' + (d.quality || '') + '">' +
            '<input type="number" class="cost-price-original" placeholder="Price" step="0.01" value="' + (d.price_original || '') + '" onchange="PVAdmin.onCostPriceChange(this)">' +
            '<select class="cost-currency" onchange="PVAdmin.onCostPriceChange(this)">' +
            '<option value="USD" ' + ((d.currency_original || 'USD') === 'USD' ? 'selected' : '') + '>USD</option>' +
            '<option value="RMB" ' + ((d.currency_original || 'USD') === 'RMB' ? 'selected' : '') + '>RMB</option>' +
            '</select>' +
            '<input type="text" class="cost-price-usd" placeholder="USD" value="' + (d.price_usd || '') + '" readonly title="Auto-converted">' +
            '<input type="text" class="cost-price-rmb" placeholder="RMB" value="' + (d.price_rmb || '') + '" readonly title="Auto-converted">' +
            '<input type="text" class="cost-notes" placeholder="Notes" value="' + (d.notes || '') + '">' +
            '<button type="button" class="btn-remove" onclick="this.closest(\'.cost-price-row\').remove();PVAdmin.showToast(\'Cost price removed\',\'info\');">&#10005;</button>' +
            '</div>';
        container.appendChild(div);
        // Trigger conversion if data exists
        if (d.price_original) {
            const priceInput = div.querySelector('.cost-price-original');
            this.onCostPriceChange(priceInput);
        }
    },

    onCostPriceChange(el) {
        const row = el.closest('.cost-price-row');
        if (!row) return;
        const price = row.querySelector('.cost-price-original').value;
        const currency = row.querySelector('.cost-currency').value;
        const converted = this.convertCurrency(price, currency);
        row.querySelector('.cost-price-usd').value = converted.usd;
        row.querySelector('.cost-price-rmb').value = converted.rmb;
    },

    addSellingPriceField(data) {
        const container = document.getElementById('selling-prices-container');
        const d = data || {};
        const div = document.createElement('div');
        div.className = 'selling-price-row';
        div.innerHTML =
            '<div class="pricing-row-grid selling-grid">' +
            '<input type="text" class="sell-quality" placeholder="Quality (e.g. OEM, Aftermarket)" value="' + (d.quality || '') + '">' +
            '<input type="number" class="sell-price" placeholder="Price" step="0.01" value="' + (d.price || '') + '">' +
            '<select class="sell-currency">' +
            '<option value="USD" ' + ((d.currency || 'USD') === 'USD' ? 'selected' : '') + '>USD</option>' +
            '<option value="RMB" ' + ((d.currency || 'USD') === 'RMB' ? 'selected' : '') + '>RMB</option>' +
            '</select>' +
            '<button type="button" class="btn-remove" onclick="this.closest(\'.selling-price-row\').remove();PVAdmin.showToast(\'Selling price removed\',\'info\');">&#10005;</button>' +
            '</div>';
        container.appendChild(div);
    },

    renderPricingFields(item) {
        // Cost prices
        const costContainer = document.getElementById('cost-prices-container');
        if (costContainer) {
            costContainer.innerHTML = '';
            if (item.cost_prices && item.cost_prices.length > 0) {
                item.cost_prices.forEach(cp => this.addCostPriceField(cp));
            } else {
                this.addCostPriceField(); // Add one empty row
            }
        }
        // Selling prices
        const sellContainer = document.getElementById('selling-prices-container');
        if (sellContainer) {
            sellContainer.innerHTML = '';
            if (item.selling_prices && item.selling_prices.length > 0) {
                item.selling_prices.forEach(sp => this.addSellingPriceField(sp));
            } else {
                this.addSellingPriceField(); // Add one empty row
            }
        }
        this.updateExchangeRateDisplay();
    },

    collectPricingData(item) {
        // Collect cost prices
        item.cost_prices = [];
        document.querySelectorAll('.cost-price-row').forEach(row => {
            const supplier = row.querySelector('.cost-supplier').value.trim();
            const quality = row.querySelector('.cost-quality').value.trim();
            const priceOriginal = row.querySelector('.cost-price-original').value;
            const currencyOriginal = row.querySelector('.cost-currency').value;
            const priceUsd = row.querySelector('.cost-price-usd').value;
            const priceRmb = row.querySelector('.cost-price-rmb').value;
            const notes = row.querySelector('.cost-notes').value.trim();
            if (supplier || quality || priceOriginal) {
                item.cost_prices.push({
                    supplier_name: supplier,
                    quality: quality,
                    price_original: parseFloat(priceOriginal) || 0,
                    currency_original: currencyOriginal,
                    price_usd: parseFloat(priceUsd) || 0,
                    price_rmb: parseFloat(priceRmb) || 0,
                    notes: notes
                });
            }
        });

        // Collect selling prices
        item.selling_prices = [];
        document.querySelectorAll('.selling-price-row').forEach(row => {
            const quality = row.querySelector('.sell-quality').value.trim();
            const price = row.querySelector('.sell-price').value;
            const currency = row.querySelector('.sell-currency').value;
            if (quality || price) {
                item.selling_prices.push({
                    quality: quality,
                    price: parseFloat(price) || 0,
                    currency: currency
                });
            }
        });
    },

    // ============================================
    // DATA LAYER
    // ============================================
    loadCatalog() {
        this.tryLoadFromSupabase().then(loaded => {
            if (!loaded) {
                const localData = localStorage.getItem('pv_catalog_data');
                if (localData) {
                    try { this.catalog = JSON.parse(localData); } catch (e) { this.catalog = []; }
                } else {
                    this.catalog = [];
                }
                this.filteredItems = [...this.catalog];
                this.renderStats();
                this.renderTable();
                this.renderMissingDataWarning();
                if (this.catalog.length === 0) this.showEmptyAdminState();
            }
        });
    },

    async tryLoadFromSupabase() {
        const supabaseConfigured = window.supabaseClient &&
            window.ENV && window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');
        if (!supabaseConfigured) return false;
        try {
            const { data, error } = await window.supabaseClient
                .from('catalog_items').select('*').order('item_code');
            if (!error && data) {
                this.catalog = data;
                this.filteredItems = [...this.catalog];
                localStorage.setItem('pv_catalog_data', JSON.stringify(this.catalog));
                this.renderStats();
                this.renderTable();
                this.renderMissingDataWarning();
                this.showToast('Loaded ' + data.length + ' items from Supabase', 'success');
                if (data.length === 0) this.showEmptyAdminState();
                return true;
            }
        } catch (e) {}
        return false;
    },

    saveToLocal() {
        localStorage.setItem('pv_catalog_data', JSON.stringify(this.catalog));
    },

    showEmptyAdminState() {
        const tbody = document.getElementById('admin-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:60px 20px;color:#888;">' +
                '<div style="font-size:3em;margin-bottom:16px;">&#128230;</div>' +
                '<h3 style="color:var(--pv-gold);margin-bottom:8px;">Your Catalog is Empty</h3>' +
                '<p>Start by adding your first part.</p>' +
                '<div style="margin-top:20px;">' +
                '<button onclick="PVAdmin.addNewItem()" class="btn-export" style="margin-right:12px;">+ Add First Part</button>' +
                '<label class="btn-import" style="margin-right:12px;">' +
                '&#128259; Import JSON' +
                '<input type="file" accept=".json" onchange="PVAdmin.importFromJSON(this.files[0])" style="display:none;">' +
                '</label>' +
                '</div>' +
                '</td></tr>';
        }
    },

    // ============================================
    // CRUD - ADD NEW (manual code)
    // ============================================
    addNewItem() {
        this.editingItem = {
            item_code: '',
            product_name_en: '',
            product_name_ar: '',
            product_name_fr: '',
            product_name_zh: '',
            oem_part_number: '',
            alternative_part_numbers: [],
            cross_references: { superseded_by: '', replaces: '', interchangeable_with: [] },
            brand: '',
            compatible_machines: [],
            category: '',
            engine: '',
            main_image: '',
            extra_images: [],
            technical_specs: {},
            sizes_dimensions: {},
            package_info: '',
            notes: '',
            verification_status: 'Pending',
            source_links: [],
            cost_price_supplier_a: '',
            cost_price_supplier_b: '',
            cost_price_supplier_c: '',
            cost_price_supplier_d: '',
            selling_price: '',
            profit_margin: '',
            currency: 'USD',
            item_status: 'Draft',
            last_updated: new Date().toISOString(),
            change_history: [{ timestamp: new Date().toISOString(), action: 'Created', field: 'item', user: 'admin' }]
        };

        this.currentTab = 'basic';
        document.getElementById('edit-modal-title').textContent = 'Add New Product';
        document.getElementById('item-code-error').textContent = '';

        // Clear all fields
        document.getElementById('edit-item-code').value = '';
        document.getElementById('edit-oem-number').value = '';
        document.getElementById('edit-product-name-en').value = '';
        document.getElementById('edit-product-name-ar').value = '';
        document.getElementById('edit-product-name-fr').value = '';
        document.getElementById('edit-product-name-zh').value = '';
        document.getElementById('edit-brand').value = '';
        document.getElementById('edit-engine').value = '';
        document.getElementById('edit-status').value = 'Draft';
        document.getElementById('edit-verification').value = 'Pending';
        document.getElementById('edit-notes').value = '';

        this.renderCategoryDropdown();

        document.getElementById('edit-machines-container').innerHTML =
            '<div class="machine-input-row"><input type="text" class="machine-input" placeholder="Enter machine model"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
        document.getElementById('edit-alt-numbers-container').innerHTML =
            '<div class="alt-input-row"><input type="text" class="alt-input" placeholder="Enter alternative number"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
        document.getElementById('edit-tech-specs-container').innerHTML =
            '<div class="spec-row"><input type="text" class="spec-key" placeholder="Spec name"><input type="text" class="spec-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
        document.getElementById('edit-dimensions-container').innerHTML =
            '<div class="dim-row"><input type="text" class="dim-key" placeholder="Dimension name"><input type="text" class="dim-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';

        this.renderMainImagePreview();
        this.renderImagesGallery();
        this.renderPricingFields(this.editingItem);

        this.switchTab('basic');
        document.getElementById('edit-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('edit-save-btn').style.display = '';
        document.querySelectorAll('#edit-modal input, #edit-modal textarea, #edit-modal select').forEach(el => { el.disabled = false; });
        document.querySelectorAll('.btn-remove').forEach(el => { el.style.display = ''; });
    },

    // ============================================
    // EDIT ITEM
    // ============================================
    editItem(itemCode) {
        const item = this.catalog.find(i => i.item_code === itemCode);
        if (!item) return;

        this.editingItem = item;
        this.currentTab = 'basic';
        document.getElementById('edit-modal-title').textContent = 'Edit Product';
        document.getElementById('item-code-error').textContent = '';

        document.getElementById('edit-item-code').value = item.item_code;
        document.getElementById('edit-oem-number').value = item.oem_part_number || '';
        document.getElementById('edit-product-name-en').value = item.product_name_en || '';
        document.getElementById('edit-product-name-ar').value = item.product_name_ar || '';
        document.getElementById('edit-product-name-fr').value = item.product_name_fr || '';
        document.getElementById('edit-product-name-zh').value = item.product_name_zh || '';
        document.getElementById('edit-brand').value = item.brand || '';
        document.getElementById('edit-engine').value = item.engine || '';
        document.getElementById('edit-status').value = item.item_status || 'Draft';
        document.getElementById('edit-verification').value = item.verification_status || 'Pending';
        document.getElementById('edit-notes').value = item.notes || '';

        this.renderCategoryDropdown();

        // Machines
        const machinesContainer = document.getElementById('edit-machines-container');
        if (machinesContainer) {
            machinesContainer.innerHTML = (item.compatible_machines || []).map(m =>
                '<div class="machine-input-row">' +
                '<input type="text" class="machine-input" value="' + m + '">' +
                '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>' +
                '</div>'
            ).join('') || '<div class="machine-input-row"><input type="text" class="machine-input" placeholder="Enter machine model"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
        }

        // Alt numbers
        const altContainer = document.getElementById('edit-alt-numbers-container');
        if (altContainer) {
            altContainer.innerHTML = (item.alternative_part_numbers || []).map(n =>
                '<div class="alt-input-row">' +
                '<input type="text" class="alt-input" value="' + n + '">' +
                '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>' +
                '</div>'
            ).join('') || '<div class="alt-input-row"><input type="text" class="alt-input" placeholder="Enter alternative number"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
        }

        // Specs
        const techContainer = document.getElementById('edit-tech-specs-container');
        if (techContainer) {
            const specs = item.technical_specs || {};
            if (typeof specs === 'object' && Object.keys(specs).length > 0) {
                techContainer.innerHTML = Object.entries(specs).map(([k, v]) =>
                    '<div class="spec-row">' +
                    '<input type="text" class="spec-key" value="' + k + '" placeholder="Spec name">' +
                    '<input type="text" class="spec-value" value="' + v + '" placeholder="Value">' +
                    '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>' +
                    '</div>'
                ).join('');
            } else {
                techContainer.innerHTML = '<div class="spec-row"><input type="text" class="spec-key" placeholder="Spec name"><input type="text" class="spec-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
            }
        }

        // Dimensions
        const dimContainer = document.getElementById('edit-dimensions-container');
        if (dimContainer) {
            const dims = item.sizes_dimensions || {};
            if (typeof dims === 'object' && Object.keys(dims).length > 0) {
                dimContainer.innerHTML = Object.entries(dims).map(([k, v]) =>
                    '<div class="dim-row">' +
                    '<input type="text" class="dim-key" value="' + k + '" placeholder="Dimension name">' +
                    '<input type="text" class="dim-value" value="' + v + '" placeholder="Value">' +
                    '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>' +
                    '</div>'
                ).join('');
            } else {
                dimContainer.innerHTML = '<div class="dim-row"><input type="text" class="dim-key" placeholder="Dimension name"><input type="text" class="dim-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button></div>';
            }
        }

        this.renderMainImagePreview();
        this.renderImagesGallery();
        this.renderPricingFields(item);

        document.getElementById('edit-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('edit-save-btn').style.display = '';
        document.querySelectorAll('#edit-modal input, #edit-modal textarea, #edit-modal select').forEach(el => { el.disabled = false; });
        document.querySelectorAll('.btn-remove').forEach(el => { el.style.display = ''; });
    },

    // ============================================
    // IMAGE GALLERY
    // ============================================
    renderMainImagePreview() {
        const preview = document.getElementById('edit-main-image-preview');
        if (!preview) return;
        if (this.editingItem && this.editingItem.main_image && this.editingItem.main_image.trim()) {
            preview.innerHTML = '<img src="' + this.editingItem.main_image + '" alt="Main image">' +
                '<div class="main-image-badge">&#9733; MAIN IMAGE</div>';
        } else {
            preview.innerHTML = '<div class="no-image-large">No main image set</div>';
        }
    },

    renderImagesGallery() {
        const gallery = document.getElementById('edit-images-gallery');
        if (!gallery) return;
        if (!this.editingItem) { gallery.innerHTML = ''; return; }

        const allImages = [];
        if (this.editingItem.main_image && this.editingItem.main_image.trim()) {
            allImages.push({ url: this.editingItem.main_image, isMain: true });
        }
        (this.editingItem.extra_images || []).forEach(url => {
            if (url && url.trim()) allImages.push({ url: url, isMain: false });
        });

        if (allImages.length === 0) {
            gallery.innerHTML = '<div class="empty-gallery">No images yet. Upload one below.</div>';
            return;
        }

        gallery.innerHTML = allImages.map((img, idx) =>
            '<div class="gallery-item ' + (img.isMain ? 'is-main' : '') + '">' +
            '<img src="' + img.url + '" alt="">' +
            '<div class="gallery-item-actions">' +
            (img.isMain ? '<span class="main-badge">&#9733; Main</span>' : '<button class="btn-set-main" onclick="PVAdmin.setMainImage(\'' + idx + '\')">Set as Main</button>') +
            '<button class="btn-delete-image" onclick="PVAdmin.deleteImage(\'' + idx + '\')">&#128465;&#65039;</button>' +
            '</div>' +
            '</div>'
        ).join('');
    },

    handleExtraImageUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.editingItem) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target.result;
            // If no main image, this becomes the main
            if (!this.editingItem.main_image || !this.editingItem.main_image.trim()) {
                this.editingItem.main_image = url;
            } else {
                if (!this.editingItem.extra_images) this.editingItem.extra_images = [];
                this.editingItem.extra_images.push(url);
            }
            this.renderMainImagePreview();
            this.renderImagesGallery();
            this.showToast('Image added to gallery', 'success');
            document.getElementById('edit-image-upload').value = '';
        };
        reader.readAsDataURL(file);
    },

    setMainImage(galleryIdx) {
        if (!this.editingItem) return;
        // Rebuild the all-images array to find which one
        const allImages = [];
        if (this.editingItem.main_image && this.editingItem.main_image.trim()) {
            allImages.push(this.editingItem.main_image);
        }
        (this.editingItem.extra_images || []).forEach(url => {
            if (url && url.trim()) allImages.push(url);
        });

        const selectedUrl = allImages[galleryIdx];
        if (!selectedUrl) return;

        // Remove from extra_images if it's there
        this.editingItem.extra_images = (this.editingItem.extra_images || []).filter(u => u !== selectedUrl);

        // If there was an old main image, move it to extra_images
        if (this.editingItem.main_image && this.editingItem.main_image.trim() && this.editingItem.main_image !== selectedUrl) {
            if (!this.editingItem.extra_images) this.editingItem.extra_images = [];
            this.editingItem.extra_images.push(this.editingItem.main_image);
        }

        // Set the new main image
        this.editingItem.main_image = selectedUrl;

        this.renderMainImagePreview();
        this.renderImagesGallery();
        this.showToast('Main image updated', 'success');
    },

    deleteImage(galleryIdx) {
        if (!this.editingItem) return;
        const allImages = [];
        if (this.editingItem.main_image && this.editingItem.main_image.trim()) {
            allImages.push({ url: this.editingItem.main_image, isMain: true });
        }
        (this.editingItem.extra_images || []).forEach(url => {
            if (url && url.trim()) allImages.push({ url: url, isMain: false });
        });

        const toDelete = allImages[galleryIdx];
        if (!toDelete) return;
        if (!confirm('Delete this image?')) return;

        if (toDelete.isMain) {
            // Delete main image, promote first extra if available
            this.editingItem.main_image = (this.editingItem.extra_images && this.editingItem.extra_images.length > 0)
                ? this.editingItem.extra_images.shift()
                : '';
        } else {
            this.editingItem.extra_images = (this.editingItem.extra_images || []).filter(u => u !== toDelete.url);
        }

        this.renderMainImagePreview();
        this.renderImagesGallery();
        this.showToast('Image deleted', 'success');
    },

    // ============================================
    // SAVE ITEM (with validation)
    // ============================================
    saveItem() {
        if (!this.editingItem) return;

        // Validate item code
        const itemCodeInput = document.getElementById('edit-item-code');
        const itemCode = itemCodeInput.value.trim();
        const errorEl = document.getElementById('item-code-error');

        if (!itemCode) {
            errorEl.textContent = 'Item Code is required. Please enter a code before saving.';
            itemCodeInput.focus();
            this.switchTab('basic');
            return;
        }

        // Check for duplicate codes (only if it's a new item or code changed)
        const existingItem = this.catalog.find(i => i.item_code === itemCode);
        const isNewItem = !this.catalog.find(i => i === this.editingItem);

        if (isNewItem && existingItem) {
            errorEl.textContent = 'Item Code "' + itemCode + '" already exists. Use a different code.';
            itemCodeInput.focus();
            return;
        }

        if (!isNewItem && existingItem && existingItem !== this.editingItem) {
            errorEl.textContent = 'Item Code "' + itemCode + '" is used by another item.';
            itemCodeInput.focus();
            return;
        }

        errorEl.textContent = '';
        this.createBackup();

        const item = this.editingItem;
        item.item_code = itemCode;
        item.oem_part_number = document.getElementById('edit-oem-number').value;
        item.product_name_en = document.getElementById('edit-product-name-en').value;
        item.product_name_ar = document.getElementById('edit-product-name-ar').value;
        item.product_name_fr = document.getElementById('edit-product-name-fr').value;
        item.product_name_zh = document.getElementById('edit-product-name-zh').value;
        item.brand = document.getElementById('edit-brand').value;

        const catSelect = document.getElementById('edit-category');
        const catValue = catSelect.value;
        item.category = (catValue === '__other__') ? '' : catValue;

        item.engine = document.getElementById('edit-engine').value;
        item.item_status = document.getElementById('edit-status').value;
        item.verification_status = document.getElementById('edit-verification').value;
        item.notes = document.getElementById('edit-notes').value;

        item.compatible_machines = Array.from(document.querySelectorAll('.machine-input')).map(i => i.value).filter(v => v.trim());
        item.alternative_part_numbers = Array.from(document.querySelectorAll('.alt-input')).map(i => i.value).filter(v => v.trim());

        const specKeys = document.querySelectorAll('.spec-key');
        const specValues = document.querySelectorAll('.spec-value');
        item.technical_specs = {};
        specKeys.forEach((key, i) => { if (key.value && specValues[i]) item.technical_specs[key.value] = specValues[i].value; });

        const dimKeys = document.querySelectorAll('.dim-key');
        const dimValues = document.querySelectorAll('.dim-value');
        item.sizes_dimensions = {};
        dimKeys.forEach((key, i) => { if (key.value && dimValues[i]) item.sizes_dimensions[key.key] = dimValues[i].value; });

        // Collect pricing data
        this.collectPricingData(item);

        item.last_updated = new Date().toISOString();

        // If new item, push to catalog
        if (isNewItem) {
            this.catalog.push(item);
        }

        this.saveToLocal();
        this.syncToSupabase();

        this.filteredItems = [...this.catalog];
        this.renderStats();
        this.renderTable();
        this.renderMissingDataWarning();
        this.closeEdit();
        this.showToast('Item saved successfully', 'success');
    },

    closeEdit() {
        document.getElementById('edit-modal').classList.remove('active');
        document.body.style.overflow = '';
        this.editingItem = null;
        document.getElementById('item-code-error').textContent = '';
    },

    // ============================================
    // VIEW / DUPLICATE
    // ============================================
    viewItem(itemCode) {
        this.editItem(itemCode);
        document.querySelectorAll('#edit-modal input, #edit-modal textarea, #edit-modal select').forEach(el => { el.disabled = true; });
        document.querySelectorAll('.btn-remove').forEach(el => { el.style.display = 'none'; });
        document.getElementById('edit-save-btn').style.display = 'none';
    },

    duplicateItem(itemCode) {
        const item = this.catalog.find(i => i.item_code === itemCode);
        if (!item) return;

        const newItem = JSON.parse(JSON.stringify(item));
        let copyNum = 1;
        let newCode = item.item_code + '-COPY';
        while (this.catalog.find(i => i.item_code === newCode)) {
            copyNum++;
            newCode = item.item_code + '-COPY' + copyNum;
        }
        newItem.item_code = newCode;
        newItem.last_updated = new Date().toISOString();
        newItem.change_history = [{
            timestamp: new Date().toISOString(),
            action: 'Duplicate',
            field: 'item',
            old_value: item.item_code,
            new_value: newCode,
            user: 'admin'
        }];

        this.catalog.push(newItem);
        this.filteredItems = [...this.catalog];
        this.saveToLocal();
        this.renderStats();
        this.renderTable();
        this.showToast('Duplicated as ' + newCode, 'success');
    },

    // ============================================
    // EXPORT / IMPORT
    // ============================================
    exportToJSON() {
        const data = {
            catalog_info: {
                title: 'Parts Village Digital Catalog',
                total_items: this.catalog.length,
                total_categories: this.categories.length,
                date_exported: new Date().toISOString(),
                version: '3.1'
            },
            categories: this.categories,
            items: this.catalog
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pv_catalog_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Catalog exported to JSON', 'success');
    },

    importFromJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.items || !Array.isArray(data.items)) {
                    throw new Error('Invalid catalog format');
                }
                this.createBackup();
                this.catalog = data.items;
                this.filteredItems = [...this.catalog];
                if (data.categories && Array.isArray(data.categories)) {
                    this.categories = data.categories;
                    this.saveCategories();
                }
                this.saveToLocal();
                this.renderStats();
                this.renderTable();
                this.renderMissingDataWarning();
                this.showToast('Imported ' + data.items.length + ' items', 'success');
                this.syncToSupabase();
            } catch (error) {
                this.showToast('Import failed: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    },

    createBackup() {
        try {
            const backups = JSON.parse(localStorage.getItem('pv_backups') || '[]');
            backups.unshift({
                timestamp: new Date().toISOString(),
                data: JSON.parse(JSON.stringify(this.catalog))
            });
            if (backups.length > 50) backups.pop();
            localStorage.setItem('pv_backups', JSON.stringify(backups));
        } catch (e) {}
    },

    // ============================================
    // SUPABASE SYNC
    // ============================================
    async syncToSupabase() {
        const supabaseConfigured = window.supabaseClient &&
            window.ENV && window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');
        if (!supabaseConfigured) return;
        try {
            const { error } = await window.supabaseClient
                .from('catalog_items')
                .upsert(this.catalog, { onConflict: 'item_code' });
            if (!error) this.showToast('Synced to Supabase', 'success');
        } catch (e) { console.log('Supabase sync not available'); }
    },

    // ============================================
    // RENDERING
    // ============================================
    renderStats() {
        const total = this.catalog.length;
        const complete = this.catalog.filter(i => i.item_status === 'Complete').length;
        const needsImage = this.catalog.filter(i => i.item_status === 'Needs image').length;
        const needsVerify = this.catalog.filter(i => i.item_status === 'Needs verification').length;
        const draft = this.catalog.filter(i => i.item_status === 'Draft').length;
        const withImages = this.catalog.filter(i =>
            i.main_image && !i.main_image.includes('Image not found') && !i.main_image.includes('Manual')
        ).length;

        const elTotal = document.getElementById('admin-stat-total');
        const elComplete = document.getElementById('admin-stat-complete');
        const elNeedsImage = document.getElementById('admin-stat-needs-image');
        const elNeedsVerify = document.getElementById('admin-stat-needs-verify');
        const elDraft = document.getElementById('admin-stat-draft');
        const elImages = document.getElementById('admin-stat-images');

        if (elTotal) elTotal.textContent = total;
        if (elComplete) elComplete.textContent = complete;
        if (elNeedsImage) elNeedsImage.textContent = needsImage;
        if (elNeedsVerify) elNeedsVerify.textContent = needsVerify;
        if (elDraft) elDraft.textContent = draft;
        if (elImages) elImages.textContent = withImages;
    },

    renderMissingDataWarning() {
        const missingImage = this.catalog.filter(i => !i.main_image || i.main_image.includes('Image not found') || i.main_image.includes('Manual')).length;
        const missingSpecs = this.catalog.filter(i => !i.technical_specs || i.technical_specs === 'Needs manual verification').length;
        const missingDimensions = this.catalog.filter(i => !i.sizes_dimensions || i.sizes_dimensions === 'Needs manual verification').length;

        const container = document.getElementById('missing-data-warning');
        if (!container) return;
        const totalMissing = missingImage + missingSpecs + missingDimensions;

        if (totalMissing === 0) { container.style.display = 'none'; return; }

        container.style.display = 'flex';
        container.innerHTML =
            '<span>&#9888;&#65039;</span>' +
            '<div>' +
            '<strong>Missing Data:</strong> ' +
            (missingImage > 0 ? '<span class="count">' + missingImage + '</span> need images ' : '') +
            (missingSpecs > 0 ? '<span class="count">' + missingSpecs + '</span> need specs ' : '') +
            (missingDimensions > 0 ? '<span class="count">' + missingDimensions + '</span> need dimensions' : '') +
            '</div>';
    },

    renderTable() {
        const tbody = document.getElementById('admin-table-body');
        if (!tbody) return;
        if (this.filteredItems.length === 0) { this.showEmptyAdminState(); return; }

        tbody.innerHTML = this.filteredItems.map(item => {
            const statusClass = {
                'Complete': 'status-complete',
                'Needs image': 'status-needs-image',
                'Needs verification': 'status-needs-verification',
                'Draft': 'status-draft'
            }[item.item_status] || 'status-draft';
            const machines = item.compatible_machines || [];

            return '<tr>' +
                '<td><span class="item-code" onclick="PVAdmin.editItem(\'' + item.item_code + '\')">' + item.item_code + '</span></td>' +
                '<td class="truncated">' + (item.oem_part_number || '') + '</td>' +
                '<td class="truncated">' + (item.product_name_en || '') + '</td>' +
                '<td>' + (item.brand || '') + '</td>' +
                '<td>' + (item.category || '') + '</td>' +
                '<td>' +
                '<div class="machine-tags">' +
                machines.slice(0, 3).map(m => '<span class="machine-tag">' + m + '</span>').join('') +
                (machines.length > 3 ? '<span class="machine-tag more">+' + (machines.length - 3) + '</span>' : '') +
                '</div>' +
                '</td>' +
                '<td><span class="status-badge ' + statusClass + '">' + item.item_status + '</span></td>' +
                '<td>' +
                '<button class="btn-icon" onclick="PVAdmin.editItem(\'' + item.item_code + '\')" title="Edit">&#9998;&#65039;</button>' +
                '<button class="btn-icon" onclick="PVAdmin.viewItem(\'' + item.item_code + '\')" title="View">&#128065;&#65039;</button>' +
                '<button class="btn-icon" onclick="PVAdmin.duplicateItem(\'' + item.item_code + '\')" title="Duplicate">&#128203;</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    },

    // ============================================
    // SEARCH & FILTER
    // ============================================
    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        if (!this.searchQuery) {
            this.filteredItems = [...this.catalog];
        } else {
            this.filteredItems = this.catalog.filter(item => {
                const searchFields = [
                    item.item_code, item.oem_part_number,
                    item.product_name_en, item.product_name_ar,
                    item.product_name_fr, item.product_name_zh,
                    item.brand, item.category,
                    ...(item.compatible_machines || [])
                ].map(f => String(f).toLowerCase());
                return searchFields.some(f => f.includes(this.searchQuery));
            });
        }
        this.renderTable();
    },

    filterByStatus(status) {
        if (status === 'all') {
            this.filteredItems = [...this.catalog];
        } else {
            this.filteredItems = this.catalog.filter(i => i.item_status === status);
        }
        this.renderTable();
    },

    // ============================================
    // TABS
    // ============================================
    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabBtn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
        const tabContent = document.getElementById('tab-' + tab);
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
    },

    // ============================================
    // DYNAMIC FIELDS
    // ============================================
    addMachineField() {
        const container = document.getElementById('edit-machines-container');
        const div = document.createElement('div');
        div.className = 'machine-input-row';
        div.innerHTML = '<input type="text" class="machine-input" placeholder="Enter machine model"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>';
        container.appendChild(div);
    },
    addAltNumberField() {
        const container = document.getElementById('edit-alt-numbers-container');
        const div = document.createElement('div');
        div.className = 'alt-input-row';
        div.innerHTML = '<input type="text" class="alt-input" placeholder="Enter alternative number"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>';
        container.appendChild(div);
    },
    addSpecField() {
        const container = document.getElementById('edit-tech-specs-container');
        const div = document.createElement('div');
        div.className = 'spec-row';
        div.innerHTML = '<input type="text" class="spec-key" placeholder="Spec name"><input type="text" class="spec-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>';
        container.appendChild(div);
    },
    addDimField() {
        const container = document.getElementById('edit-dimensions-container');
        const div = document.createElement('div');
        div.className = 'dim-row';
        div.innerHTML = '<input type="text" class="dim-key" placeholder="Dimension name"><input type="text" class="dim-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">&#10005;</button>';
        container.appendChild(div);
    },

    // ============================================
    // TOAST
    // ============================================
    showToast(message, type) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => { PVAdmin.init(); });

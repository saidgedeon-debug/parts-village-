// ============================================
// PARTS VILLAGE ADMIN BACKOFFICE v3.0
// Empty catalog - ready for your data
// Standalone mode: localStorage + password auth
// Optional: Supabase sync when configured
// ============================================

const PVAdmin = {
    catalog: [],
    filteredItems: [],
    editingItem: null,
    isAuthenticated: false,
    currentTab: 'basic',
    supabase: null,
    user: null,
    searchQuery: '',

    // Password hash - change this in production
    // Default: admin123
    get adminPassword() {
        return (window.ENV && window.ENV.ADMIN_PASSWORD) ? window.ENV.ADMIN_PASSWORD : 'admin123';
    },

    // ============================================
    // INIT
    // ============================================
    async init() {
        // Check if already logged in via localStorage
        if (this.checkLocalSession()) {
            this.isAuthenticated = true;
            this.showApp();
            this.loadCatalog();
        } else {
            this.showLogin();
        }
    },

    // ============================================
    // LOCAL AUTH (standalone mode)
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
        const timeout = 3600 * 1000; // 1 hour
        localStorage.setItem('pv_admin_session', JSON.stringify({
            timestamp: Date.now(),
            expiry: Date.now() + timeout
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

        // Try Supabase auth first (if configured)
        this.trySupabaseLogin(password).then(supabaseSuccess => {
            if (supabaseSuccess) return;

            // Fallback to local password check
            if (password === this.adminPassword) {
                this.createLocalSession();
                this.isAuthenticated = true;
                errorEl.textContent = '';
                this.showApp();
                this.loadCatalog();
            } else {
                errorEl.textContent = 'Incorrect password. Please try again.';
                document.getElementById('login-password').value = '';
                document.getElementById('login-password').focus();
            }
        }).catch(() => {
            // Supabase failed, try local
            if (password === this.adminPassword) {
                this.createLocalSession();
                this.isAuthenticated = true;
                errorEl.textContent = '';
                this.showApp();
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
                await this.loadCatalog();
                return true;
            }
        } catch (e) {}
        return false;
    },

    logout() {
        localStorage.removeItem('pv_admin_session');
        this.isAuthenticated = false;
        this.user = null;
        location.reload();
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
    // DATA LAYER - localStorage (standalone)
    // ============================================
    loadCatalog() {
        // Try Supabase first if configured
        this.tryLoadFromSupabase().then(loaded => {
            if (!loaded) {
                // Load from localStorage
                const localData = localStorage.getItem('pv_catalog_data');
                if (localData) {
                    try { this.catalog = JSON.parse(localData); } catch (e) { this.catalog = []; }
                } else {
                    this.catalog = []; // Empty catalog
                }
                this.filteredItems = [...this.catalog];
                this.renderStats();
                this.renderTable();
                this.renderMissingDataWarning();
                if (this.catalog.length === 0) {
                    this.showEmptyAdminState();
                }
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
                .from('catalog_items')
                .select('*')
                .order('item_code');

            if (!error && data) {
                this.catalog = data;
                this.filteredItems = [...this.catalog];
                // Also save to localStorage for offline access
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
            tbody.innerHTML = `
                <tr><td colspan="8" style="text-align:center;padding:60px 20px;color:#888;">
                    <div style="font-size:3em;margin-bottom:16px;">\uD83D\uDCE6</div>
                    <h3 style="color:var(--pv-gold);margin-bottom:8px;">Your Catalog is Empty</h3>
                    <p>Start by adding your first part. You can:</p>
                    <ul style="list-style:none;padding:0;margin:16px 0;text-align:left;display:inline-block;color:var(--pv-text-secondary);">
                        <li style="margin:8px 0;">\uD83D\uDCDA <strong>Add</strong> parts manually (click + Add New below)</li>
                        <li style="margin:8px 0;">\uD83D\uDD23 <strong>Import</strong> a JSON file with multiple parts</li>
                        <li style="margin:8px 0;">\u2601\uFE0F <strong>Connect Supabase</strong> for cloud sync</li>
                    </ul>
                    <div style="margin-top:20px;">
                        <button onclick="PVAdmin.addNewItem()" class="btn-export" style="margin-right:12px;">+ Add First Part</button>
                        <label class="btn-import" style="margin-right:12px;">
                            \uD83D\uDD23 Import JSON
                            <input type="file" accept=".json" onchange="PVAdmin.importFromJSON(this.files[0])" style="display:none;">
                        </label>
                    </div>
                </td></tr>
            `;
        }
    },

    // ============================================
    // CRUD OPERATIONS
    // ============================================
    addNewItem() {
        // Generate next item code
        const nextNum = this.catalog.length + 1;
        const newItem = {
            item_code: 'A' + String(nextNum).padStart(2, '0') + '-1',
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
            change_history: [{
                timestamp: new Date().toISOString(),
                action: 'Created',
                field: 'item',
                user: 'admin'
            }]
        };

        this.catalog.push(newItem);
        this.filteredItems = [...this.catalog];
        this.saveToLocal();
        this.renderStats();
        this.renderTable();
        this.showToast('New item ' + newItem.item_code + ' created', 'success');

        // Open edit modal for the new item
        setTimeout(() => this.editItem(newItem.item_code), 100);
    },

    // ============================================
    // EXPORT / IMPORT
    // ============================================
    exportToJSON() {
        const data = {
            catalog_info: {
                title: 'Parts Village Digital Catalog',
                total_items: this.catalog.length,
                date_exported: new Date().toISOString(),
                version: '3.0'
            },
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
                this.saveToLocal();
                this.renderStats();
                this.renderTable();
                this.renderMissingDataWarning();
                this.showToast('Imported ' + data.items.length + ' items', 'success');

                // Also try to sync to Supabase if configured
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
    // SUPABASE SYNC (optional)
    // ============================================
    async syncToSupabase() {
        const supabaseConfigured = window.supabaseClient &&
            window.ENV && window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');

        if (!supabaseConfigured) return;

        try {
            // Upsert all items
            const { error } = await window.supabaseClient
                .from('catalog_items')
                .upsert(this.catalog, { onConflict: 'item_code' });

            if (!error) {
                this.showToast('Synced to Supabase', 'success');
            }
        } catch (e) {
            console.log('Supabase sync not available');
        }
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
            '<span>\u26A0\uFE0F</span>' +
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

        if (this.filteredItems.length === 0) {
            this.showEmptyAdminState();
            return;
        }

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
                '<button class="btn-icon" onclick="PVAdmin.editItem(\'' + item.item_code + '\')" title="Edit">\u270F\uFE0F</button>' +
                '<button class="btn-icon" onclick="PVAdmin.viewItem(\'' + item.item_code + '\')" title="View">\uD83D\uDC41\uFE0F</button>' +
                '<button class="btn-icon" onclick="PVAdmin.duplicateItem(\'' + item.item_code + '\')" title="Duplicate">\uD83D\uDCCB</button>' +
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
    // EDIT ITEM
    // ============================================
    editItem(itemCode) {
        const item = this.catalog.find(i => i.item_code === itemCode);
        if (!item) return;

        this.editingItem = item;
        this.currentTab = 'basic';

        document.getElementById('edit-item-code').value = item.item_code;
        document.getElementById('edit-oem-number').value = item.oem_part_number || '';
        document.getElementById('edit-product-name-en').value = item.product_name_en || '';
        document.getElementById('edit-product-name-ar').value = item.product_name_ar || '';
        document.getElementById('edit-product-name-fr').value = item.product_name_fr || '';
        document.getElementById('edit-product-name-zh').value = item.product_name_zh || '';
        document.getElementById('edit-brand').value = item.brand || '';
        document.getElementById('edit-category').value = item.category || '';
        document.getElementById('edit-engine').value = item.engine || '';
        document.getElementById('edit-status').value = item.item_status || 'Draft';
        document.getElementById('edit-verification').value = item.verification_status || 'Pending';
        document.getElementById('edit-notes').value = item.notes || '';

        // Machines
        const machinesContainer = document.getElementById('edit-machines-container');
        if (machinesContainer) {
            machinesContainer.innerHTML = (item.compatible_machines || []).map(m =>
                '<div class="machine-input-row">' +
                '<input type="text" class="machine-input" value="' + m + '">' +
                '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>' +
                '</div>'
            ).join('') || '<div class="machine-input-row"><input type="text" class="machine-input" placeholder="Enter machine model"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button></div>';
        }

        // Alternative numbers
        const altContainer = document.getElementById('edit-alt-numbers-container');
        if (altContainer) {
            altContainer.innerHTML = (item.alternative_part_numbers || []).map(n =>
                '<div class="alt-input-row">' +
                '<input type="text" class="alt-input" value="' + n + '">' +
                '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>' +
                '</div>'
            ).join('') || '<div class="alt-input-row"><input type="text" class="alt-input" placeholder="Enter alternative number"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button></div>';
        }

        // Technical specs
        const techContainer = document.getElementById('edit-tech-specs-container');
        if (techContainer) {
            const specs = item.technical_specs || {};
            if (typeof specs === 'object' && Object.keys(specs).length > 0) {
                techContainer.innerHTML = Object.entries(specs).map(([k, v]) =>
                    '<div class="spec-row">' +
                    '<input type="text" class="spec-key" value="' + k + '" placeholder="Spec name">' +
                    '<input type="text" class="spec-value" value="' + v + '" placeholder="Value">' +
                    '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>' +
                    '</div>'
                ).join('');
            } else {
                techContainer.innerHTML = '<div class="spec-row"><input type="text" class="spec-key" placeholder="Spec name"><input type="text" class="spec-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button></div>';
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
                    '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>' +
                    '</div>'
                ).join('');
            } else {
                dimContainer.innerHTML = '<div class="dim-row"><input type="text" class="dim-key" placeholder="Dimension name"><input type="text" class="dim-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button></div>';
            }
        }

        // Image
        const imagePreview = document.getElementById('edit-image-preview');
        if (imagePreview) {
            if (item.main_image && !item.main_image.includes('Manual') && !item.main_image.includes('Image not found') && item.main_image.trim()) {
                imagePreview.innerHTML = '<img src="' + item.main_image + '" alt="' + item.item_code + '" style="max-width:200px;max-height:200px;">';
            } else {
                imagePreview.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">No image</div>';
            }
        }

        document.getElementById('edit-modal').classList.add('active');
        document.body.style.overflow = 'hidden';

        // Show save button, enable all inputs
        document.getElementById('edit-save-btn').style.display = '';
        document.querySelectorAll('#edit-modal input, #edit-modal textarea, #edit-modal select').forEach(el => { el.disabled = false; });
        document.querySelectorAll('.btn-remove').forEach(el => { el.style.display = ''; });
    },

    closeEdit() {
        document.getElementById('edit-modal').classList.remove('active');
        document.body.style.overflow = '';
        this.editingItem = null;
    },

    saveItem() {
        if (!this.editingItem) return;
        this.createBackup();
        const item = this.editingItem;

        item.oem_part_number = document.getElementById('edit-oem-number').value;
        item.product_name_en = document.getElementById('edit-product-name-en').value;
        item.product_name_ar = document.getElementById('edit-product-name-ar').value;
        item.product_name_fr = document.getElementById('edit-product-name-fr').value;
        item.product_name_zh = document.getElementById('edit-product-name-zh').value;
        item.brand = document.getElementById('edit-brand').value;
        item.category = document.getElementById('edit-category').value;
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
        dimKeys.forEach((key, i) => { if (key.value && dimValues[i]) item.sizes_dimensions[key.value] = dimValues[i].value; });

        item.last_updated = new Date().toISOString();

        this.saveToLocal();

        // Try to sync to Supabase
        this.syncToSupabase();

        this.filteredItems = [...this.catalog];
        this.renderStats();
        this.renderTable();
        this.renderMissingDataWarning();
        this.closeEdit();
        this.showToast('Item saved successfully', 'success');
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
        // Find unique copy code
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
    // IMAGE UPLOAD
    // ============================================
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const preview = document.getElementById('edit-image-preview');
        preview.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Uploading...</div>';

        // Try Supabase Storage first
        this.uploadToSupabase(file).then(result => {
            if (result.url) {
                preview.innerHTML = '<img src="' + result.url + '" alt="Preview" style="max-width:200px;max-height:200px;">';
                if (this.editingItem) this.editingItem.main_image = result.url;
                this.showToast('Image uploaded to cloud', 'success');
            } else {
                // Fallback: base64 local storage
                this.uploadLocal(file, preview);
            }
        }).catch(() => {
            this.uploadLocal(file, preview);
        });
    },

    async uploadToSupabase(file) {
        const supabaseConfigured = window.supabaseClient &&
            window.ENV && window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');

        if (!supabaseConfigured) return { url: null };

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = 'product-images/' + this.editingItem.item_code + '_' + Date.now() + '.' + fileExt;
            const { error } = await window.supabaseClient.storage
                .from('product-images')
                .upload(fileName, file, { upsert: true });

            if (error) return { url: null };

            const { data } = window.supabaseClient.storage
                .from('product-images')
                .getPublicUrl(fileName);

            return { url: data.publicUrl };
        } catch (e) { return { url: null }; }
    },

    uploadLocal(file, preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview" style="max-width:200px;max-height:200px;">';
            if (this.editingItem) this.editingItem.main_image = e.target.result;
        };
        reader.readAsDataURL(file);
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
        div.innerHTML = '<input type="text" class="machine-input" placeholder="Enter machine model"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>';
        container.appendChild(div);
    },
    addAltNumberField() {
        const container = document.getElementById('edit-alt-numbers-container');
        const div = document.createElement('div');
        div.className = 'alt-input-row';
        div.innerHTML = '<input type="text" class="alt-input" placeholder="Enter alternative number"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>';
        container.appendChild(div);
    },
    addSpecField() {
        const container = document.getElementById('edit-tech-specs-container');
        const div = document.createElement('div');
        div.className = 'spec-row';
        div.innerHTML = '<input type="text" class="spec-key" placeholder="Spec name"><input type="text" class="spec-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>';
        container.appendChild(div);
    },
    addDimField() {
        const container = document.getElementById('edit-dimensions-container');
        const div = document.createElement('div');
        div.className = 'dim-row';
        div.innerHTML = '<input type="text" class="dim-key" placeholder="Dimension name"><input type="text" class="dim-value" placeholder="Value"><button type="button" class="btn-remove" onclick="this.parentElement.remove()">\u2715</button>';
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

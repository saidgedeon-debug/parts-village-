// ============================================
// PARTS VILLAGE DIGITAL CATALOG v3.0
// Empty catalog - ready for your data
// Supports: Supabase (when configured) or standalone mode
// ============================================

const PVApp = {
    catalog: [],
    filteredItems: [],
    currentItem: null,
    searchIndex: {},
    favorites: new Set(),

    searchQuery: '',
    filterBrand: 'all',
    filterCategory: 'all',
    filterStatus: 'all',
    filterMachineBrand: 'all',
    showFavoritesOnly: false,

    // ============================================
    // INIT
    // ============================================
    async init() {
        this.loadTheme();
        this.loadFavorites();
        await this.loadCatalog();
        this.setupEventListeners();
    },

    // ============================================
    // DATA LOADING - tries Supabase first, falls back to empty
    // ============================================
    async loadCatalog() {
        // Check if Supabase is configured (not placeholder)
        const supabaseConfigured = window.supabaseClient &&
            window.ENV &&
            window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');

        if (supabaseConfigured) {
            try {
                this.updateStatus('mode', 'Loading from Supabase...', '#ff9800');
                const { data, error } = await window.supabaseClient
                    .from('catalog_items')
                    .select('*');

                if (!error && data && data.length > 0) {
                    this.catalog = data;
                    this.buildSearchIndex();
                    this.filteredItems = [...this.catalog];
                    this.updateStatus('db', 'Supabase', '#4caf50');
                    this.updateStatus('count', this.catalog.length, '#4caf50');
                    this.renderStats();
                    this.renderCatalog();
                    this.populateFilters();
                    return;
                }
            } catch (e) {
                console.log('[PVApp] Supabase not available, starting empty');
            }
        }

        // Standalone mode - empty catalog
        this.catalog = [];
        this.filteredItems = [];
        this.updateStatus('db', 'Empty - Add your parts', '#2196f3');
        this.updateStatus('count', '0', '#2196f3');
        this.updateStatus('mode', 'Standalone Mode', '#2196f3');
        this.updateStatus('images', '-', '#666');
        this.updateStatus('search', '-', '#666');
        this.showEmptyState();
    },

    // ============================================
    // EMPTY STATE - shown when no data exists
    // ============================================
    showEmptyState() {
        const container = document.getElementById('catalog-grid');
        if (!container) return;

        container.innerHTML = `
            <div class="pv-empty-state" style="grid-column: 1/-1;">
                <div class="pv-empty-icon">📂</div>
                <h2>Your Catalog is Empty</h2>
                <p>Start building your parts catalog by adding your first item.</p>
                <div class="pv-empty-actions">
                    <a href="admin/index.html" class="pv-empty-btn pv-empty-btn-primary">
                        Open Admin Panel
                    </a>
                </div>
                <div class="pv-empty-setup">
                    <strong>To enable cloud sync with Supabase:</strong><br>
                    1. Create a free account at <a href="https://supabase.com" target="_blank">supabase.com</a><br>
                    2. Run the SQL schema from <code>sql/schema.sql</code><br>
                    3. Set your credentials in <code>index.html</code><br>
                    <a href="README-DEPLOY.md" target="_blank">Read the full setup guide</a>
                </div>
            </div>
        `;

        // Render stats as zero
        this.renderStats();

        // Populate filters with just "All" options
        const brandSelect = document.getElementById('filter-brand');
        const categorySelect = document.getElementById('filter-category');
        const machineBrandSelect = document.getElementById('filter-machine-brand');
        if (brandSelect) brandSelect.innerHTML = '<option value="all">All Brands</option>';
        if (categorySelect) categorySelect.innerHTML = '<option value="all">All Categories</option>';
        if (machineBrandSelect) machineBrandSelect.innerHTML = '<option value="all">All Machine Brands</option>';
    },

    // ============================================
    // STATUS BAR
    // ============================================
    updateStatus(id, text, color = '#4caf50') {
        const el = document.getElementById('status-' + id);
        if (el) {
            const span = el.querySelector('span');
            if (span) {
                span.textContent = text;
                span.style.color = color;
            }
        }
    },

    // ============================================
    // THEME
    // ============================================
    loadTheme() {
        const theme = localStorage.getItem('pv_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeButton(theme);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pv_theme', next);
        this.updateThemeButton(next);
    },

    updateThemeButton(theme) {
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    },

    // ============================================
    // FAVORITES
    // ============================================
    loadFavorites() {
        const saved = localStorage.getItem('pv_favorites');
        if (saved) {
            this.favorites = new Set(JSON.parse(saved));
        }
    },

    saveFavorites() {
        localStorage.setItem('pv_favorites', JSON.stringify([...this.favorites]));
    },

    toggleFavorite(itemCode, event) {
        if (event) event.stopPropagation();
        if (this.favorites.has(itemCode)) {
            this.favorites.delete(itemCode);
        } else {
            this.favorites.add(itemCode);
        }
        this.saveFavorites();
        this.renderCatalog();
    },

    // ============================================
    // SEARCH INDEX
    // ============================================
    buildSearchIndex() {
        this.searchIndex = {};
        this.catalog.forEach(item => {
            const fields = [
                item.item_code,
                item.oem_part_number,
                item.product_name_en,
                item.product_name_ar,
                item.product_name_fr,
                item.product_name_zh,
                item.brand,
                item.category,
                item.engine,
                ...(item.alternative_part_numbers || []),
                ...(item.compatible_machines || [])
            ];
            fields.forEach(field => {
                if (!field) return;
                const words = String(field).toLowerCase().split(/\s+/);
                words.forEach(word => {
                    const cleanWord = word.replace(/[^a-z0-9\-]/g, '');
                    if (cleanWord.length < 2) return;
                    if (!this.searchIndex[cleanWord]) {
                        this.searchIndex[cleanWord] = [];
                    }
                    if (!this.searchIndex[cleanWord].includes(item.item_code)) {
                        this.searchIndex[cleanWord].push(item.item_code);
                    }
                });
            });
        });
    },

    // ============================================
    // SEARCH
    // ============================================
    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        if (!this.searchQuery) {
            this.applyFilters();
            return;
        }
        const matchedCodes = new Set();
        for (const [keyword, codes] of Object.entries(this.searchIndex)) {
            if (keyword.includes(this.searchQuery)) {
                codes.forEach(code => matchedCodes.add(code));
            }
        }
        if (matchedCodes.size === 0) {
            this.catalog.forEach(item => {
                const searchFields = [
                    item.item_code, item.oem_part_number,
                    item.product_name_en, item.product_name_ar,
                    item.product_name_fr, item.product_name_zh,
                    item.brand, item.category, item.engine,
                    ...(item.alternative_part_numbers || []),
                    ...(item.compatible_machines || [])
                ].map(f => String(f).toLowerCase());
                if (searchFields.some(f => f.includes(this.searchQuery))) {
                    matchedCodes.add(item.item_code);
                }
            });
        }
        this.filteredItems = this.catalog.filter(item => matchedCodes.has(item.item_code));
        this.applyDropdownFilters();
    },

    // ============================================
    // FILTERS
    // ============================================
    applyFilters() {
        this.filteredItems = this.catalog.filter(item => {
            let matchesSearch = true;
            if (this.searchQuery) {
                const searchFields = [
                    item.item_code, item.oem_part_number,
                    item.product_name_en, item.brand,
                    item.category,
                    ...(item.compatible_machines || []),
                    ...(item.alternative_part_numbers || [])
                ].map(f => String(f).toLowerCase());
                matchesSearch = searchFields.some(f => f.includes(this.searchQuery));
            }
            const matchesBrand = this.filterBrand === 'all' ||
                (item.brand && item.brand.toLowerCase() === this.filterBrand.toLowerCase());
            const matchesCategory = this.filterCategory === 'all' ||
                (item.category && item.category.toLowerCase().includes(this.filterCategory.toLowerCase()));
            const matchesStatus = this.filterStatus === 'all' ||
                item.item_status === this.filterStatus;
            const matchesMachineBrand = this.filterMachineBrand === 'all' ||
                (item.compatible_machines && item.compatible_machines.some(m =>
                    m.toLowerCase().includes(this.filterMachineBrand.toLowerCase())
                ));
            const matchesFavorites = !this.showFavoritesOnly ||
                this.favorites.has(item.item_code);
            return matchesSearch && matchesBrand && matchesCategory &&
                matchesStatus && matchesMachineBrand && matchesFavorites;
        });
        this.renderCatalog();
        this.renderStats();
    },

    applyDropdownFilters() {
        this.filteredItems = this.filteredItems.filter(item => {
            const matchesBrand = this.filterBrand === 'all' ||
                (item.brand && item.brand.toLowerCase() === this.filterBrand.toLowerCase());
            const matchesCategory = this.filterCategory === 'all' ||
                (item.category && item.category.toLowerCase().includes(this.filterCategory.toLowerCase()));
            const matchesStatus = this.filterStatus === 'all' ||
                item.item_status === this.filterStatus;
            const matchesMachineBrand = this.filterMachineBrand === 'all' ||
                (item.compatible_machines && item.compatible_machines.some(m =>
                    m.toLowerCase().includes(this.filterMachineBrand.toLowerCase())
                ));
            const matchesFavorites = !this.showFavoritesOnly ||
                this.favorites.has(item.item_code);
            return matchesBrand && matchesCategory && matchesStatus &&
                matchesMachineBrand && matchesFavorites;
        });
        this.renderCatalog();
    },

    // ============================================
    // RENDERING
    // ============================================
    renderStats() {
        const total = this.catalog.length;
        const complete = this.catalog.filter(i => i.item_status === 'Complete').length;
        const needsImage = this.catalog.filter(i => i.item_status === 'Needs image').length;
        const needsVerification = this.catalog.filter(i => i.item_status === 'Needs verification').length;
        const withImages = this.catalog.filter(i =>
            i.main_image && !i.main_image.includes('Image not found') && !i.main_image.includes('Manual')
        ).length;

        const statTotal = document.getElementById('stat-total');
        const statComplete = document.getElementById('stat-complete');
        const statNeedsImage = document.getElementById('stat-needs-image');
        const statNeedsVerify = document.getElementById('stat-needs-verification');
        const statImages = document.getElementById('stat-images');

        if (statTotal) statTotal.textContent = total;
        if (statComplete) statComplete.textContent = complete;
        if (statNeedsImage) statNeedsImage.textContent = needsImage;
        if (statNeedsVerify) statNeedsVerify.textContent = needsVerification;
        if (statImages) statImages.textContent = withImages;
    },

    renderCatalog() {
        const container = document.getElementById('catalog-grid');
        if (!container) return;

        if (this.filteredItems.length === 0) {
            if (this.catalog.length === 0) {
                this.showEmptyState();
            } else {
                container.innerHTML = `
                    <div class="pv-no-results" style="grid-column: 1/-1;">
                        <div class="pv-no-results-icon">\uD83D\uDD0D</div>
                        <h3>No parts match your search</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                `;
            }
            return;
        }

        container.innerHTML = this.filteredItems.map(item => this.createCard(item)).join('');
    },

    createCard(item) {
        const hasImage = item.main_image &&
            item.main_image !== 'Manual image upload needed' &&
            !item.main_image.includes('Image not found') &&
            item.main_image.trim() !== '';

        const machines = item.compatible_machines || [];
        const machinesPreview = machines.slice(0, 4).join(', ');
        const machinesMore = machines.length > 4
            ? '+' + (machines.length - 4) + ' more'
            : '';

        const statusClass = {
            'Complete': 'status-complete',
            'Needs image': 'status-needs-image',
            'Needs verification': 'status-needs-verification',
            'Draft': 'status-draft'
        }[item.item_status] || 'status-draft';

        const isFav = this.favorites.has(item.item_code);

        let imageHtml;
        if (hasImage) {
            var fallbackHtml = '<div class=\'pv-card-no-image\'><span class=\'icon\'>\uD83D\uDCF7</span><div>Image Not Available Yet</div></div>';
            imageHtml = '<img src="' + item.main_image + '" alt="' + item.item_code + '" loading="lazy" '
                + 'onerror="this.onerror=null;this.parentElement.innerHTML=\'' + fallbackHtml + '\'">';
        } else {
            imageHtml = '<div class="pv-card-no-image">'
                + '<span class="icon">\uD83D\uDCF7</span>'
                + '<div>Image Not Available Yet</div>'
                + '</div>';
        }

        return '<div class="pv-card" onclick="PVApp.openDetail(\'' + item.item_code + '\')">'
            + '<button class="pv-card-favorite ' + (isFav ? 'active' : '') + '" '
            + 'onclick="PVApp.toggleFavorite(\'' + item.item_code + '\', event)" '
            + 'title="' + (isFav ? 'Remove from favorites' : 'Add to favorites') + '">'
            + (isFav ? '\u2605' : '\u2606')
            + '</button>'
            + '<span class="pv-card-status-badge ' + statusClass + '">' + item.item_status + '</span>'
            + '<div class="pv-card-header">'
            + '<span class="pv-card-code">' + item.item_code + '</span>'
            + '<span class="pv-card-brand">' + (item.brand || '') + '</span>'
            + '</div>'
            + '<div class="pv-card-image">' + imageHtml + '</div>'
            + '<div class="pv-card-body">'
            + '<div class="pv-card-part-number">' + (item.oem_part_number || '') + '</div>'
            + '<div class="pv-card-name">' + (item.product_name_en || '') + '</div>'
            + '<div class="pv-card-machines">'
            + '<div class="pv-card-machines-title">\uD83D\uDE9C Compatible Machines</div>'
            + '<div class="pv-card-machines-list">' + machinesPreview + '</div>'
            + (machinesMore ? '<div class="pv-card-machines-more">' + machinesMore + '</div>' : '')
            + '</div>'
            + '<div class="pv-card-footer">'
            + '<span class="pv-card-verified ' + (item.verification_status === 'Verified' ? 'verified' : 'pending') + '">'
            + (item.verification_status === 'Verified' ? '\u2713 Verified' : '\u26A0 Pending')
            + '</span>'
            + '<button class="pv-card-view-btn">View Details \u2192</button>'
            + '</div>'
            + '</div>'
            + '</div>';
    },

    // ============================================
    // PRODUCT DETAIL MODAL
    // ============================================
    openDetail(itemCode) {
        const item = this.catalog.find(i => i.item_code === itemCode);
        if (!item) return;

        this.currentItem = item;
        const overlay = document.getElementById('modal-overlay');

        const hasImage = item.main_image &&
            item.main_image !== 'Manual image upload needed' &&
            !item.main_image.includes('Image not found') &&
            item.main_image.trim() !== '';

        const machines = item.compatible_machines || [];
        const machinesTags = machines.map(m =>
            '<span class="pv-machine-tag">' + m + '</span>'
        ).join('');

        const altNumbers = (item.alternative_part_numbers || []).map(n =>
            '<span class="pv-alt-number">' + n + '</span>'
        ).join('');

        const techSpecs = typeof item.technical_specs === 'object' && item.technical_specs !== null
            ? Object.entries(item.technical_specs).map(([k, v]) =>
                '<div><strong>' + k + ':</strong> ' + v + '</div>'
            ).join('')
            : (item.technical_specs || 'N/A');

        const dimensions = typeof item.sizes_dimensions === 'object' && item.sizes_dimensions !== null
            ? Object.entries(item.sizes_dimensions).map(([k, v]) =>
                '<div><strong>' + k + ':</strong> ' + v + '</div>'
            ).join('')
            : (item.sizes_dimensions || 'N/A');

        const crossRefs = item.cross_references
            ? '<div><strong>Superseded By:</strong> ' + (item.cross_references.superseded_by || 'N/A') + '</div>'
            + '<div><strong>Replaces:</strong> ' + (item.cross_references.replaces || 'N/A') + '</div>'
            + '<div><strong>Interchangeable:</strong> ' + (item.cross_references.interchangeable_with ? item.cross_references.interchangeable_with.join(', ') : 'N/A') + '</div>'
            : 'N/A';

        let missingWarnings = [];
        if (!hasImage) missingWarnings.push('No product image');
        if (!item.technical_specs || item.technical_specs === 'Needs manual verification') missingWarnings.push('Technical specs need verification');
        if (!item.sizes_dimensions || item.sizes_dimensions === 'Needs manual verification') missingWarnings.push('Dimensions need verification');
        if (machines.length === 0) missingWarnings.push('No compatible machines listed');

        const warningsHtml = missingWarnings.length > 0
            ? '<div class="pv-missing-warning">'
            + '<span>\u26A0\uFE0F</span>'
            + '<div><strong>Missing Data:</strong> ' + missingWarnings.join(', ') + '</div>'
            + '</div>'
            : '';

        const sourceLinksHtml = [
            ...(item.source_links_images || []),
            ...(item.source_links_compatibility || []),
            ...(item.source_links_sizes || []),
            ...(item.source_links_cross_refs || [])
        ].map(url => '<a href="' + url + '" class="pv-source-link" target="_blank">\uD83D\uDD17 ' + url + '</a>').join('') || 'No source links recorded';

        const isFav = this.favorites.has(item.item_code);

        var fallbackHtml2 = '<div class=\'pv-card-no-image\'><span class=\'icon\'>\uD83D\uDCF7</span><div>Image Not Available Yet</div></div>';
        const modalImageHtml = hasImage
            ? '<img src="' + item.main_image + '" alt="' + item.item_code + '" onerror="this.onerror=null;this.parentElement.innerHTML=\'' + fallbackHtml2 + '\'">'
            : '<div class="pv-card-no-image"><span class="icon">\uD83D\uDCF7</span><div>Image Not Available Yet</div></div>';

        document.getElementById('modal-content').innerHTML =
            '<div class="pv-modal-header">'
            + '<div class="pv-modal-code">' + item.item_code + '</div>'
            + '<div class="pv-modal-part-number">' + (item.oem_part_number || '') + '</div>'
            + '<div class="pv-modal-actions">'
            + '<button class="pv-modal-btn pv-modal-btn-primary" onclick="PVApp.toggleFavorite(\'' + item.item_code + '\'); PVApp.openDetail(\'' + item.item_code + '\');">'
            + (isFav ? '\u2605 Favorited' : '\u2606 Add to Favorites')
            + '</button>'
            + '<button class="pv-modal-btn pv-modal-btn-secondary" onclick="PVApp.printProductPage()">\uD83D\uDDA8\uFE0F Print / PDF</button>'
            + '</div>'
            + '</div>'
            + '<div class="pv-modal-body">'
            + warningsHtml
            + '<div class="pv-modal-image-section">'
            + '<div class="pv-modal-main-image">' + modalImageHtml + '</div>'
            + '<div class="pv-modal-info-grid">'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDCCB Product Name</div>'
            + '<div class="pv-info-block-content">'
            + '<div><strong>EN:</strong> ' + (item.product_name_en || '') + '</div>'
            + '<div><strong>AR:</strong> ' + (item.product_name_ar || '') + '</div>'
            + '<div><strong>FR:</strong> ' + (item.product_name_fr || '') + '</div>'
            + '<div><strong>ZH:</strong> ' + (item.product_name_zh || '') + '</div>'
            + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83C\uDFF7\uFE0F Brand & Category</div>'
            + '<div class="pv-info-block-content">'
            + '<div><strong>Brand:</strong> ' + (item.brand || '') + '</div>'
            + '<div><strong>Category:</strong> ' + (item.category || '') + '</div>'
            + '<div><strong>Engine:</strong> ' + (item.engine || 'N/A') + '</div>'
            + '<div><strong>Status:</strong> ' + (item.item_status || '') + '</div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '<div class="pv-modal-info-grid">'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDE9C Compatible Machines (' + machines.length + ')</div>'
            + '<div class="pv-info-block-content machines">' + machinesTags + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDD22 Alternative Numbers</div>'
            + '<div class="pv-info-block-content">' + (altNumbers || 'None') + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDD04 Cross References</div>'
            + '<div class="pv-info-block-content">' + crossRefs + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\u2699\uFE0F Technical Specs</div>'
            + '<div class="pv-info-block-content">' + techSpecs + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDCD0 Sizes & Dimensions</div>'
            + '<div class="pv-info-block-content">' + dimensions + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDCDD Notes</div>'
            + '<div class="pv-info-block-content">' + (item.notes || 'N/A') + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDD17 Source Links</div>'
            + '<div class="pv-info-block-content">' + sourceLinksHtml + '</div>'
            + '</div>'
            + '<div class="pv-info-block">'
            + '<div class="pv-info-block-title">\uD83D\uDCC5 Last Updated</div>'
            + '<div class="pv-info-block-content">'
            + '<div>' + (item.last_updated ? new Date(item.last_updated).toLocaleString() : 'N/A') + '</div>'
            + '<div class="pv-last-updated">Item status: ' + (item.item_status || '') + '</div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</div>';

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeDetail() {
        document.getElementById('modal-overlay').classList.remove('active');
        document.body.style.overflow = '';
        this.currentItem = null;
    },

    // ============================================
    // PRINT / PDF EXPORT
    // ============================================
    printProductPage() {
        if (!this.currentItem) return;
        const item = this.currentItem;
        const machines = item.compatible_machines || [];

        const printWindow = window.open('', '_blank');
        printWindow.document.write(
            '<!DOCTYPE html>\n' +
            '<html><head><title>' + item.item_code + ' - ' + item.oem_part_number + '</title>' +
            '<style>' +
            'body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }' +
            'h1 { color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }' +
            '.field { margin: 12px 0; } .label { font-weight: bold; color: #555; }' +
            '.machines { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }' +
            '.machine-tag { background: #f0f0f0; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; }' +
            '.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 0.85em; }' +
            '</style></head><body>' +
            '<h1>' + item.item_code + '</h1>' +
            '<div class="field"><span class="label">OEM Part Number:</span> ' + item.oem_part_number + '</div>' +
            '<div class="field"><span class="label">Product Name:</span> ' + item.product_name_en + '</div>' +
            '<div class="field"><span class="label">Brand:</span> ' + item.brand + '</div>' +
            '<div class="field"><span class="label">Category:</span> ' + item.category + '</div>' +
            '<div class="field"><span class="label">Compatible Machines:</span>' +
            '<div class="machines">' + machines.map(m => '<span class="machine-tag">' + m + '</span>').join('') + '</div></div>' +
            '<div class="field"><span class="label">Alternative Numbers:</span> ' + (item.alternative_part_numbers || []).join(', ') + '</div>' +
            '<div class="field"><span class="label">Notes:</span> ' + (item.notes || 'N/A') + '</div>' +
            '<div class="footer">Parts Village Digital Catalog | Generated: ' + new Date().toLocaleString() + '<br>' +
            'All Original Manufacturer\'s Names, Part Numbers, and Descriptions Are For Reference Purposes Only</div>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    },

    // ============================================
    // FILTERS
    // ============================================
    populateFilters() {
        const brands = [...new Set(this.catalog.map(i => i.brand).filter(Boolean))].sort();
        const categories = [...new Set(this.catalog.map(i => i.category).filter(Boolean))].sort();
        const machineBrands = [...new Set(this.catalog.flatMap(i =>
            (i.compatible_machines || []).map(m => m.split('-')[0])
        ))].sort();

        const brandSelect = document.getElementById('filter-brand');
        const categorySelect = document.getElementById('filter-category');
        const machineBrandSelect = document.getElementById('filter-machine-brand');

        if (brandSelect) {
            brandSelect.innerHTML = '<option value="all">All Brands</option>' +
                brands.map(b => '<option value="' + b + '">' + b + '</option>').join('');
        }
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="all">All Categories</option>' +
                categories.map(c => '<option value="' + c + '">' + c + '</option>').join('');
        }
        if (machineBrandSelect) {
            machineBrandSelect.innerHTML = '<option value="all">All Machine Brands</option>' +
                machineBrands.map(b => '<option value="' + b + '">' + b + '</option>').join('');
        }
    },

    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.search(e.target.value);
                if (searchClear) searchClear.classList.toggle('visible', e.target.value.length > 0);
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                searchClear.classList.remove('visible');
                this.search('');
            });
        }

        const filterBrand = document.getElementById('filter-brand');
        const filterCategory = document.getElementById('filter-category');
        const filterStatus = document.getElementById('filter-status');
        const filterMachineBrand = document.getElementById('filter-machine-brand');
        const filterFavorites = document.getElementById('filter-favorites');

        if (filterBrand) {
            filterBrand.addEventListener('change', (e) => { this.filterBrand = e.target.value; this.applyFilters(); });
        }
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => { this.filterCategory = e.target.value; this.applyFilters(); });
        }
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => { this.filterStatus = e.target.value; this.applyFilters(); });
        }
        if (filterMachineBrand) {
            filterMachineBrand.addEventListener('change', (e) => { this.filterMachineBrand = e.target.value; this.applyFilters(); });
        }
        if (filterFavorites) {
            filterFavorites.addEventListener('change', (e) => { this.showFavoritesOnly = e.target.checked; this.applyFilters(); });
        }

        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeDetail(); });
        }
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeDetail());
        }

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());

        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeDetail(); });
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => { PVApp.init(); });

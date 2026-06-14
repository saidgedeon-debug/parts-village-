// ============================================
// PARTS VILLAGE DIGITAL CATALOG v4.0
// Empty catalog - ready for your data
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

    async init() {
        this.loadTheme();
        this.loadFavorites();
        await this.loadCatalog();
        this.setupEventListeners();
    },

    async loadCatalog() {
        const supabaseConfigured = window.supabaseClient &&
            window.ENV && window.ENV.SUPABASE_URL &&
            !window.ENV.SUPABASE_URL.includes('YOUR_');

        if (supabaseConfigured) {
            try {
                const { data, error } = await window.supabaseClient.from('catalog_items').select('*');
                if (!error && data && data.length > 0) {
                    this.catalog = data;
                    this.buildSearchIndex();
                    this.filteredItems = [...this.catalog];
                    this.updateStatus('db', 'Supabase Connected', '#4caf50');
                    this.updateStatus('count', this.catalog.length, '#4caf50');
                    this.renderStats();
                    this.renderCatalog();
                    this.populateFilters();
                    return;
                }
            } catch (e) { console.log('[PVApp] Supabase not available'); }
        }

        const localData = localStorage.getItem('pv_catalog_data');
        if (localData) {
            try {
                this.catalog = JSON.parse(localData);
                this.buildSearchIndex();
                this.filteredItems = [...this.catalog];
                this.updateStatus('db', 'Local Data', '#ff9800');
                this.updateStatus('count', this.catalog.length, '#ff9800');
                this.renderStats();
                this.renderCatalog();
                this.populateFilters();
                return;
            } catch (e) {}
        }

        this.catalog = [];
        this.filteredItems = [];
        this.updateStatus('db', 'Empty', '#2196f3');
        this.updateStatus('count', '0', '#2196f3');
        this.showEmptyState();
    },

    showEmptyState() {
        const container = document.getElementById('catalog-grid');
        if (!container) return;
        container.innerHTML = `<div class="pv-empty-state" style="grid-column:1/-1;">
            <div class="pv-empty-icon">&#128230;</div>
            <h2>Your Catalog is Empty</h2>
            <p>Add parts via the Admin Panel or import a catalog file.</p>
            <div class="pv-empty-actions">
                <a href="admin/index.html" class="pv-empty-btn pv-empty-btn-primary">Open Admin Panel</a>
            </div>
        </div>`;
        this.renderStats();
    },

    updateStatus(id, text, color) {
        const el = document.getElementById('status-' + id);
        if (el) { const s = el.querySelector('span'); if (s) { s.textContent = text; s.style.color = color || '#4caf50'; } }
    },

    renderStats() {
        const t = this.catalog.length;
        const c = this.catalog.filter(i => i.item_status === 'Complete').length;
        const ni = this.catalog.filter(i => i.item_status === 'Needs image').length;
        const nv = this.catalog.filter(i => i.item_status === 'Needs verification').length;
        const wi = this.catalog.filter(i => i.main_image && !i.main_image.includes('Image not found') && !i.main_image.includes('Manual')).length;
        const s = (id, v) => { const el = document.getElementById('stat-' + id); if (el) el.textContent = v; };
        s('total', t); s('complete', c); s('needs-image', ni); s('needs-verify', nv); s('images', wi);
    },

    loadTheme() {
        const theme = localStorage.getItem('pv_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    },

    toggleTheme() {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pv_theme', next);
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = next === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    },

    loadFavorites() {
        const saved = localStorage.getItem('pv_favorites');
        if (saved) { try { this.favorites = new Set(JSON.parse(saved)); } catch(e) {} }
    },

    saveFavorites() { localStorage.setItem('pv_favorites', JSON.stringify([...this.favorites])); },

    toggleFavorite(code, e) {
        if (e) e.stopPropagation();
        this.favorites.has(code) ? this.favorites.delete(code) : this.favorites.add(code);
        this.saveFavorites(); this.renderCatalog();
    },

    buildSearchIndex() {
        this.searchIndex = {};
        this.catalog.forEach(item => {
            [item.item_code, item.oem_part_number, item.product_name_en, item.product_name_ar,
             item.product_name_fr, item.product_name_zh, item.brand, item.category, item.engine,
             ...(item.alternative_part_numbers || []), ...(item.compatible_machines || [])]
            .forEach(f => {
                if (!f) return;
                String(f).toLowerCase().split(/\s+/).forEach(w => {
                    const cw = w.replace(/[^a-z0-9\-]/g, '');
                    if (cw.length < 2) return;
                    if (!this.searchIndex[cw]) this.searchIndex[cw] = [];
                    if (!this.searchIndex[cw].includes(item.item_code)) this.searchIndex[cw].push(item.item_code);
                });
            });
        });
    },

    search(q) {
        this.searchQuery = q.toLowerCase().trim();
        if (!this.searchQuery) { this.applyFilters(); return; }
        const mc = new Set();
        for (const [k, codes] of Object.entries(this.searchIndex)) {
            if (k.includes(this.searchQuery)) codes.forEach(c => mc.add(c));
        }
        if (mc.size === 0) {
            this.catalog.forEach(i => {
                const sf = [i.item_code, i.oem_part_number, i.product_name_en, i.product_name_ar, i.brand, i.category, ...(i.alternative_part_numbers || []), ...(i.compatible_machines || [])].map(f => String(f).toLowerCase());
                if (sf.some(f => f.includes(this.searchQuery))) mc.add(i.item_code);
            });
        }
        this.filteredItems = this.catalog.filter(i => mc.has(i.item_code));
        this.applyDropdownFilters();
    },

    applyFilters() {
        this.filteredItems = this.catalog.filter(i => {
            let ms = true;
            if (this.searchQuery) {
                const sf = [i.item_code, i.oem_part_number, i.product_name_en, i.brand, i.category, ...(i.compatible_machines || []), ...(i.alternative_part_numbers || [])].map(f => String(f).toLowerCase());
                ms = sf.some(f => f.includes(this.searchQuery));
            }
            const mb = this.filterBrand === 'all' || (i.brand && i.brand.toLowerCase() === this.filterBrand.toLowerCase());
            const mc = this.filterCategory === 'all' || (i.category && i.category.toLowerCase().includes(this.filterCategory.toLowerCase()));
            const ms2 = this.filterStatus === 'all' || i.item_status === this.filterStatus;
            const mm = this.filterMachineBrand === 'all' || (i.compatible_machines && i.compatible_machines.some(m => m.toLowerCase().includes(this.filterMachineBrand.toLowerCase())));
            const mf = !this.showFavoritesOnly || this.favorites.has(i.item_code);
            return ms && mb && mc && ms2 && mm && mf;
        });
        this.renderCatalog(); this.renderStats();
    },

    applyDropdownFilters() {
        this.filteredItems = this.filteredItems.filter(i => {
            const mb = this.filterBrand === 'all' || (i.brand && i.brand.toLowerCase() === this.filterBrand.toLowerCase());
            const mc = this.filterCategory === 'all' || (i.category && i.category.toLowerCase().includes(this.filterCategory.toLowerCase()));
            const ms = this.filterStatus === 'all' || i.item_status === this.filterStatus;
            const mm = this.filterMachineBrand === 'all' || (i.compatible_machines && i.compatible_machines.some(m => m.toLowerCase().includes(this.filterMachineBrand.toLowerCase())));
            const mf = !this.showFavoritesOnly || this.favorites.has(i.item_code);
            return mb && mc && ms && mm && mf;
        });
        this.renderCatalog();
    },

    renderCatalog() {
        const c = document.getElementById('catalog-grid');
        if (!c) return;
        if (this.filteredItems.length === 0) {
            if (this.catalog.length === 0) { this.showEmptyState(); return; }
            c.innerHTML = '<div class="pv-no-results" style="grid-column:1/-1;"><div class="pv-no-results-icon">&#128269;</div><h3>No parts match your search</h3></div>';
            return;
        }
        c.innerHTML = this.filteredItems.map(i => this.createCard(i)).join('');
    },

    createCard(i) {
        const hi = i.main_image && i.main_image !== 'Manual image upload needed' && !i.main_image.includes('Image not found') && i.main_image.trim();
        const m = i.compatible_machines || [];
        const mp = m.slice(0, 4).join(', ');
        const mm = m.length > 4 ? '+' + (m.length - 4) + ' more' : '';
        const sc = { 'Complete': 'status-complete', 'Needs image': 'status-needs-image', 'Needs verification': 'status-needs-verification', 'Draft': 'status-draft' }[i.item_status] || 'status-draft';
        const f = this.favorites.has(i.item_code);
        const fi = hi ? "<img src=\"" + i.main_image + "\" alt=\"" + i.item_code + "\" loading=\"lazy\" onerror=\"this.parentElement.innerHTML='<div class=\\'pv-card-no-image\\'><span>&#128247;</span></div>'\">" : "<div class=\"pv-card-no-image\"><span>&#128247;</span></div>";
        return '<div class="pv-card" onclick="PVApp.openDetail(\'' + i.item_code + '\')">' +
            '<button class="pv-card-favorite ' + (f ? 'active' : '') + '" onclick="PVApp.toggleFavorite(\'' + i.item_code + '\', event)">' + (f ? '&#9733;' : '&#9734;') + '</button>' +
            '<span class="pv-card-status-badge ' + sc + '">' + i.item_status + '</span>' +
            '<div class="pv-card-header"><span class="pv-card-code">' + i.item_code + '</span><span class="pv-card-brand">' + (i.brand || '') + '</span></div>' +
            '<div class="pv-card-image">' + fi + '</div>' +
            '<div class="pv-card-body">' +
            '<div class="pv-card-part-number">' + (i.oem_part_number || '') + '</div>' +
            '<div class="pv-card-name">' + (i.product_name_en || '') + '</div>' +
            '<div class="pv-card-machines"><div class="pv-card-machines-title">&#128668; Compatible Machines</div><div class="pv-card-machines-list">' + mp + '</div>' + (mm ? '<div class="pv-card-machines-more">' + mm + '</div>' : '') + '</div>' +
            '<div class="pv-card-footer"><span class="pv-card-verified ' + (i.verification_status === 'Verified' ? 'verified' : 'pending') + '">' + (i.verification_status === 'Verified' ? '&#10003; Verified' : '&#9888; Pending') + '</span><button class="pv-card-view-btn">View Details &#8594;</button></div>' +
            '</div></div>';
    },

    openDetail(code) {
        const item = this.catalog.find(i => i.item_code === code);
        if (!item) return;
        this.currentItem = item;
        const o = document.getElementById('modal-overlay');
        const hasImage = item.main_image && item.main_image !== 'Manual image upload needed' && !item.main_image.includes('Image not found') && item.main_image.trim();
        const m = item.compatible_machines || [];
        const mTags = m.map(m2 => '<span class="pv-machine-tag">' + m2 + '</span>').join('');
        const altNums = (item.alternative_part_numbers || []).map(n => '<span class="pv-alt-number">' + n + '</span>').join('');
        const ts = typeof item.technical_specs === 'object' && item.technical_specs !== null ? Object.entries(item.technical_specs).map(([k, v]) => '<div><strong>' + k + ':</strong> ' + v + '</div>').join('') : (item.technical_specs || 'N/A');
        const sd = typeof item.sizes_dimensions === 'object' && item.sizes_dimensions !== null ? Object.entries(item.sizes_dimensions).map(([k, v]) => '<div><strong>' + k + ':</strong> ' + v + '</div>').join('') : (item.sizes_dimensions || 'N/A');
        const cr = item.cross_references ? '<div><strong>Superseded By:</strong> ' + (item.cross_references.superseded_by || 'N/A') + '</div><div><strong>Replaces:</strong> ' + (item.cross_references.replaces || 'N/A') + '</div><div><strong>Interchangeable:</strong> ' + (item.cross_references.interchangeable_with ? item.cross_references.interchangeable_with.join(', ') : 'N/A') + '</div>' : 'N/A';
        const mw = [];
        if (!hasImage) mw.push('No product image');
        if (!item.technical_specs || item.technical_specs === 'Needs manual verification') mw.push('Technical specs need verification');
        if (!item.sizes_dimensions || item.sizes_dimensions === 'Needs manual verification') mw.push('Dimensions need verification');
        if (m.length === 0) mw.push('No compatible machines listed');
        const wh = mw.length > 0 ? '<div class="pv-missing-warning"><span>&#9888;&#65039;</span><div><strong>Missing Data:</strong> ' + mw.join(', ') + '</div></div>' : '';
        const sl = [...(item.source_links_images || []), ...(item.source_links_compatibility || []), ...(item.source_links_sizes || []), ...(item.source_links_cross_refs || [])].map(u => '<a href="' + u + '" class="pv-source-link" target="_blank">&#128279; ' + u + '</a>').join('') || 'No source links recorded';
        const f = this.favorites.has(item.item_code);
        const mh = hasImage ? "<img src=\"" + item.main_image + "\" alt=\"" + item.item_code + "\" onerror=\"this.parentElement.innerHTML='<div class=\\'pv-card-no-image\\'><span>&#128247;</span></div>'\">" : "<div class=\"pv-card-no-image\"><span>&#128247;</span></div>";
        document.getElementById('modal-content').innerHTML =
            '<div class="pv-modal-header"><div class="pv-modal-code">' + item.item_code + '</div><div class="pv-modal-part-number">' + (item.oem_part_number || '') + '</div><div class="pv-modal-actions"><button class="pv-modal-btn pv-modal-btn-primary" onclick="PVApp.toggleFavorite(\'' + item.item_code + '\'); PVApp.openDetail(\'' + item.item_code + '\');">' + (f ? '&#9733; Favorited' : '&#9734; Add to Favorites') + '</button><button class="pv-modal-btn pv-modal-btn-secondary" onclick="PVApp.printProductPage()">&#128424;&#65039; Print / PDF</button></div></div>' +
            '<div class="pv-modal-body">' + wh + '<div class="pv-modal-image-section"><div class="pv-modal-main-image">' + mh + '</div><div class="pv-modal-info-grid"><div class="pv-info-block"><div class="pv-info-block-title">&#128203; Product Name</div><div class="pv-info-block-content"><div><strong>EN:</strong> ' + (item.product_name_en || '') + '</div><div><strong>AR:</strong> ' + (item.product_name_ar || '') + '</div><div><strong>FR:</strong> ' + (item.product_name_fr || '') + '</div><div><strong>ZH:</strong> ' + (item.product_name_zh || '') + '</div></div></div><div class="pv-info-block"><div class="pv-info-block-title">&#127991;&#65039; Brand & Category</div><div class="pv-info-block-content"><div><strong>Brand:</strong> ' + (item.brand || '') + '</div><div><strong>Category:</strong> ' + (item.category || '') + '</div><div><strong>Engine:</strong> ' + (item.engine || 'N/A') + '</div><div><strong>Status:</strong> ' + (item.item_status || '') + '</div></div></div></div></div>' +
            '<div class="pv-modal-info-grid"><div class="pv-info-block"><div class="pv-info-block-title">&#128668; Compatible Machines (' + m.length + ')</div><div class="pv-info-block-content machines">' + mTags + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#128258; Alternative Numbers</div><div class="pv-info-block-content">' + (altNums || 'None') + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#128260; Cross References</div><div class="pv-info-block-content">' + cr + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#9881;&#65039; Technical Specs</div><div class="pv-info-block-content">' + ts + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#128208; Sizes & Dimensions</div><div class="pv-info-block-content">' + sd + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#128221; Notes</div><div class="pv-info-block-content">' + (item.notes || 'N/A') + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#128279; Source Links</div><div class="pv-info-block-content">' + sl + '</div></div><div class="pv-info-block"><div class="pv-info-block-title">&#128197; Last Updated</div><div class="pv-info-block-content"><div>' + (item.last_updated ? new Date(item.last_updated).toLocaleString() : 'N/A') + '</div></div></div></div></div>';
        o.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeDetail() { document.getElementById('modal-overlay').classList.remove('active'); document.body.style.overflow = ''; this.currentItem = null; },

    printProductPage() {
        if (!this.currentItem) return;
        const i = this.currentItem;
        const m = i.compatible_machines || [];
        const w = window.open('', '_blank');
        w.document.write('<!DOCTYPE html><html><head><title>' + i.item_code + ' - ' + i.oem_part_number + '</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}h1{color:#d4af37;border-bottom:2px solid #d4af37;padding-bottom:10px}.field{margin:12px 0}.label{font-weight:bold;color:#555}.machines{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.machine-tag{background:#f0f0f0;padding:4px 10px;border-radius:12px;font-size:0.85em}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;color:#888;font-size:0.85em}</style></head><body><h1>' + i.item_code + '</h1><div class="field"><span class="label">OEM Part Number:</span> ' + i.oem_part_number + '</div><div class="field"><span class="label">Product Name:</span> ' + i.product_name_en + '</div><div class="field"><span class="label">Brand:</span> ' + i.brand + '</div><div class="field"><span class="label">Category:</span> ' + i.category + '</div><div class="field"><span class="label">Compatible Machines:</span><div class="machines">' + m.map(m2 => '<span class="machine-tag">' + m2 + '</span>').join('') + '</div></div><div class="field"><span class="label">Alternative Numbers:</span> ' + (i.alternative_part_numbers || []).join(', ') + '</div><div class="field"><span class="label">Notes:</span> ' + (i.notes || 'N/A') + '</div><div class="footer">Parts Village Digital Catalog | Generated: ' + new Date().toLocaleString() + '<br>All Original Manufacturer\'s Names, Part Numbers, and Descriptions Are For Reference Purposes Only</div></body></html>');
        w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
    },

    populateFilters() {
        const b = [...new Set(this.catalog.map(i => i.brand).filter(Boolean))].sort();
        const c = [...new Set(this.catalog.map(i => i.category).filter(Boolean))].sort();
        const mb = [...new Set(this.catalog.flatMap(i => (i.compatible_machines || []).map(m => m.split('-')[0])))].sort();
        const bs = document.getElementById('filter-brand');
        const cs = document.getElementById('filter-category');
        const ms = document.getElementById('filter-machine-brand');
        if (bs) bs.innerHTML = '<option value="all">All Brands</option>' + b.map(x => '<option value="' + x + '">' + x + '</option>').join('');
        if (cs) cs.innerHTML = '<option value="all">All Categories</option>' + c.map(x => '<option value="' + x + '">' + x + '</option>').join('');
        if (ms) ms.innerHTML = '<option value="all">All Machine Brands</option>' + mb.map(x => '<option value="' + x + '">' + x + '</option>').join('');
    },

    setupEventListeners() {
        const si = document.getElementById('search-input');
        const sc = document.getElementById('search-clear');
        if (si) si.addEventListener('input', e => { this.search(e.target.value); if (sc) sc.classList.toggle('visible', e.target.value.length > 0); });
        if (sc) sc.addEventListener('click', () => { if (si) si.value = ''; sc.classList.remove('visible'); this.search(''); });
        ['filter-brand', 'filter-category', 'filter-status', 'filter-machine-brand'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', e => { this[id.replace('filter-', 'filter')] = e.target.value; this.applyFilters(); });
        });
        const ff = document.getElementById('filter-favorites');
        if (ff) ff.addEventListener('change', e => { this.showFavoritesOnly = e.target.checked; this.applyFilters(); });
        const mo = document.getElementById('modal-overlay');
        const mc = document.getElementById('modal-close');
        if (mo) mo.addEventListener('click', e => { if (e.target === e.currentTarget) this.closeDetail(); });
        if (mc) mc.addEventListener('click', () => this.closeDetail());
        const tb = document.getElementById('theme-toggle');
        if (tb) tb.addEventListener('click', () => this.toggleTheme());
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeDetail(); });
    }
};

document.addEventListener('DOMContentLoaded', () => { PVApp.init(); });

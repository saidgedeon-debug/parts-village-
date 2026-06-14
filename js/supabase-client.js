/**
 * Parts Village Digital Catalog - Supabase Client Module
 * ========================================================
 * Comprehensive Supabase client for vanilla JavaScript.
 * Provides CRUD operations, image uploads, real-time subscriptions,
 * offline caching, favorites sync, and auth helpers.
 *
 * CDN Dependency (load BEFORE this script):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *
 * Environment Dependency (load BEFORE this script):
 *   <script src="js/env.js"></script>
 *
 * Typical HTML loading order:
 *   1. Supabase CDN
 *   2. env.js (sets window.ENV)
 *   3. supabase-client.js (this file)
 *   4. app.js / admin.js
 */

(function () {
  'use strict';

  // ── Module Version ─────────────────────────────────────────────────────────
  const MODULE_VERSION = '4.0.0';

  // ── Configuration from Environment ────────────────────────────────────────
  const SUPABASE_URL = (typeof window !== 'undefined' &&
                        window.ENV && window.ENV.SUPABASE_URL)
                        ? window.ENV.SUPABASE_URL : '';

  const SUPABASE_ANON_KEY = (typeof window !== 'undefined' &&
                             window.ENV && window.ENV.SUPABASE_ANON_KEY)
                             ? window.ENV.SUPABASE_ANON_KEY : '';

  // ── Validation ────────────────────────────────────────────────────────────
  const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

  if (!isConfigured) {
    console.warn(
      '[Parts Village] Supabase credentials not configured. ' +
      'Running in offline/demo mode. Set window.ENV.SUPABASE_URL and ' +
      'window.ENV.SUPABASE_ANON_KEY before loading this script.'
    );
  }

  // ── Client Initialization ────────────────────────────────────────────────
  let supabaseClient = null;

  if (isConfigured && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'parts-village-auth'
        },
        realtime: {
          timeout: 20000
        },
        global: {
          headers: {
            'x-application-name': 'parts-village-catalog',
            'x-client-info': 'parts-village-js/' + MODULE_VERSION
          }
        },
        db: {
          schema: 'public'
        }
      });
      // Also expose directly for app.js and admin.js compatibility
      window.supabaseClient = supabaseClient;
      console.log('[Parts Village] Supabase client initialized. v' + MODULE_VERSION);
    } catch (err) {
      console.error('[Parts Village] Failed to initialize Supabase client:', err);
      supabaseClient = null;
    }
  } else {
    if (typeof window.supabase === 'undefined') {
      console.warn(
        '[Parts Village] Supabase library not loaded. ' +
        'Include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>'
      );
    }
  }

  // ── Health Check ──────────────────────────────────────────────────────────
  /**
   * Check if Supabase connection is alive.
   * @returns {Promise<boolean>}
   */
  async function checkSupabaseHealth() {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient
        .from('catalog_items')
        .select('count', { count: 'exact', head: true });
      return !error;
    } catch {
      return false;
    }
  }

  // ── CATALOG CRUD OPERATIONS ───────────────────────────────────────────────

  /**
   * Fetch all catalog items with optional filters.
   *
   * @param {Object}  [filters={}]          - Filter options
   * @param {string}  [filters.brand]       - Filter by brand (exact match)
   * @param {string}  [filters.category]    - Filter by category (exact match)
   * @param {string}  [filters.status]      - Filter by item_status
   * @param {string}  [filters.search]      - Full-text search query
   * @param {boolean} [filters.favorites]   - If true, only favorited items
   * @param {string}  [filters.orderBy]     - Column to order by (default: item_code)
   * @param {boolean} [filters.ascending]   - Sort direction (default: true)
   * @param {number}  [filters.limit]       - Max items to return
   * @param {number}  [filters.offset]      - Pagination offset
   * @returns {Promise<{data: Array|null, error: Error|null, count: number}>}
   */
  async function fetchCatalogItems(filters) {
    filters = filters || {};

    // If offline, return cached data
    if (!supabaseClient) {
      var cached = getCachedCatalogItems();
      return {
        data: cached ? cached.items : null,
        error: new Error('Supabase offline - returned cached data'),
        count: cached ? cached.items.length : 0
      };
    }

    var query = supabaseClient
      .from('catalog_items')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.status) {
      query = query.eq('item_status', filters.status);
    }
    if (filters.favorites) {
      query = query.eq('is_favorited', true);
    }
    if (filters.search) {
      var q = filters.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(
        'item_code.ilike.%' + q + '%,' +
        'oem_part_number.ilike.%' + q + '%,' +
        'product_name_en.ilike.%' + q + '%,' +
        'product_name_ar.ilike.%' + q + '%,' +
        'brand.ilike.%' + q + '%'
      );
    }

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 1000) - 1);
    }

    // Ordering
    var orderColumn = filters.orderBy || 'item_code';
    var ascending = filters.ascending !== false;
    query = query.order(orderColumn, { ascending: ascending });

    var result = await query;

    // Cache successful results for offline use
    if (result.data && !result.error) {
      cacheCatalogItems(result.data);
    }

    return {
      data: result.data,
      error: result.error,
      count: result.count || (result.data ? result.data.length : 0)
    };
  }

  /**
   * Fetch a single catalog item by item_code.
   * @param {string} itemCode - The item code (e.g., "A01-1")
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async function fetchCatalogItem(itemCode) {
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };

    return await supabaseClient
      .from('catalog_items')
      .select('*')
      .eq('item_code', itemCode)
      .single();
  }

  /**
   * Insert a new catalog item.
   * Requires authentication (enforced by RLS).
   * @param {Object} item - The catalog item data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async function insertCatalogItem(item) {
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };

    var now = new Date().toISOString();
    var enrichedItem = Object.assign({}, item, {
      last_updated: now,
      change_history: item.change_history || [{
        timestamp: now,
        action: 'Created',
        field: 'item',
        old_value: '',
        new_value: item.item_code || '',
        user: 'admin'
      }]
    });

    return await supabaseClient
      .from('catalog_items')
      .insert([enrichedItem])
      .select()
      .single();
  }

  /**
   * Update an existing catalog item.
   * Requires authentication (enforced by RLS).
   * @param {string} itemCode  - The item code to update
   * @param {Object} updates   - The fields to update
   * @param {string} [user='admin'] - The user making the change
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async function updateCatalogItem(itemCode, updates, user) {
    user = user || 'admin';
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };

    // Fetch current item to compute change history
    var currentResult = await fetchCatalogItem(itemCode);
    if (!currentResult.data) {
      return { data: null, error: new Error('Item ' + itemCode + ' not found') };
    }
    var currentItem = currentResult.data;

    // Build change history entries for modified fields
    var now = new Date().toISOString();
    var newHistory = currentItem.change_history || [];
    var scalarTypes = { string: 1, number: 1, boolean: 1 };

    Object.keys(updates).forEach(function (key) {
      var oldVal = currentItem[key];
      var newVal = updates[key];
      if (oldVal !== newVal && scalarTypes[typeof newVal]) {
        newHistory.push({
          timestamp: now,
          action: 'Updated',
          field: key,
          old_value: String(oldVal !== null && oldVal !== undefined ? oldVal : ''),
          new_value: String(newVal !== null && newVal !== undefined ? newVal : ''),
          user: user
        });
      }
    });

    var enrichedUpdates = Object.assign({}, updates, {
      last_updated: now,
      change_history: newHistory
    });

    return await supabaseClient
      .from('catalog_items')
      .update(enrichedUpdates)
      .eq('item_code', itemCode)
      .select()
      .single();
  }

  /**
   * Delete a catalog item.
   * Requires authentication (enforced by RLS).
   * @param {string} itemCode - The item code to delete
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async function deleteCatalogItem(itemCode) {
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };

    return await supabaseClient
      .from('catalog_items')
      .delete()
      .eq('item_code', itemCode)
      .select()
      .single();
  }

  // ── FAVORITES ──────────────────────────────────────────────────────────────

  /**
   * Toggle favorite status for an item.
   * @param {string}  itemCode    - The item code
   * @param {boolean} isFavorited - The new favorite status
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async function toggleFavorite(itemCode, isFavorited) {
    if (!supabaseClient) {
      // Fallback: update localStorage only
      var favs = getLocalFavorites();
      if (isFavorited) favs.add(itemCode); else favs.delete(itemCode);
      saveLocalFavorites(favs);
      return { data: { item_code: itemCode, is_favorited: isFavorited }, error: null };
    }

    return await supabaseClient
      .from('catalog_items')
      .update({
        is_favorited: isFavorited,
        last_updated: new Date().toISOString()
      })
      .eq('item_code', itemCode)
      .select()
      .single();
  }

  /**
   * Get favorited item codes from localStorage (offline support).
   * @returns {Set<string>}
   */
  function getLocalFavorites() {
    try {
      var stored = window.localStorage.getItem('parts-village-favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  /**
   * Save favorite item codes to localStorage.
   * @param {Set<string>} favorites
   */
  function saveLocalFavorites(favorites) {
    try {
      window.localStorage.setItem(
        'parts-village-favorites',
        JSON.stringify(Array.from(favorites))
      );
    } catch (err) {
      console.error('[Parts Village] Failed to save favorites:', err);
    }
  }

  // ── STORAGE (Product Images) ──────────────────────────────────────────────

  /**
   * Upload an image to the "product-images" Supabase Storage bucket.
   * @param {File}    file       - The image file to upload
   * @param {string}  itemCode   - The item code for folder organization
   * @param {string}  [imageType='main'] - "main" or "extra"
   * @returns {Promise<{url: string|null, error: Error|null, path: string}>}
   */
  async function uploadProductImage(file, itemCode, imageType) {
    imageType = imageType || 'main';
    if (!supabaseClient) return { url: null, error: new Error('Supabase not configured'), path: '' };

    var fileExt = file.name.split('.').pop();
    var fileName = itemCode + '/' + imageType + '_' + Date.now() + '.' + fileExt;

    var result = await supabaseClient.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (result.error) {
      return { url: null, error: result.error, path: '' };
    }

    var urlResult = supabaseClient.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return {
      url: urlResult.data.publicUrl,
      error: null,
      path: fileName
    };
  }

  /**
   * Get a public URL for an image stored in the "product-images" bucket.
   * @param {string} filePath - The file path in the bucket
   * @returns {string|null}
   */
  function getProductImageUrl(filePath) {
    if (!supabaseClient || !filePath) return null;

    var result = supabaseClient.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return result.data ? result.data.publicUrl : null;
  }

  /**
   * Delete an image from the "product-images" bucket.
   * @param {string} filePath - The file path in the bucket
   * @returns {Promise<{error: Error|null}>}
   */
  async function deleteProductImage(filePath) {
    if (!supabaseClient) return { error: new Error('Supabase not configured') };
    return await supabaseClient.storage.from('product-images').remove([filePath]);
  }

  // ── REAL-TIME SUBSCRIPTIONS ───────────────────────────────────────────────

  /**
   * Subscribe to real-time changes on the catalog_items table.
   * @param {Function} callback - Called with (payload, eventType)
   * @returns {Object|null}     - The subscription channel
   */
  function subscribeToCatalogChanges(callback) {
    if (!supabaseClient) return null;

    var channel = supabaseClient
      .channel('catalog-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_items' },
        function (payload) {
          callback(payload, payload.eventType);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from real-time changes.
   * @param {Object} channel - The subscription channel
   */
  async function unsubscribeFromCatalogChanges(channel) {
    if (!supabaseClient || !channel) return;
    await supabaseClient.removeChannel(channel);
  }

  // ── OFFLINE CACHING ───────────────────────────────────────────────────────

  /**
   * Cache catalog items in localStorage for offline access.
   * @param {Array} items
   */
  function cacheCatalogItems(items) {
    try {
      window.localStorage.setItem(
        'parts-village-catalog-cache',
        JSON.stringify({
          timestamp: Date.now(),
          items: items
        })
      );
    } catch (err) {
      console.warn('[Parts Village] Failed to cache catalog items:', err);
    }
  }

  /**
   * Get cached catalog items from localStorage.
   * @returns {Object|null} - { timestamp, items }
   */
  function getCachedCatalogItems() {
    try {
      var cached = window.localStorage.getItem('parts-village-catalog-cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear the catalog cache from localStorage.
   */
  function clearCatalogCache() {
    try {
      window.localStorage.removeItem('parts-village-catalog-cache');
    } catch (err) {
      console.warn('[Parts Village] Failed to clear cache:', err);
    }
  }

  /**
   * Check if cached data is stale.
   * @param {number} [maxAgeMs=300000] - Max age in milliseconds (default: 5 minutes)
   * @returns {boolean}
   */
  function isCacheStale(maxAgeMs) {
    maxAgeMs = maxAgeMs || 300000;
    var cached = getCachedCatalogItems();
    if (!cached) return true;
    return (Date.now() - cached.timestamp) > maxAgeMs;
  }

  // ── AUTHENTICATION ────────────────────────────────────────────────────────

  /**
   * Sign in with email/password via Supabase Auth.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async function signIn(email, password) {
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };
    return await supabaseClient.auth.signInWithPassword({ email: email, password: password });
  }

  /**
   * Sign out the current user.
   * @returns {Promise<{error: Error|null}>}
   */
  async function signOut() {
    if (!supabaseClient) return { error: null };
    return await supabaseClient.auth.signOut();
  }

  /**
   * Get the current session.
   * @returns {Promise<{data: {session: Object|null}, error: Error|null}>}
   */
  async function getCurrentSession() {
    if (!supabaseClient) return { data: { session: null }, error: null };
    return await supabaseClient.auth.getSession();
  }

  /**
   * Check if a user is currently authenticated.
   * @returns {Promise<boolean>}
   */
  async function isAuthenticated() {
    var result = await getCurrentSession();
    return !!(result.data && result.data.session);
  }

  /**
   * Listen for auth state changes.
   * @param {Function} callback - Called with (event, session)
   * @returns {Object} - Subscription with .unsubscribe() method
   */
  function onAuthStateChange(callback) {
    if (!supabaseClient) {
      return { data: { subscription: { unsubscribe: function () {} } } };
    }
    return supabaseClient.auth.onAuthStateChange(callback);
  }

  // ── ADMIN ACCESS ──────────────────────────────────────────────────────────

  /**
   * Verify admin access via localStorage password or Supabase Auth role.
   * @param {string} password - Admin password to check
   * @returns {boolean}
   */
  function verifyAdminAccess(password) {
    var storedHash = window.localStorage.getItem('parts-village-admin-auth');
    if (storedHash) return true;

    var adminPassword = (window.ENV && window.ENV.ADMIN_PASSWORD)
      ? window.ENV.ADMIN_PASSWORD
      : 'admin123';

    if (password === adminPassword) {
      window.localStorage.setItem('parts-village-admin-auth', btoa(password));
      return true;
    }
    return false;
  }

  /**
   * Check if admin is currently authenticated (via localStorage token).
   * @returns {boolean}
   */
  function isAdminAuthenticated() {
    return !!window.localStorage.getItem('parts-village-admin-auth');
  }

  /**
   * Clear admin authentication.
   */
  function clearAdminAuth() {
    window.localStorage.removeItem('parts-village-admin-auth');
  }

  // ── DASHBOARD / STATS ─────────────────────────────────────────────────────

  /**
   * Fetch catalog statistics from the database.
   * Uses the get_catalog_stats() PostgreSQL function.
   * @returns {Promise<{stats: Object|null, error: Error|null}>}
   */
  async function fetchCatalogStats() {
    if (!supabaseClient) return { stats: null, error: new Error('Supabase not configured') };

    var result = await supabaseClient.rpc('get_catalog_stats');
    return {
      stats: result.data,
      error: result.error
    };
  }

  /**
   * Fetch distinct brands with item counts.
   * Uses the get_distinct_brands() PostgreSQL function.
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async function fetchDistinctBrands() {
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };
    return await supabaseClient.rpc('get_distinct_brands');
  }

  /**
   * Fetch distinct categories with item counts.
   * Uses the get_distinct_categories() PostgreSQL function.
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async function fetchDistinctCategories() {
    if (!supabaseClient) return { data: null, error: new Error('Supabase not configured') };
    return await supabaseClient.rpc('get_distinct_categories');
  }

  // ── EXPORT PUBLIC API ─────────────────────────────────────────────────────

  window.PartsVillageDB = {
    // Version & Config
    version: MODULE_VERSION,
    isConfigured: isConfigured,

    // Connection
    client: supabaseClient,
    checkHealth: checkSupabaseHealth,

    // Catalog CRUD
    fetchItems: fetchCatalogItems,
    fetchItem: fetchCatalogItem,
    insertItem: insertCatalogItem,
    updateItem: updateCatalogItem,
    deleteItem: deleteCatalogItem,

    // Favorites
    toggleFavorite: toggleFavorite,
    getLocalFavorites: getLocalFavorites,
    saveLocalFavorites: saveLocalFavorites,

    // Storage
    uploadImage: uploadProductImage,
    getImageUrl: getProductImageUrl,
    deleteImage: deleteProductImage,

    // Real-time
    subscribe: subscribeToCatalogChanges,
    unsubscribe: unsubscribeFromCatalogChanges,

    // Offline / Caching
    cacheItems: cacheCatalogItems,
    getCachedItems: getCachedCatalogItems,
    clearCache: clearCatalogCache,
    isCacheStale: isCacheStale,

    // Auth
    signIn: signIn,
    signOut: signOut,
    getSession: getCurrentSession,
    isAuthenticated: isAuthenticated,
    onAuthStateChange: onAuthStateChange,

    // Admin
    verifyAdmin: verifyAdminAccess,
    isAdminAuthenticated: isAdminAuthenticated,
    clearAdminAuth: clearAdminAuth,

    // Dashboard
    fetchStats: fetchCatalogStats,
    fetchBrands: fetchDistinctBrands,
    fetchCategories: fetchDistinctCategories
  };

  console.log('[Parts Village] Database module v' + MODULE_VERSION + ' loaded. Mode: ' + (isConfigured ? 'online' : 'offline'));
})();

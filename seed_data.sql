-- ============================================================================
-- Parts Village Digital Catalog - Database Schema
-- ============================================================================
-- PostgreSQL 14+ / Supabase
-- Run this in the Supabase SQL Editor (new query)
-- ============================================================================

-- ── Enable required extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ── Create the main catalog_items table ─────────────────────────────────────

DROP TABLE IF EXISTS catalog_items CASCADE;

CREATE TABLE catalog_items (
  -- Primary identification
  item_code               TEXT PRIMARY KEY,
  
  -- Product names (multilingual)
  product_name_en         TEXT NOT NULL DEFAULT '',
  product_name_ar         TEXT NOT NULL DEFAULT '',
  product_name_fr         TEXT NOT NULL DEFAULT '',
  product_name_zh         TEXT NOT NULL DEFAULT '',
  
  -- Part numbers
  oem_part_number         TEXT NOT NULL DEFAULT '',
  alternative_part_numbers TEXT[] NOT NULL DEFAULT '{}',
  
  -- Cross references (flexible JSONB structure)
  cross_references        JSONB NOT NULL DEFAULT '{}',
  
  -- Classification
  brand                   TEXT NOT NULL DEFAULT '',
  compatible_machines     TEXT[] NOT NULL DEFAULT '{}',
  category                TEXT NOT NULL DEFAULT '',
  engine                  TEXT NOT NULL DEFAULT '',
  
  -- Images
  main_image              TEXT NOT NULL DEFAULT '',
  extra_images            TEXT[] NOT NULL DEFAULT '{}',
  
  -- Technical data (flexible key-value pairs)
  technical_specs         JSONB NOT NULL DEFAULT '{}',
  sizes_dimensions        JSONB NOT NULL DEFAULT '{}',
  
  -- Packaging & notes
  package_info            TEXT NOT NULL DEFAULT '',
  notes                   TEXT NOT NULL DEFAULT '',
  
  -- Verification
  verification_status     TEXT NOT NULL DEFAULT 'Needs verification'
    CHECK (verification_status IN (
      'Verified',
      'Needs manual verification',
      'Needs verification',
      'Partially verified'
    )),
  
  -- Source links (categorized)
  source_links            TEXT[] NOT NULL DEFAULT '{}',
  source_links_images     TEXT[] NOT NULL DEFAULT '{}',
  source_links_compatibility TEXT[] NOT NULL DEFAULT '{}',
  source_links_sizes      TEXT[] NOT NULL DEFAULT '{}',
  source_links_cross_refs TEXT[] NOT NULL DEFAULT '{}',
  
  -- Pricing (stored as TEXT to preserve currency formatting)
  cost_price_supplier_a   TEXT NOT NULL DEFAULT '',
  cost_price_supplier_b   TEXT NOT NULL DEFAULT '',
  cost_price_supplier_c   TEXT NOT NULL DEFAULT '',
  cost_price_supplier_d   TEXT NOT NULL DEFAULT '',
  selling_price           TEXT NOT NULL DEFAULT '',
  profit_margin           TEXT NOT NULL DEFAULT '',
  currency                TEXT NOT NULL DEFAULT 'USD',
  
  -- Supplier information
  supplier_a_name         TEXT NOT NULL DEFAULT '',
  supplier_b_name         TEXT NOT NULL DEFAULT '',
  supplier_c_name         TEXT NOT NULL DEFAULT '',
  supplier_d_name         TEXT NOT NULL DEFAULT '',
  supplier_a_contact      TEXT NOT NULL DEFAULT '',
  supplier_b_contact      TEXT NOT NULL DEFAULT '',
  supplier_c_contact      TEXT NOT NULL DEFAULT '',
  supplier_d_contact      TEXT NOT NULL DEFAULT '',
  
  -- Order details
  min_order_qty_a         TEXT NOT NULL DEFAULT '',
  min_order_qty_b         TEXT NOT NULL DEFAULT '',
  min_order_qty_c         TEXT NOT NULL DEFAULT '',
  min_order_qty_d         TEXT NOT NULL DEFAULT '',
  lead_time_a             TEXT NOT NULL DEFAULT '',
  lead_time_b             TEXT NOT NULL DEFAULT '',
  lead_time_c             TEXT NOT NULL DEFAULT '',
  lead_time_d             TEXT NOT NULL DEFAULT '',
  
  -- Status tracking
  item_status             TEXT NOT NULL DEFAULT 'Draft'
    CHECK (item_status IN (
      'Complete',
      'Needs image',
      'Needs verification',
      'Draft'
    )),
  
  -- Metadata
  last_updated            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_history          JSONB[] NOT NULL DEFAULT '{}',
  is_favorited            BOOLEAN NOT NULL DEFAULT FALSE,
  display_mode            TEXT NOT NULL DEFAULT 'dark',

  -- ── Row timestamps (auto-managed) ──
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes for fast searching ──────────────────────────────────────────────

-- Primary search fields (B-tree, case-insensitive via lower())
CREATE INDEX idx_catalog_items_item_code ON catalog_items (item_code);
CREATE INDEX idx_catalog_items_oem_part_number ON catalog_items (oem_part_number);
CREATE INDEX idx_catalog_items_brand ON catalog_items (brand);
CREATE INDEX idx_catalog_items_category ON catalog_items (category);
CREATE INDEX idx_catalog_items_item_status ON catalog_items (item_status);
CREATE INDEX idx_catalog_items_verification_status ON catalog_items (verification_status);
CREATE INDEX idx_catalog_items_is_favorited ON catalog_items (is_favorited) WHERE is_favorited = TRUE;
CREATE INDEX idx_catalog_items_last_updated ON catalog_items (last_updated DESC);

-- GIN indexes for array and JSONB queries
CREATE INDEX idx_catalog_items_alt_part_numbers ON catalog_items USING GIN (alternative_part_numbers);
CREATE INDEX idx_catalog_items_compatible_machines ON catalog_items USING GIN (compatible_machines);
CREATE INDEX idx_catalog_items_cross_references ON catalog_items USING GIN (cross_references jsonb_path_ops);
CREATE INDEX idx_catalog_items_technical_specs ON catalog_items USING GIN (technical_specs jsonb_path_ops);
CREATE INDEX idx_catalog_items_sizes_dimensions ON catalog_items USING GIN (sizes_dimensions jsonb_path_ops);
CREATE INDEX idx_catalog_items_source_links ON catalog_items USING GIN (source_links);

-- Composite indexes for common filter combinations
CREATE INDEX idx_catalog_items_brand_category ON catalog_items (brand, category);
CREATE INDEX idx_catalog_items_status_brand ON catalog_items (item_status, brand);

-- Full-text search index (on product name + OEM part number + brand)
CREATE INDEX idx_catalog_items_fts ON catalog_items USING GIN (
  to_tsvector('english',
    coalesce(product_name_en, '') || ' ' ||
    coalesce(oem_part_number, '') || ' ' ||
    coalesce(brand, '') || ' ' ||
    coalesce(item_code, '')
  )
);

-- ── Auto-update updated_at timestamp ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security (RLS) ──────────────────────────────────────────────

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (including anonymous) can SELECT (read)
CREATE POLICY "Allow public read access"
  ON catalog_items
  FOR SELECT
  USING (TRUE);

-- Policy: Only authenticated users can INSERT
CREATE POLICY "Allow authenticated insert"
  ON catalog_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can UPDATE
CREATE POLICY "Allow authenticated update"
  ON catalog_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can DELETE
CREATE POLICY "Allow authenticated delete"
  ON catalog_items
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ── Helper: Full-text search function ──────────────────────────────────────

CREATE OR REPLACE FUNCTION search_catalog_items(search_query TEXT)
RETURNS SETOF catalog_items AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM catalog_items
  WHERE
    item_code ILIKE '%' || search_query || '%'
    OR oem_part_number ILIKE '%' || search_query || '%'
    OR product_name_en ILIKE '%' || search_query || '%'
    OR product_name_ar ILIKE '%' || search_query || '%'
    OR product_name_fr ILIKE '%' || search_query || '%'
    OR product_name_zh ILIKE '%' || search_query || '%'
    OR brand ILIKE '%' || search_query || '%'
    OR category ILIKE '%' || search_query || '%'
    OR engine ILIKE '%' || search_query || '%'
    OR alternative_part_numbers && ARRAY[search_query]
    OR to_tsvector('english',
         coalesce(product_name_en, '') || ' ' ||
         coalesce(oem_part_number, '') || ' ' ||
         coalesce(brand, '') || ' ' ||
         coalesce(item_code, '')
       ) @@ plainto_tsquery('english', search_query)
  ORDER BY
    CASE WHEN item_code = search_query THEN 0 ELSE 1 END,
    CASE WHEN item_code ILIKE search_query || '%' THEN 0 ELSE 1 END,
    last_updated DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Helper: Search within compatible machines ──────────────────────────────

CREATE OR REPLACE FUNCTION search_by_machine(machine_query TEXT)
RETURNS SETOF catalog_items AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM catalog_items
  WHERE compatible_machines && ARRAY[machine_query]
     OR EXISTS (
       SELECT 1
       FROM unnest(compatible_machines) AS machine
       WHERE machine ILIKE '%' || machine_query || '%'
     )
  ORDER BY brand, item_code;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Helper: Get distinct brands (for filters) ──────────────────────────────

CREATE OR REPLACE FUNCTION get_distinct_brands()
RETURNS TABLE(brand TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT ci.brand, COUNT(*)::BIGINT
  FROM catalog_items ci
  WHERE ci.brand <> ''
  GROUP BY ci.brand
  ORDER BY ci.brand;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Helper: Get distinct categories (for filters) ──────────────────────────

CREATE OR REPLACE FUNCTION get_distinct_categories()
RETURNS TABLE(category TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT ci.category, COUNT(*)::BIGINT
  FROM catalog_items ci
  WHERE ci.category <> ''
  GROUP BY ci.category
  ORDER BY ci.category;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Helper: Get statistics dashboard ───────────────────────────────────────

CREATE OR REPLACE FUNCTION get_catalog_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_items', (SELECT COUNT(*) FROM catalog_items),
    'verified_items', (SELECT COUNT(*) FROM catalog_items WHERE verification_status = 'Verified'),
    'needs_verification', (SELECT COUNT(*) FROM catalog_items WHERE verification_status IN ('Needs verification', 'Needs manual verification')),
    'needs_image', (SELECT COUNT(*) FROM catalog_items WHERE item_status = 'Needs image'),
    'complete_items', (SELECT COUNT(*) FROM catalog_items WHERE item_status = 'Complete'),
    'draft_items', (SELECT COUNT(*) FROM catalog_items WHERE item_status = 'Draft'),
    'favorited_items', (SELECT COUNT(*) FROM catalog_items WHERE is_favorited = TRUE),
    'brands', (SELECT jsonb_agg(DISTINCT brand) FROM catalog_items WHERE brand <> ''),
    'latest_update', (SELECT MAX(last_updated) FROM catalog_items)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Helper: Log change to change_history ───────────────────────────────────

CREATE OR REPLACE FUNCTION append_change_history(
  p_item_code TEXT,
  p_action TEXT,
  p_field TEXT,
  p_old_value TEXT,
  p_new_value TEXT,
  p_user TEXT DEFAULT 'system'
)
RETURNS VOID AS $$
BEGIN
  UPDATE catalog_items
  SET change_history = array_append(
    COALESCE(change_history, '{}'),
    jsonb_build_object(
      'timestamp', NOW(),
      'action', p_action,
      'field', p_field,
      'old_value', p_old_value,
      'new_value', p_new_value,
      'user', p_user
    )
  ),
  last_updated = NOW()
  WHERE item_code = p_item_code;
END;
$$ LANGUAGE plpgsql;

-- ── Comment on table ────────────────────────────────────────────────────────

COMMENT ON TABLE catalog_items IS 'Parts Village Digital Catalog - Main catalog table for heavy equipment spare parts (revolution sensors)';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

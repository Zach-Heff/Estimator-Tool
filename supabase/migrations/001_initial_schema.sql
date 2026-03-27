-- QuoteCraft Initial Schema
-- Migration: 001_initial_schema.sql

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  license_number text,
  logo_url text,
  zip_code text,
  default_labor_margin decimal DEFAULT 20.0,
  default_material_margin decimal DEFAULT 30.0,
  default_payment_terms text DEFAULT '50% due upon acceptance, balance due upon completion',
  default_quote_validity_days integer DEFAULT 30,
  subscription_tier text,
  quote_count_this_period integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  company_id uuid REFERENCES companies NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'estimator')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- ============================================
-- QUOTES TABLE
-- ============================================
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies NOT NULL,
  created_by uuid REFERENCES users NOT NULL,
  quote_number text NOT NULL,
  version integer DEFAULT 1,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  client_name text,
  client_email text,
  client_address text,
  job_site_address text,
  scope_description text,
  labor_margin_default decimal,
  material_margin_default decimal,
  subtotal decimal DEFAULT 0,
  tax_rate decimal,
  total decimal DEFAULT 0,
  expires_at date,
  payment_terms text,
  ai_model_used text,
  total_tokens_used integer DEFAULT 0,
  estimated_api_cost decimal DEFAULT 0,
  review_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- QUOTE LINE ITEMS TABLE
-- ============================================
CREATE TABLE quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes ON DELETE CASCADE NOT NULL,
  sort_order integer NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('labor', 'material')),
  description text NOT NULL,
  quantity decimal NOT NULL,
  unit text,
  unit_cost decimal NOT NULL,
  margin_percent decimal NOT NULL,
  billable_price decimal NOT NULL,
  price_source text CHECK (price_source IN ('contractor_list', 'historical', 'ai_estimate')),
  confidence_flag text CHECK (confidence_flag IN ('low', 'medium', 'high')),
  ai_original_description text,
  ai_original_quantity decimal,
  ai_original_unit_cost decimal,
  was_edited boolean DEFAULT false,
  was_added_manually boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  tokens_used integer,
  model_used text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PRODUCT CATALOG TABLE
-- ============================================
CREATE TABLE product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies NOT NULL,
  original_name text NOT NULL,
  normalized_category text,
  normalized_attributes jsonb,
  canonical_name text,
  sku text,
  unit_price decimal NOT NULL,
  unit text,
  confidence_score decimal,
  manually_verified boolean DEFAULT false,
  source_file text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- API USAGE LOG TABLE
-- ============================================
CREATE TABLE api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies NOT NULL,
  quote_id uuid REFERENCES quotes,
  user_id uuid REFERENCES users NOT NULL,
  endpoint_type text NOT NULL,
  model_used text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  estimated_cost_usd decimal NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================

-- Helper function: get the current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "Admins can update their own company"
  ON companies FOR UPDATE
  USING (id = get_user_company_id());

-- Allow authenticated users to create a company (needed during signup)
CREATE POLICY "Authenticated users can create a company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Allow new users to insert their own profile row (needed during signup)
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- QUOTES
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes in their company"
  ON quotes FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create quotes in their company"
  ON quotes FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update quotes in their company"
  ON quotes FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete quotes in their company"
  ON quotes FOR DELETE
  USING (company_id = get_user_company_id());

-- QUOTE LINE ITEMS
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view line items for their company quotes"
  ON quote_line_items FOR SELECT
  USING (quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can create line items for their company quotes"
  ON quote_line_items FOR INSERT
  WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can update line items for their company quotes"
  ON quote_line_items FOR UPDATE
  USING (quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can delete line items for their company quotes"
  ON quote_line_items FOR DELETE
  USING (quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id()));

-- CHAT MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat messages for their company quotes"
  ON chat_messages FOR SELECT
  USING (quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can create chat messages for their company quotes"
  ON chat_messages FOR INSERT
  WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE company_id = get_user_company_id()));

-- PRODUCT CATALOG
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company catalog"
  ON product_catalog FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage their company catalog"
  ON product_catalog FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update their company catalog"
  ON product_catalog FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete from their company catalog"
  ON product_catalog FOR DELETE
  USING (company_id = get_user_company_id());

-- API USAGE LOG
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company API usage"
  ON api_usage_log FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can log API usage for their company"
  ON api_usage_log FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

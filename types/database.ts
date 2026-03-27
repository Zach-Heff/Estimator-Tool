export interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  license_number: string | null;
  logo_url: string | null;
  zip_code: string | null;
  default_labor_margin: number;
  default_material_margin: number;
  default_payment_terms: string;
  default_quote_validity_days: number;
  subscription_tier: string | null;
  quote_count_this_period: number;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: "admin" | "estimator";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Quote {
  id: string;
  company_id: string;
  created_by: string;
  quote_number: string;
  version: number;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  client_name: string | null;
  client_email: string | null;
  client_address: string | null;
  job_site_address: string | null;
  scope_description: string | null;
  labor_margin_default: number | null;
  material_margin_default: number | null;
  subtotal: number;
  tax_rate: number | null;
  total: number;
  expires_at: string | null;
  payment_terms: string | null;
  ai_model_used: string | null;
  total_tokens_used: number;
  estimated_api_cost: number;
  review_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  sort_order: number;
  item_type: "labor" | "material";
  description: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  margin_percent: number;
  billable_price: number;
  price_source: "contractor_list" | "historical" | "ai_estimate" | null;
  confidence_flag: "low" | "medium" | "high" | null;
  ai_original_description: string | null;
  ai_original_quantity: number | null;
  ai_original_unit_cost: number | null;
  was_edited: boolean;
  was_added_manually: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  quote_id: string;
  role: "user" | "assistant";
  content: string;
  tokens_used: number | null;
  model_used: string | null;
  created_at: string;
}

export interface ProductCatalogItem {
  id: string;
  company_id: string;
  original_name: string;
  normalized_category: string | null;
  normalized_attributes: Record<string, unknown> | null;
  canonical_name: string | null;
  sku: string | null;
  unit_price: number;
  unit: string | null;
  confidence_score: number | null;
  manually_verified: boolean;
  source_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiUsageLog {
  id: string;
  company_id: string;
  quote_id: string | null;
  user_id: string;
  endpoint_type: string;
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

// Supabase Database type (used with the Supabase client for type safety)
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Company, "id">>;
      };
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "last_login_at"> & { created_at?: string; last_login_at?: string };
        Update: Partial<Omit<User, "id">>;
      };
      quotes: {
        Row: Quote;
        Insert: Omit<Quote, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Quote, "id">>;
      };
      quote_line_items: {
        Row: QuoteLineItem;
        Insert: Omit<QuoteLineItem, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<QuoteLineItem, "id">>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ChatMessage, "id">>;
      };
      product_catalog: {
        Row: ProductCatalogItem;
        Insert: Omit<ProductCatalogItem, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<ProductCatalogItem, "id">>;
      };
      api_usage_log: {
        Row: ApiUsageLog;
        Insert: Omit<ApiUsageLog, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ApiUsageLog, "id">>;
      };
    };
  };
}

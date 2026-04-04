-- Add a category column to quote_line_items so line items can be grouped
-- (e.g., "Panel Upgrade", "Kitchen Rewire", "Labor & Misc").
-- The AI assigns a category during generation; the electrician can edit it.
ALTER TABLE quote_line_items
ADD COLUMN category TEXT DEFAULT 'General';

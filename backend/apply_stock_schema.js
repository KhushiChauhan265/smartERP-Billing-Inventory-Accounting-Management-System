require("dotenv").config();
const pool = require("./src/config/db");

const sql = `
-- Add new columns to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_name VARCHAR(50) DEFAULT 'PCS';
ALTER TABLE items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS opening_stock INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    voucher_type VARCHAR(50) NOT NULL,
    voucher_id UUID,
    qty_in INTEGER DEFAULT 0,
    qty_out INTEGER DEFAULT 0,
    rate DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);

-- Quantity update function
CREATE OR REPLACE FUNCTION update_item_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE items 
        SET quantity = quantity + NEW.qty_in - NEW.qty_out
        WHERE id = NEW.item_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE items 
        SET quantity = quantity - OLD.qty_in + OLD.qty_out + NEW.qty_in - NEW.qty_out
        WHERE id = NEW.item_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE items 
        SET quantity = quantity - OLD.qty_in + OLD.qty_out
        WHERE id = OLD.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stock_movements_qty_update') THEN
        CREATE TRIGGER trg_stock_movements_qty_update
        AFTER INSERT OR UPDATE OR DELETE ON stock_movements
        FOR EACH ROW EXECUTE FUNCTION update_item_quantity();
    END IF;
END $$;
`;

async function apply() {
    try {
        console.log("Applying stock schema updates...");
        await pool.query(sql);
        console.log("Stock schema updates applied successfully.");
    } catch (err) {
        console.error("Error applying stock schema updates:", err);
    } finally {
        pool.end();
    }
}

apply();

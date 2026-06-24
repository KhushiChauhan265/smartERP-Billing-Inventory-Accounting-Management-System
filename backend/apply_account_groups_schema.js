require("dotenv").config();
const pool = require("./src/config/db");

const sql = `
-- Drop the old unused groups table if it exists
DROP TABLE IF EXISTS groups CASCADE;

-- 13) account_groups
CREATE TABLE IF NOT EXISTS account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    parent_group_id UUID REFERENCES account_groups(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_account_groups_company_id ON account_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_account_groups_parent_id ON account_groups(parent_group_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_account_groups_modtime') THEN
        CREATE TRIGGER update_account_groups_modtime BEFORE UPDATE ON account_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add group_id to customers and suppliers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES account_groups(id) ON DELETE SET NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES account_groups(id) ON DELETE SET NULL;
`;

async function apply() {
    try {
        console.log("Applying account groups schema...");
        await pool.query(sql);
        console.log("Schema applied successfully.");
    } catch (err) {
        console.error("Error applying schema:", err);
    } finally {
        pool.end();
    }
}

apply();

require('dotenv').config({ path: './backend/.env' });
const pool = require("./backend/src/config/db");

const sql = `
CREATE TABLE IF NOT EXISTS ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    group_name VARCHAR(255),
    opening_balance DECIMAL(14, 2) DEFAULT 0,
    opening_balance_type VARCHAR(10) DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_ledgers_company_id ON ledgers(company_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ledgers_modtime') THEN
        CREATE TRIGGER update_ledgers_modtime BEFORE UPDATE ON ledgers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
`;

async function apply() {
    try {
        console.log("Applying schema...");
        await pool.query(sql);
        console.log("Schema applied successfully.");
    } catch (err) {
        console.error("Error applying schema:", err);
    } finally {
        pool.end();
    }
}

apply();

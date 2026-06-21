require("dotenv").config();
const pool = require("./src/config/db");

const sql = `
ALTER TABLE customers ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(14, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance_type VARCHAR(10) DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES ledgers(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customers_company_id_customer_name_key'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_company_id_customer_name_key UNIQUE (company_id, customer_name);
    END IF;
END $$;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gstin VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(14, 2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance_type VARCHAR(10) DEFAULT 'CREDIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT'));
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ledger_id UUID REFERENCES ledgers(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_company_id_supplier_name_key'
    ) THEN
        ALTER TABLE suppliers ADD CONSTRAINT suppliers_company_id_supplier_name_key UNIQUE (company_id, supplier_name);
    END IF;
END $$;
`;

async function apply() {
    try {
        console.log("Applying customer/supplier schema updates...");
        await pool.query(sql);
        console.log("Schema applied successfully.");
    } catch (err) {
        console.error("Error applying schema:", err);
    } finally {
        pool.end();
    }
}

apply();

require("dotenv").config();
const pool = require("./src/config/db");

const sql = `
-- Alter purchase_vouchers table to add discount_amount, remarks, and is_active columns
ALTER TABLE purchase_vouchers ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE purchase_vouchers ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE purchase_vouchers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
`;

async function apply() {
    try {
        console.log("Applying purchase vouchers schema updates...");
        await pool.query(sql);
        console.log("Purchase vouchers schema updates applied successfully.");
    } catch (err) {
        console.error("Error applying schema updates:", err);
    } finally {
        pool.end();
    }
}

apply();

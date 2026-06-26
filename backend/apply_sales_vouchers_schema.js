require("dotenv").config();
const pool = require("./src/config/db");

const sql = `
-- Alter sales_vouchers table to add discount_amount, remarks, is_active, and reference_no columns
ALTER TABLE sales_vouchers ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE sales_vouchers ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE sales_vouchers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE sales_vouchers ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100);
`;

async function apply() {
    try {
        console.log("Applying sales vouchers schema updates...");
        await pool.query(sql);
        console.log("Sales vouchers schema updates applied successfully.");
    } catch (err) {
        console.error("Error applying schema updates:", err);
    } finally {
        pool.end();
    }
}

apply();

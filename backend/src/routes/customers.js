const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

const checkCompanyAccess = async (req, res, next) => {
  const companyId = req.query.companyId || req.body.companyId;
  if (!companyId) return res.status(400).json({ message: "companyId is required" });

  try {
    const result = await pool.query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2 AND is_active = true",
      [companyId, req.user.userId]
    );

    if (result.rows.length === 0) return res.status(403).json({ message: "Access denied" });
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/customers
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await pool.query(
      `SELECT c.*, g.name as group_name 
       FROM customers c 
       LEFT JOIN account_groups g ON c.group_id = g.id 
       WHERE c.company_id = $1 
       ORDER BY c.customer_name ASC`,
      [companyId]
    );
    res.json({ customers: result.rows });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/customers/:id
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    const result = await pool.query(
      `SELECT c.*, g.name as group_name 
       FROM customers c 
       LEFT JOIN account_groups g ON c.group_id = g.id 
       WHERE c.id = $1 AND c.company_id = $2`,
      [id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/customers
router.post("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, name, code, contactPerson, mobileNumber, email, address, gstin, openingBalance, openingBalanceType, groupId } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    // 1. Create Ledger
    const ledgerResult = await pool.query(
      `INSERT INTO ledgers (company_id, name, code, type, group_name, opening_balance, opening_balance_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [companyId, name, code || null, 'ASSET', 'Sundry Debtors', openingBalance || 0, openingBalanceType || 'DEBIT']
    );
    const ledgerId = ledgerResult.rows[0].id;

    // 2. Create Customer
    const insertResult = await pool.query(
      `INSERT INTO customers 
        (company_id, customer_name, code, contact_person, mobile_number, email, address, gstin, opening_balance, opening_balance_type, ledger_id, group_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [companyId, name, code || null, contactPerson || null, mobileNumber || null, email || null, address || null, gstin || null, openingBalance || 0, openingBalanceType || 'DEBIT', ledgerId, groupId || null]
    );

    res.status(201).json({ customer: insertResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Customer with this name already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/customers/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, name, code, contactPerson, mobileNumber, email, address, gstin, openingBalance, openingBalanceType, isActive, groupId } = req.body;

    const check = await pool.query("SELECT ledger_id FROM customers WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });
    
    const ledgerId = check.rows[0].ledger_id;

    const updateResult = await pool.query(
      `UPDATE customers SET 
        customer_name = COALESCE($1, customer_name), code = $2, contact_person = $3, mobile_number = $4, email = $5, address = $6, gstin = $7, opening_balance = COALESCE($8, opening_balance), opening_balance_type = COALESCE($9, opening_balance_type), is_active = COALESCE($10, is_active), group_id = $11
       WHERE id = $12 AND company_id = $13 RETURNING *`,
      [name, code || null, contactPerson || null, mobileNumber || null, email || null, address || null, gstin || null, openingBalance, openingBalanceType, isActive, groupId || null, id, companyId]
    );

    if (ledgerId) {
      await pool.query(
        `UPDATE ledgers SET name = COALESCE($1, name), code = $2, opening_balance = COALESCE($3, opening_balance), opening_balance_type = COALESCE($4, opening_balance_type), is_active = COALESCE($5, is_active) WHERE id = $6`,
        [name, code || null, openingBalance, openingBalanceType, isActive, ledgerId]
      );
    }

    res.json({ customer: updateResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Customer with this name already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/customers/:id
router.delete("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const check = await pool.query("SELECT ledger_id FROM customers WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });

    const ledgerId = check.rows[0].ledger_id;

    await pool.query("UPDATE customers SET is_active = false WHERE id = $1", [id]);
    if (ledgerId) await pool.query("UPDATE ledgers SET is_active = false WHERE id = $1", [ledgerId]);

    res.json({ message: "Customer deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

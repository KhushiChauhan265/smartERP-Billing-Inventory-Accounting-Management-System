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

// GET /api/suppliers
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await pool.query(
      "SELECT * FROM suppliers WHERE company_id = $1 ORDER BY supplier_name ASC",
      [companyId]
    );
    res.json({ suppliers: result.rows });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/suppliers/:id
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    const result = await pool.query("SELECT * FROM suppliers WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ supplier: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/suppliers
router.post("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, name, code, contactPerson, mobileNumber, email, address, gstin, openingBalance, openingBalanceType } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    // 1. Create Ledger
    const ledgerResult = await pool.query(
      `INSERT INTO ledgers (company_id, name, code, type, group_name, opening_balance, opening_balance_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [companyId, name, code || null, 'LIABILITY', 'Sundry Creditors', openingBalance || 0, openingBalanceType || 'CREDIT']
    );
    const ledgerId = ledgerResult.rows[0].id;

    // 2. Create Supplier
    const insertResult = await pool.query(
      `INSERT INTO suppliers 
        (company_id, supplier_name, code, contact_person, mobile_number, email, address, gstin, opening_balance, opening_balance_type, ledger_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [companyId, name, code || null, contactPerson || null, mobileNumber || null, email || null, address || null, gstin || null, openingBalance || 0, openingBalanceType || 'CREDIT', ledgerId]
    );

    res.status(201).json({ supplier: insertResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Supplier with this name already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, name, code, contactPerson, mobileNumber, email, address, gstin, openingBalance, openingBalanceType, isActive } = req.body;

    const check = await pool.query("SELECT ledger_id FROM suppliers WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });
    
    const ledgerId = check.rows[0].ledger_id;

    const updateResult = await pool.query(
      `UPDATE suppliers SET 
        supplier_name = COALESCE($1, supplier_name), code = $2, contact_person = $3, mobile_number = $4, email = $5, address = $6, gstin = $7, opening_balance = COALESCE($8, opening_balance), opening_balance_type = COALESCE($9, opening_balance_type), is_active = COALESCE($10, is_active)
       WHERE id = $11 AND company_id = $12 RETURNING *`,
      [name, code || null, contactPerson || null, mobileNumber || null, email || null, address || null, gstin || null, openingBalance, openingBalanceType, isActive, id, companyId]
    );

    if (ledgerId) {
      await pool.query(
        `UPDATE ledgers SET name = COALESCE($1, name), code = $2, opening_balance = COALESCE($3, opening_balance), opening_balance_type = COALESCE($4, opening_balance_type), is_active = COALESCE($5, is_active) WHERE id = $6`,
        [name, code || null, openingBalance, openingBalanceType, isActive, ledgerId]
      );
    }

    res.json({ supplier: updateResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Supplier with this name already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const check = await pool.query("SELECT ledger_id FROM suppliers WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });

    const ledgerId = check.rows[0].ledger_id;

    await pool.query("UPDATE suppliers SET is_active = false WHERE id = $1", [id]);
    if (ledgerId) await pool.query("UPDATE ledgers SET is_active = false WHERE id = $1", [ledgerId]);

    res.json({ message: "Supplier deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

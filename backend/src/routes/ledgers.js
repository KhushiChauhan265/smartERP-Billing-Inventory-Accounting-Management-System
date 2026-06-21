const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// Middleware to check if user has access to the company
const checkCompanyAccess = async (req, res, next) => {
  const companyId = req.query.companyId || req.body.companyId;
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const result = await pool.query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2 AND is_active = true",
      [companyId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: "Access denied or company not found" });
    }
    next();
  } catch (error) {
    console.error("Error checking company access:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/ledgers?companyId=...
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, type, isActive } = req.query;
    let query = "SELECT * FROM ledgers WHERE company_id = $1";
    const params = [companyId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    query += " ORDER BY name ASC";

    const result = await pool.query(query, params);
    res.json({ ledgers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/ledgers/:id?companyId=...
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const result = await pool.query(
      "SELECT * FROM ledgers WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ledger not found" });
    }

    res.json({ ledger: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/ledgers
router.post("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, name, code, type, groupName, openingBalance, openingBalanceType } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid ledger type" });
    }

    if (openingBalanceType && !['DEBIT', 'CREDIT'].includes(openingBalanceType)) {
      return res.status(400).json({ message: "openingBalanceType must be DEBIT or CREDIT" });
    }

    const insertResult = await pool.query(
      `INSERT INTO ledgers 
        (company_id, name, code, type, group_name, opening_balance, opening_balance_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [companyId, name, code || null, type, groupName || null, openingBalance || 0, openingBalanceType || 'DEBIT']
    );

    res.status(201).json({ ledger: insertResult.rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ message: "A ledger with this name or code already exists in this company" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/ledgers/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, name, code, type, groupName, openingBalance, openingBalanceType, isActive } = req.body;

    const checkResult = await pool.query(
      "SELECT id FROM ledgers WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Ledger not found" });
    }

    const updateResult = await pool.query(
      `UPDATE ledgers SET 
        name = COALESCE($1, name), 
        code = $2, 
        type = COALESCE($3, type), 
        group_name = $4, 
        opening_balance = COALESCE($5, opening_balance), 
        opening_balance_type = COALESCE($6, opening_balance_type),
        is_active = COALESCE($7, is_active)
       WHERE id = $8 AND company_id = $9 RETURNING *`,
      [name, code !== undefined ? code : null, type, groupName !== undefined ? groupName : null, openingBalance, openingBalanceType, isActive, id, companyId]
    );

    res.json({ ledger: updateResult.rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ message: "A ledger with this name or code already exists in this company" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/ledgers/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "companyId query parameter is required" });
    }

    const companyCheck = await pool.query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
      [companyId, req.user.userId]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const checkResult = await pool.query(
      "SELECT id FROM ledgers WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Ledger not found" });
    }

    await pool.query(
      "UPDATE ledgers SET is_active = false WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );

    res.json({ message: "Ledger deactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

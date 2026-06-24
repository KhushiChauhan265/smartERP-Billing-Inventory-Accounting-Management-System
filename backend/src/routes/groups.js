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

// GET /api/groups
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, type, isActive } = req.query;
    let query = "SELECT * FROM account_groups WHERE company_id = $1";
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

    query += " ORDER BY is_primary DESC, name ASC";

    const result = await pool.query(query, params);
    res.json({ groups: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/groups/:id
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    const result = await pool.query("SELECT * FROM account_groups WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ group: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/groups
router.post("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, name, code, type, parentGroupId, isPrimary } = req.body;
    if (!name || !type) return res.status(400).json({ message: "Name and type are required" });

    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    if (!validTypes.includes(type)) return res.status(400).json({ message: "Invalid group type" });

    const insertResult = await pool.query(
      `INSERT INTO account_groups 
        (company_id, name, code, type, parent_group_id, is_primary) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [companyId, name, code || null, type, parentGroupId || null, isPrimary || false]
    );

    res.status(201).json({ group: insertResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Group with this name already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/groups/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, name, code, type, parentGroupId, isPrimary, isActive } = req.body;

    const check = await pool.query("SELECT id FROM account_groups WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });
    
    // Prevent setting self as parent
    if (parentGroupId === id) return res.status(400).json({ message: "A group cannot be its own parent" });

    const updateResult = await pool.query(
      `UPDATE account_groups SET 
        name = COALESCE($1, name), code = $2, type = COALESCE($3, type), 
        parent_group_id = $4, is_primary = COALESCE($5, is_primary), is_active = COALESCE($6, is_active)
       WHERE id = $7 AND company_id = $8 RETURNING *`,
      [name, code !== undefined ? code : null, type, parentGroupId !== undefined ? parentGroupId : null, isPrimary, isActive, id, companyId]
    );

    res.json({ group: updateResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Group with this name already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/groups/:id
router.delete("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const check = await pool.query("SELECT id FROM account_groups WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });

    await pool.query("UPDATE account_groups SET is_active = false WHERE id = $1", [id]);

    res.json({ message: "Group deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

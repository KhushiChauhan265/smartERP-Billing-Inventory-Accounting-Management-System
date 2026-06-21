const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// GET /api/companies
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM companies WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC",
      [req.user.userId]
    );
    res.json({ companies: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/companies
router.post("/", async (req, res) => {
  try {
    const { company_name, address, gst_number, state, financial_year_start, financial_year_end, contact_number } = req.body;
    
    if (!company_name) {
      return res.status(400).json({ message: "Company name is required" });
    }



    const insertResult = await pool.query(
      `INSERT INTO companies 
        (user_id, company_name, address, gst_number, state, financial_year_start, financial_year_end, contact_number) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [req.user.userId, company_name, address, gst_number, state, financial_year_start, financial_year_end, contact_number]
    );

    res.status(201).json({ company: insertResult.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/companies/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, address, gst_number, state, financial_year_start, financial_year_end, contact_number } = req.body;

    const checkResult = await pool.query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2 AND is_active = true",
      [id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Active company not found or unauthorized" });
    }

    const updateResult = await pool.query(
      `UPDATE companies SET 
        company_name = COALESCE($1, company_name), 
        address = COALESCE($2, address), 
        gst_number = COALESCE($3, gst_number), 
        state = COALESCE($4, state), 
        financial_year_start = COALESCE($5, financial_year_start), 
        financial_year_end = COALESCE($6, financial_year_end), 
        contact_number = COALESCE($7, contact_number) 
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [company_name, address, gst_number, state, financial_year_start, financial_year_end, contact_number, id, req.user.userId]
    );

    res.json({ company: updateResult.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/companies/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2 AND is_active = true",
      [id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Active company not found or unauthorized" });
    }

    await pool.query(
      "UPDATE companies SET is_active = false WHERE id = $1 AND user_id = $2",
      [id, req.user.userId]
    );

    res.json({ message: "Company deactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

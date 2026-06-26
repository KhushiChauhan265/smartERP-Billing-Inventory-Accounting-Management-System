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

// GET /api/purchase-vouchers
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, supplierId, startDate, endDate } = req.query;
    let query = `
      SELECT pv.*, s.supplier_name 
      FROM purchase_vouchers pv
      JOIN suppliers s ON pv.supplier_id = s.id
      WHERE pv.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;

    if (supplierId) {
      query += ` AND pv.supplier_id = $${paramIndex}`;
      params.push(supplierId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND pv.purchase_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND pv.purchase_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += " ORDER BY pv.purchase_date DESC, pv.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ vouchers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/purchase-vouchers/:id
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const voucherResult = await pool.query(
      `SELECT pv.*, s.supplier_name 
       FROM purchase_vouchers pv
       JOIN suppliers s ON pv.supplier_id = s.id
       WHERE pv.id = $1 AND pv.company_id = $2`,
      [id, companyId]
    );

    if (voucherResult.rows.length === 0) return res.status(404).json({ message: "Voucher not found" });

    const itemsResult = await pool.query(
      `SELECT pvi.*, i.item_name, i.sku
       FROM purchase_voucher_items pvi
       JOIN items i ON pvi.item_id = i.id
       WHERE pvi.purchase_voucher_id = $1`,
      [id]
    );

    res.json({
      voucher: voucherResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/purchase-vouchers
router.post("/", checkCompanyAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      companyId,
      supplierId,
      voucherDate,
      voucherNumber,
      discountAmount,
      remarks,
      items
    } = req.body;

    if (!supplierId || !voucherDate || !voucherNumber || !items || items.length === 0) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Verify supplier belongs to same company
    const supplierCheck = await client.query(
      "SELECT id FROM suppliers WHERE id = $1 AND company_id = $2 AND is_active = true",
      [supplierId, companyId]
    );
    if (supplierCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid supplier" });
    }

    // Calculate totals
    let totalAmount = 0; // gross subtotal (without GST)
    let totalGstAmount = 0;
    const discountVal = parseFloat(discountAmount) || 0;

    const calculatedItems = items.map(item => {
      const qty = parseInt(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;

      const amount = qty * rate;
      const gstAmount = amount * (gstRate / 100);

      totalAmount += amount;
      totalGstAmount += gstAmount;

      return {
        itemId: item.itemId,
        quantity: qty,
        rate: rate,
        amount: amount,
        gstPercentage: gstRate,
        gstAmount: gstAmount
      };
    });

    const grossTotal = totalAmount + totalGstAmount - discountVal;

    await client.query("BEGIN");

    // Insert Voucher Header
    const insertVoucherResult = await client.query(
      `INSERT INTO purchase_vouchers 
        (company_id, voucher_number, purchase_date, supplier_id, total_amount, gst_amount, discount_amount, gross_total, remarks, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
      [
        companyId,
        voucherNumber,
        voucherDate,
        supplierId,
        totalAmount,
        totalGstAmount,
        discountVal,
        grossTotal,
        remarks || null
      ]
    );
    const voucherId = insertVoucherResult.rows[0].id;

    // Insert Voucher Items & Stock Movements
    for (const item of calculatedItems) {
      await client.query(
        `INSERT INTO purchase_voucher_items 
          (purchase_voucher_id, item_id, quantity, rate, amount, gst_percentage, gst_amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          voucherId,
          item.itemId,
          item.quantity,
          item.rate,
          item.amount,
          item.gstPercentage,
          item.gstAmount
        ]
      );

      // Insert Stock Movement
      await client.query(
        `INSERT INTO stock_movements 
          (company_id, item_id, voucher_type, voucher_id, qty_in, qty_out, rate) 
         VALUES ($1, $2, 'PURCHASE', $3, $4, 0, $5)`,
        [
          companyId,
          item.itemId,
          voucherId,
          item.quantity,
          item.rate
        ]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ voucher: insertVoucherResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// PUT /api/purchase-vouchers/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      companyId,
      supplierId,
      voucherDate,
      voucherNumber,
      discountAmount,
      remarks,
      items
    } = req.body;

    const voucherCheck = await client.query(
      "SELECT id FROM purchase_vouchers WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );
    if (voucherCheck.rows.length === 0) return res.status(404).json({ message: "Voucher not found" });

    if (!supplierId || !voucherDate || !voucherNumber || !items || items.length === 0) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Verify supplier belongs to same company
    const supplierCheck = await client.query(
      "SELECT id FROM suppliers WHERE id = $1 AND company_id = $2 AND is_active = true",
      [supplierId, companyId]
    );
    if (supplierCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid supplier" });
    }

    // Calculate totals
    let totalAmount = 0; // gross subtotal
    let totalGstAmount = 0;
    const discountVal = parseFloat(discountAmount) || 0;

    const calculatedItems = items.map(item => {
      const qty = parseInt(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;

      const amount = qty * rate;
      const gstAmount = amount * (gstRate / 100);

      totalAmount += amount;
      totalGstAmount += gstAmount;

      return {
        itemId: item.itemId,
        quantity: qty,
        rate: rate,
        amount: amount,
        gstPercentage: gstRate,
        gstAmount: gstAmount
      };
    });

    const grossTotal = totalAmount + totalGstAmount - discountVal;

    await client.query("BEGIN");

    // Update Voucher Header
    const updateVoucherResult = await client.query(
      `UPDATE purchase_vouchers SET 
        voucher_number = $1, 
        purchase_date = $2, 
        supplier_id = $3, 
        total_amount = $4, 
        gst_amount = $5, 
        discount_amount = $6, 
        gross_total = $7, 
        remarks = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND company_id = $10 RETURNING *`,
      [
        voucherNumber,
        voucherDate,
        supplierId,
        totalAmount,
        totalGstAmount,
        discountVal,
        grossTotal,
        remarks || null,
        id,
        companyId
      ]
    );

    // Delete existing voucher items and their stock movements
    await client.query("DELETE FROM purchase_voucher_items WHERE purchase_voucher_id = $1", [id]);
    await client.query("DELETE FROM stock_movements WHERE voucher_id = $1 AND voucher_type = 'PURCHASE'", [id]);

    // Insert new Voucher Items & Stock Movements
    for (const item of calculatedItems) {
      await client.query(
        `INSERT INTO purchase_voucher_items 
          (purchase_voucher_id, item_id, quantity, rate, amount, gst_percentage, gst_amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          item.itemId,
          item.quantity,
          item.rate,
          item.amount,
          item.gstPercentage,
          item.gstAmount
        ]
      );

      // Insert Stock Movement
      await client.query(
        `INSERT INTO stock_movements 
          (company_id, item_id, voucher_type, voucher_id, qty_in, qty_out, rate) 
         VALUES ($1, $2, 'PURCHASE', $3, $4, 0, $5)`,
        [
          companyId,
          item.itemId,
          id,
          item.quantity,
          item.rate
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ voucher: updateVoucherResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/purchase-vouchers/:id
router.delete("/:id", checkCompanyAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const check = await client.query(
      "SELECT id FROM purchase_vouchers WHERE id = $1 AND company_id = $2 AND is_active = true",
      [id, companyId]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: "Voucher not found" });

    await client.query("BEGIN");

    // Soft delete voucher
    await client.query(
      "UPDATE purchase_vouchers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Delete associated stock movements so quantities are automatically adjusted backwards by trigger
    await client.query(
      "DELETE FROM stock_movements WHERE voucher_id = $1 AND voucher_type = 'PURCHASE'",
      [id]
    );

    await client.query("COMMIT");
    res.json({ message: "Voucher cancelled successfully and stock adjusted" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;

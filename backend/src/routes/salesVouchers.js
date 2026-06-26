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

// GET /api/sales-vouchers
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, customerId, startDate, endDate } = req.query;
    let query = `
      SELECT sv.*, c.customer_name 
      FROM sales_vouchers sv
      JOIN customers c ON sv.customer_id = c.id
      WHERE sv.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;

    if (customerId) {
      query += ` AND sv.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND sv.invoice_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND sv.invoice_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += " ORDER BY sv.invoice_date DESC, sv.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ vouchers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/sales-vouchers/:id
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const voucherResult = await pool.query(
      `SELECT sv.*, c.customer_name 
       FROM sales_vouchers sv
       JOIN customers c ON sv.customer_id = c.id
       WHERE sv.id = $1 AND sv.company_id = $2`,
      [id, companyId]
    );

    if (voucherResult.rows.length === 0) return res.status(404).json({ message: "Voucher not found" });

    const itemsResult = await pool.query(
      `SELECT svi.*, i.item_name, i.sku
       FROM sales_voucher_items svi
       JOIN items i ON svi.item_id = i.id
       WHERE svi.sales_voucher_id = $1`,
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

// POST /api/sales-vouchers
router.post("/", checkCompanyAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      companyId,
      customerId,
      voucherDate,     // mapped to invoice_date
      voucherNumber,   // mapped to invoice_number
      referenceNo,     // mapped to reference_no
      discountAmount,
      remarks,
      items
    } = req.body;

    if (!customerId || !voucherDate || !voucherNumber || !items || items.length === 0) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Verify customer belongs to same company
    const customerCheck = await client.query(
      "SELECT id FROM customers WHERE id = $1 AND company_id = $2 AND is_active = true",
      [customerId, companyId]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid customer" });
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
      `INSERT INTO sales_vouchers 
        (company_id, invoice_number, invoice_date, customer_id, total_amount, gst_amount, discount_amount, gross_total, remarks, reference_no, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING *`,
      [
        companyId,
        voucherNumber,
        voucherDate,
        customerId,
        totalAmount,
        totalGstAmount,
        discountVal,
        grossTotal,
        remarks || null,
        referenceNo || null
      ]
    );
    const voucherId = insertVoucherResult.rows[0].id;

    // Insert Voucher Items & Stock Movements
    for (const item of calculatedItems) {
      await client.query(
        `INSERT INTO sales_voucher_items 
          (sales_voucher_id, item_id, quantity, rate, amount, gst_percentage, gst_amount) 
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

      // Insert Stock Movement (Outward for sales: qty_in = 0, qty_out = quantity)
      await client.query(
        `INSERT INTO stock_movements 
          (company_id, item_id, voucher_type, voucher_id, qty_in, qty_out, rate) 
         VALUES ($1, $2, 'SALES', $3, 0, $4, $5)`,
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

// PUT /api/sales-vouchers/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      companyId,
      customerId,
      voucherDate,
      voucherNumber,
      referenceNo,
      discountAmount,
      remarks,
      items
    } = req.body;

    const voucherCheck = await client.query(
      "SELECT id FROM sales_vouchers WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );
    if (voucherCheck.rows.length === 0) return res.status(404).json({ message: "Voucher not found" });

    if (!customerId || !voucherDate || !voucherNumber || !items || items.length === 0) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Verify customer belongs to same company
    const customerCheck = await client.query(
      "SELECT id FROM customers WHERE id = $1 AND company_id = $2 AND is_active = true",
      [customerId, companyId]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid customer" });
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
      `UPDATE sales_vouchers SET 
        invoice_number = $1, 
        invoice_date = $2, 
        customer_id = $3, 
        total_amount = $4, 
        gst_amount = $5, 
        discount_amount = $6, 
        gross_total = $7, 
        remarks = $8,
        reference_no = $9,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND company_id = $11 RETURNING *`,
      [
        voucherNumber,
        voucherDate,
        customerId,
        totalAmount,
        totalGstAmount,
        discountVal,
        grossTotal,
        remarks || null,
        referenceNo || null,
        id,
        companyId
      ]
    );

    // Delete existing voucher items and their stock movements
    await client.query("DELETE FROM sales_voucher_items WHERE sales_voucher_id = $1", [id]);
    await client.query("DELETE FROM stock_movements WHERE voucher_id = $1 AND voucher_type = 'SALES'", [id]);

    // Insert new Voucher Items & Stock Movements
    for (const item of calculatedItems) {
      await client.query(
        `INSERT INTO sales_voucher_items 
          (sales_voucher_id, item_id, quantity, rate, amount, gst_percentage, gst_amount) 
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
         VALUES ($1, $2, 'SALES', $3, 0, $4, $5)`,
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

// DELETE /api/sales-vouchers/:id
router.delete("/:id", checkCompanyAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const check = await client.query(
      "SELECT id FROM sales_vouchers WHERE id = $1 AND company_id = $2 AND is_active = true",
      [id, companyId]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: "Voucher not found" });

    await client.query("BEGIN");

    // Soft delete voucher
    await client.query(
      "UPDATE sales_vouchers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Delete associated stock movements so quantities are automatically adjusted backwards by trigger
    await client.query(
      "DELETE FROM stock_movements WHERE voucher_id = $1 AND voucher_type = 'SALES'",
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

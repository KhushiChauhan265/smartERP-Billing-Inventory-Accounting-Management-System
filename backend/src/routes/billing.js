const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/auth");
const { generateInvoicePDF } = require("../services/pdfInvoiceService");

const router = express.Router();

router.use(authMiddleware);

// Middleware for company access scoping
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

// GET /api/billing/sales
router.get("/sales", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, customerId, fromDate, toDate, status } = req.query;
    
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

    if (fromDate) {
      query += ` AND sv.invoice_date >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      query += ` AND sv.invoice_date <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }

    if (status) {
      if (status.toUpperCase() === "ACTIVE") {
        query += ` AND sv.is_active = true`;
      } else if (status.toUpperCase() === "CANCELLED") {
        query += ` AND sv.is_active = false`;
      }
    }

    query += " ORDER BY sv.invoice_date DESC, sv.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ vouchers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/billing/purchase
router.get("/purchase", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, supplierId, fromDate, toDate, status } = req.query;

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

    if (fromDate) {
      query += ` AND pv.purchase_date >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      query += ` AND pv.purchase_date <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }

    if (status) {
      if (status.toUpperCase() === "ACTIVE") {
        query += ` AND pv.is_active = true`;
      } else if (status.toUpperCase() === "CANCELLED") {
        query += ` AND pv.is_active = false`;
      }
    }

    query += " ORDER BY pv.purchase_date DESC, pv.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ vouchers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/billing/sales/:id
router.get("/sales/:id", checkCompanyAccess, async (req, res) => {
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

    if (voucherResult.rows.length === 0) return res.status(404).json({ message: "Sales Invoice not found" });

    const itemsResult = await pool.query(
      `SELECT svi.*, i.item_name, i.sku, i.hsn_sac
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

// GET /api/billing/purchase/:id
router.get("/purchase/:id", checkCompanyAccess, async (req, res) => {
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

    if (voucherResult.rows.length === 0) return res.status(404).json({ message: "Purchase Bill not found" });

    const itemsResult = await pool.query(
      `SELECT pvi.*, i.item_name, i.sku, i.hsn_sac
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

// GET /api/billing/sales/:id/pdf
router.get("/sales/:id/pdf", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    // Fetch Voucher Header
    const voucherResult = await pool.query(
      `SELECT sv.*, c.customer_name 
       FROM sales_vouchers sv
       JOIN customers c ON sv.customer_id = c.id
       WHERE sv.id = $1 AND sv.company_id = $2`,
      [id, companyId]
    );
    if (voucherResult.rows.length === 0) return res.status(404).json({ message: "Sales Invoice not found" });
    const voucher = voucherResult.rows[0];

    // Fetch Company Info
    const companyResult = await pool.query(
      "SELECT * FROM companies WHERE id = $1",
      [companyId]
    );
    const company = companyResult.rows[0];

    // Fetch Customer Details
    const customerResult = await pool.query(
      "SELECT * FROM customers WHERE id = $1",
      [voucher.customer_id]
    );
    const customer = customerResult.rows[0];

    // Fetch Line Items
    const itemsResult = await pool.query(
      `SELECT svi.*, i.item_name, i.sku, i.hsn_sac
       FROM sales_voucher_items svi
       JOIN items i ON svi.item_id = i.id
       WHERE svi.sales_voucher_id = $1`,
      [id]
    );
    const items = itemsResult.rows;

    const pdfData = {
      title: "TAX INVOICE",
      company,
      party: {
        name: customer.customer_name,
        code: customer.code,
        address: customer.address,
        gstin: customer.gstin,
        mobile_number: customer.mobile_number
      },
      voucher,
      items
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-invoice-${voucher.invoice_number}.pdf"`
    );

    generateInvoicePDF(pdfData, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/billing/purchase/:id/pdf
router.get("/purchase/:id/pdf", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    // Fetch Voucher Header
    const voucherResult = await pool.query(
      `SELECT pv.*, s.supplier_name 
       FROM purchase_vouchers pv
       JOIN suppliers s ON pv.supplier_id = s.id
       WHERE pv.id = $1 AND pv.company_id = $2`,
      [id, companyId]
    );
    if (voucherResult.rows.length === 0) return res.status(404).json({ message: "Purchase Bill not found" });
    const voucher = voucherResult.rows[0];

    // Fetch Company Info
    const companyResult = await pool.query(
      "SELECT * FROM companies WHERE id = $1",
      [companyId]
    );
    const company = companyResult.rows[0];

    // Fetch Supplier Details
    const supplierResult = await pool.query(
      "SELECT * FROM suppliers WHERE id = $1",
      [voucher.supplier_id]
    );
    const supplier = supplierResult.rows[0];

    // Fetch Line Items
    const itemsResult = await pool.query(
      `SELECT pvi.*, i.item_name, i.sku, i.hsn_sac
       FROM purchase_voucher_items pvi
       JOIN items i ON pvi.item_id = i.id
       WHERE pvi.purchase_voucher_id = $1`,
      [id]
    );
    const items = itemsResult.rows;

    const pdfData = {
      title: "PURCHASE BILL",
      company,
      party: {
        name: supplier.supplier_name,
        code: supplier.code,
        address: supplier.address,
        gstin: supplier.gstin,
        mobile_number: supplier.mobile_number
      },
      voucher,
      items
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="purchase-bill-${voucher.voucher_number}.pdf"`
    );

    generateInvoicePDF(pdfData, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

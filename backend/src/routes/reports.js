const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// Indian State Codes dictionary for GST mapping
const GST_STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};

/**
 * Resolves State Name and 2-digit Code from GSTIN or Address.
 */
function resolveStateAndCode(obj, isCompany = false) {
  if (!obj) return { code: "", name: "" };
  
  const gstin = isCompany ? obj.gst_number : obj.gstin;
  if (gstin && gstin.trim().length >= 2) {
    const code = gstin.trim().substring(0, 2);
    if (/^\d{2}$/.test(code)) {
      const stateName = GST_STATE_CODES[code];
      if (stateName) {
        return { code, name: stateName };
      }
    }
  }
  
  if (obj.state) {
    const stateClean = obj.state.trim();
    if (/^\d{2}$/.test(stateClean) && GST_STATE_CODES[stateClean]) {
      return { code: stateClean, name: GST_STATE_CODES[stateClean] };
    }
    for (const [code, name] of Object.entries(GST_STATE_CODES)) {
      if (name.toLowerCase() === stateClean.toLowerCase()) {
        return { code, name };
      }
    }
    return { code: "", name: stateClean };
  }

  if (obj.address) {
    const addressUpper = obj.address.toUpperCase();
    for (const [code, name] of Object.entries(GST_STATE_CODES)) {
      if (addressUpper.includes(name.toUpperCase())) {
        return { code, name };
      }
    }
  }

  return { code: "", name: "" };
}

// Scoping helper
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

// 1. GET /api/reports/sales-summary
router.get("/sales-summary", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, fromDate, toDate, customerId } = req.query;

    const params = [companyId];
    let paramIndex = 2;
    let query = `
      SELECT 
        invoice_date::text as date,
        SUM(total_amount)::numeric as total_gross_amount,
        SUM(discount_amount)::numeric as total_discount,
        SUM(gst_amount)::numeric as total_tax_amount,
        SUM(gross_total)::numeric as net_sales_amount
      FROM sales_vouchers
      WHERE company_id = $1 AND is_active = true
    `;

    if (fromDate) {
      query += ` AND invoice_date >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      query += ` AND invoice_date <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }
    if (customerId) {
      query += ` AND customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    query += ` GROUP BY invoice_date ORDER BY invoice_date ASC`;

    const result = await pool.query(query, params);
    const rows = result.rows;

    let grand_gross = 0;
    let grand_discount = 0;
    let grand_tax = 0;
    let grand_net = 0;

    rows.forEach(r => {
      grand_gross += parseFloat(r.total_gross_amount || 0);
      grand_discount += parseFloat(r.total_discount || 0);
      grand_tax += parseFloat(r.total_tax_amount || 0);
      grand_net += parseFloat(r.net_sales_amount || 0);
    });

    res.json({
      rows,
      grand_totals: {
        total_gross_amount: grand_gross,
        total_discount: grand_discount,
        total_tax_amount: grand_tax,
        net_sales_amount: grand_net
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET /api/reports/purchase-summary
router.get("/purchase-summary", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, fromDate, toDate, supplierId } = req.query;

    const params = [companyId];
    let paramIndex = 2;
    let query = `
      SELECT 
        purchase_date::text as date,
        SUM(total_amount)::numeric as total_gross_amount,
        SUM(discount_amount)::numeric as total_discount,
        SUM(gst_amount)::numeric as total_tax_amount,
        SUM(gross_total)::numeric as net_purchase_amount
      FROM purchase_vouchers
      WHERE company_id = $1 AND is_active = true
    `;

    if (fromDate) {
      query += ` AND purchase_date >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      query += ` AND purchase_date <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }
    if (supplierId) {
      query += ` AND supplier_id = $${paramIndex}`;
      params.push(supplierId);
      paramIndex++;
    }

    query += ` GROUP BY purchase_date ORDER BY purchase_date ASC`;

    const result = await pool.query(query, params);
    const rows = result.rows;

    let grand_gross = 0;
    let grand_discount = 0;
    let grand_tax = 0;
    let grand_net = 0;

    rows.forEach(r => {
      grand_gross += parseFloat(r.total_gross_amount || 0);
      grand_discount += parseFloat(r.total_discount || 0);
      grand_tax += parseFloat(r.total_tax_amount || 0);
      grand_net += parseFloat(r.net_purchase_amount || 0);
    });

    res.json({
      rows,
      grand_totals: {
        total_gross_amount: grand_gross,
        total_discount: grand_discount,
        total_tax_amount: grand_tax,
        net_purchase_amount: grand_net
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. GET /api/reports/gst-summary
router.get("/gst-summary", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, fromDate, toDate } = req.query;

    const params = [companyId];
    let paramIndex = 2;
    let salesQuery = `
      SELECT 
        sv.total_amount::numeric as taxable_value, 
        sv.gst_amount::numeric as gst_amount, 
        c.gstin as customer_gstin,
        comp.gst_number as company_gstin,
        comp.state as company_state,
        c.address as customer_address
      FROM sales_vouchers sv
      JOIN customers c ON sv.customer_id = c.id
      JOIN companies comp ON sv.company_id = comp.id
      WHERE sv.company_id = $1 AND sv.is_active = true
    `;
    if (fromDate) {
      salesQuery += ` AND sv.invoice_date >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      salesQuery += ` AND sv.invoice_date <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }

    const salesResult = await pool.query(salesQuery, params);

    // Compute Sales GST splits
    let sales_taxable = 0;
    let sales_cgst = 0;
    let sales_sgst = 0;
    let sales_igst = 0;
    let sales_gst = 0;

    salesResult.rows.forEach(row => {
      const taxable = parseFloat(row.taxable_value || 0);
      const gst = parseFloat(row.gst_amount || 0);
      sales_taxable += taxable;
      sales_gst += gst;

      const comp = { gst_number: row.company_gstin, state: row.company_state };
      const cust = { gstin: row.customer_gstin, address: row.customer_address };
      const supplierState = resolveStateAndCode(comp, true);
      const recipientState = resolveStateAndCode(cust, false);
      const isInterState = supplierState.code && recipientState.code && supplierState.code !== recipientState.code;

      if (isInterState) {
        sales_igst += gst;
      } else {
        sales_cgst += gst / 2;
        sales_sgst += gst / 2;
      }
    });

    // Compute Purchase GST splits
    const pParams = [companyId];
    let pParamIndex = 2;
    let purchaseQuery = `
      SELECT 
        pv.total_amount::numeric as taxable_value, 
        pv.gst_amount::numeric as gst_amount, 
        s.gstin as supplier_gstin,
        comp.gst_number as company_gstin,
        comp.state as company_state,
        s.address as supplier_address
      FROM purchase_vouchers pv
      JOIN suppliers s ON pv.supplier_id = s.id
      JOIN companies comp ON pv.company_id = comp.id
      WHERE pv.company_id = $1 AND pv.is_active = true
    `;
    if (fromDate) {
      purchaseQuery += ` AND pv.purchase_date >= $${pParamIndex}`;
      pParams.push(fromDate);
      pParamIndex++;
    }
    if (toDate) {
      purchaseQuery += ` AND pv.purchase_date <= $${pParamIndex}`;
      pParams.push(toDate);
      pParamIndex++;
    }

    const purchaseResult = await pool.query(purchaseQuery, pParams);

    let purchase_taxable = 0;
    let purchase_cgst = 0;
    let purchase_sgst = 0;
    let purchase_igst = 0;
    let purchase_gst = 0;

    purchaseResult.rows.forEach(row => {
      const taxable = parseFloat(row.taxable_value || 0);
      const gst = parseFloat(row.gst_amount || 0);
      purchase_taxable += taxable;
      purchase_gst += gst;

      const comp = { gst_number: row.company_gstin, state: row.company_state };
      const supp = { gstin: row.supplier_gstin, address: row.supplier_address };
      const supplierState = resolveStateAndCode(supp, false);
      const recipientState = resolveStateAndCode(comp, true);
      const isInterState = supplierState.code && recipientState.code && supplierState.code !== recipientState.code;

      if (isInterState) {
        purchase_igst += gst;
      } else {
        purchase_cgst += gst / 2;
        purchase_sgst += gst / 2;
      }
    });

    res.json({
      total_cgst_amount: sales_cgst,
      total_sgst_amount: sales_sgst,
      total_igst_amount: sales_igst,
      total_tax_amount: sales_gst,
      total_taxable_value: sales_taxable,
      sales: {
        total_taxable_value: sales_taxable,
        total_cgst_amount: sales_cgst,
        total_sgst_amount: sales_sgst,
        total_igst_amount: sales_igst,
        total_tax_amount: sales_gst
      },
      purchase: {
        total_taxable_value: purchase_taxable,
        total_cgst_amount: purchase_cgst,
        total_sgst_amount: purchase_sgst,
        total_igst_amount: purchase_igst,
        total_tax_amount: purchase_gst
      },
      combined: {
        total_taxable_value: sales_taxable + purchase_taxable,
        total_cgst_amount: sales_cgst + purchase_cgst,
        total_sgst_amount: sales_sgst + purchase_sgst,
        total_igst_amount: sales_igst + purchase_igst,
        total_tax_amount: sales_gst + purchase_gst
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 4. GET /api/reports/stock-summary
router.get("/stock-summary", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, fromDate, toDate, groupId } = req.query;

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const resolvedFromDate = fromDate || thirtyDaysAgo;
    const resolvedToDate = toDate || today;

    const params = [companyId, resolvedFromDate, resolvedToDate];
    let query = `
      SELECT 
        i.id as item_id,
        i.item_name,
        i.sku,
        i.category,
        i.unit_name,
        (i.opening_stock + COALESCE((
          SELECT SUM(sm.qty_in - sm.qty_out)
          FROM stock_movements sm
          WHERE sm.item_id = i.id AND sm.voucher_type != 'OPENING' AND sm.created_at::date < $2
        ), 0))::integer as opening_qty,
        COALESCE((
          SELECT SUM(sm.qty_in)
          FROM stock_movements sm
          WHERE sm.item_id = i.id AND sm.voucher_type IN ('PURCHASE', 'ADJUSTMENT') AND sm.created_at::date >= $2 AND sm.created_at::date <= $3
        ), 0)::integer as qty_in,
        COALESCE((
          SELECT SUM(sm.qty_out)
          FROM stock_movements sm
          WHERE sm.item_id = i.id AND sm.voucher_type IN ('SALES', 'ADJUSTMENT') AND sm.created_at::date >= $2 AND sm.created_at::date <= $3
        ), 0)::integer as qty_out
      FROM items i
      WHERE i.company_id = $1 AND i.is_active = true
    `;

    if (groupId) {
      query += ` AND i.category = $4`;
      params.push(groupId);
    }

    query += ` ORDER BY i.item_name ASC`;

    const result = await pool.query(query, params);
    const rows = result.rows.map(row => {
      const closing = row.opening_qty + row.qty_in - row.qty_out;
      return {
        ...row,
        closing_qty: closing
      };
    });

    res.json({ rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

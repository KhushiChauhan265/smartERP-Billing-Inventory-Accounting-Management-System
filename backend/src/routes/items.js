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

// GET /api/items
router.get("/", checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, includeInactive } = req.query;
    let query = "SELECT * FROM items WHERE company_id = $1";
    const params = [companyId];

    if (includeInactive !== "true") {
      query += " AND is_active = true";
    }

    query += " ORDER BY item_name ASC";
    const result = await pool.query(query, params);
    res.json({ items: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/items/:id
router.get("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    const result = await pool.query(
      "SELECT * FROM items WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/items
router.post("/", checkCompanyAccess, async (req, res) => {
  try {
    const {
      companyId,
      name,
      sku,
      barcode,
      hsnSac,
      unitName,
      category,
      purchasePrice,
      sellingPrice,
      openingStock,
      reorderLevel,
      gstPercentage
    } = req.body;

    if (!name) return res.status(400).json({ message: "Item name is required" });

    const openStockVal = parseInt(openingStock) || 0;
    const reorderVal = parseInt(reorderLevel) || 0;
    const purPriceVal = parseFloat(purchasePrice) || 0;
    const selPriceVal = parseFloat(sellingPrice) || 0;
    const gstPctVal = parseFloat(gstPercentage) || 0;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertItemResult = await client.query(
        `INSERT INTO items 
          (company_id, item_name, sku, barcode, hsn_sac, unit_name, category, purchase_price, selling_price, opening_stock, quantity, reorder_level, gst_percentage) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12) RETURNING *`,
        [
          companyId,
          name,
          sku || null,
          barcode || null,
          hsnSac || null,
          unitName || "PCS",
          category || null,
          purPriceVal,
          selPriceVal,
          openStockVal,
          reorderVal,
          gstPctVal
        ]
      );

      const newItem = insertItemResult.rows[0];

      if (openStockVal > 0) {
        await client.query(
          `INSERT INTO stock_movements 
            (company_id, item_id, voucher_type, qty_in, qty_out, rate) 
           VALUES ($1, $2, 'OPENING', $3, 0, $4)`,
          [companyId, newItem.id, openStockVal, purPriceVal]
        );
      }

      await client.query("COMMIT");

      // Refetch the item to get the trigger-updated quantity
      const finalResult = await client.query("SELECT * FROM items WHERE id = $1", [newItem.id]);
      res.status(201).json({ item: finalResult.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ message: "SKU already exists for this company" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/items/:id
router.put("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      companyId,
      name,
      sku,
      barcode,
      hsnSac,
      unitName,
      category,
      purchasePrice,
      sellingPrice,
      openingStock,
      reorderLevel,
      gstPercentage,
      isActive
    } = req.body;

    const check = await pool.query("SELECT * FROM items WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });
    const existingItem = check.rows[0];

    const nameVal = name !== undefined ? name : existingItem.item_name;
    const skuVal = sku !== undefined ? (sku === "" ? null : sku) : existingItem.sku;
    const barcodeVal = barcode !== undefined ? (barcode === "" ? null : barcode) : existingItem.barcode;
    const hsnSacVal = hsnSac !== undefined ? (hsnSac === "" ? null : hsnSac) : existingItem.hsn_sac;
    const unitNameVal = unitName !== undefined ? unitName : existingItem.unit_name;
    const categoryVal = category !== undefined ? (category === "" ? null : category) : existingItem.category;
    const purPriceVal = purchasePrice !== undefined ? parseFloat(purchasePrice) : parseFloat(existingItem.purchase_price);
    const selPriceVal = sellingPrice !== undefined ? parseFloat(sellingPrice) : parseFloat(existingItem.selling_price);
    const openStockVal = openingStock !== undefined ? parseInt(openingStock) : parseInt(existingItem.opening_stock);
    const reorderVal = reorderLevel !== undefined ? parseInt(reorderLevel) : parseInt(existingItem.reorder_level);
    const gstPctVal = gstPercentage !== undefined ? parseFloat(gstPercentage) : parseFloat(existingItem.gst_percentage);
    const isActVal = isActive !== undefined ? isActive : existingItem.is_active;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const updateItemResult = await client.query(
        `UPDATE items SET 
          item_name = $1, 
          sku = $2, 
          barcode = $3, 
          hsn_sac = $4, 
          unit_name = $5, 
          category = $6, 
          purchase_price = $7, 
          selling_price = $8, 
          opening_stock = $9, 
          reorder_level = $10, 
          gst_percentage = $11,
          is_active = $12
         WHERE id = $13 AND company_id = $14 RETURNING *`,
        [
          nameVal,
          skuVal,
          barcodeVal,
          hsnSacVal,
          unitNameVal,
          categoryVal,
          purPriceVal,
          selPriceVal,
          openStockVal,
          reorderVal,
          gstPctVal,
          isActVal,
          id,
          companyId
        ]
      );

      // Handle opening stock updates in stock_movements
      const movementCheck = await client.query(
        "SELECT id FROM stock_movements WHERE item_id = $1 AND voucher_type = 'OPENING'",
        [id]
      );

      if (movementCheck.rows.length > 0) {
        const movementId = movementCheck.rows[0].id;
        if (openStockVal === 0) {
          // Delete opening stock movement
          await client.query("DELETE FROM stock_movements WHERE id = $1", [movementId]);
        } else {
          // Update opening stock movement
          await client.query(
            "UPDATE stock_movements SET qty_in = $1, rate = $2 WHERE id = $3",
            [openStockVal, purPriceVal, movementId]
          );
        }
      } else if (openStockVal > 0) {
        // Create new opening stock movement
        await client.query(
          `INSERT INTO stock_movements 
            (company_id, item_id, voucher_type, qty_in, qty_out, rate) 
           VALUES ($1, $2, 'OPENING', $3, 0, $4)`,
          [companyId, id, openStockVal, purPriceVal]
        );
      }

      await client.query("COMMIT");

      // Refetch item
      const finalResult = await client.query("SELECT * FROM items WHERE id = $1", [id]);
      res.json({ item: finalResult.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ message: "SKU already exists for this company" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/items/:id
router.delete("/:id", checkCompanyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const check = await pool.query("SELECT id FROM items WHERE id = $1 AND company_id = $2", [id, companyId]);
    if (check.rows.length === 0) return res.status(404).json({ message: "Not found" });

    // Soft delete
    await pool.query("UPDATE items SET is_active = false WHERE id = $1", [id]);

    res.json({ message: "Item deactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

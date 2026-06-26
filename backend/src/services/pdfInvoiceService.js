const PDFDocument = require("pdfkit");

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
 * @param {Object} obj - The party or company object.
 * @param {boolean} isCompany - Flag to check gst_number vs gstin.
 * @returns {Object} { code, name }
 */
function resolveStateAndCode(obj, isCompany = false) {
  if (!obj) return { code: "", name: "" };
  
  // Try from GSTIN/GST number first (first 2 digits)
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
  
  // Try from state field
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

  // Try from address field
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

/**
 * Generates an Invoice PDF and pipes it to the response stream.
 * @param {Object} data - Contains title, company, party, voucher, and items.
 * @param {Object} res - Express response stream.
 */
function generateInvoicePDF(data, res) {
  const { title, company, party, voucher, items } = data;

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Pipe the doc to the response stream
  doc.pipe(res);

  // Outline Box around the A4 page (50pt margin)
  doc.rect(40, 40, 515, 762).strokeColor("#cbd5e1").lineWidth(1).stroke();

  // Resolve State and Codes
  const supplierState = resolveStateAndCode(company, true);
  const recipientState = resolveStateAndCode(party, false);

  // 1. HEADER - Company Info
  doc.fillColor("#0f172a");
  doc.font("Helvetica-Bold").fontSize(18).text(company.company_name, 55, 55);
  doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
  
  let companyAddress = company.address || "";
  if (company.state) companyAddress += (companyAddress ? ", " : "") + company.state;
  doc.text(companyAddress, 55, 78, { width: 280 });
  
  let companyContactGst = "";
  if (company.contact_number) companyContactGst += `Contact: ${company.contact_number}`;
  if (company.gst_number) companyContactGst += (companyContactGst ? " | " : "") + `GSTIN: ${company.gst_number}`;
  if (supplierState.name) companyContactGst += (companyContactGst ? " | " : "") + `State: ${supplierState.name} (${supplierState.code || "N/A"})`;
  
  if (companyContactGst) {
    doc.text(companyContactGst, 55, 108, { width: 280 });
  }

  // 2. DOCUMENT TITLE
  doc.fillColor("#4f46e5");
  doc.font("Helvetica-Bold").fontSize(16).text(title, 350, 55, { width: 190, align: "right" });

  // 3. INVOICE METADATA (Voucher Number, Date, Ref No, Status)
  doc.fillColor("#0f172a");
  doc.font("Helvetica").fontSize(9);
  
  const metaYStart = 80;
  const isSales = title.includes("SALES") || title.includes("INVOICE");
  const numberLabel = isSales ? "Invoice No:" : "Bill No:";
  const dateLabel = isSales ? "Invoice Date:" : "Bill Date:";

  doc.font("Helvetica-Bold").text(numberLabel, 350, metaYStart, { width: 90, align: "right" });
  doc.font("Helvetica").text(voucher.invoice_number || voucher.voucher_number || "", 450, metaYStart, { width: 90, align: "left" });

  const dateFormatted = new Date(voucher.invoice_date || voucher.purchase_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  doc.font("Helvetica-Bold").text(dateLabel, 350, metaYStart + 14, { width: 90, align: "right" });
  doc.font("Helvetica").text(dateFormatted, 450, metaYStart + 14, { width: 90, align: "left" });

  if (voucher.reference_no) {
    doc.font("Helvetica-Bold").text("Ref/PO No:", 350, metaYStart + 28, { width: 90, align: "right" });
    doc.font("Helvetica").text(voucher.reference_no, 450, metaYStart + 28, { width: 90, align: "left" });
  }

  // Cancelled Status Watermark in red
  if (!voucher.is_active) {
    doc.fillColor("#ef4444");
    doc.font("Helvetica-Bold").fontSize(12).text("CANCELLED", 350, metaYStart + 42, { width: 190, align: "right" });
  }

  // Divider Line
  doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 135).lineTo(545, 135).stroke();

  // 4. PARTY SECTION (Bill To or Supplier)
  const partyY = 145;
  doc.fillColor("#0f172a");
  doc.font("Helvetica-Bold").fontSize(9.5).text(isSales ? "BILL TO:" : "SUPPLIER:", 55, partyY);
  
  doc.font("Helvetica-Bold").fontSize(10.5).text(party.name, 55, partyY + 15);
  doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
  
  let currentPartyY = partyY + 28;
  if (party.address) {
    doc.text(party.address, 55, currentPartyY, { width: 480 });
    currentPartyY += 22;
  }
  
  let contactAndGstText = "";
  if (party.mobile_number) contactAndGstText += `Contact: ${party.mobile_number}`;
  if (party.gstin) contactAndGstText += (contactAndGstText ? " | " : "") + `GSTIN: ${party.gstin}`;
  if (recipientState.name) contactAndGstText += (contactAndGstText ? " | " : "") + `State: ${recipientState.name} (${recipientState.code || "N/A"})`;
  
  if (contactAndGstText) {
    doc.text(contactAndGstText, 55, currentPartyY);
    currentPartyY += 15;
  }

  // Dedicated Place of Supply line
  const placeOfSupplyName = recipientState.name || supplierState.name || "N/A";
  const placeOfSupplyCode = recipientState.code || supplierState.code || "";
  const placeOfSupplyStr = placeOfSupplyCode ? `${placeOfSupplyName} (${placeOfSupplyCode})` : placeOfSupplyName;
  doc.font("Helvetica-Bold").fillColor("#0f172a");
  doc.text(`Place of Supply: ${placeOfSupplyStr}`, 55, currentPartyY);
  currentPartyY += 18;

  // Divider Line
  const dividerY = Math.max(230, currentPartyY + 5);
  doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, dividerY).lineTo(545, dividerY).stroke();

  // 5. ITEMS TABLE Setup
  const tableY = dividerY + 15;
  
  // Decide CGST/SGST vs IGST split
  const isInterState = supplierState.code && recipientState.code && supplierState.code !== recipientState.code;
  
  const hasSeparateGST = items.some(item => 
    item.cgst_amount !== undefined || 
    item.sgst_amount !== undefined || 
    item.igst_amount !== undefined
  );

  let columns = [];
  if (hasSeparateGST) {
    if (isInterState) {
      columns = [
        { id: "item", label: "Item Description", align: "left", x: 50, width: 150 },
        { id: "hsn", label: "HSN/SAC", align: "left", x: 200, width: 60 },
        { id: "qty", label: "Qty", align: "right", x: 260, width: 40 },
        { id: "rate", label: "Rate (Rs.)", align: "right", x: 300, width: 70 },
        { id: "igst_rate", label: "IGST %", align: "right", x: 370, width: 45 },
        { id: "igst_amt", label: "IGST Amt", align: "right", x: 415, width: 60 },
        { id: "total", label: "Total (Rs.)", align: "right", x: 475, width: 70 }
      ];
    } else {
      columns = [
        { id: "item", label: "Item Description", align: "left", x: 50, width: 140 },
        { id: "hsn", label: "HSN/SAC", align: "left", x: 190, width: 50 },
        { id: "qty", label: "Qty", align: "right", x: 240, width: 30 },
        { id: "rate", label: "Rate (Rs.)", align: "right", x: 270, width: 55 },
        { id: "cgst_rate", label: "CGST %", align: "right", x: 325, width: 35 },
        { id: "cgst_amt", label: "CGST Amt", align: "right", x: 360, width: 45 },
        { id: "sgst_rate", label: "SGST %", align: "right", x: 405, width: 35 },
        { id: "sgst_amt", label: "SGST Amt", align: "right", x: 440, width: 45 },
        { id: "total", label: "Total (Rs.)", align: "right", x: 485, width: 60 }
      ];
    }
  } else {
    // Unified GST columns
    columns = [
      { id: "item", label: "Item Description", align: "left", x: 50, width: 175 },
      { id: "hsn", label: "HSN/SAC", align: "left", x: 225, width: 65 },
      { id: "qty", label: "Qty", align: "right", x: 290, width: 35 },
      { id: "rate", label: "Rate (Rs.)", align: "right", x: 325, width: 65 },
      { id: "gst_rate", label: "GST %", align: "right", x: 390, width: 40 },
      { id: "gst_amt", label: "GST Amt", align: "right", x: 430, width: 55 },
      { id: "total", label: "Total (Rs.)", align: "right", x: 485, width: 60 }
    ];
  }

  // Draw header row background
  doc.save();
  doc.fillColor("#f1f5f9").rect(50, tableY, 495, 25).fill();
  doc.restore();

  // Draw header text
  doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8.5);
  columns.forEach(col => {
    let textX = col.x + 4;
    let textWidth = col.width - 8;
    doc.text(col.label, textX, tableY + 8, { width: textWidth, align: col.align });
  });

  // Draw header bottom border
  doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, tableY + 25).lineTo(545, tableY + 25).stroke();

  // Table items rows
  let pageTableStartY = tableY;
  let currentY = tableY + 25;
  const rowHeight = 22;

  doc.fillColor("#334155").font("Helvetica").fontSize(8);

  items.forEach((item) => {
    // Check overflow and add page if needed
    if (currentY + rowHeight > 700) {
      // Draw grid borders for current page
      doc.save();
      doc.strokeColor("#cbd5e1").lineWidth(1);
      doc.rect(50, pageTableStartY, 495, currentY - pageTableStartY).stroke();
      columns.slice(0, -1).forEach(col => {
        const lineX = col.x + col.width;
        doc.moveTo(lineX, pageTableStartY).lineTo(lineX, currentY).stroke();
      });
      doc.restore();

      // Add page
      doc.addPage();
      doc.rect(40, 40, 515, 762).strokeColor("#cbd5e1").lineWidth(1).stroke();

      pageTableStartY = 60;
      currentY = pageTableStartY + 25;

      // Draw header row background on new page
      doc.save();
      doc.fillColor("#f1f5f9").rect(50, pageTableStartY, 495, 25).fill();
      doc.restore();

      // Draw header text on new page
      doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8.5);
      columns.forEach(col => {
        let textX = col.x + 4;
        let textWidth = col.width - 8;
        doc.text(col.label, textX, pageTableStartY + 8, { width: textWidth, align: col.align });
      });

      // Draw header bottom border on new page
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, pageTableStartY + 25).lineTo(545, pageTableStartY + 25).stroke();

      // Set text settings back
      doc.fillColor("#334155").font("Helvetica").fontSize(8);
    }

    // Render columns
    columns.forEach(col => {
      let val = "";
      if (col.id === "item") {
        val = item.item_name || "Item";
      } else if (col.id === "hsn") {
        val = item.hsn_sac || "";
      } else if (col.id === "qty") {
        val = item.quantity.toString();
      } else if (col.id === "rate") {
        val = Number(item.rate).toFixed(2);
      } else if (col.id === "gst_rate") {
        val = (item.gst_percentage || item.gstRate || 0).toString() + "%";
      } else if (col.id === "gst_amt") {
        val = Number(item.gst_amount).toFixed(2);
      } else if (col.id === "cgst_rate") {
        const rate = item.cgst_percentage !== undefined ? item.cgst_percentage : (Number(item.gst_percentage || item.gstRate || 0) / 2);
        val = rate.toString() + "%";
      } else if (col.id === "cgst_amt") {
        const amt = item.cgst_amount !== undefined ? item.cgst_amount : (Number(item.gst_amount || 0) / 2);
        val = Number(amt).toFixed(2);
      } else if (col.id === "sgst_rate") {
        const rate = item.sgst_percentage !== undefined ? item.sgst_percentage : (Number(item.gst_percentage || item.gstRate || 0) / 2);
        val = rate.toString() + "%";
      } else if (col.id === "sgst_amt") {
        const amt = item.sgst_amount !== undefined ? item.sgst_amount : (Number(item.gst_amount || 0) / 2);
        val = Number(amt).toFixed(2);
      } else if (col.id === "igst_rate") {
        const rate = item.igst_percentage !== undefined ? item.igst_percentage : Number(item.gst_percentage || item.gstRate || 0);
        val = rate.toString() + "%";
      } else if (col.id === "igst_amt") {
        const amt = item.igst_amount !== undefined ? item.igst_amount : Number(item.gst_amount || 0);
        val = Number(amt).toFixed(2);
      } else if (col.id === "total") {
        const lineTotal = Number(item.amount) + Number(item.gst_amount);
        val = lineTotal.toFixed(2);
      }

      let textX = col.x + 4;
      let textWidth = col.width - 8;
      doc.text(val, textX, currentY + 7, { width: textWidth, align: col.align });
    });

    // Draw horizontal separator line under this row
    doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(50, currentY + rowHeight).lineTo(545, currentY + rowHeight).stroke();

    currentY += rowHeight;
  });

  // Draw table boundary box and vertical grid lines for the final page
  doc.save();
  doc.strokeColor("#cbd5e1").lineWidth(1);
  doc.rect(50, pageTableStartY, 495, currentY - pageTableStartY).stroke();
  columns.slice(0, -1).forEach(col => {
    const lineX = col.x + col.width;
    doc.moveTo(lineX, pageTableStartY).lineTo(lineX, currentY).stroke();
  });
  doc.restore();

  // 7. REMARKS & SUMMARY
  let summaryY = currentY + 15;
  
  // Page overflow protection for the summary section
  if (summaryY + 110 > 750) {
    doc.addPage();
    doc.rect(40, 40, 515, 762).strokeColor("#cbd5e1").lineWidth(1).stroke();
    summaryY = 60;
  }

  // Remarks on the left
  if (voucher.remarks) {
    doc.fillColor("#475569");
    doc.font("Helvetica-Bold").fontSize(8).text("Remarks/Notes:", 55, summaryY);
    doc.font("Helvetica").fontSize(8).text(voucher.remarks, 55, summaryY + 12, { width: 220 });
  }

  // Totals Section Calculations
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
  if (voucher.cgst_amount !== undefined || voucher.sgst_amount !== undefined || voucher.igst_amount !== undefined) {
    totalCGST = Number(voucher.cgst_amount || 0);
    totalSGST = Number(voucher.sgst_amount || 0);
    totalIGST = Number(voucher.igst_amount || 0);
  } else {
    const totalGst = Number(voucher.gst_amount || 0);
    if (isInterState) {
      totalIGST = totalGst;
    } else {
      totalCGST = totalGst / 2;
      totalSGST = totalGst / 2;
    }
  }

  const netTaxTotal = totalCGST + totalSGST + totalIGST;

  // Summary Card on the right
  doc.fillColor("#0f172a");
  doc.font("Helvetica").fontSize(8.5);

  let nextY = summaryY;
  doc.text("Subtotal (Gross):", 330, nextY, { width: 120, align: "right" });
  doc.text(Number(voucher.total_amount).toFixed(2), 460, nextY, { width: 85, align: "right" });
  nextY += 15;

  if (totalCGST > 0 || (!isInterState && totalSGST >= 0)) {
    doc.text("Total CGST:", 330, nextY, { width: 120, align: "right" });
    doc.text(totalCGST.toFixed(2), 460, nextY, { width: 85, align: "right" });
    nextY += 15;
    
    doc.text("Total SGST:", 330, nextY, { width: 120, align: "right" });
    doc.text(totalSGST.toFixed(2), 460, nextY, { width: 85, align: "right" });
    nextY += 15;
  }
  if (totalIGST > 0 || (isInterState && totalIGST >= 0)) {
    doc.text("Total IGST:", 330, nextY, { width: 120, align: "right" });
    doc.text(totalIGST.toFixed(2), 460, nextY, { width: 85, align: "right" });
    nextY += 15;
  }

  doc.text("Net Tax Total:", 330, nextY, { width: 120, align: "right" });
  doc.text(netTaxTotal.toFixed(2), 460, nextY, { width: 85, align: "right" });
  nextY += 15;

  doc.text("Discount:", 330, nextY, { width: 120, align: "right" });
  doc.text(Number(voucher.discount_amount).toFixed(2), 460, nextY, { width: 85, align: "right" });
  nextY += 15;

  // Border top of Grand Total
  doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(330, nextY).lineTo(545, nextY).stroke();
  nextY += 7;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Grand Total (Rs.):", 330, nextY, { width: 120, align: "right" });
  doc.text(Number(voucher.gross_total).toFixed(2), 460, nextY, { width: 85, align: "right" });

  // 8. FOOTER
  doc.fillColor("#94a3b8");
  doc.font("Helvetica-Oblique").fontSize(7.5);
  doc.text("This is a computer-generated invoice and requires no physical signature.", 50, 770, { width: 495, align: "center" });

  // End Document
  doc.end();
}

module.exports = { generateInvoicePDF };

"use client";
import React, { useState, useEffect } from "react";
import { usePageShortcuts } from "@/hooks/usePageShortcuts";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales"); // "sales", "purchase", "gst", "stock"
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [partyId, setPartyId] = useState(""); // customer or supplier ID
  const [categoryId, setCategoryId] = useState(""); // item category

  // Filter sources
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);

  // Report Data
  const [salesSummary, setSalesSummary] = useState({ rows: [], grand_totals: {} });
  const [purchaseSummary, setPurchaseSummary] = useState({ rows: [], grand_totals: {} });
  const [gstSummary, setGstSummary] = useState(null);
  const [stockSummary, setStockSummary] = useState({ rows: [] });

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  usePageShortcuts([
    { key: "b", altKey: true, handler: () => alert("Balance Sheet not fully implemented yet") },
    { key: "p", altKey: true, handler: () => alert("Profit & Loss not fully implemented yet") },
    { key: "t", altKey: true, handler: () => alert("Trial Balance not fully implemented yet") },
    { key: "c", altKey: true, handler: () => alert("Cash Flow not fully implemented yet") },
    { key: "r", altKey: true, handler: () => setActiveTab("stock") },
    { key: "x", altKey: true, handler: () => setActiveTab("gst") },
  ]);

  // Check Auth & Company Context
  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const active = localStorage.getItem("activeCompanyId");
    if (active) {
      setActiveCompanyId(active);
      fetch(`${API_BASE}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const comp = data.companies?.find(c => c.id === active);
          if (comp) setActiveCompanyName(comp.company_name);
        })
        .catch(console.error);
    }
  }, [token]);

  // Load static filter resources (Customers, Suppliers, Categories)
  useEffect(() => {
    if (!token || !activeCompanyId) return;

    // Load Customers
    fetch(`${API_BASE}/api/customers?companyId=${activeCompanyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []))
      .catch(console.error);

    // Load Suppliers
    fetch(`${API_BASE}/api/suppliers?companyId=${activeCompanyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSuppliers(data.suppliers || []))
      .catch(console.error);

    // Load Items to extract categories
    fetch(`${API_BASE}/api/items?companyId=${activeCompanyId}&includeInactive=true`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const itemsList = data.items || [];
        const cats = Array.from(new Set(itemsList.map(item => item.category).filter(Boolean)));
        setCategories(cats);
      })
      .catch(console.error);
  }, [token, activeCompanyId]);

  // Fetch Report Data on Tab or Filter Apply
  const fetchReport = async () => {
    if (!token || !activeCompanyId) return;
    setLoading(true);
    setError("");

    try {
      let endpoint = "";
      let params = `companyId=${activeCompanyId}`;
      if (fromDate) params += `&fromDate=${fromDate}`;
      if (toDate) params += `&toDate=${toDate}`;

      if (activeTab === "sales") {
        endpoint = "/api/reports/sales-summary";
        if (partyId) params += `&customerId=${partyId}`;
        const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch Sales summary");
        const data = await res.json();
        setSalesSummary(data);
      } else if (activeTab === "purchase") {
        endpoint = "/api/reports/purchase-summary";
        if (partyId) params += `&supplierId=${partyId}`;
        const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch Purchase summary");
        const data = await res.json();
        setPurchaseSummary(data);
      } else if (activeTab === "gst") {
        endpoint = "/api/reports/gst-summary";
        const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch GST summary");
        const data = await res.json();
        setGstSummary(data);
      } else if (activeTab === "stock") {
        endpoint = "/api/reports/stock-summary";
        if (categoryId) params += `&groupId=${categoryId}`;
        const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch Stock summary");
        const data = await res.json();
        setStockSummary(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when Tab or Company changes, or when Filters are submitted
  useEffect(() => {
    setPartyId("");
    setCategoryId("");
    fetchReport();
  }, [activeTab, activeCompanyId]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // Client-side CSV Export
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `report-${activeTab}.csv`;

    if (activeTab === "sales") {
      headers = ["Date", "Gross Amount (Rs.)", "Discount (Rs.)", "GST Amount (Rs.)", "Net Sales (Rs.)"];
      rows = salesSummary.rows.map(r => [
        r.date,
        Number(r.total_gross_amount).toFixed(2),
        Number(r.total_discount).toFixed(2),
        Number(r.total_tax_amount).toFixed(2),
        Number(r.net_sales_amount).toFixed(2)
      ]);
      // Add Grand Totals
      const gt = salesSummary.grand_totals || {};
      rows.push([
        "GRAND TOTAL",
        Number(gt.total_gross_amount || 0).toFixed(2),
        Number(gt.total_discount || 0).toFixed(2),
        Number(gt.total_tax_amount || 0).toFixed(2),
        Number(gt.net_sales_amount || 0).toFixed(2)
      ]);
    } else if (activeTab === "purchase") {
      headers = ["Date", "Gross Amount (Rs.)", "Discount (Rs.)", "GST Amount (Rs.)", "Net Purchase (Rs.)"];
      rows = purchaseSummary.rows.map(r => [
        r.date,
        Number(r.total_gross_amount).toFixed(2),
        Number(r.total_discount).toFixed(2),
        Number(r.total_tax_amount).toFixed(2),
        Number(r.net_purchase_amount).toFixed(2)
      ]);
      // Add Grand Totals
      const gt = purchaseSummary.grand_totals || {};
      rows.push([
        "GRAND TOTAL",
        Number(gt.total_gross_amount || 0).toFixed(2),
        Number(gt.total_discount || 0).toFixed(2),
        Number(gt.total_tax_amount || 0).toFixed(2),
        Number(gt.net_purchase_amount || 0).toFixed(2)
      ]);
    } else if (activeTab === "gst" && gstSummary) {
      headers = ["Tax Section", "Taxable Value (Rs.)", "CGST Amount (Rs.)", "SGST Amount (Rs.)", "IGST Amount (Rs.)", "Total GST (Rs.)"];
      const s = gstSummary.sales || {};
      const p = gstSummary.purchase || {};
      const c = gstSummary.combined || {};
      rows = [
        ["Outward (Sales)", Number(s.total_taxable_value).toFixed(2), Number(s.total_cgst_amount).toFixed(2), Number(s.total_sgst_amount).toFixed(2), Number(s.total_igst_amount).toFixed(2), Number(s.total_tax_amount).toFixed(2)],
        ["Inward (Purchases)", Number(p.total_taxable_value).toFixed(2), Number(p.total_cgst_amount).toFixed(2), Number(p.total_sgst_amount).toFixed(2), Number(p.total_igst_amount).toFixed(2), Number(p.total_tax_amount).toFixed(2)],
        ["Net GST Account", Number(c.total_taxable_value).toFixed(2), Number(c.total_cgst_amount).toFixed(2), Number(c.total_sgst_amount).toFixed(2), Number(c.total_igst_amount).toFixed(2), Number(c.total_tax_amount).toFixed(2)]
      ];
    } else if (activeTab === "stock") {
      headers = ["Item Name", "SKU", "Category", "Opening Qty", "Qty In (Inward)", "Qty Out (Outward)", "Closing Qty"];
      rows = stockSummary.rows.map(r => [
        r.item_name,
        r.sku || "",
        r.category || "",
        r.opening_qty,
        r.qty_in,
        r.qty_out,
        r.closing_qty
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!activeCompanyId) {
    return (
      <div className="flex-1 p-6 bg-[#F8F4EE] text-[#2F2F2F] flex flex-col justify-center items-center h-screen">
        <div className="text-xl font-semibold text-[#2F2F2F]/70">No active company selected.</div>
        <p className="text-sm text-[#2F2F2F]/50 mt-2">Please select or build a company in the Companies tab first.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-[#F8F4EE] text-[#2F2F2F] min-h-screen">
      {/* Dynamic CSS Print Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-section {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            color: black !important;
          }
          .print-section table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 15px !important;
          }
          .print-section th, .print-section td {
            border: 1px solid #000 !important;
            padding: 6px 10px !important;
            color: black !important;
          }
          .print-section th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside, nav, button, select, input, form, .no-print, header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-[#EFE7DD] no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#8B5E3C]">Reports Module</h1>
          <p className="text-sm text-[#2F2F2F]/70 mt-0.5">{activeCompanyName}</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-[#FFFDF9] border border-[#EFE7DD] text-[#8B5E3C] shadow-sm hover:shadow-md hover:bg-[#E7C9A9] transition-all duration-150 hover:scale-[1.01]"
          >
            Export CSV
          </button>
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow-md hover:shadow-lg transition-all duration-150 hover:scale-[1.01]"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Filters form */}
      <form onSubmit={handleApplyFilters} className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#EFE7DD] mb-6 flex flex-wrap items-end gap-4 no-print">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-[#2F2F2F]/70 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[#F8F4EE] border border-[#EFE7DD] rounded-full text-[#2F2F2F] focus:outline-none focus:border-[#C68642]"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-[#2F2F2F]/70 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[#F8F4EE] border border-[#EFE7DD] rounded-full text-[#2F2F2F] focus:outline-none focus:border-[#C68642]"
          />
        </div>

        {/* Tab specific filters */}
        {activeTab === "sales" && (
          <div className="flex flex-col min-w-[180px]">
            <label className="text-xs font-medium text-[#2F2F2F]/70 mb-1">Filter by Customer</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#F8F4EE] border border-[#EFE7DD] rounded-full text-[#2F2F2F] focus:outline-none focus:border-[#C68642]"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customer_name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "purchase" && (
          <div className="flex flex-col min-w-[180px]">
            <label className="text-xs font-medium text-[#2F2F2F]/70 mb-1">Filter by Supplier</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#F8F4EE] border border-[#EFE7DD] rounded-full text-[#2F2F2F] focus:outline-none focus:border-[#C68642]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.supplier_name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "stock" && (
          <div className="flex flex-col min-w-[180px]">
            <label className="text-xs font-medium text-[#2F2F2F]/70 mb-1">Filter by Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#F8F4EE] border border-[#EFE7DD] rounded-full text-[#2F2F2F] focus:outline-none focus:border-[#C68642]"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="px-4 py-1.5 text-sm font-semibold text-[#2F2F2F] bg-[#E7C9A9] hover:bg-[#FFFDF9] rounded-full transition-all"
        >
          Apply Filters
        </button>
      </form>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-[#EFE7DD] mb-6 no-print">
        {["sales", "purchase", "gst", "stock"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab
                ? "border-[#C68642] text-[#8B5E3C]"
                : "border-transparent text-[#2F2F2F]/70 hover:text-[#2F2F2F]"
            }`}
          >
            {tab === "sales" && "Sales Summary"}
            {tab === "purchase" && "Purchase Summary"}
            {tab === "gst" && "GST Tax Summary"}
            {tab === "stock" && "Stock / Inventory Summary"}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#FFFDF9] border border-red-500/20 text-red-600 p-4 rounded-full mb-6 no-print">
          {error}
        </div>
      )}

      {/* Report View Card (Print-friendly container) */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 print-section">
        
        {/* Printable Header Info */}
        <div className="hidden print:block mb-6 border-b border-black pb-4">
          <h2 className="text-xl font-bold">{activeCompanyName}</h2>
          <h3 className="text-lg font-semibold mt-1">
            {activeTab === "sales" && "Sales Summary Report"}
            {activeTab === "purchase" && "Purchase Summary Report"}
            {activeTab === "gst" && "GST Tax Summary Report"}
            {activeTab === "stock" && "Stock / Inventory Summary Report"}
          </h3>
          <p className="text-sm mt-1">Period: {fromDate || "Beginning"} to {toDate || "Present"}</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C68642]"></div>
          </div>
        ) : (
          <>
            {/* 1. SALES SUMMARY TAB */}
            {activeTab === "sales" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-[#2F2F2F]/90">
                    <thead className="text-xs uppercase bg-[#E7C9A9] text-[#2F2F2F]">
                      <tr>
                        <th className="px-6 py-3 border-b border-[#EFE7DD]">Date</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">Gross Amount (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">Discount (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">GST Tax Amount (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right font-semibold text-[#2F2F2F]">Net Sales (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DD]">
                      {salesSummary.rows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-[#2F2F2F]/50">No sales transactions found for this range.</td>
                        </tr>
                      ) : (
                        salesSummary.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#FFFDF9]">
                            <td className="px-6 py-3.5 font-medium">{row.date}</td>
                            <td className="px-6 py-3.5 text-right">{Number(row.total_gross_amount).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right text-red-600">-{Number(row.total_discount).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right">{Number(row.total_tax_amount).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right font-semibold text-green-700">{Number(row.net_sales_amount).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {salesSummary.rows.length > 0 && (
                      <tfoot className="bg-[#FFFDF9] font-semibold text-[#2F2F2F]">
                        <tr>
                          <td className="px-6 py-4">GRAND TOTAL</td>
                          <td className="px-6 py-4 text-right">{Number(salesSummary.grand_totals.total_gross_amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-red-600">-{Number(salesSummary.grand_totals.total_discount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">{Number(salesSummary.grand_totals.total_tax_amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-green-700">{Number(salesSummary.grand_totals.net_sales_amount || 0).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 2. PURCHASE SUMMARY TAB */}
            {activeTab === "purchase" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-[#2F2F2F]/90">
                    <thead className="text-xs uppercase bg-[#E7C9A9] text-[#2F2F2F]">
                      <tr>
                        <th className="px-6 py-3 border-b border-[#EFE7DD]">Date</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">Gross Amount (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">Discount (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">GST Tax Amount (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right font-semibold text-[#2F2F2F]">Net Purchase (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DD]">
                      {purchaseSummary.rows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-[#2F2F2F]/50">No purchase transactions found for this range.</td>
                        </tr>
                      ) : (
                        purchaseSummary.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#FFFDF9]">
                            <td className="px-6 py-3.5 font-medium">{row.date}</td>
                            <td className="px-6 py-3.5 text-right">{Number(row.total_gross_amount).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right text-red-600">-{Number(row.total_discount).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right">{Number(row.total_tax_amount).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right font-semibold text-[#8B5E3C]">{Number(row.net_purchase_amount).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {purchaseSummary.rows.length > 0 && (
                      <tfoot className="bg-[#FFFDF9] font-semibold text-[#2F2F2F]">
                        <tr>
                          <td className="px-6 py-4">GRAND TOTAL</td>
                          <td className="px-6 py-4 text-right">{Number(purchaseSummary.grand_totals.total_gross_amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-red-600">-{Number(purchaseSummary.grand_totals.total_discount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">{Number(purchaseSummary.grand_totals.total_tax_amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-[#8B5E3C]">{Number(purchaseSummary.grand_totals.net_purchase_amount || 0).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 3. GST TAX SUMMARY TAB */}
            {activeTab === "gst" && gstSummary && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
                  <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EFE7DD]">
                    <div className="text-xs font-semibold text-[#2F2F2F]/70 uppercase tracking-wide">Outward Taxable Value</div>
                    <div className="text-2xl font-bold text-[#2F2F2F] mt-1">Rs. {Number(gstSummary.sales.total_taxable_value).toFixed(2)}</div>
                    <div className="text-xs text-[#2F2F2F]/50 mt-1">Sales base amount</div>
                  </div>
                  <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EFE7DD]">
                    <div className="text-xs font-semibold text-[#2F2F2F]/70 uppercase tracking-wide">Outward GST (Tax Liability)</div>
                    <div className="text-2xl font-bold text-green-700 mt-1">Rs. {Number(gstSummary.sales.total_tax_amount).toFixed(2)}</div>
                    <div className="text-xs text-[#2F2F2F]/50 mt-1">CGST + SGST + IGST liability</div>
                  </div>
                  <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EFE7DD]">
                    <div className="text-xs font-semibold text-[#2F2F2F]/70 uppercase tracking-wide">Inward GST (Input Tax Credit)</div>
                    <div className="text-2xl font-bold text-[#8B5E3C] mt-1">Rs. {Number(gstSummary.purchase.total_tax_amount).toFixed(2)}</div>
                    <div className="text-xs text-[#2F2F2F]/50 mt-1">ITC from Purchases</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-[#2F2F2F]/90">
                    <thead className="text-xs uppercase bg-[#E7C9A9] text-[#2F2F2F]">
                      <tr>
                        <th className="px-6 py-3 border-b border-[#EFE7DD]">Tax Type / Activity</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">Taxable Value (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">CGST (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">SGST (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right">IGST (Rs.)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-right font-semibold text-[#2F2F2F]">Total Tax (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DD]">
                      <tr className="hover:bg-[#FFFDF9]">
                        <td className="px-6 py-4 font-semibold text-[#2F2F2F]">Outward Supplies (Sales)</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.sales.total_taxable_value).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.sales.total_cgst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.sales.total_sgst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.sales.total_igst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-green-700">{Number(gstSummary.sales.total_tax_amount).toFixed(2)}</td>
                      </tr>
                      <tr className="hover:bg-[#FFFDF9]">
                        <td className="px-6 py-4 font-semibold text-[#2F2F2F]">Inward Supplies (Purchases)</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.purchase.total_taxable_value).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.purchase.total_cgst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.purchase.total_sgst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.purchase.total_igst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-[#8B5E3C]">{Number(gstSummary.purchase.total_tax_amount).toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-[#FFFDF9] font-bold text-[#2F2F2F]">
                      <tr>
                        <td className="px-6 py-4">NET GST ACCOUNT</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.combined.total_taxable_value).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.combined.total_cgst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.combined.total_sgst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">{Number(gstSummary.combined.total_igst_amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[#8B5E3C]">{Number(gstSummary.combined.total_tax_amount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 4. STOCK / INVENTORY SUMMARY TAB */}
            {activeTab === "stock" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-[#2F2F2F]/90">
                    <thead className="text-xs uppercase bg-[#E7C9A9] text-[#2F2F2F]">
                      <tr>
                        <th className="px-6 py-3 border-b border-[#EFE7DD]">Item Name</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD]">SKU</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD]">Category</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-center">Opening Qty</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-center text-green-700">Qty In (Inward)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-center text-red-600">Qty Out (Outward)</th>
                        <th className="px-6 py-3 border-b border-[#EFE7DD] text-center font-semibold text-[#2F2F2F]">Closing Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DD]">
                      {stockSummary.rows.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-[#2F2F2F]/50">No stock transactions found for this range.</td>
                        </tr>
                      ) : (
                        stockSummary.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#FFFDF9]">
                            <td className="px-6 py-3.5 font-medium text-[#2F2F2F]">{row.item_name}</td>
                            <td className="px-6 py-3.5 text-[#2F2F2F]/70">{row.sku || "N/A"}</td>
                            <td className="px-6 py-3.5 text-[#2F2F2F]/70">{row.category || "N/A"}</td>
                            <td className="px-6 py-3.5 text-center font-mono">{row.opening_qty} {row.unit_name || "PCS"}</td>
                            <td className="px-6 py-3.5 text-center font-mono text-green-700">+{row.qty_in}</td>
                            <td className="px-6 py-3.5 text-center font-mono text-red-600">-{row.qty_out}</td>
                            <td className="px-6 py-3.5 text-center font-mono font-semibold text-[#8B5E3C]">{row.closing_qty} {row.unit_name || "PCS"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("sales"); // "sales" or "purchase"
  const [vouchers, setVouchers] = useState([]);
  const [parties, setParties] = useState([]); // customers or suppliers
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeCompanyName, setActiveCompanyName] = useState("");
  
  // Filter states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [partyId, setPartyId] = useState("");
  const [status, setStatus] = useState("ALL"); // "ALL", "ACTIVE", "CANCELLED"

  // Details Modal states
  const [detailVoucher, setDetailVoucher] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  // Check auth and load company
  useEffect(() => {
    const active = localStorage.getItem("activeCompanyId");
    if (!token) {
      window.location.href = "/login";
      return;
    }
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

  // Load parties (customers or suppliers depending on tab) and bills
  const loadParties = async () => {
    if (!token || !activeCompanyId) return;
    try {
      const endpoint = activeTab === "sales" ? "customers" : "suppliers";
      const res = await fetch(`${API_BASE}/api/${endpoint}?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setParties(data[endpoint] || []);
      }
    } catch (err) {
      console.error("Error loading parties:", err);
    }
  };

  const loadBills = async () => {
    if (!token || !activeCompanyId) return;
    try {
      let url = `${API_BASE}/api/billing/${activeTab}?companyId=${activeCompanyId}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;
      if (partyId) {
        url += activeTab === "sales" ? `&customerId=${partyId}` : `&supplierId=${partyId}`;
      }
      if (status !== "ALL") url += `&status=${status}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch billing logs");
      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    setPartyId(""); // Reset party filter when tab changes
    loadParties();
    loadBills();
  }, [activeTab, activeCompanyId]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    loadBills();
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setPartyId("");
    setStatus("ALL");
    // Directly trigger load with cleared filters
    setTimeout(() => {
      loadBills();
    }, 50);
  };

  const handleViewDetails = async (voucherId) => {
    setModalLoading(true);
    setDetailVoucher(null);
    setDetailItems([]);
    setIsModalOpen(true);

    try {
      const res = await fetch(`${API_BASE}/api/billing/${activeTab}/${voucherId}?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setDetailVoucher(data.voucher);
      setDetailItems(data.items || []);
    } catch (err) {
      alert(err.message);
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!detailVoucher) return;
    try {
      const res = await fetch(`${API_BASE}/api/billing/${activeTab}/${detailVoucher.id}/pdf?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to generate PDF invoice");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const num = detailVoucher.invoice_number || detailVoucher.voucher_number || "inv";
      a.download = `${activeTab === "sales" ? "sales-invoice" : "purchase-bill"}-${num}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!activeCompanyId) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-[#2F2F2F] mb-4">Billing System</h1>
        <div className="bg-[#FFFDF9] p-6 rounded-xl border border-[#EFE7DD] text-[#2F2F2F]/90">
          Please select an active company from Company Management to access the Billing System.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full print:p-0 print:m-0">
      {/* Header (Hidden when printing) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-[#EFE7DD] gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-[#2F2F2F]">Billing Dashboard</h1>
          {activeCompanyName && <p className="text-sm text-[#2F2F2F]/70 mt-1">{activeCompanyName}</p>}
        </div>
        
        {/* Sales / Purchase Tab Selector */}
        <div className="flex bg-[#FFFDF9] p-1 rounded-2xl border border-[#EFE7DD]">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === "sales" ? "bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow" : "text-[#2F2F2F]/70 hover:text-[#2F2F2F]"}`}
          >
            Sales Invoices
          </button>
          <button
            onClick={() => setActiveTab("purchase")}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === "purchase" ? "bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow" : "text-[#2F2F2F]/70 hover:text-[#2F2F2F]"}`}
          >
            Purchase Bills
          </button>
        </div>
      </div>

      {/* Filter panel (Hidden when printing) */}
      <div className="bg-[#FFFDF9] p-6 border border-[#EFE7DD] rounded-xl shadow-md print:hidden">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Date Picker Range */}
          <div>
            <label className="text-xs font-medium text-[#2F2F2F]/90 block mb-1">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] h-10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#2F2F2F]/90 block mb-1">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] h-10"
            />
          </div>

          {/* Party Dropdown */}
          <div>
            <label className="text-xs font-medium text-[#2F2F2F]/90 block mb-1">
              {activeTab === "sales" ? "Customer" : "Supplier"}
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30 text-sm"
            >
              <option value="">All Parties</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  {activeTab === "sales" ? p.customer_name : p.supplier_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="text-xs font-medium text-[#2F2F2F]/90 block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30 text-sm"
            >
              <option value="ALL">All Bills</option>
              <option value="ACTIVE">Active Only</option>
              <option value="CANCELLED">Cancelled Only</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-4 flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F]"
            >
              Reset
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-[#C68642] to-[#8B5E3C] hover:bg-[#C68642] text-[#FFFDF9] border-none">
              Apply Filters
            </Button>
          </div>
        </form>
      </div>

      {/* Main Table List (Hidden when printing) */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-xl shadow-md overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-[#2F2F2F]/90 min-w-[600px]">
            <thead className="bg-[#F8F4EE]/50 text-[#2F2F2F]/70 uppercase text-xs border-b border-[#EFE7DD]">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Invoice / Bill No</th>
                <th className="px-6 py-4 font-medium">Party Name</th>
                <th className="px-6 py-4 font-medium text-right">Tax (₹)</th>
                <th className="px-6 py-4 font-medium text-right">Net Amount (₹)</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#2F2F2F]/50">
                    No bills or invoices matching the filters.
                  </td>
                </tr>
              ) : (
                vouchers.map(v => {
                  const billDate = new Date(v.invoice_date || v.purchase_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });
                  const isCancelled = !v.is_active;

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-[#E7C9A9] transition-colors ${isCancelled ? "opacity-40 bg-red-950/5" : ""}`}
                    >
                      <td className="px-6 py-4 font-medium text-[#2F2F2F]">{billDate}</td>
                      <td className="px-6 py-4 font-semibold text-[#2F2F2F]">
                        {v.invoice_number || v.voucher_number}
                        {v.reference_no && <span className="text-[10px] text-[#2F2F2F]/50 font-normal block">Ref: {v.reference_no}</span>}
                      </td>
                      <td className="px-6 py-4 text-[#2F2F2F]/90">{v.customer_name || v.supplier_name}</td>
                      <td className="px-6 py-4 text-right">₹{Number(v.gst_amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#2F2F2F]">
                        ₹{Number(v.gross_total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${!isCancelled ? "bg-emerald-500/10 text-green-700 border-emerald-500/20" : "bg-[#FFFDF9] text-red-600 border-red-500/20"}`}>
                          {!isCancelled ? "Active" : "Cancelled"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(v.id)}
                          className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F]"
                        >
                          View Bill
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. DETAIL INVOICE MODAL (VISIBLE FOR SCREEN & PRINTING WHEN OPEN) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:absolute print:inset-0 print:bg-white print:backdrop-blur-none print:text-black">
          <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-xl max-w-4xl w-full p-8 space-y-6 shadow-2xl relative print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
            
            {/* Modal Close & Actions (Hidden when printing) */}
            <div className="flex justify-between items-center pb-4 border-b border-[#EFE7DD] print:hidden">
              <h3 className="text-xl font-bold text-[#2F2F2F]">
                {activeTab === "sales" ? "Tax Invoice Details" : "Purchase Bill Details"}
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  className="bg-gradient-to-r from-[#C68642] to-[#8B5E3C] hover:bg-[#C68642] text-[#FFFDF9] border-none text-xs"
                >
                  Print Invoice
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-[#C68642] hover:bg-[#8B5E3C] text-[#FFFDF9] border-none text-xs"
                >
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F] text-xs"
                >
                  Close
                </Button>
              </div>
            </div>

            {modalLoading ? (
              <div className="py-20 text-center text-[#2F2F2F]/70">Loading invoice details...</div>
            ) : (
              detailVoucher && (
                <div className="space-y-6 print:text-black">
                  {/* Clean print style overrides */}
                  <style jsx global>{`
                    @media print {
                      body {
                        background-color: white !important;
                        color: black !important;
                      }
                      aside, header, nav, .print\\:hidden {
                        display: none !important;
                      }
                      .print-bill-container {
                        border: 1px solid #cbd5e1 !important;
                        padding: 24px !important;
                        background: white !important;
                        color: black !important;
                        border-radius: 8px !important;
                      }
                    }
                  `}</style>

                  <div className="print-bill-container p-1 rounded-2xl">
                    {/* 1. Header (Company Info & Document title) */}
                    <div className="flex flex-col md:flex-row justify-between items-start border-b border-[#EFE7DD] pb-6 print:border-slate-300">
                      <div className="space-y-1">
                        <h4 className="text-2xl font-bold text-[#2F2F2F] print:text-black">{activeCompanyName}</h4>
                        {detailVoucher.company_state && <p className="text-sm text-[#2F2F2F]/70 print:text-slate-600">State: {detailVoucher.company_state}</p>}
                        {detailVoucher.company_gst && <p className="text-sm font-semibold text-[#8B5E3C] print:text-black">GSTIN: {detailVoucher.company_gst}</p>}
                      </div>
                      <div className="text-right space-y-1 mt-4 md:mt-0">
                        <h4 className="text-xl font-bold text-[#8B5E3C] print:text-black uppercase">
                          {activeTab === "sales" ? "Tax Invoice" : "Purchase Bill"}
                        </h4>
                        <p className="text-sm text-[#2F2F2F]/90 print:text-black">
                          <span className="font-semibold">{activeTab === "sales" ? "Invoice No: " : "Bill No: "}</span>
                          {detailVoucher.invoice_number || detailVoucher.voucher_number}
                        </p>
                        <p className="text-sm text-[#2F2F2F]/90 print:text-black">
                          <span className="font-semibold">Date: </span>
                          {new Date(detailVoucher.invoice_date || detailVoucher.purchase_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                        {detailVoucher.reference_no && (
                          <p className="text-sm text-[#2F2F2F]/90 print:text-black">
                            <span className="font-semibold">Ref/PO No: </span>
                            {detailVoucher.reference_no}
                          </p>
                        )}
                        {!detailVoucher.is_active && (
                          <div className="text-red-600 font-bold border border-red-500/30 bg-[#FFFDF9] px-2 py-0.5 rounded text-xs inline-block uppercase print:border-red-500 print:text-red-600">
                            Cancelled
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Client / Supplier details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-b border-[#EFE7DD] pb-6 print:border-slate-300 print:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#2F2F2F]/50 uppercase block">
                          {activeTab === "sales" ? "Billed To" : "Supplier / Vendor"}
                        </span>
                        <h5 className="text-base font-bold text-[#2F2F2F] print:text-black">
                          {detailVoucher.customer_name || detailVoucher.supplier_name}
                        </h5>
                        <p className="text-sm text-[#2F2F2F]/90 print:text-slate-700">{detailVoucher.party_address || "Address not provided."}</p>
                        {detailVoucher.party_gstin && (
                          <p className="text-sm font-medium text-[#2F2F2F]/90 print:text-black">
                            GSTIN: <span className="font-semibold">{detailVoucher.party_gstin}</span>
                          </p>
                        )}
                        {detailVoucher.party_mobile && (
                          <p className="text-sm text-[#2F2F2F]/70 print:text-slate-600">Contact: {detailVoucher.party_mobile}</p>
                        )}
                      </div>
                    </div>

                    {/* 3. Items list */}
                    <div className="pt-6">
                      <table className="w-full text-left text-sm print:text-black">
                        <thead>
                          <tr className="border-b border-[#EFE7DD] print:border-slate-400 text-[#2F2F2F]/70 print:text-slate-800 font-semibold">
                            <th className="py-2">Item Description</th>
                            <th className="py-2 text-right">Qty</th>
                            <th className="py-2 text-right">Rate</th>
                            <th className="py-2 text-right">GST %</th>
                            <th className="py-2 text-right">GST Amt</th>
                            <th className="py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                          {detailItems.map((item, index) => {
                            const lineTotal = Number(item.amount) + Number(item.gst_amount);
                            return (
                              <tr key={index} className="text-[#2F2F2F]/90 print:text-black">
                                <td className="py-3">
                                  <div className="font-medium">{item.item_name}</div>
                                  {item.sku && <div className="text-xs text-[#2F2F2F]/50 print:text-slate-600">SKU: {item.sku}</div>}
                                </td>
                                <td className="py-3 text-right">{item.quantity}</td>
                                <td className="py-3 text-right">₹{Number(item.rate).toFixed(2)}</td>
                                <td className="py-3 text-right">{(item.gst_percentage || item.gst_rate || 0)}%</td>
                                <td className="py-3 text-right">₹{Number(item.gst_amount).toFixed(2)}</td>
                                <td className="py-3 text-right font-medium">₹{lineTotal.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 4. Calculation summary */}
                    <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t border-[#EFE7DD] print:border-slate-400 mt-6 gap-6">
                      {/* Left: Remarks */}
                      <div className="max-w-md">
                        {detailVoucher.remarks && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-[#2F2F2F]/50 uppercase block">Remarks / Special Notes</span>
                            <p className="text-sm text-[#2F2F2F]/70 print:text-slate-700">{detailVoucher.remarks}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Calculations */}
                      <div className="w-full md:w-80 space-y-2.5 text-sm print:text-black">
                        <div className="flex justify-between">
                          <span className="text-[#2F2F2F]/70 print:text-slate-700">Subtotal (Gross):</span>
                          <span className="font-medium text-[#2F2F2F] print:text-black">₹{Number(detailVoucher.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2F2F2F]/70 print:text-slate-700">GST Amount (Tax):</span>
                          <span className="font-medium text-[#2F2F2F] print:text-black">₹{Number(detailVoucher.gst_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2F2F2F]/70 print:text-slate-700">Discount:</span>
                          <span className="font-medium text-[#2F2F2F] print:text-black">₹{Number(detailVoucher.discount_amount).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-[#EFE7DD] print:border-slate-400 my-2 pt-2 flex justify-between items-center">
                          <span className="text-base font-semibold text-[#2F2F2F] print:text-black">Grand Total:</span>
                          <span className="text-lg font-bold text-[#8B5E3C] print:text-black">₹{Number(detailVoucher.gross_total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Computer generated disclaimer */}
                  <div className="text-center text-[10px] text-[#2F2F2F]/50 pt-8 border-t border-[#EFE7DD] print:text-[#2F2F2F]/50">
                    This is a computer-generated invoice and requires no physical signature.
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

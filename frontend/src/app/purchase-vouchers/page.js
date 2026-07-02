"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageShortcuts } from "@/hooks/usePageShortcuts";

export default function PurchaseVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [supplierId, setSupplierId] = useState("");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherItems, setVoucherItems] = useState([
    { itemId: "", quantity: 1, rate: 0, gstRate: 0 }
  ]);

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  usePageShortcuts([
    { key: "s", ctrlKey: true, handler: (e) => onSubmit(e), allowInInput: true }
  ]);

  // Load active company
  useEffect(() => {
    const t = localStorage.getItem("authToken");
    if (!t) {
      window.location.href = "/login";
      return;
    }
    const active = localStorage.getItem("activeCompanyId");
    if (active) {
      setActiveCompanyId(active);
      if (token) {
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
    }
  }, [token]);

  // Fetch initial data
  const fetchData = async () => {
    if (!token || !activeCompanyId) return;
    try {
      // Fetch Vouchers
      const vRes = await fetch(`${API_BASE}/api/purchase-vouchers?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVouchers(vData.vouchers || []);
      }

      // Fetch Suppliers
      const sRes = await fetch(`${API_BASE}/api/suppliers?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        // Only active suppliers
        setSuppliers(sData.suppliers?.filter(s => s.is_active) || []);
      }

      // Fetch Items
      const iRes = await fetch(`${API_BASE}/api/items?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (iRes.ok) {
        const iData = await iRes.json();
        // Only active items
        setItemsList(iData.items?.filter(i => i.is_active) || []);
      }
    } catch (err) {
      console.error("Error loading page data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, activeCompanyId]);

  // Calculate totals dynamically for UI display
  const subTotal = voucherItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return sum + (qty * rate);
  }, 0);

  const gstTotal = voucherItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gst = parseFloat(item.gstRate) || 0;
    return sum + (qty * rate * (gst / 100));
  }, 0);

  const netTotal = subTotal + gstTotal - (parseFloat(discountAmount) || 0);

  // Auto-generate voucher number helper when creating new voucher
  useEffect(() => {
    if (!editingId && !voucherNumber) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setVoucherNumber(`PV-${new Date().getFullYear() % 100}${String(new Date().getMonth() + 1).padStart(2, '0')}-${randomNum}`);
    }
  }, [editingId, voucherNumber]);

  const handleItemChange = (index, field, value) => {
    const updated = [...voucherItems];
    updated[index][field] = value;

    // If item is selected, prefill rate and gstRate
    if (field === "itemId") {
      const selectedItem = itemsList.find(i => i.id === value);
      if (selectedItem) {
        updated[index].rate = selectedItem.purchase_price || 0;
        updated[index].gstRate = selectedItem.gst_percentage || 0;
      } else {
        updated[index].rate = 0;
        updated[index].gstRate = 0;
      }
    }
    setVoucherItems(updated);
  };

  const addItemRow = () => {
    setVoucherItems([...voucherItems, { itemId: "", quantity: 1, rate: 0, gstRate: 0 }]);
  };

  const removeItemRow = (index) => {
    if (voucherItems.length === 1) return; // Keep at least one row
    setVoucherItems(voucherItems.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingId(null);
    setSupplierId("");
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setVoucherNumber("");
    setRemarks("");
    setDiscountAmount(0);
    setVoucherItems([{ itemId: "", quantity: 1, rate: 0, gstRate: 0 }]);
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!supplierId) {
      setError("Please select a Supplier.");
      return;
    }
    if (!voucherNumber) {
      setError("Voucher Number is required.");
      return;
    }
    if (voucherItems.some(item => !item.itemId || item.quantity <= 0 || item.rate < 0)) {
      setError("Please select a valid item, quantity (> 0), and rate (>= 0) for all rows.");
      return;
    }

    try {
      const payload = {
        companyId: activeCompanyId,
        supplierId,
        voucherDate,
        voucherNumber,
        discountAmount: parseFloat(discountAmount) || 0,
        remarks,
        items: voucherItems.map(item => ({
          itemId: item.itemId,
          quantity: parseInt(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          gstRate: parseFloat(item.gstRate) || 0
        }))
      };

      const url = editingId 
        ? `${API_BASE}/api/purchase-vouchers/${editingId}?companyId=${activeCompanyId}`
        : `${API_BASE}/api/purchase-vouchers?companyId=${activeCompanyId}`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save purchase voucher");
      }

      setSuccess(editingId ? "Voucher updated successfully!" : "Voucher created successfully!");
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = async (voucher) => {
    setError("");
    setSuccess("");
    setEditingId(voucher.id);
    
    try {
      const res = await fetch(`${API_BASE}/api/purchase-vouchers/${voucher.id}?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load voucher details");
      
      const data = await res.json();
      const v = data.voucher;
      
      setSupplierId(v.supplier_id);
      // Format date correctly to YYYY-MM-DD
      const dateFormatted = new Date(v.purchase_date).toISOString().split("T")[0];
      setVoucherDate(dateFormatted);
      setVoucherNumber(v.voucher_number);
      setRemarks(v.remarks || "");
      setDiscountAmount(Number(v.discount_amount) || 0);

      // Map items
      const itemsMapped = data.items.map(item => ({
        itemId: item.item_id,
        quantity: item.quantity,
        rate: Number(item.rate),
        gstRate: Number(item.gst_percentage)
      }));
      setVoucherItems(itemsMapped);
    } catch (err) {
      setError(err.message);
      setEditingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to cancel/delete this purchase voucher? Stock levels will be automatically reversed.")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/api/purchase-vouchers/${id}?companyId=${activeCompanyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to cancel voucher");
      }

      setSuccess("Voucher cancelled and stock levels adjusted.");
      fetchData();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!activeCompanyId) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-[#2F2F2F] mb-4">Purchase Voucher Management</h1>
        <div className="bg-[#FFFDF9] p-6 rounded-xl border border-[#EFE7DD] text-[#2F2F2F]/90">
          Please select an active company from Company Management to manage purchase vouchers.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-[#EFE7DD]">
        <div>
          <h1 className="text-3xl font-bold text-[#2F2F2F]">Purchase Vouchers</h1>
          {activeCompanyName && <p className="text-sm text-[#2F2F2F]/70 mt-1">{activeCompanyName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Form Panel - left 7 columns on large screens */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-[#FFFDF9] p-6 border border-[#EFE7DD] rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-[#2F2F2F]">
              {editingId ? "Edit Purchase Voucher" : "New Purchase Voucher"}
            </h2>
            {error && <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-600 text-sm rounded mb-4">{error}</div>}
            {success && <div className="p-3 bg-emerald-900/30 border border-emerald-500/30 text-green-700 text-sm rounded mb-4">{success}</div>}

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Voucher Number *</label>
                  <Input
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    placeholder="PV-XXXX"
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Voucher Date *</label>
                  <Input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F]"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#EFE7DD] pb-2">
                  <h3 className="text-lg font-medium text-[#2F2F2F]">Line Items</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addItemRow}
                    className="bg-[#E7C9A9] hover:bg-[#FFFDF9] text-[#2F2F2F] border-none"
                  >
                    + Add Row
                  </Button>
                </div>

                <div className="space-y-3">
                  {voucherItems.map((item, index) => {
                    const rowSubtotal = (parseInt(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                    const rowGst = rowSubtotal * ((parseFloat(item.gstRate) || 0) / 100);
                    const rowTotal = rowSubtotal + rowGst;

                    return (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-[#F8F4EE]/40 p-3 rounded-2xl border border-[#EFE7DD]">
                        {/* Item Select */}
                        <div className="md:col-span-4">
                          <label className="text-xs text-[#2F2F2F]/70 block mb-1">Item *</label>
                          <select
                            value={item.itemId}
                            onChange={(e) => handleItemChange(index, "itemId", e.target.value)}
                            className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30"
                          >
                            <option value="">Select Item</option>
                            {itemsList.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.item_name} {i.sku ? `(${i.sku})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Qty */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-[#2F2F2F]/70 block mb-1">Qty *</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                            className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F]"
                          />
                        </div>

                        {/* Rate */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-[#2F2F2F]/70 block mb-1">Rate (₹) *</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, "rate", parseFloat(e.target.value) || 0)}
                            className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F]"
                          />
                        </div>

                        {/* GST % */}
                        <div className="md:col-span-2">
                          <label className="text-xs text-[#2F2F2F]/70 block mb-1">GST (%)</label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleItemChange(index, "gstRate", parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>

                        {/* Total & Action */}
                        <div className="md:col-span-2 flex items-center justify-between gap-2">
                          <div className="text-right">
                            <span className="text-[10px] text-[#2F2F2F]/50 block">Total</span>
                            <span className="text-sm font-semibold text-[#2F2F2F]/90">₹{rowTotal.toFixed(2)}</span>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={voucherItems.length === 1}
                            onClick={() => removeItemRow(index)}
                            className="bg-red-500 text-white hover:bg-red-600 transition-colors p-2 h-9 w-9 flex items-center justify-center"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Section: Remarks & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#EFE7DD]">
                {/* Remarks & Notes */}
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Remarks / Notes</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full h-28 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30 resize-none"
                    placeholder="Enter additional comments or reference details..."
                  />
                </div>

                {/* Voucher Calculation Summary */}
                <div className="bg-[#F8F4EE]/60 p-4 rounded-xl border border-[#EFE7DD] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#2F2F2F]/70">Subtotal (Gross):</span>
                    <span className="font-medium text-[#2F2F2F]">₹{subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#2F2F2F]/70">GST (Tax Amount):</span>
                    <span className="font-medium text-[#2F2F2F]">₹{gstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#2F2F2F]/70">Discount (₹):</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-28 h-8 bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] text-right"
                    />
                  </div>
                  <div className="border-t border-[#EFE7DD] my-2 pt-2 flex justify-between items-center">
                    <span className="text-base font-semibold text-[#2F2F2F]">Net Total:</span>
                    <span className="text-lg font-bold text-[#8B5E3C]">₹{netTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-[#C68642] to-[#8B5E3C] hover:bg-[#C68642] text-[#FFFDF9] border-none">
                  {editingId ? "Update Voucher (Ctrl+S)" : "Save Voucher (Ctrl+S)"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F]"
                >
                  {editingId ? "Cancel Edit" : "Reset Form"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* List Panel - right 5 columns on large screens */}
        <div className="xl:col-span-5">
          <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-xl shadow-md overflow-x-auto">
            <div className="p-4 border-b border-[#EFE7DD] bg-[#F8F4EE]/30">
              <h2 className="text-lg font-semibold text-[#2F2F2F]">Voucher Ledger</h2>
            </div>
            
            <table className="w-full text-sm text-left text-[#2F2F2F]/90 min-w-[450px]">
              <thead className="bg-[#F8F4EE]/50 text-[#2F2F2F]/70 uppercase text-xs border-b border-[#EFE7DD]">
                <tr>
                  <th className="px-4 py-3 font-medium">Voucher Details</th>
                  <th className="px-4 py-3 font-medium text-right">Net Total</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-12 text-center text-[#2F2F2F]/50">
                      No purchase vouchers found.
                    </td>
                  </tr>
                ) : (
                  vouchers.map(v => {
                    const isCancelled = !v.is_active;
                    const purchaseDateStr = new Date(v.purchase_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    });
                    
                    return (
                      <tr 
                        key={v.id} 
                        className={`hover:bg-[#E7C9A9] transition-colors ${isCancelled ? 'opacity-40 bg-red-950/10' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#2F2F2F] flex items-center gap-2">
                            <span>{v.voucher_number}</span>
                            {isCancelled && (
                              <span className="text-[9px] font-bold uppercase bg-red-500/20 text-red-600 px-1.5 py-0.5 rounded border border-red-500/30">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#2F2F2F]/70 mt-0.5">{v.supplier_name}</div>
                          <div className="text-[10px] text-[#2F2F2F]/50 mt-0.5">{purchaseDateStr}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-[#2F2F2F]">
                            ₹{Number(v.gross_total).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[#2F2F2F]/50">
                            Tax: ₹{Number(v.gst_amount).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isCancelled}
                            onClick={() => handleEdit(v)}
                            className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F] h-7 text-xs px-2"
                          >
                            Edit
                          </Button>
                          {v.is_active && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(v.id)}
                              className="bg-[#FFFDF9] text-red-600 hover:bg-red-600 hover:text-[#FFFDF9] border border-red-500/20 hover:border-red-500 h-7 text-xs px-2"
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

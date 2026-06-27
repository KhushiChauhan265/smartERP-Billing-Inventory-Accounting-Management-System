"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      unitName: "PCS",
      purchasePrice: 0,
      sellingPrice: 0,
      openingStock: 0,
      reorderLevel: 0,
      gstPercentage: 0
    }
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

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
        // Fetch active company details to get name
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

  const fetchItems = async () => {
    if (!token || !activeCompanyId) return;
    try {
      const res = await fetch(`${API_BASE}/api/items?companyId=${activeCompanyId}&includeInactive=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token, activeCompanyId]);

  const onSubmit = async (data) => {
    setError("");
    try {
      const url = editingId ? `${API_BASE}/api/items/${editingId}` : `${API_BASE}/api/items`;
      const method = editingId ? "PUT" : "POST";
      
      const payload = {
        ...data,
        companyId: activeCompanyId,
        purchasePrice: parseFloat(data.purchasePrice) || 0,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        openingStock: parseInt(data.openingStock) || 0,
        reorderLevel: parseInt(data.reorderLevel) || 0,
        gstPercentage: parseFloat(data.gstPercentage) || 0,
        isActive: data.isActive === undefined ? true : data.isActive === "true"
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to save item");
      
      reset({
        name: "",
        sku: "",
        barcode: "",
        hsnSac: "",
        unitName: "PCS",
        category: "",
        purchasePrice: 0,
        sellingPrice: 0,
        openingStock: 0,
        reorderLevel: 0,
        gstPercentage: 0,
        isActive: "true"
      });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setValue("name", item.item_name);
    setValue("sku", item.sku || "");
    setValue("barcode", item.barcode || "");
    setValue("hsnSac", item.hsn_sac || "");
    setValue("unitName", item.unit_name);
    setValue("category", item.category || "");
    setValue("purchasePrice", item.purchase_price);
    setValue("sellingPrice", item.selling_price);
    setValue("openingStock", item.opening_stock);
    setValue("reorderLevel", item.reorder_level);
    setValue("gstPercentage", item.gst_percentage);
    setValue("isActive", item.is_active.toString());
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to deactivate this item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/items/${id}?companyId=${activeCompanyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchItems();
      else {
        const result = await res.json();
        alert(result.message || "Failed to delete item");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeCompanyId) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-[#2F2F2F] mb-4">Stock Management</h1>
        <div className="bg-[#FFFDF9] p-6 rounded-xl border border-[#EFE7DD] text-[#2F2F2F]/90">
          Please select an active company from Company Management to manage stock items.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-[#EFE7DD]">
        <div>
          <h1 className="text-3xl font-bold text-[#2F2F2F]">Stock Management</h1>
          {activeCompanyName && <p className="text-sm text-[#2F2F2F]/70 mt-1">{activeCompanyName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#FFFDF9] p-6 border border-[#EFE7DD] rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-[#2F2F2F]">
              {editingId ? "Edit Item" : "Create New Item"}
            </h2>
            {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Item Name *</label>
                <Input
                  {...register("name", { required: true })}
                  placeholder="Intel Core i7 13700K"
                  className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">SKU / Code</label>
                  <Input
                    {...register("sku")}
                    placeholder="CPU-I7-13"
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Barcode</label>
                  <Input
                    {...register("barcode")}
                    placeholder="123456789012"
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">HSN / SAC</label>
                  <Input
                    {...register("hsnSac")}
                    placeholder="84713010"
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Category</label>
                  <Input
                    {...register("category")}
                    placeholder="Processors"
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Unit</label>
                  <select
                    {...register("unitName")}
                    className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30"
                  >
                    <option value="PCS">PCS</option>
                    <option value="BOX">BOX</option>
                    <option value="NOS">NOS</option>
                    <option value="KGS">KGS</option>
                    <option value="LTRS">LTRS</option>
                    <option value="MTRS">MTRS</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">GST Rate (%)</label>
                  <select
                    {...register("gstPercentage")}
                    className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Purchase Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("purchasePrice")}
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Sale Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("sellingPrice")}
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Opening Stock</label>
                  <Input
                    type="number"
                    {...register("openingStock")}
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Reorder Level</label>
                  <Input
                    type="number"
                    {...register("reorderLevel")}
                    className="bg-[#F8F4EE] border-[#EFE7DD] text-[#2F2F2F] placeholder:text-[#2F2F2F]/50"
                  />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="text-sm font-medium text-[#2F2F2F]/90 block mb-1">Status</label>
                  <select
                    {...register("isActive")}
                    className="w-full h-10 px-3 py-2 rounded-full bg-[#F8F4EE] border border-[#EFE7DD] text-[#2F2F2F] focus:outline-none focus:ring-1 focus:border-[#C68642] focus:ring-[#C68642]/30"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-[#C68642] to-[#8B5E3C] hover:bg-[#C68642] text-[#FFFDF9] border-none">
                  {editingId ? "Update" : "Save"}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      reset({
                        name: "",
                        sku: "",
                        barcode: "",
                        hsnSac: "",
                        unitName: "PCS",
                        category: "",
                        purchasePrice: 0,
                        sellingPrice: 0,
                        openingStock: 0,
                        reorderLevel: 0,
                        gstPercentage: 0,
                        isActive: "true"
                      });
                    }}
                    className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F]"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2">
          <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-xl shadow-md overflow-x-auto">
            <table className="w-full text-sm text-left text-[#2F2F2F]/90 min-w-[700px]">
              <thead className="bg-[#F8F4EE]/50 text-[#2F2F2F]/70 uppercase text-xs border-b border-[#EFE7DD]">
                <tr>
                  <th className="px-6 py-4 font-medium">Item Name & SKU</th>
                  <th className="px-6 py-4 font-medium">Category / Unit</th>
                  <th className="px-6 py-4 font-medium text-right">Pricing (Pur / Sale)</th>
                  <th className="px-6 py-4 font-medium text-right">Stock / Reorder</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-[#2F2F2F]/50">
                      No stock items found for this company.
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const isLowStock = item.quantity <= item.reorder_level;
                    return (
                      <tr key={item.id} className={`hover:bg-[#E7C9A9] transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#2F2F2F]">{item.item_name}</div>
                          {item.sku && <div className="text-xs text-[#2F2F2F]/50 mt-0.5">SKU: {item.sku}</div>}
                          <div className="text-[10px] text-[#2F2F2F]/50 mt-0.5">
                            {item.hsn_sac && <span className="mr-2">HSN: {item.hsn_sac}</span>}
                            {item.barcode && <span>EAN: {item.barcode}</span>}
                          </div>
                          {!item.is_active && (
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-red-500/20 text-red-600 px-2 py-0.5 rounded border border-red-500/30">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[#2F2F2F]/90">{item.category || "General"}</div>
                          <div className="text-xs text-[#2F2F2F]/50 mt-0.5">{item.unit_name}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-[#2F2F2F]">
                            ₹{Number(item.purchase_price).toFixed(2)} / ₹{Number(item.selling_price).toFixed(2)}
                          </div>
                          <div className="text-xs text-[#2F2F2F]/50 mt-0.5">GST: {item.gst_percentage}%</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`font-semibold ${isLowStock && item.is_active ? 'text-[#C68642]' : 'text-[#2F2F2F]'}`}>
                            {item.quantity} {item.unit_name}
                          </div>
                          <div className="text-xs text-[#2F2F2F]/50 mt-0.5">Reorder at: {item.reorder_level}</div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="border-[#EFE7DD] text-[#2F2F2F]/90 hover:bg-[#E7C9A9] hover:text-[#2F2F2F]"
                          >
                            Edit
                          </Button>
                          {item.is_active && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Delete
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

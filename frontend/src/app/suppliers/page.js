"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { openingBalanceType: "CREDIT", openingBalance: 0, groupId: "" }
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
    if (active) setActiveCompanyId(active);
  }, []);

  const fetchSuppliers = async () => {
    if (!token || !activeCompanyId) return;
    try {
      const res = await fetch(`${API_BASE}/api/suppliers?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();
      setSuppliers(data.suppliers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async () => {
    if (!token || !activeCompanyId) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups?companyId=${activeCompanyId}&isActive=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      // Filter for LIABILITY and EXPENSE type groups
      const filtered = data.groups.filter(g => g.type === "LIABILITY" || g.type === "EXPENSE");
      setGroups(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchGroups();
  }, [token, activeCompanyId]);

  const onSubmit = async (data) => {
    setError("");
    try {
      const url = editingId ? `${API_BASE}/api/suppliers/${editingId}` : `${API_BASE}/api/suppliers`;
      const method = editingId ? "PUT" : "POST";
      
      const payload = {
        ...data,
        companyId: activeCompanyId,
        openingBalance: parseFloat(data.openingBalance) || 0
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
      if (!res.ok) throw new Error(result.message || "Failed to save supplier");
      
      reset({ openingBalanceType: "CREDIT", openingBalance: 0, groupId: "" });
      setEditingId(null);
      fetchSuppliers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setValue("name", s.supplier_name);
    setValue("code", s.code || "");
    setValue("contactPerson", s.contact_person || "");
    setValue("mobileNumber", s.mobile_number || "");
    setValue("email", s.email || "");
    setValue("address", s.address || "");
    setValue("gstin", s.gstin || "");
    setValue("openingBalance", s.opening_balance);
    setValue("openingBalanceType", s.opening_balance_type);
    setValue("groupId", s.group_id || "");
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/${id}?companyId=${activeCompanyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchSuppliers();
      else {
        const result = await res.json();
        alert(result.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeCompanyId) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-white mb-4">Supplier Ledger Management</h1>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300">
          Please select an active company from Company Management to manage suppliers.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex justify-between items-center pb-4 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-white">Supplier Ledger Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 p-6 border border-slate-700 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-white">{editingId ? "Edit Supplier" : "Create New Supplier"}</h2>
            {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Name *</label>
                <Input {...register("name", { required: true })} placeholder="Supplier Name" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Code</label>
                  <Input {...register("code")} placeholder="SUP001" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Contact Person</label>
                  <Input {...register("contactPerson")} placeholder="Name" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Phone</label>
                  <Input {...register("mobileNumber")} placeholder="98765..." className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Email</label>
                  <Input {...register("email")} placeholder="s@example.com" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Address</label>
                <textarea {...register("address")} className="w-full h-20 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Full address" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">GSTIN</label>
                <Input {...register("gstin")} placeholder="27ABCDE1234F1Z5" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Group</label>
                <select {...register("groupId")} className="w-full h-10 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">None</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-300 block mb-1">Opening Balance</label>
                  <Input type="number" step="0.01" {...register("openingBalance")} className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-300 block mb-1">Dr/Cr</label>
                  <select {...register("openingBalanceType")} className="w-full h-10 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="CREDIT">CREDIT (Cr)</option>
                    <option value="DEBIT">DEBIT (Dr)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-none">{editingId ? "Update" : "Save"}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => {setEditingId(null); reset({ openingBalanceType: "CREDIT", openingBalance: 0 });}} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300 min-w-[600px]">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Supplier Details</th>
                  <th className="px-6 py-4 font-medium">Group</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium text-right">Opening Bal</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No suppliers found for this company.</td>
                  </tr>
                ) : (
                  suppliers.map(s => (
                    <tr key={s.id} className={`hover:bg-slate-700/30 transition-colors ${!s.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-100">{s.supplier_name}</div>
                        {s.code && <div className="text-xs text-slate-500 mt-0.5">{s.code}</div>}
                        {s.gstin && <div className="text-xs text-indigo-400 mt-0.5">GST: {s.gstin}</div>}
                        {!s.is_active && <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">Inactive</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{s.group_name || 'None'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{s.contact_person || '-'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.mobile_number || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-200">{Number(s.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.opening_balance_type === 'DEBIT' ? 'Dr' : 'Cr'}</div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(s)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Edit</Button>
                        {s.is_active && (
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500">Delete</Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

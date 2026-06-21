"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LedgersPage() {
  const [ledgers, setLedgers] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { type: "ASSET", openingBalanceType: "DEBIT", openingBalance: 0 }
  });
  
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  useEffect(() => {
    const active = localStorage.getItem("activeCompanyId");
    if (active) {
      setActiveCompanyId(active);
    }
  }, []);

  const fetchLedgers = async () => {
    if (!token || !activeCompanyId) return;
    try {
      const res = await fetch(`${API_BASE}/api/ledgers?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch ledgers");
      const data = await res.json();
      setLedgers(data.ledgers);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, [token, activeCompanyId]);

  const onSubmit = async (data) => {
    setError("");
    try {
      const url = editingId ? `${API_BASE}/api/ledgers/${editingId}` : `${API_BASE}/api/ledgers`;
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
      if (!res.ok) throw new Error(result.message || "Failed to save ledger");
      
      reset({ type: "ASSET", openingBalanceType: "DEBIT", openingBalance: 0 });
      setEditingId(null);
      fetchLedgers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (ledger) => {
    setEditingId(ledger.id);
    setValue("name", ledger.name);
    setValue("code", ledger.code || "");
    setValue("type", ledger.type);
    setValue("groupName", ledger.group_name || "");
    setValue("openingBalance", ledger.opening_balance);
    setValue("openingBalanceType", ledger.opening_balance_type);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/ledgers/${id}?companyId=${activeCompanyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLedgers();
      } else {
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
        <h1 className="text-3xl font-bold text-white mb-4">Ledger Management</h1>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300">
          Please select an active company from Company Management to manage ledgers.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex justify-between items-center pb-4 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-white">Ledger Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 p-6 border border-slate-700 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-white">{editingId ? "Edit Ledger" : "Create New Ledger"}</h2>
            {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Ledger Name *</label>
                <Input {...register("name", { required: true })} placeholder="Cash A/c" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Ledger Code</label>
                <Input {...register("code")} placeholder="CASH001" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Type *</label>
                <select {...register("type", { required: true })} className="w-full h-10 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Group Name</label>
                <Input {...register("groupName")} placeholder="Bank Accounts" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-300 block mb-1">Opening Balance</label>
                  <Input type="number" step="0.01" {...register("openingBalance")} className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-300 block mb-1">Dr/Cr</label>
                  <select {...register("openingBalanceType")} className="w-full h-10 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="DEBIT">DEBIT (Dr)</option>
                    <option value="CREDIT">CREDIT (Cr)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-none">{editingId ? "Update" : "Save"}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => {setEditingId(null); reset({ type: "ASSET", openingBalanceType: "DEBIT", openingBalance: 0 });}} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel: Table */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Name & Code</th>
                  <th className="px-6 py-4 font-medium">Type / Group</th>
                  <th className="px-6 py-4 font-medium text-right">Opening Bal</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {ledgers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">No ledgers found for this company.</td>
                  </tr>
                ) : (
                  ledgers.map(ledger => (
                    <tr key={ledger.id} className={`hover:bg-slate-700/30 transition-colors ${!ledger.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-100">{ledger.name}</div>
                        {ledger.code && <div className="text-xs text-slate-500 mt-0.5">{ledger.code}</div>}
                        {!ledger.is_active && <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">Inactive</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{ledger.type}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{ledger.group_name || "No Group"}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-slate-200">{Number(ledger.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{ledger.opening_balance_type === 'DEBIT' ? 'Dr' : 'Cr'}</div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(ledger)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Edit</Button>
                        {ledger.is_active && (
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(ledger.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500">Delete</Button>
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

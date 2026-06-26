"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, setValue } = useForm();
  
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  const fetchCompanies = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCompanies(data.companies);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetchCompanies();
    const active = localStorage.getItem("activeCompanyId");
    if (active) setActiveCompanyId(active);
  }, [token]);

  const onSubmit = async (data) => {
    setError("");
    try {
      const url = editingId ? `${API_BASE}/api/companies/${editingId}` : `${API_BASE}/api/companies`;
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to save");
      
      reset();
      setEditingId(null);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (comp) => {
    setEditingId(comp.id);
    setValue("company_name", comp.company_name);
    setValue("address", comp.address || "");
    setValue("gst_number", comp.gst_number || "");
    setValue("state", comp.state || "");
    setValue("financial_year_start", comp.financial_year_start || "");
    setValue("financial_year_end", comp.financial_year_end || "");
    setValue("contact_number", comp.contact_number || "");
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (activeCompanyId === id) {
          localStorage.removeItem("activeCompanyId");
          setActiveCompanyId(null);
        }
        fetchCompanies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectActive = (id) => {
    localStorage.setItem("activeCompanyId", id);
    setActiveCompanyId(id);
  };

  const activeCompanyName = companies.find(c => c.id === activeCompanyId)?.company_name;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex justify-between items-center pb-4 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-white">Company Management</h1>
        <div className="text-sm font-medium text-slate-300">
          Active Company: {activeCompanyName ? <span className="text-indigo-400 font-bold">{activeCompanyName}</span> : <span className="text-slate-500">None Selected</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 p-6 border border-slate-700 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-white">{editingId ? "Edit Company" : "Create New Company"}</h2>
            {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
            
            <div className="text-sm text-slate-400 mb-6">
              Manage your companies here. You can add as many as you need.
            </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Company Name *</label>
                  <Input {...register("company_name", { required: true })} placeholder="My Business" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">GST Number</label>
                  <Input {...register("gst_number")} placeholder="22AAAAA0000A1Z5" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">State</label>
                  <Input {...register("state")} placeholder="Maharashtra" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Address</label>
                  <Input {...register("address")} placeholder="123 Main St" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Contact Number</label>
                  <Input {...register("contact_number")} placeholder="9876543210" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-300 block mb-1">FY Start</label>
                    <Input {...register("financial_year_start")} placeholder="01-04-2023" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-300 block mb-1">FY End</label>
                    <Input {...register("financial_year_end")} placeholder="31-03-2024" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-none">{editingId ? "Update" : "Save"}</Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={() => {setEditingId(null); reset();}} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
                  )}
                </div>
              </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Company Name</th>
                  <th className="px-6 py-4 font-medium">GST / State</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-500">No companies found. Create one to get started.</td>
                  </tr>
                ) : (
                  companies.map(comp => (
                    <tr key={comp.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-100">{comp.company_name}</div>
                        {activeCompanyId === comp.id && <span className="inline-block mt-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">Active</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{comp.gst_number || "No GST"}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{comp.state || "No State"}</div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <Button variant="outline" size="sm" onClick={() => handleSelectActive(comp.id)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Select</Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(comp)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(comp.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500">Delete</Button>
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

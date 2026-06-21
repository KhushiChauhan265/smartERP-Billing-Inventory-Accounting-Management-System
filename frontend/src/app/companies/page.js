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
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold">Company Management</h1>
        <div className="text-sm font-medium">
          Active Company: {activeCompanyName ? <span className="text-blue-600 font-bold">{activeCompanyName}</span> : <span className="text-gray-500">None Selected</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-4 border rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit Company" : "Create New Company"}</h2>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            
            {companies.length >= 5 && !editingId ? (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                You have reached the maximum limit of 5 companies.
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Company Name *</label>
                  <Input {...register("company_name", { required: true })} placeholder="My Business" />
                </div>
                <div>
                  <label className="text-sm font-medium">GST Number</label>
                  <Input {...register("gst_number")} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Input {...register("state")} placeholder="Maharashtra" />
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input {...register("address")} placeholder="123 Main St" />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Number</label>
                  <Input {...register("contact_number")} placeholder="9876543210" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium">FY Start</label>
                    <Input {...register("financial_year_start")} placeholder="01-04-2023" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">FY End</label>
                    <Input {...register("financial_year_end")} placeholder="31-03-2024" />
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button type="submit" className="w-full">{editingId ? "Update" : "Save"}</Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={() => {setEditingId(null); reset();}}>Cancel</Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">GST / State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-gray-500">No companies found. Create one to get started.</td>
                  </tr>
                ) : (
                  companies.map(comp => (
                    <tr key={comp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {comp.company_name}
                        {activeCompanyId === comp.id && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Active</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">{comp.gst_number || "No GST"}</div>
                        <div className="text-xs text-gray-500">{comp.state || "No State"}</div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleSelectActive(comp.id)}>Select</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(comp)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(comp.id)}>Delete</Button>
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

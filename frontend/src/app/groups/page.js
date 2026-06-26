"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [activeCompanyName, setActiveCompanyName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { type: "ASSET", isPrimary: false }
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

  const fetchGroups = async () => {
    if (!token || !activeCompanyId) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(data.groups);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [token, activeCompanyId]);

  const onSubmit = async (data) => {
    setError("");
    try {
      const url = editingId ? `${API_BASE}/api/groups/${editingId}` : `${API_BASE}/api/groups`;
      const method = editingId ? "PUT" : "POST";
      
      const payload = {
        ...data,
        companyId: activeCompanyId,
        parentGroupId: data.parentGroupId || null
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
      if (!res.ok) throw new Error(result.message || "Failed to save group");
      
      reset({ type: "ASSET", isPrimary: false, parentGroupId: "" });
      setEditingId(null);
      fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setValue("name", g.name);
    setValue("code", g.code || "");
    setValue("type", g.type);
    setValue("parentGroupId", g.parent_group_id || "");
    setValue("isPrimary", g.is_primary);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/${id}?companyId=${activeCompanyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchGroups();
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
        <h1 className="text-3xl font-bold text-white mb-4">Group Management</h1>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300">
          Please select an active company from Company Management to manage groups.
        </div>
      </div>
    );
  }

  // Helper to find parent name
  const getParentName = (parentId) => {
    if (!parentId) return "None";
    const parent = groups.find(g => g.id === parentId);
    return parent ? parent.name : "None";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex justify-between items-center pb-4 border-b border-slate-700">
        <div>
          <h1 className="text-3xl font-bold text-white">Group Management</h1>
          {activeCompanyName && <p className="text-sm text-slate-400 mt-1">{activeCompanyName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 p-6 border border-slate-700 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-white">{editingId ? "Edit Group" : "Create New Group"}</h2>
            {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Group Name *</label>
                <Input {...register("name", { required: true })} placeholder="Sundry Debtors" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Group Code</label>
                <Input {...register("code")} placeholder="GRP01" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
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
                <label className="text-sm font-medium text-slate-300 block mb-1">Parent Group</label>
                <select {...register("parentGroupId")} className="w-full h-10 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">None</option>
                  {groups.filter(g => g.id !== editingId && g.is_active).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="isPrimary" {...register("isPrimary")} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-600" />
                <label htmlFor="isPrimary" className="text-sm font-medium text-slate-300">Is Primary Group</label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-none">{editingId ? "Update" : "Save"}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => {setEditingId(null); reset({ type: "ASSET", isPrimary: false, parentGroupId: "" });}} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
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
                  <th className="px-6 py-4 font-medium">Group Name & Code</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Parent Group</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">No groups found for this company.</td>
                  </tr>
                ) : (
                  groups.map(g => (
                    <tr key={g.id} className={`hover:bg-slate-700/30 transition-colors ${!g.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-100">
                          {g.is_primary ? <span className="mr-2 text-indigo-400">★</span> : null}
                          {g.name}
                        </div>
                        {g.code && <div className="text-xs text-slate-500 mt-0.5">{g.code}</div>}
                        {!g.is_active && <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">Inactive</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{g.type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{getParentName(g.parent_group_id)}</div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(g)} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Edit</Button>
                        {g.is_active && (
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(g.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500">Delete</Button>
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

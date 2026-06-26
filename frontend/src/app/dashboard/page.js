"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [activeCompany, setActiveCompany] = useState(null);
  
  // Billing metrics states
  const [sales30Days, setSales30Days] = useState(0);
  const [purchases30Days, setPurchases30Days] = useState(0);
  const [activeSalesCount, setActiveSalesCount] = useState(0);
  const [cancelledSalesCount, setCancelledSalesCount] = useState(0);
  const [activePurchasesCount, setActivePurchasesCount] = useState(0);
  const [cancelledPurchasesCount, setCancelledPurchasesCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const activeCompanyId = typeof window !== "undefined" ? localStorage.getItem("activeCompanyId") : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    
    // Fetch user
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error);

    // Fetch active company details
    if (activeCompanyId) {
      fetch(`${API_BASE}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const comp = data.companies?.find(c => c.id === activeCompanyId);
          if (comp) setActiveCompany(comp);
        })
        .catch(console.error);

      // Fetch items to count low stock
      fetch(`${API_BASE}/api/items?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const items = data.items || [];
          const lowStock = items.filter(i => i.is_active && i.quantity <= i.reorder_level);
          setLowStockCount(lowStock.length);
        })
        .catch(console.error);

      // Fetch sales billing stats
      fetch(`${API_BASE}/api/billing/sales?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const vouchers = data.vouchers || [];
          let sum30 = 0;
          let activeCnt = 0;
          let cancelledCnt = 0;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          vouchers.forEach(v => {
            const billDate = new Date(v.invoice_date);
            if (v.is_active) {
              activeCnt++;
              if (billDate >= thirtyDaysAgo) {
                sum30 += Number(v.gross_total) || 0;
              }
            } else {
              cancelledCnt++;
            }
          });

          setSales30Days(sum30);
          setActiveSalesCount(activeCnt);
          setCancelledSalesCount(cancelledCnt);
        })
        .catch(console.error);

      // Fetch purchase billing stats
      fetch(`${API_BASE}/api/billing/purchase?companyId=${activeCompanyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const vouchers = data.vouchers || [];
          let sum30 = 0;
          let activeCnt = 0;
          let cancelledCnt = 0;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          vouchers.forEach(v => {
            const billDate = new Date(v.purchase_date);
            if (v.is_active) {
              activeCnt++;
              if (billDate >= thirtyDaysAgo) {
                sum30 += Number(v.gross_total) || 0;
              }
            } else {
              cancelledCnt++;
            }
          });

          setPurchases30Days(sum30);
          setActivePurchasesCount(activeCnt);
          setCancelledPurchasesCount(cancelledCnt);
        })
        .catch(console.error);
    }
  }, [token, activeCompanyId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="text-sm font-medium text-slate-300">
          Active Company: {activeCompany ? <span className="text-indigo-400 font-bold">{activeCompany.company_name}</span> : <span className="text-slate-500">None Selected</span>}
        </div>
      </div>

      {/* Welcome Card */}
      <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
        <h2 className="text-2xl font-semibold text-white mb-2">Welcome, {user?.fullName || user?.email || "User"}</h2>
        {activeCompany ? (
          <p className="text-slate-400 text-lg">You are working in <strong className="text-slate-200">{activeCompany.company_name}</strong>.</p>
        ) : (
          <p className="text-slate-400 text-lg">You haven't selected a company to work in.</p>
        )}
      </div>

      {/* Company Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Company Overview */}
        <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 flex flex-col">
          <h3 className="text-lg font-medium text-white mb-4">Company Overview</h3>
          {activeCompany ? (
            <div className="space-y-3 text-slate-300 flex-1">
              <p><span className="text-slate-500 w-24 inline-block">Name:</span> <span className="font-medium text-slate-100">{activeCompany.company_name}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">GST Status:</span> {activeCompany.gst_number || "No GST"}</p>
              <p><span className="text-slate-500 w-24 inline-block">State:</span> {activeCompany.state || "N/A"}</p>
            </div>
          ) : (
            <div className="text-slate-400 flex-1 flex items-center">
              No active company selected. Go to Company Management to select or create one.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
          <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/companies" className="flex flex-col items-center justify-center p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-center h-24 shadow-md">
              <span className="font-medium">Manage Companies</span>
            </Link>
            <Link href="/sales-vouchers" className="flex flex-col items-center justify-center p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-center h-24 shadow-md">
              <span className="font-medium">Create Invoice</span>
            </Link>
            <Link href="/billing" className="flex flex-col items-center justify-center p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-center h-24 shadow-md border border-slate-600">
              <span className="font-medium">Billing Ledger</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Billing & Stock Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <p className="text-slate-400 text-sm font-medium mb-1">Sales (Last 30 Days)</p>
            <p className="text-3xl font-bold text-white">₹{sales30Days.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <p className="text-slate-400 text-sm font-medium mb-1">Purchases (Last 30 Days)</p>
            <p className="text-3xl font-bold text-white">₹{purchases30Days.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <p className="text-slate-400 text-sm font-medium mb-1">Low Stock Items</p>
            <p className={`text-3xl font-bold ${lowStockCount > 0 ? "text-amber-400" : "text-white"}`}>
              {lowStockCount}
            </p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 space-y-1">
            <p className="text-slate-400 text-xs font-medium">Vouchers Count</p>
            <p className="text-xs text-slate-300">
              Sales: <span className="text-white font-bold">{activeSalesCount}</span> Act / <span className="text-slate-500 font-bold">{cancelledSalesCount}</span> Can
            </p>
            <p className="text-xs text-slate-300">
              Purchases: <span className="text-white font-bold">{activePurchasesCount}</span> Act / <span className="text-slate-500 font-bold">{cancelledPurchasesCount}</span> Can
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

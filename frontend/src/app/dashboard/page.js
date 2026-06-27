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
    <div className="w-full">
      {/* Welcome Card */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md mb-8">
        <h2 className="text-2xl font-bold text-[#8B5E3C] mb-2">Welcome back, {user?.fullName || user?.email || "User"}</h2>
        <p className="text-[#2F2F2F]">Here’s a quick overview of your business today.</p>
        <div className="mt-4 pt-4 border-t border-[#EFE7DD]">
          {activeCompany ? (
            <p className="text-[#2F2F2F] font-medium">
              Active Company: <span className="text-[#C68642]">{activeCompany.company_name}</span>
            </p>
          ) : (
            <p className="text-[#2F2F2F]/70">No active company selected. Navigate to Companies to set one up.</p>
          )}
        </div>
      </div>

      {/* Statistic Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-[#2F2F2F]/70 mb-1">Sales (30 Days)</p>
          <p className="text-3xl font-bold text-[#8B5E3C]">₹{sales30Days.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-[#2F2F2F]/50 mt-2">{activeSalesCount} Active Vouchers</p>
        </div>
        <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-[#2F2F2F]/70 mb-1">Purchases (30 Days)</p>
          <p className="text-3xl font-bold text-[#8B5E3C]">₹{purchases30Days.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-[#2F2F2F]/50 mt-2">{activePurchasesCount} Active Vouchers</p>
        </div>
        <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-[#2F2F2F]/70 mb-1">Low Stock Items</p>
          <p className="text-3xl font-bold text-[#C68642]">{lowStockCount}</p>
          <p className="text-xs text-[#2F2F2F]/50 mt-2">Requires immediate reorder</p>
        </div>
        <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-[#2F2F2F]/70 mb-1">Cancelled Operations</p>
          <p className="text-3xl font-bold text-[#2F2F2F]">{cancelledSalesCount + cancelledPurchasesCount}</p>
          <p className="text-xs text-[#2F2F2F]/50 mt-2">Sales: {cancelledSalesCount} / Pur: {cancelledPurchasesCount}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md mb-8">
        <h3 className="text-lg font-semibold text-[#8B5E3C] mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link href="/sales-vouchers" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow-md hover:shadow-lg transition-all duration-150 hover:scale-[1.01]">
            New Sales Voucher
          </Link>
          <Link href="/purchase-vouchers" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow-md hover:shadow-lg transition-all duration-150 hover:scale-[1.01]">
            New Purchase Voucher
          </Link>
          <Link href="/billing" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow-md hover:shadow-lg transition-all duration-150 hover:scale-[1.01]">
            Go to Invoices
          </Link>
          <Link href="/reports" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow-md hover:shadow-lg transition-all duration-150 hover:scale-[1.01]">
            Go to Reports
          </Link>
        </div>
      </div>
      
      {/* Business Insights */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl p-6 shadow-md">
        <h3 className="text-lg font-semibold text-[#8B5E3C] mb-4">Business Insights</h3>
        <p className="text-[#2F2F2F]">Your business is operating smoothly. Keep an eye on low stock items and review your GST liabilities in the Reports module.</p>
      </div>
    </div>
  );
}

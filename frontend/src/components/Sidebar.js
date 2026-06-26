"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check if token exists to handle login/logout states
    setToken(localStorage.getItem("authToken"));
  }, [pathname]);

  // Hide sidebar on login and register pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("activeCompanyId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col hidden md:flex min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <Link href="/dashboard" className="text-xl font-bold text-white tracking-wider">
          Smart<span className="text-indigo-400">ERP</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/dashboard" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/dashboard" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Dashboard
        </Link>
        <Link href="/companies" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/companies" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Companies
        </Link>
        <Link href="/ledgers" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/ledgers" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Ledgers
        </Link>
        <Link href="/groups" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/groups" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Groups
        </Link>
        <Link href="/customers" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/customers" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Customers
        </Link>
        <Link href="/suppliers" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/suppliers" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Suppliers
        </Link>
        <Link href="/purchase-vouchers" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/purchase-vouchers" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Purchase Vouchers
        </Link>
        <Link href="/sales-vouchers" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/sales-vouchers" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Sales Vouchers
        </Link>
        <Link href="/invoices" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/invoices" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Invoices
        </Link>
        <Link href="/inventory" className={`block px-4 py-2 rounded-md transition-colors ${pathname === "/inventory" ? "bg-indigo-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}>
          Inventory
        </Link>
      </nav>
      {token && (
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-md border border-red-500/20 hover:border-red-500 transition-all"
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}

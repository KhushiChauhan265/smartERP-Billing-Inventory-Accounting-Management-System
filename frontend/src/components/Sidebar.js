"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const [token, setToken] = useState(null);
  const [userFullName, setUserFullName] = useState("");

  useEffect(() => {
    // Check if token exists to handle login/logout states
    setToken(localStorage.getItem("authToken"));
    setUserFullName(localStorage.getItem("userFullName") || "User");
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

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Companies", href: "/companies" },
    { name: "Ledgers", href: "/ledgers" },
    { name: "Groups", href: "/groups" },
    { name: "Customers", href: "/customers" },
    { name: "Suppliers", href: "/suppliers" },
    { name: "Purchase Vouchers", href: "/purchase-vouchers" },
    { name: "Sales Vouchers", href: "/sales-vouchers" },
    { name: "Invoices", href: "/billing" },
    { name: "Reports", href: "/reports" },
    { name: "Inventory", href: "/inventory" },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between h-[90vh] mt-8 ml-6 w-64 bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl shadow-md sticky top-8">
      {/* Top Section */}
      <div className="p-6">
        <Link href="/dashboard" className="text-xl font-bold text-[#2F2F2F] tracking-wide block">
          Smart<span className="text-[#C68642]">ERP</span>
        </Link>
      </div>

      {/* Middle Section - Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide pb-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[#C68642] text-[#FFFDF9] shadow-sm hover:scale-[1.02]"
                  : "text-[#2F2F2F] hover:bg-[#E7C9A9] hover:text-[#2F2F2F]"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Profile & Logout */}
      {token && (
        <div className="p-4 border-t border-[#EFE7DD] m-2 rounded-xl bg-[#F8F4EE]">
          <div className="text-xs text-[#2F2F2F]/60 mb-1">Logged in as</div>
          <div className="text-sm font-semibold text-[#8B5E3C] mb-3 truncate">
            {userFullName}
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-xs font-medium text-[#8B5E3C] hover:text-[#FFFDF9] hover:bg-[#8B5E3C] rounded-lg border border-[#8B5E3C]/30 transition-all duration-150"
          >
            Log Out
          </button>
        </div>
      )}
    </aside>
  );
}

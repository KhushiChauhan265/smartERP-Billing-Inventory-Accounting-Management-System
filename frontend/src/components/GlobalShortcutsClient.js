"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePageShortcuts } from "@/hooks/usePageShortcuts";

export default function GlobalShortcutsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("activeCompanyId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  const globalShortcuts = [
    { key: "f1", handler: () => router.push("/companies") }, // Company Selection
    { key: "f2", handler: () => alert("Change Financial Year (Not fully implemented yet)") },
    { key: "f3", handler: () => router.push("/companies") }, // Company Info
    { key: "f4", handler: () => setShowCalculator(true) }, // Calculator
    { key: "f5", handler: () => router.refresh() }, // Refresh
    { key: "f6", handler: () => alert("Receipt Voucher not fully implemented yet") },
    { key: "f7", handler: () => alert("Journal Voucher not fully implemented yet") },
    { key: "f8", handler: () => router.push("/sales-vouchers") },
    { key: "f9", handler: () => router.push("/purchase-vouchers") },
    { key: "f10", handler: () => alert("Reversing Journal not fully implemented yet") },
    { key: "f8", altKey: true, handler: () => alert("Credit Note not fully implemented yet") },
    { key: "f9", altKey: true, handler: () => alert("Debit Note not fully implemented yet") },
    { key: "escape", handler: () => {
        if (showHelpPanel) setShowHelpPanel(false);
        else if (showCalculator) setShowCalculator(false);
        else router.back();
      }, allowInInput: true }, // ESC -> Previous Screen / close modals
    { key: "q", ctrlKey: true, handler: handleLogout },
    { key: "h", ctrlKey: true, handler: () => router.push("/dashboard") },
    { key: "k", ctrlKey: true, handler: () => setShowHelpPanel(true), allowInInput: true },
    { key: "f", ctrlKey: true, shiftKey: true, handler: () => setShowHelpPanel(true), allowInInput: true },
  ];

  usePageShortcuts(globalShortcuts);

  // If we're on login or register, don't render the global overlay buttons
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const evalCalc = () => {
    try {
      // eslint-disable-next-line no-eval
      setCalcInput(eval(calcInput).toString());
    } catch(e) {
      setCalcInput("Error");
    }
  };

  return (
    <>
      {/* Keyboard Shortcuts Button */}
      <button
        onClick={() => setShowHelpPanel(!showHelpPanel)}
        className="fixed right-6 bottom-6 rounded-full px-4 py-2 text-xs font-medium bg-[#C68642] text-[#FFFDF9] shadow-md hover:bg-[#8B5E3C] transition-all z-40"
      >
        Keyboard Shortcuts (Ctrl+K)
      </button>

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed right-6 bottom-20 w-64 bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl shadow-xl p-4 z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-[#8B5E3C]">Calculator</h3>
            <button onClick={() => setShowCalculator(false)} className="text-[#2F2F2F] text-xs hover:text-red-500 font-bold">X</button>
          </div>
          <input
            type="text"
            value={calcInput}
            onChange={(e) => setCalcInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && evalCalc()}
            autoFocus
            className="w-full bg-[#F8F4EE] border border-[#EFE7DD] rounded-xl px-3 py-2 text-[#2F2F2F] focus:outline-none focus:border-[#C68642] mb-2 text-right"
            placeholder="0"
          />
          <div className="grid grid-cols-4 gap-2">
             {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map(btn => (
               <button
                 key={btn}
                 onClick={() => {
                   if(btn === "=") evalCalc();
                   else setCalcInput(prev => prev === "Error" ? btn : prev + btn);
                 }}
                 className="bg-[#F8F4EE] border border-[#EFE7DD] rounded-xl py-2 text-sm text-[#2F2F2F] hover:bg-[#E7C9A9] font-medium"
               >
                 {btn}
               </button>
             ))}
          </div>
        </div>
      )}

      {/* Help Panel */}
      {showHelpPanel && (
        <div className="fixed right-6 top-20 w-[340px] max-h-[75vh] overflow-y-auto scrollbar-hide bg-[#FFFDF9] border border-[#EFE7DD] rounded-2xl shadow-xl p-5 z-50">
          <button
            onClick={() => setShowHelpPanel(false)}
            className="absolute top-4 right-4 text-xs font-bold text-[#8B5E3C] hover:text-red-500 bg-[#F8F4EE] w-6 h-6 rounded-full flex items-center justify-center"
          >
            X
          </button>
          <h2 className="text-lg font-bold text-[#8B5E3C] mb-4 border-b border-[#EFE7DD] pb-2">Keyboard Shortcuts</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Global Shortcuts</h3>
              <ShortcutRow keys="F1" label="Company Selection" />
              <ShortcutRow keys="F2" label="Change Financial Year" />
              <ShortcutRow keys="F3" label="Company Information" />
              <ShortcutRow keys="F4" label="Calculator" />
              <ShortcutRow keys="F5" label="Refresh" />
              <ShortcutRow keys="ESC" label="Previous Screen" />
              <ShortcutRow keys="CTRL + Q" label="Logout" />
              <ShortcutRow keys="CTRL + H" label="Home" />
              <ShortcutRow keys="CTRL + K" label="Command Search" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Masters Shortcuts</h3>
              <ShortcutRow keys="ALT + L" label="Create Ledger" />
              <ShortcutRow keys="ALT + A" label="Alter Ledger" />
              <ShortcutRow keys="ALT + G" label="Create Group" />
              <ShortcutRow keys="ALT + S" label="Create Stock Item" />
              <ShortcutRow keys="ALT + U" label="Unit Creation" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Voucher Shortcuts</h3>
              <ShortcutRow keys="F6" label="Receipt Voucher" />
              <ShortcutRow keys="F7" label="Journal Voucher" />
              <ShortcutRow keys="F8" label="Sales Voucher" />
              <ShortcutRow keys="F9" label="Purchase Voucher" />
              <ShortcutRow keys="F10" label="Reversing Journal" />
              <ShortcutRow keys="ALT + F8" label="Credit Note" />
              <ShortcutRow keys="ALT + F9" label="Debit Note" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Inventory Shortcuts</h3>
              <ShortcutRow keys="CTRL + I" label="Inventory Dashboard" />
              <ShortcutRow keys="CTRL + N" label="New Item" />
              <ShortcutRow keys="CTRL + E" label="Edit Item" />
              <ShortcutRow keys="CTRL + D" label="Delete Item" />
              <ShortcutRow keys="CTRL + T" label="Stock Transfer" />
              <ShortcutRow keys="CTRL + R" label="Stock Report" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Billing Shortcuts</h3>
              <ShortcutRow keys="CTRL + B" label="New Invoice" />
              <ShortcutRow keys="CTRL + P" label="Print Invoice" />
              <ShortcutRow keys="CTRL+SHIFT+P" label="PDF Download" />
              <ShortcutRow keys="CTRL + M" label="Email Invoice" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Entities & Reports</h3>
              <ShortcutRow keys="CTRL + C" label="New Customer" />
              <ShortcutRow keys="CTRL + S" label="New Supplier" />
              <ShortcutRow keys="ALT + B" label="Balance Sheet" />
              <ShortcutRow keys="ALT + P" label="Profit & Loss" />
              <ShortcutRow keys="ALT + R" label="Stock Summary" />
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-[#C68642] mb-1">Search & Navigation</h3>
              <ShortcutRow keys="CTRL + F" label="Search" />
              <ShortcutRow keys="CTRL+SHIFT+F" label="Global Search" />
              <ShortcutRow keys="ARROW KEYS" label="Navigation" />
              <ShortcutRow keys="ENTER" label="Select" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShortcutRow({ keys, label }) {
  return (
    <div className="flex justify-between items-center text-xs py-1.5 border-b border-[#EFE7DD] last:border-0">
      <span className="text-[#2F2F2F]/80">{label}</span>
      <span className="font-mono bg-[#F8F4EE] border border-[#EFE7DD] px-1.5 py-0.5 rounded-md text-[#8B5E3C] font-semibold">{keys}</span>
    </div>
  );
}

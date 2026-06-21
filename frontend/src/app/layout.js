import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SmartERP",
  description: "Billing, Inventory & Accounting Management System",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-slate-900 text-slate-100">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 flex-col hidden md:flex">
          <div className="p-6 border-b border-slate-700">
            <Link href="/dashboard" className="text-xl font-bold text-white tracking-wider">
              Smart<span className="text-indigo-400">ERP</span>
            </Link>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/dashboard" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/companies" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Companies
            </Link>
            <Link href="/ledgers" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Ledgers
            </Link>
            <Link href="/customers" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Customers
            </Link>
            <Link href="/suppliers" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Suppliers
            </Link>
            <Link href="/invoices" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Invoices
            </Link>
            <Link href="/inventory" className="block px-4 py-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              Inventory
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

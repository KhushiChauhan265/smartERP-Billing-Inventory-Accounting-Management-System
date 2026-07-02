import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import GlobalShortcutsClient from "@/components/GlobalShortcutsClient";

const inter = Inter({
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
      className={`${inter.className} h-full antialiased`}
    >
      <body className="min-h-full flex bg-[#F8F4EE] text-[#2F2F2F]">
        {/* Sidebar */}
        <Sidebar />

        {/* Global Keyboard System */}
        <GlobalShortcutsClient />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-6 py-6 min-h-screen overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

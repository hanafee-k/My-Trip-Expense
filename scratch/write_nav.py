import os

layout_js = """import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RouteGuard from "../components/RouteGuard";
import "./globals.css";

export const metadata = {
  title: 'My Trip Expense - จัดการค่าใช้จ่ายการเดินทาง',
  description: 'แอปพลิเคชันบันทึกและจัดการค่าใช้จ่ายการเดินทางอย่างมืออาชีพ',
  keywords: 'expense tracker, trip expense, การจัดการค่าใช้จ่าย',
  authors: [{ name: 'My Trip Expense Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
        <AuthProvider>
          <RouteGuard>
            <Navbar />
            <main className="min-h-screen pb-24 lg:pb-0 lg:pl-60">
              {children}
            </main>
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
"""

navbar_js = """"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, Layers, User, Plane } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { id: "home", label: "หน้าหลัก", icon: Home, href: "/" },
    { id: "projects", label: "โปรเจกต์", icon: Layers, href: "/trips" },
    { id: "reports", label: "รายงาน", icon: PieChart, href: "/reports" },
    { id: "profile", label: "โปรไฟล์", icon: User, href: "/profile" },
  ];

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (lg+) ===== */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 z-50">
        <div className="px-6 py-8 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl shadow-sm flex items-center justify-center">
              <Plane size={20} className="text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-black text-sm tracking-widest uppercase">My Trip</p>
              <p className="text-slate-500 font-medium text-xs tracking-widest uppercase">Expense</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active
                    ? "bg-teal-50 text-teal-700 font-bold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-900 transition-colors"}
                />
                <span className={`text-sm ${active ? "font-bold text-teal-700" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-6 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 font-medium tracking-wider text-center uppercase">v1.0.0 · Made for travelers</p>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV (< lg) ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-2 pb-safe">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 px-4 transition-all active:scale-95 ${
                  active ? "text-teal-600" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <div className={`p-1.5 rounded-full ${active ? "bg-teal-50 text-teal-600" : "bg-transparent text-slate-400"}`}>
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span className={`text-[10px] font-bold mt-1 ${active ? "text-teal-600" : "text-slate-400"}`}>
                  {item.label}
                </span>
                {active && <div className="w-1 h-1 bg-teal-600 rounded-full mt-1" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
"""

with open("d:/my-trip-expense/app/layout.js", "w", encoding="utf-8") as f:
    f.write(layout_js)
with open("d:/my-trip-expense/components/Navbar.js", "w", encoding="utf-8") as f:
    f.write(navbar_js)

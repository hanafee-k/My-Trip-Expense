"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, Layers, User, Plane, Image as ImageIcon, Split } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { id: "home", label: "หน้าหลัก", icon: Home, href: "/" },
    { id: "projects", label: "โปรเจกต์", icon: Layers, href: "/trips" },
    { id: "reports", label: "รายงาน", icon: PieChart, href: "/reports" },
    { id: "gallery", label: "คลังสลิป", icon: ImageIcon, href: "/gallery" },
    { id: "profile", label: "โปรไฟล์", icon: User, href: "/profile" },
  ];

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (lg+) ===== */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-zinc-950 border-r border-zinc-800 z-50">
        <div className="px-6 py-8 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl shadow-lg shadow-teal-900/40 flex items-center justify-center rotate-6">
              <Plane size={20} className="text-white -rotate-6" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-widest uppercase">My Trip</p>
              <p className="text-zinc-500 font-medium text-xs tracking-widest uppercase">Expense</p>
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
                    ? "bg-teal-500/10 text-teal-400 font-bold"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-teal-400" : "text-zinc-500 group-hover:text-zinc-300"}
                />
                <span className={`text-sm tracking-wide ${active ? "font-bold text-teal-400" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-6 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 font-medium tracking-wider text-center uppercase">v1.0.0 · Made for travelers</p>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV (< lg) ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#09090b]/90 backdrop-blur-xl border-t border-zinc-800 z-50 px-2 pb-safe">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 px-4 transition-all active:scale-95 ${
                  active ? "text-teal-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <div className={`p-1.5 rounded-full ${active ? "bg-teal-500/20 text-teal-400" : "bg-transparent text-zinc-500"}`}>
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span className={`text-[10px] font-bold mt-1 ${active ? "text-teal-400" : "text-zinc-500"}`}>
                  {item.label}
                </span>
                {active && <div className="w-1 h-1 bg-teal-400 rounded-full mt-1 shadow-[0_0_8px_rgba(45,212,191,0.5)]" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

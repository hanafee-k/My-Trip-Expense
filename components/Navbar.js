"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, Layers, User, Plane, Split, RefreshCw, DollarSign, TrendingUp } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { id: "home",       label: "หน้าหลัก",  icon: Home,       href: "/" },
    { id: "projects",  label: "ทริป",       icon: Layers,     href: "/trips" },
    { id: "allocation",label: "จัดสรร",     icon: TrendingUp, href: "/allocation" },
    { id: "split-bill",label: "หารบิล",     icon: Split,      href: "/split-bill" },
    { id: "debts",     label: "หนี้สิน",    icon: DollarSign, href: "/debts" },
    { id: "reports",   label: "รายงาน",     icon: PieChart,   href: "/reports" },
    { id: "profile",   label: "โปรไฟล์",   icon: User,       href: "/profile" },
  ];


  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (lg+) ===== */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-200 z-50">

        <div className="px-6 py-8 border-b border-gray-200">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E8622A] rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center rotate-6">
              <Plane size={20} className="text-white -rotate-6" />
            </div>
            <div>
              <p className="text-[#1A1A1A] font-black text-sm tracking-widest uppercase">Finvoy</p>
              <p className="text-[#6B6B6B] font-medium text-xs tracking-widest uppercase">Wallet</p>
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
                    ? "bg-[#FFF4EF] text-[#E8622A] font-bold"
                    : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-gray-50"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-[#E8622A]" : "text-[#6B6B6B] group-hover:text-[#1A1A1A]"}
                />
                <span className={`text-sm tracking-wide ${active ? "font-bold text-[#E8622A]" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-6 border-t border-gray-200">

          <p className="text-[10px] text-gray-400 font-medium tracking-wider text-center uppercase">v1.0.0 · Made for travelers</p>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV (< lg) ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe">

        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 px-4 transition-all active:scale-95 ${
                  active ? "text-[#E8622A]" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
                }`}
              >
                <div className={`p-1.5 rounded-full ${active ? "bg-[#FFF4EF] text-[#E8622A]" : "bg-transparent text-[#6B6B6B]"}`}>
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span className={`text-[10px] font-bold mt-1 ${active ? "text-[#E8622A]" : "text-[#6B6B6B]"}`}>
                  {item.label}
                </span>
                {active && <div className="w-1 h-1 bg-[#E8622A] rounded-full mt-1" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

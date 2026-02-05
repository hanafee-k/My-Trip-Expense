"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, Layers, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      id: "home",
      label: "หน้าหลัก",
      icon: Home,
      href: "/",
      active: pathname === "/"
    },
   {
      id: "projects", 
      label: "โปรเจกต์", 
      icon: Layers,      
      href: "/trips",    
      active: pathname === "/trips"
    },
    {
      id: "reports",
      label: "รายงาน",
      icon: PieChart,
      href: "/reports",
      active: pathname === "/reports"
    },
    {
      id: "profile",
      label: "โปรไฟล์",
      icon: User,
      href: "/profile",
      active: pathname === "/profile"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#18181b] border-t border-zinc-800 z-50 safe-area-inset-bottom">
      <div className="max-w-md mx-auto px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all active:scale-95 ${
                  item.active
                    ? 'bg-teal-600/20 text-teal-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <Icon 
                  size={22} 
                  strokeWidth={item.active ? 2.5 : 2}
                  className="mb-1"
                />
                <span className={`text-[10px] font-semibold ${
                  item.active ? 'text-teal-400' : 'text-zinc-500'
                }`}>
                  {item.label}
                </span>
                {item.active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-400 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
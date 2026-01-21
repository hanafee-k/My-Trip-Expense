"use client";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { LogOut, PieChart, Plane, Home } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    // ลบ md:top-0 และอื่นๆ ออก เหลือแค่ fixed bottom-0
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4 flex justify-around z-50">
      <Link href="/" className="flex flex-col items-center text-gray-600 hover:text-black">
        <Home size={24} />
        <span className="text-xs mt-1">หน้าหลัก</span>
      </Link>
      <Link href="/trips" className="flex flex-col items-center text-gray-600 hover:text-black">
        <Plane size={24} />
        <span className="text-xs mt-1">จัดการทริป</span>
      </Link>
      <Link href="/reports" className="flex flex-col items-center text-gray-600 hover:text-black">
        <PieChart size={24} />
        <span className="text-xs mt-1">รายงาน</span>
      </Link>
      <button onClick={logout} className="flex flex-col items-center text-red-500 hover:text-red-700">
        <LogOut size={24} />
        <span className="text-xs mt-1">ออก</span>
      </button>
    </nav>
  );
}
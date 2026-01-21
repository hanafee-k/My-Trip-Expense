"use client";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // ถ้าโหลดเสร็จแล้ว + ไม่มี User + และไม่ได้อยู่ที่หน้า login
    if (!loading && !user && pathname !== "/login") {
      router.push("/login"); // ดีดไปหน้า Login
    }
  }, [user, loading, router, pathname]);

  // ถ้ากำลังโหลด หรือ ไม่มี User (แต่กำลังจะโดนดีด) ให้แสดงหน้าว่างๆ ไปก่อน
  if (loading || (!user && pathname !== "/login")) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  // ถ้าทุกอย่าง OK ให้แสดงเนื้อหาข้างใน
  return children;
}
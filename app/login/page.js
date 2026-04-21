"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plane, Loader2, CheckCircle, Shield } from "lucide-react";

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg("");
    try {
      await loginWithGoogle();
      // Redirect will happen automatically via useEffect
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "คุณปิดหน้าต่างการเข้าสู่ระบบ";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "มีการขอเข้าสู่ระบบอยู่แล้ว";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "เบราว์เซอร์บล็อก popup กรุณาอนุญาต popup และลองใหม่";
      }
      setErrorMsg(errorMessage);
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: Plane, title: "จัดการทริปได้หลายทริป", desc: "สร้างและติดตามทริปแยกตามการเดินทาง" },
    { icon: CheckCircle, title: "ติดตามงบประมาณ", desc: "ดูยอดใช้จ่ายเปรียบเทียบกับงบที่ตั้งไว้" },
    { icon: Shield, title: "ปลอดภัยด้วย Google", desc: "ผูกบัญชีด้วย Firebase Authentication" }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex">

      {/* ===== LEFT PANEL — Desktop only ===== */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-zinc-900 to-zinc-950 border-r border-zinc-800 p-14">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-900/40 rotate-6">
            <Plane size={20} className="text-white -rotate-6" />
          </div>
          <span className="text-white font-bold text-lg">My Trip Expense</span>
        </div>

        {/* Hero */}
        <div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            จัดการทริป<br />
            <span className="text-teal-400">อย่างมือโปร</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10">
            บันทึกค่าใช้จ่ายทุกทริป ติดตามงบด้วย AI สแกนสลิป<br />
            ครบในแอปเดียว ง่าย เร็ว ปลอดภัย
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <p className="text-xs text-zinc-600">© 2025 My Trip Expense · Made with ❤️ for travelers</p>
      </div>

      {/* ===== RIGHT PANEL — Login Form ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-900/50 rotate-6 hover:rotate-0 transition-transform duration-300 mb-4">
               <Plane size={32} className="text-white -rotate-6" />
            </div>
            <h1 className="text-2xl font-black text-white">My Trip Expense</h1>
            <p className="text-zinc-500 text-sm mt-1">จัดการค่าใช้จ่ายการเดินทาง</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-black text-white mb-2">ยินดีต้อนรับ 👋</h2>
            <p className="text-zinc-400">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
          </div>

          {/* Mobile heading */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-xl font-bold text-white">ยินดีต้อนรับ</h2>
            <p className="text-zinc-500 text-sm mt-1">เข้าสู่ระบบเพื่อเริ่มต้น</p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-900 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={20} className="animate-spin text-zinc-500" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="group-hover:scale-105 transition-transform">
                  เข้าสู่ระบบด้วย Google
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-5 mt-6">
            {[
              { icon: CheckCircle, text: "ฟรี 100%" },
              { icon: Shield, text: "ข้อมูลปลอดภัย" },
              { icon: Plane, text: "ใช้งานง่าย" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-zinc-600">
                <Icon size={12} />
                <span className="text-[11px] font-medium">{text}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-700 text-center mt-6 leading-relaxed">
            การเข้าสู่ระบบแสดงว่าคุณยอมรับ{" "}
            <span className="text-zinc-500">เงื่อนไขการให้บริการ</span> และ <span className="text-zinc-500">นโยบายความเป็นส่วนตัว</span>
          </p>

        </div>
      </div>
    </div>
  );
}
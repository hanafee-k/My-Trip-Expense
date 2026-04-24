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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8622A]" />
          <p className="text-slate-500 text-sm font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: Plane, title: "จัดการทริป", desc: "ติดตามการเดินทางง่ายๆ" },
    { icon: CheckCircle, title: "คุมงบประมาณ", desc: "สรุปยอดใช้จ่ายชัดเจน" },
    { icon: Shield, title: "ปลอดภัย", desc: "ล็อกอินด้วย Google" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Left Branding Panel */}
      <div className="md:w-5/12 lg:w-1/3 bg-[#E8622A] p-8 md:p-12 flex flex-col justify-between hidden md:flex text-white relative overflow-hidden">
        {/* Simple decorative element */}
        <div className="absolute top-[-10%] right-[-20%] w-64 h-64 rounded-full bg-white/20 blur-3xl mix-blend-screen pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-8 backdrop-blur-sm shadow-sm">
            <Plane size={24} className="text-white -rotate-12" />
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-tight mb-4">
            บันทึก<br />ทุกการเดินทาง
          </h1>
          <p className="text-white/90 text-lg xl:text-xl font-medium leading-relaxed">
            ควบคุมงบประมาณ จัดทริปง่าย<br />จบในแอปเดียว
          </p>
        </div>
        
        <div className="space-y-6 relative z-10 block">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5 shadow-sm shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{title}</p>
                <p className="text-white/80 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-[400px]">
          
          {/* Mobile Header */}
          <div className="md:hidden flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-[#E8622A] rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-[#E8622A]/20">
              <Plane size={32} className="text-white -rotate-12" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">My Trip Expense</h1>
            <p className="text-slate-500 mt-2 text-sm">เข้าสู่ระบบเพื่อจัดการค่าใช้จ่ายของคุณ</p>
          </div>

          <div className="hidden md:block mb-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">ยินดีต้อนรับกลับ</h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium">โปรดเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-3">
              <div className="mt-0.5 shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#E8622A]/20"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={20} className="animate-spin text-[#E8622A]" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-zinc-700 font-bold">เข้าสู่ระบบด้วย Google</span>
                </>
              )}
            </button>
            
            <div className="mt-8 flex items-center justify-center gap-6">
              {[
                { icon: Shield, text: "ข้อมูลปลอดภัย" },
                { icon: CheckCircle, text: "ฟรีตลอดชีพ" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-slate-500">
                  <Icon size={14} className="text-[#E8622A]/70" />
                  <span className="text-xs font-semibold">{text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-xs text-slate-400 font-medium text-center mt-8">
            © {new Date().getFullYear()} My Trip Expense. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
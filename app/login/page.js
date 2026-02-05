"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plane, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
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
      
      alert(errorMessage);
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo & Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl mb-6 shadow-2xl shadow-teal-900/50 rotate-6 hover:rotate-0 transition-transform duration-300">
            <Plane size={40} className="text-white -rotate-6" />
          </div>
          
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
            My Trip Expense
          </h1>
          
          <p className="text-zinc-400 text-sm">
            จัดการค่าใช้จ่ายในการเดินทางของคุณ<br/>อย่างง่ายดายและมีประสิทธิภาพ
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
          
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              ยินดีต้อนรับ
            </h2>
            <p className="text-teal-100 text-sm">
              เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน
            </p>
          </div>

          {/* Login Content */}
          <div className="p-8">
            
            {/* Features List */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">จัดการทริปได้หลายทริป</p>
                  <p className="text-xs text-zinc-500">สร้างและติดตามทริปแยกตามแต่ละการเดินทาง</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">ติดตามงบประมาณแบบเรียลไทม์</p>
                  <p className="text-xs text-zinc-500">ดูยอดใช้จ่ายและเปรียบเทียบกับงบที่ตั้งไว้</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">ปลอดภัยด้วย Google</p>
                  <p className="text-xs text-zinc-500">ข้อมูลของคุณปลอดภัยด้วย Firebase Authentication</p>
                </div>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white hover:bg-zinc-50 text-zinc-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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

            {/* Privacy Notice */}
            <p className="text-xs text-zinc-500 text-center mt-6 leading-relaxed">
              การเข้าสู่ระบบแสดงว่าคุณยอมรับ
              <br />
              <span className="text-zinc-400">เงื่อนไขการให้บริการ</span> และ <span className="text-zinc-400">นโยบายความเป็นส่วนตัว</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-zinc-600">
            © 2025 My Trip Expense
          </p>
          <p className="text-xs text-zinc-700">
            Made with ❤️ for travelers
          </p>
        </div>
      </div>
    </div>
  );
}
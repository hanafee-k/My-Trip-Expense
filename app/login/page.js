"use client";
import { useAuth } from "../../context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const { user, googleSignIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-8">🎒 My Trip Expense</h1>
      <button
        onClick={googleSignIn}
        className="bg-white border border-gray-300 px-6 py-3 rounded-lg shadow hover:bg-gray-50 flex items-center gap-2 font-medium"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6"/>
        เข้าสู่ระบบด้วย Google
      </button>
    </div>
  );
}
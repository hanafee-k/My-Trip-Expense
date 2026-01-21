"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        // ถ้าไม่ได้ล็อกอิน ให้เด้งไปหน้า login (ยกเว้นหน้า login เอง)
        if (window.location.pathname !== "/login") router.push("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, googleSignIn, logout }}>
      {loading ? <div className="h-screen flex items-center justify-center">Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
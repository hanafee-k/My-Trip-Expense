"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Mail, LogOut, Trash2, Settings, Shield, Calendar, Plane, DollarSign, TrendingUp, ChevronRight, Camera, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase"; 
import { collection, query, onSnapshot, deleteDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function ProfilePage() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customPhoto, setCustomPhoto] = useState(null); // เก็บรูป Base64 จาก DB

  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalSpent: 0,
    totalBudget: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // 1. ดึงรูปโปรไฟล์จาก Database (Base64)
    const fetchProfilePic = async () => {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().photoBase64) {
                setCustomPhoto(userDoc.data().photoBase64);
            }
        } catch (err) {
            console.error("Error fetching profile pic:", err);
        }
    };
    fetchProfilePic();

    // 2. ดึงสถิติ (Stats)
    const fetchStats = async () => {
      try {
        const tripsRef = collection(db, `users/${user.uid}/trips`);
        const transactionsRef = collection(db, `users/${user.uid}/transactions`);

        const unsubTrips = onSnapshot(query(tripsRef), (snapshot) => {
          const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const active = trips.filter(t => (t.status || 'active') === 'active');
          const completed = trips.filter(t => t.status === 'completed');
          const totalBudget = active.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);

          setStats(prev => ({
            ...prev,
            totalTrips: trips.length,
            activeTrips: active.length,
            completedTrips: completed.length,
            totalBudget
          }));
        });

        const unsubTrans = onSnapshot(query(transactionsRef), (snapshot) => {
          const transactions = snapshot.docs.map(doc => doc.data());
          const totalSpent = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

          setStats(prev => ({ ...prev, totalSpent }));
          setIsLoading(false);
        });

        return () => {
          unsubTrips();
          unsubTrans();
        };
      } catch (error) {
        console.error("Error fetching stats:", error);
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user, router]);

  // ... (ส่วน handleImageUpload และอื่นๆ เหมือนเดิม ไม่ต้องแก้) ...
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { 
        alert("กรุณาใช้รูปขนาดเล็กกว่า 1MB ครับ");
        return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result;
        try {
            await setDoc(doc(db, "users", user.uid), { 
                photoBase64: base64String 
            }, { merge: true });
            setCustomPhoto(base64String);
        } catch (error) {
            console.error("Save failed", error);
            alert("บันทึกรูปไม่สำเร็จ");
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
      try {
        await logout();
        router.push("/login");
      } catch (error) {
        console.error("Error logging out:", error);
      }
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = "ยืนยันการลบบัญชี";
    const userInput = prompt(
      `⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้!\n\nข้อมูลทั้งหมดรวมถึงทริปและรายการใช้จ่ายจะถูกลบอย่างถาวร\n\nพิมพ์ "${confirmText}" เพื่อยืนยัน:`
    );

    if (userInput === confirmText) {
      try {
        const tripsRef = collection(db, `users/${user.uid}/trips`);
        const transactionsRef = collection(db, `users/${user.uid}/transactions`);
        const tripsSnapshot = await getDocs(tripsRef);
        const transSnapshot = await getDocs(transactionsRef);
        
        const deletePromises = [
          ...tripsSnapshot.docs.map(doc => deleteDoc(doc.ref)),
          ...transSnapshot.docs.map(doc => deleteDoc(doc.ref)),
          deleteDoc(doc(db, "users", user.uid))
        ];

        await Promise.all(deletePromises);
        await deleteAccount();
        
        router.push("/login");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("เกิดข้อผิดพลาดในการลบบัญชี กรุณาลองใหม่อีกครั้ง");
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "ไม่ระบุ";
    try {
      return new Date(dateString).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return "ไม่ระบุ"; }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
           <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // เลือกรูปที่จะแสดง
  const displayPhoto = customPhoto || user.photoURL;
  const isGoogleAccount = user.providerData[0]?.providerId === 'google.com';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 font-sans">
      
      {/* Header Section - ✨ อัปเกรดความสวยงาม ✨ */}
      <div className="relative bg-zinc-900 border-b border-zinc-800 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/30 via-transparent to-zinc-950/50 pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md mx-auto px-4 pt-10 pb-8 relative z-10">
          <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
                <Settings className="text-teal-400" size={28} />
            </div>
            โปรไฟล์
          </h1>

          {/* 🔥 Profile Card - Redesigned 🔥 */}
          <div className="relative overflow-hidden bg-zinc-800/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-2xl group transition-all duration-500 hover:border-teal-500/30">
            {/* Subtle Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div className="relative flex items-center gap-6">
              
              {/* --- ส่วนรูปโปรไฟล์ (อัปเกรด) --- */}
              <div 
                className="relative group/img cursor-pointer shrink-0"
                onClick={() => !isUploading && fileInputRef.current.click()}
              >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                {isUploading ? (
                    <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center ring-4 ring-teal-500/30 ring-offset-2 ring-offset-zinc-900">
                        <Loader2 className="animate-spin text-teal-400" size={28} />
                    </div>
                ) : (
                    <div className="relative">
                        {/* รูปภาพหลัก */}
                        {displayPhoto ? (
                        <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-zinc-700/50 ring-offset-2 ring-offset-zinc-900 group-hover/img:ring-teal-400 transition-all duration-300 shadow-lg">
                            {/* ใช้ img tag เพื่อรองรับ Base64 */}
                            <img
                            src={displayPhoto}
                            alt="Profile"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                            />
                        </div>
                        ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center ring-4 ring-teal-500/30 ring-offset-2 ring-offset-zinc-900 shadow-lg">
                            <User size={48} className="text-white/90" />
                        </div>
                        )}
                        
                        {/* Overlay ไอคอนกล้อง */}
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                            <Camera size={28} className="text-white drop-shadow-md" />
                        </div>
                        
                        {/* ไอคอนกล้องเล็กที่มุม */}
                        <div className="absolute bottom-0 right-0 bg-zinc-800 rounded-full p-2 border-2 border-zinc-900 shadow-md group-hover/img:bg-teal-500 transition-colors duration-300">
                            <Camera size={14} className="text-zinc-300 group-hover/img:text-white" />
                        </div>
                    </div>
                )}
              </div>

              {/* --- ส่วนข้อมูล User (อัปเกรด) --- */}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-extrabold text-white mb-1 truncate">
                  {user.displayName || "ผู้ใช้งาน"}
                </h2>
                <p className="text-sm text-zinc-400 flex items-center gap-2 mb-4 truncate">
                  <Mail size={14} className="text-zinc-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Account Type Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${
                      isGoogleAccount 
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' 
                      : 'bg-zinc-700/50 text-zinc-300 border-zinc-600'
                  }`}>
                    {isGoogleAccount ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    ) : (
                        <Shield size={12} />
                    )}
                    {isGoogleAccount ? 'Google' : 'Email'}
                  </div>

                  {/* Verified Badge */}
                  {user.emailVerified && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-teal-500/10 text-teal-300 border-teal-500/30 text-xs font-medium">
                        <CheckCircle2 size={12} /> Certified
                    </div>
                  )}

                  {/* Join Date */}
                  {user.metadata?.creationTime && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1 ml-auto">
                      <Calendar size={12} />
                      {formatDate(user.metadata.creationTime)}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* ... (ส่วน Stats Grid, Account Settings, Danger Zone เหมือนเดิมเป๊ะ) ... */}
        {/* Stats Grid */}
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-lg">
          <h3 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-500" />
            สถิติการใช้งาน
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <Plane size={16} className="text-teal-500" />
                </div>
                <span className="text-xs text-zinc-500">ทริปทั้งหมด</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalTrips}</p>
              <p className="text-[10px] text-zinc-600 mt-1">{stats.activeTrips} กำลังเที่ยว</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-zinc-700/50 rounded-lg">
                  <CheckCircle2 size={16} className="text-zinc-400" />
                </div>
                <span className="text-xs text-zinc-500">จบแล้ว</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.completedTrips}</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <DollarSign size={16} className="text-red-400" />
                  </div>
                  <span className="text-xs text-zinc-500">ใช้ไปทั้งหมด</span>
                </div>
                <p className="text-xl font-bold text-red-400">฿{stats.totalSpent.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">งบรวม (ทริปที่กำลังเที่ยว)</span>
                <p className="text-sm font-semibold text-zinc-300">฿{stats.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
              <Shield size={16} className="text-teal-500" />
              การตั้งค่าบัญชี
            </h3>
          </div>
          <div className="divide-y divide-zinc-800">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${user.emailVerified ? 'bg-teal-500/10' : 'bg-yellow-500/10'}`}>
                  <Mail size={18} className={user.emailVerified ? 'text-teal-500' : 'text-yellow-500'} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">อีเมล</p>
                  <p className="text-xs text-zinc-500">{user.emailVerified ? 'ยืนยันแล้ว ✓' : 'ยังไม่ได้ยืนยัน'}</p>
                </div>
              </div>
              {user.emailVerified && <CheckCircle2 size={18} className="text-teal-500" />}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-zinc-900 rounded-2xl border border-red-900/30 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-red-900/30 bg-red-500/5">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
              <Shield size={16} />
              โซนอันตราย
            </h3>
          </div>
          <div className="divide-y divide-zinc-800">
            <button onClick={handleLogout} className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition">
                  <LogOut size={18} className="text-yellow-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">ออกจากระบบ</p>
                  <p className="text-xs text-zinc-500">คุณสามารถเข้าสู่ระบบได้อีกครั้ง</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-600 group-hover:text-yellow-500 transition" />
            </button>

            <button onClick={handleDeleteAccount} className="w-full px-4 py-4 flex items-center justify-between hover:bg-red-500/5 transition group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-red-400">ลบบัญชีถาวร</p>
                  <p className="text-xs text-zinc-500">ข้อมูลทั้งหมดจะถูกลบอย่างถาวร</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-600 group-hover:text-red-500 transition" />
            </button>
          </div>
        </div>

        <div className="text-center py-6 space-y-2">
          <p className="text-xs text-zinc-600">My Trip Expense</p>
          <p className="text-xs text-zinc-700">Version 1.0.0</p>
          <p className="text-xs text-zinc-700">Made with ❤️ for travelers</p>
        </div>

      </div>
    </div>
  );
}
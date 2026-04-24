"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Mail, LogOut, Settings, Shield, Calendar, Plane, DollarSign, TrendingUp, ChevronRight, Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../lib/firebase";
import { collection, query, onSnapshot, deleteDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfilePage() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customPhoto, setCustomPhoto] = useState(null);

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

    const fetchProfilePic = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) {
            setCustomPhoto(data.photoURL);
          } else if (data.photoBase64) {
            setCustomPhoto(data.photoBase64);
          }
        }
      } catch (err) {
        console.error("Error fetching profile pic:", err);
      }
    };
    fetchProfilePic();

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("กรุณาใช้รูปขนาดเล็กกว่า 5MB ครับ");
      return;
    }

    setIsUploading(true);
    try {
      const sRef = storageRef(storage, `profiles/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(sRef, file);
      const downloadURL = await getDownloadURL(sRef);

      await setDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL
      }, { merge: true });

      setCustomPhoto(downloadURL);
    } catch (error) {
      console.error("Save failed", error);
      alert("บันทึกรูปไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return "ไม่ระบุ";
    try {
      return new Date(dateString).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return "ไม่ระบุ"; }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#E8622A] mx-auto mb-4" size={40} />
          <p className="text-gray-500 text-sm font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  const displayPhoto = customPhoto || user.photoURL;
  const isGoogleAccount = user.providerData[0]?.providerId === 'google.com';

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-24 font-sans text-[#1A1A1A]">
      
      <div className="max-w-4xl mx-auto px-4 pt-10 space-y-6">
        
        {/* TASK 4 — USER PROFILE CARD */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div 
              className="relative w-16 h-16 rounded-full border-2 border-[#E8622A] shrink-0 cursor-pointer group"
              onClick={() => !isUploading && fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              {isUploading ? (
                <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#E8622A]" size={20} />
                </div>
              ) : (
                <>
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                      <User size={30} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-bold text-gray-900 truncate">
                {user.displayName || "ผู้ใช้งาน"}
              </h2>
              <p className="text-[13px] text-gray-500 flex items-center gap-1 truncate">
                <Mail size={14} className="shrink-0" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full px-3 py-1 flex items-center gap-1 uppercase tracking-wider">
              {isGoogleAccount ? 'Google Account' : 'Email Account'}
            </div>
            {user.emailVerified && (
              <div className="bg-green-50 text-green-600 border border-green-200 text-[11px] font-medium rounded-full px-3 py-1 flex items-center gap-1 uppercase tracking-wider">
                <CheckCircle2 size={12} /> Verified
              </div>
            )}
          </div>
        </div>

        {/* TASK 2 — SECTION: ภาพรวมการเดินทาง */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-[#E8622A]" />
            <h3 className="text-[15px] font-semibold text-gray-800">ภาพรวมการเดินทางของคุณ</h3>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 grid grid-cols-2 gap-3">
              {/* Mini Card 1 */}
              <div className="bg-[#F7F6F3] rounded-xl p-4">
                <p className="text-[12px] font-medium text-gray-500 mb-1">ทริปทั้งหมด</p>
                <p className="text-[28px] font-bold text-gray-900 leading-none">{stats.totalTrips}</p>
                <p className="text-[11px] text-gray-400 mt-2">{stats.activeTrips} กำลังดำเนินการ</p>
              </div>
              {/* Mini Card 2 */}
              <div className="bg-[#F7F6F3] rounded-xl p-4">
                <p className="text-[12px] font-medium text-gray-500 mb-1">จบทริปแล้ว</p>
                <p className="text-[28px] font-bold text-gray-900 leading-none">{stats.completedTrips}</p>
                <p className="text-[11px] text-gray-400 mt-2">เสร็จสิ้นสมบูรณ์</p>
              </div>
            </div>

            {/* Total Spent Row */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-red-500" />
                  <span className="text-[12px] font-medium text-gray-500 uppercase">ยอดใช้จ่ายรวม</span>
                </div>
                <p className="text-[22px] font-bold text-[#E8622A]">
                  ฿{stats.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[11px] text-gray-400 uppercase">งบรวม (ทริปปัจจุบัน)</span>
                <p className="text-[13px] font-bold text-gray-700">฿{stats.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TASK 2/3 — SECTION: ความปลอดภัยและการตั้งค่า */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Shield className="w-4 h-4 text-[#E8622A]" />
            <h3 className="text-[15px] font-semibold text-gray-800">ความปลอดภัยและการตั้งค่า</h3>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {/* Row 1: Email */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-[#FFF4EF] rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#E8622A]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-gray-800">อีเมลลงทะเบียน</p>
                <p className="text-[12px] text-gray-400">
                  {user.emailVerified ? 'ยืนยันตัวตนเรียบร้อย' : 'ยังไม่ได้ยืนยันตัวตน'}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            </div>

            {/* Row 2: Join Date */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-gray-800">วันที่เข้าร่วม</p>
                <p className="text-[12px] text-gray-400">{formatDate(user.metadata.creationTime)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TASK 2/3 — SECTION: เขตอันตราย */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Shield className="w-4 h-4 text-red-500" />
            <h3 className="text-[15px] font-semibold text-red-500">เขตอันตราย</h3>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Logout Row */}
            <button 
              onClick={handleLogout}
              className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-red-500">ออกจากระบบ</p>
                <p className="text-[12px] text-gray-400">สิ้นสุดเซสชันการใช้งานปัจจุบัน</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          </div>
        </div>

        {/* App Info Footer */}
        <div className="text-center pt-8 space-y-3">
          <div className="inline-flex p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <Plane size={20} className="text-gray-400 -rotate-12" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">My Trip Expense</p>
            <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-tighter">v1.0.0 • Travel with Ease</p>
          </div>
        </div>

      </div>
    </div>
  );
}
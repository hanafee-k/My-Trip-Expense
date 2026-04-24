"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Mail, LogOut, Trash2, Settings, Shield, Calendar, Plane, DollarSign, TrendingUp, ChevronRight, Camera, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../lib/firebase";
import { collection, query, onSnapshot, deleteDoc, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
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

    // 1. ดึงรูปโปรไฟล์จาก Database
    const fetchProfilePic = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // ลองดึง photoURL ก่อน ถ้าไม่มีค่อยเอา photoBase64 (backward compatibility)
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

    if (file.size > 5 * 1024 * 1024) {
      alert("กรุณาใช้รูปขนาดเล็กกว่า 5MB ครับ");
      return;
    }

    setIsUploading(true);
    try {
      // 1. อัปโหลดไปยัง Firebase Storage
      const sRef = storageRef(storage, `profiles/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(sRef, file);
      const downloadURL = await getDownloadURL(sRef);

      // 2. บันทึก URL ลง Firestore
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
      <div className="min-h-screen text-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#E8622A] mx-auto mb-4" size={48} />
          <p className="text-[#6B6B6B] font-medium tracking-tight">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  // เลือกรูปที่จะแสดง
  const displayPhoto = customPhoto || user.photoURL;
  const isGoogleAccount = user.providerData[0]?.providerId === 'google.com';

  return (
    <div className="min-h-screen pb-24 font-sans text-[#1A1A1A]">

      {/* Header Section - Modern Light Theme */}
      <div className="relative border-b border-[#EBEBEB] overflow-hidden bg-white">
        {/* Subtle Background Pattern/Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#FFF4EF] via-white to-white pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#E8622A]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 relative z-10">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A1A1A] mb-8 flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-[#FFF4EF] text-[#E8622A] rounded-xl border border-[#fbdcd0] shadow-sm">
                <Settings size={28} />
              </div>
              จัดการบัญชีของคุณ
            </h1>

          {/* Profile Card */}
          <div className="relative overflow-hidden bg-white backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-[#EBEBEB] shadow-sm group transition-all duration-500 hover:border-[#E8622A]/30 w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8622A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">

              {/* Photo Upload Area */}
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
                  <div className="w-28 h-28 rounded-full bg-gray-50 flex items-center justify-center ring-4 ring-white ring-offset-2 ring-offset-white border border-[#EBEBEB]">
                    <Loader2 className="animate-spin text-[#E8622A]" size={32} />
                  </div>
                ) : (
                  <div className="relative">
                    {displayPhoto ? (
                      <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white ring-offset-2 ring-offset-white border border-[#EBEBEB] group-hover/img:ring-[#E8622A]/20 transition-all duration-300 shadow-[0_0_20px_rgba(232,98,42,0.1)] group-hover/img:shadow-[0_0_30px_rgba(232,98,42,0.2)]">
                        <img
                          src={displayPhoto}
                          alt="Profile"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center ring-4 ring-white ring-offset-2 ring-offset-white shadow-sm border border-[#EBEBEB]">
                        <User size={48} className="text-[#6B6B6B]" />
                      </div>
                    )}

                    {/* Camera Overlay */}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                      <Camera size={28} className="text-white drop-shadow-sm" />
                    </div>

                    {/* Camera Badge */}
                    <div className="absolute bottom-0 right-0 bg-[#E8622A] rounded-full p-2 border-4 border-white shadow-md transition-transform duration-300 group-hover/img:scale-110">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left flex flex-col justify-center py-2 relative w-full overflow-hidden">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A] mb-1.5 truncate tracking-tight">
                  {user.displayName || "ผู้ใช้งาน"}
                </h2>
                <div className="w-full overflow-hidden">
                  <p className="text-[#6B6B6B] text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2 mb-4 font-medium truncate w-full group/email">
                    <Mail size={16} className="text-gray-400 shrink-0 group-hover/email:text-[#E8622A] transition-colors" />
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${isGoogleAccount
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-gray-100 text-[#6B6B6B] border border-gray-200'
                    }`}>
                    {isGoogleAccount ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    ) : (
                      <Shield size={12} />
                    )}
                    {isGoogleAccount ? 'Google' : 'Email'}
                  </div>

                  {user.emailVerified && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 text-[11px] font-bold tracking-wide uppercase">
                      <CheckCircle2 size={12} /> Verified
                    </div>
                  )}

                  {user.metadata?.creationTime && (
                    <span className="text-[11px] text-[#6B6B6B] flex items-center gap-1.5 font-semibold sm:ml-auto mt-2 sm:mt-0 w-full sm:w-auto justify-center sm:justify-start uppercase tracking-wider">
                      <Calendar size={12} /> Joined {formatDate(user.metadata.creationTime)}
                    </span>
                  )}
                </div>
              </div>

          </div>
        </div>
      </div>
    </div>
  </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="max-w-3xl mx-auto space-y-8">

        {/* Stats Grid */}
        <div className="bg-white border border-[#EBEBEB] p-6 sm:p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp size={120} className="text-[#E8622A]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2 relative z-10 uppercase tracking-widest">
            <TrendingUp size={16} className="text-[#E8622A]" />
            ภาพรวมการเดินทางของคุณ
          </h3>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-[#fbdcd0] transition-colors group shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#FFF4EF] rounded-xl group-hover:bg-orange-100 transition-colors">
                  <Plane size={16} className="text-[#E8622A]" />
                </div>
                <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mt-0.5">ทริปทั้งหมด</span>
              </div>
              <p className="text-4xl font-black text-[#1A1A1A] leading-none mb-2">{stats.totalTrips}</p>
              <p className="text-[11px] font-bold text-[#E8622A]">{stats.activeTrips} กำลังดำเนินการ</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-gray-300 transition-colors group shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gray-200 rounded-xl group-hover:bg-gray-300 transition-colors">
                  <CheckCircle2 size={16} className="text-gray-600" />
                </div>
                <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mt-0.5">จบทริปแล้ว</span>
              </div>
              <p className="text-4xl font-black text-[#1A1A1A] leading-none">{stats.completedTrips}</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 col-span-2 hover:border-red-200 transition-colors group relative overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 relative z-10 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                    <DollarSign size={16} className="text-red-500" />
                  </div>
                  <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-widest mt-0.5">ยอดใช้จ่ายรวม</span>
                </div>
                <p className="text-3xl font-black text-red-500 tracking-tight">฿{stats.totalSpent.toLocaleString()}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 relative z-10">
                <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">งบรวม (ทริปปัจจุบัน)</span>
                <p className="text-sm font-bold text-[#1A1A1A]">฿{stats.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Account settings */}
        <div className="bg-white rounded-[2rem] border border-[#EBEBEB] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#EBEBEB] bg-gray-50/50">
            <h3 className="text-xs sm:text-sm font-bold text-[#6B6B6B] flex items-center gap-2 uppercase tracking-widest">
              <Shield size={14} className="text-[#E8622A]" />
              ความปลอดภัยและการตั้งค่า
            </h3>
          </div>
          <div className="p-2.5">
            <div className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${user.emailVerified ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-orange-50 border border-orange-200 text-orange-500'}`}>
                  <Mail size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm sm:text-base font-bold text-[#1A1A1A]">อีเมลลงทะเบียน</p>
                  <p className="text-xs sm:text-sm font-bold text-[#6B6B6B] mt-1 uppercase tracking-wide">{user.emailVerified ? 'ยืนยันตัวตนเรียบร้อย' : 'รอการยืนยันอีเมล'}</p>
                </div>
              </div>
              {user.emailVerified ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <span className="text-[10px] font-black text-orange-500 border border-orange-200 bg-orange-50 px-2 py-1 rounded-md uppercase">Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-[2rem] border border-red-200 shadow-sm overflow-hidden group/danger">
          <div className="p-6 border-b border-red-100 bg-red-50/50">
            <h3 className="text-xs sm:text-sm font-bold text-red-500 flex items-center gap-2 uppercase tracking-widest">
              <Shield size={14} />
              เขตอันตราย
            </h3>
          </div>
          <div className="p-2.5 space-y-1">
            <button onClick={handleLogout} className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-red-50 rounded-xl transition-colors group text-left">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white rounded-xl group-hover:bg-red-100 text-[#6B6B6B] group-hover:text-red-500 transition-colors border border-gray-200 group-hover:border-red-200 shadow-sm">
                  <LogOut size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A] group-hover:text-red-500 transition-colors">ออกจากระบบ</p>
                  <p className="text-[11px] font-bold text-[#6B6B6B] mt-1">สิ้นสุดเซสชันการใช้งานปัจจุบัน</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        <div className="text-center pt-6 pb-4 space-y-2 opacity-60">
          <div className="inline-flex items-center justify-center p-3 bg-white border border-[#EBEBEB] shadow-sm rounded-2xl mb-2">
            <Plane size={24} className="text-[#6B6B6B] -rotate-12" />
          </div>
          <p className="text-[11px] font-black text-[#6B6B6B] tracking-widest my-2">MY TRIP EXPENSE</p>
          <p className="text-[10px] font-bold text-gray-400">v1.0.0 &copy; {new Date().getFullYear()}</p>
        </div>

        </div>
      </div>
    </div>
  );
}
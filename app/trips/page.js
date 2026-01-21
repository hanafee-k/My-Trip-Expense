"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Trash2, Plane, Plus, Calendar, MapPin } from "lucide-react";

export default function TripsPage() {
  const { user } = useAuth();
  const [tripName, setTripName] = useState("");
  const [trips, setTrips] = useState([]);

  // ดึงข้อมูลทริป
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  const handleAddTrip = async (e) => {
    e.preventDefault();
    if (!tripName.trim()) return;
    await addDoc(collection(db, `users/${user.uid}/trips`), {
      name: tripName,
      status: "active",
      createdAt: serverTimestamp(), // เปลี่ยนเป็น Server Timestamp เพื่อความชัวร์
    });
    setTripName("");
  };

  const handleDelete = async (id) => {
    if (confirm("⚠️ ยืนยันที่จะลบทริปนี้? (รายการจดในทริปนี้จะไม่หายไป แต่จะไม่มีสังกัด)")) {
        await deleteDoc(doc(db, `users/${user.uid}/trips`, id));
    }
  };

  // Helper แปลงวันที่
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    // เช็คกรณีเป็น Date Object หรือ Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp); 
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-zinc-800 text-zinc-100 pb-24 font-sans selection:bg-teal-800">
      
      {/* Header เหมือนหน้าหลัก */}
      <div className="bg-[#18181b] p-4 text-center border-b border-zinc-800 sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-white tracking-wide">
          <span className="text-2xl">✈️</span>
          <span>จัดการ<span className="text-teal-500">ทริปเที่ยว</span></span>
        </h1>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* --- Form เพิ่มทริป --- */}
        <div className="bg-[#18181b] p-5 rounded-2xl border border-zinc-800 shadow-sm mb-6">
            <h2 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
                <Plus size={16} className="text-teal-500"/> สร้างทริปใหม่
            </h2>
            <form onSubmit={handleAddTrip} className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-3.5 text-zinc-500"><MapPin size={18}/></span>
                    <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="ชื่อทริป (เช่น 🇯🇵 ญี่ปุ่น 2025)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                    />
                </div>
                <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-5 rounded-xl font-bold transition flex items-center justify-center shadow-lg shadow-teal-900/20">
                    เพิ่ม
                </button>
            </form>
        </div>

        {/* --- List รายการทริป --- */}
        <div className="space-y-3">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider ml-1">ทริปทั้งหมด ({trips.length})</h3>
          
          {trips.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 bg-[#18181b] rounded-xl border border-zinc-800 border-dashed">
                <Plane size={40} className="mx-auto mb-2 opacity-20"/>
                <p>ยังไม่มีทริปเที่ยว</p>
            </div>
          ) : (
            trips.map((trip) => (
                <div key={trip.id} className="bg-[#18181b] hover:bg-[#202024] p-4 rounded-xl flex justify-between items-center border border-zinc-800 transition group">
                    <div className="flex items-center gap-4">
                        {/* Icon Box */}
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-teal-500 group-hover:border-teal-500/50 group-hover:text-teal-400 transition">
                            <Plane size={20} />
                        </div>
                        
                        <div>
                            <span className="font-bold text-lg text-zinc-100 block">{trip.name}</span>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                                <Calendar size={12}/>
                                <span>สร้างเมื่อ: {formatDate(trip.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleDelete(trip.id)} 
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-600 hover:bg-red-950 hover:text-red-500 hover:border hover:border-red-900 transition"
                        title="ลบทริป"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
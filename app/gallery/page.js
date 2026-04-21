"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { ArrowLeft, Image as ImageIcon, Filter, X, ChevronRight, ZoomIn, Calendar, Tag } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GalleryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [trips, setTrips] = useState([]);
  const [filterTrip, setFilterTrip] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  const categories = [
    { id: "food", name: "อาหาร", icon: "🍜" },
    { id: "transport", name: "เดินทาง", icon: "🚕" },
    { id: "shopping", name: "ช็อปปิ้ง", icon: "🛍️" },
    { id: "hotel", name: "ที่พัก", icon: "🏨" },
    { id: "entertainment", name: "บันเทิง", icon: "🎡" },
    { id: "medical", name: "ค่ารักษา", icon: "💊" },
    { id: "other", name: "อื่นๆ", icon: "📝" },
  ];

  useEffect(() => {
    if (!user) return;
    const qT = query(collection(db, `users/${user.uid}/transactions`), orderBy("date", "desc"));
    const unsubT = onSnapshot(qT, snap =>
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const qTr = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubTr = onSnapshot(qTr, snap =>
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubT(); unsubTr(); };
  }, [user]);

  const receipts = useMemo(() => {
    return transactions.filter(t => {
      if (!t.receiptUrl) return false;
      if (filterTrip === "all") return true;
      if (filterTrip === "no_trip") return !t.tripId;
      return t.tripId === filterTrip;
    });
  }, [transactions, filterTrip]);

  const getTripName = (id) => trips.find(t => t.id === id)?.name || "";
  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || "📝";
  const formatDate = (ts) => {
    if (!ts) return "";
    try { return ts.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); }
    catch { return ""; }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 font-sans">
      {/* Header */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-800 rounded-lg transition">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon size={20} className="text-teal-500" />
              คลังสลิป
            </h1>
            <p className="text-xs text-zinc-500">Receipt Gallery • {receipts.length} รูป</p>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition border border-zinc-700"
          >
            <Filter size={18} className="text-teal-500" />
          </button>
        </div>

        {/* Filter Dropdown */}
        {showFilter && (
          <div className="max-w-4xl mx-auto px-4 pb-4 animate-in fade-in slide-in-from-top-2">
            <select
              value={filterTrip}
              onChange={e => setFilterTrip(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">🌐 ทุกทริป</option>
              <option value="no_trip">🏠 ชีวิตประจำวัน</option>
              {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {receipts.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900 rounded-2xl border border-dashed border-zinc-800">
            <div className="text-6xl mb-4">🧾</div>
            <p className="text-zinc-400 font-bold">ยังไม่มีสลิปในคลัง</p>
            <p className="text-zinc-600 text-sm mt-1">เพิ่มรายการพร้อมสแกนสลิปในหน้าหลัก</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {receipts.map(t => (
              <div
                key={t.id}
                onClick={() => setLightbox(t)}
                className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-teal-600 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={t.receiptUrl}
                    alt="สลิป"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-bold text-white truncate">
                    {getCategoryIcon(t.categoryId)} {t.note || "ไม่ระบุ"}
                  </p>
                  <p className="text-teal-400 font-black text-sm">฿{Number(t.amount).toLocaleString()}</p>
                  <p className="text-zinc-500 text-[10px]">{formatDate(t.date)}</p>
                  {t.tripId && (
                    <span className="text-[9px] bg-teal-950 text-teal-400 px-1.5 py-0.5 rounded border border-teal-800/50 font-bold">
                      ✈️ {getTripName(t.tripId)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition z-10"
            onClick={() => setLightbox(null)}
          >
            <X size={20} className="text-white" />
          </button>

          <div onClick={e => e.stopPropagation()} className="max-w-lg w-full space-y-4">
            {/* Image */}
            <div className="rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl">
              <img
                src={lightbox.receiptUrl}
                alt="สลิปเต็ม"
                className="w-full max-h-[65vh] object-contain bg-zinc-900"
              />
            </div>

            {/* Info Card */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-bold">
                    {getCategoryIcon(lightbox.categoryId)} {lightbox.note || "ไม่ระบุ"}
                  </p>
                  <p className="text-zinc-400 text-xs flex items-center gap-1 mt-1">
                    <Calendar size={12} /> {formatDate(lightbox.date)}
                  </p>
                </div>
                <p className="text-2xl font-black text-white">฿{Number(lightbox.amount).toLocaleString()}</p>
              </div>
              {lightbox.tripId && (
                <div className="flex items-center gap-2 bg-teal-950/50 px-3 py-2 rounded-lg border border-teal-800/40">
                  <span className="text-teal-400 text-xs font-bold">✈️ {getTripName(lightbox.tripId)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

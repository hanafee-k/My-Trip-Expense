"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { 
  collection, query, onSnapshot, addDoc, deleteDoc, doc, 
  updateDoc, serverTimestamp, Timestamp, orderBy 
} from "firebase/firestore";
import { 
  ArrowLeft, Plus, Trash2, Clock, Calendar, Tag, 
  TrendingDown, TrendingUp, Loader2, X, AlertCircle, RefreshCw,
  Pause, Play, ChevronRight, Plane
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getTodayDate } from "../../lib/dateUtils";

export default function RecurringPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [rules, setRules] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [form, setForm] = useState({
    amount: "",
    note: "",
    type: "expense",
    category: "food",
    frequency: "monthly",
    startDate: getTodayDate(),
    tripId: ""
  });

  const categories = [
    { id: "food", name: "อาหาร & เครื่องดื่ม", icon: "🍜", color: "bg-orange-500" },
    { id: "transport", name: "เดินทาง & น้ำมัน", icon: "🚕", color: "bg-blue-500" },
    { id: "shopping", name: "ช็อปปิ้ง & ของที่ระลึก", icon: "🛍️", color: "bg-pink-500" },
    { id: "hotel", name: "ที่พัก", icon: "🏨", color: "bg-purple-500" },
    { id: "entertainment", name: "บันเทิง & กิจกรรม", icon: "🎡", color: "bg-yellow-500" },
    { id: "medical", name: "ค่ารักษาพยาบาล", icon: "💊", color: "bg-red-500" },
    { id: "other", name: "อื่นๆ", icon: "📝", color: "bg-zinc-500" },
  ];

  const frequencies = [
    { id: "daily", name: "ทุกวัน" },
    { id: "weekly", name: "ทุกสัปดาห์" },
    { id: "monthly", name: "ทุกเดือน" },
    { id: "yearly", name: "ทุกปี" }
  ];

  useEffect(() => {
    if (!user) return;

    const qRules = query(
      collection(db, `users/${user.uid}/recurring_rules`),
      orderBy("createdAt", "desc")
    );
    const unsubRules = onSnapshot(qRules, (snap) => {
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const qTrips = query(
      collection(db, `users/${user.uid}/trips`),
      orderBy("createdAt", "desc")
    );
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubRules(); unsubTrips(); };
  }, [user]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!form.amount || parseFloat(form.amount) <= 0) {
      showNotification("⚠️ กรุณากรอกจำนวนเงินที่ถูกต้อง", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        note: form.note.trim() || categories.find(c => c.id === form.category)?.name || "รายจ่ายประจำ",
        type: form.type,
        categoryId: form.category,
        frequency: form.frequency,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        nextOccurrence: Timestamp.fromDate(new Date(form.startDate)),
        tripId: form.tripId || null,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `users/${user.uid}/recurring_rules`), payload);
      showNotification("✅ บันทึกรายการตั้งล่วงหน้าสำเร็จ!");
      setShowForm(false);
      setForm({
        amount: "", note: "", type: "expense", category: "food",
        frequency: "monthly", startDate: getTodayDate(), tripId: ""
      });
    } catch (err) {
      console.error(err);
      showNotification("❌ เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (rule) => {
    const newStatus = rule.status === "active" ? "paused" : "active";
    try {
      await updateDoc(doc(db, `users/${user.uid}/recurring_rules`, rule.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showNotification(`✅ ${newStatus === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"} ชั่วคราวแล้ว`);
    } catch (err) {
      showNotification("❌ ไม่สามารถเปลี่ยนสถานะได้", "error");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("⚠️ ยืนยันที่จะลบรายการตั้งล่วงหน้านี้? (รายการที่เคยถูกสร้างไปแล้วจะไม่ถูกลบ)")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/recurring_rules`, id));
        showNotification("🗑️ ลบรายการสำเร็จ");
      } catch (err) {
        showNotification("❌ ไม่สามารถลบได้", "error");
      }
    }
  };

  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || "📝";
  const getTripName = (id) => trips.find(t => t.id === id)?.name || "ทริปที่ถูกลบ";

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center font-sans">
        <Loader2 className="animate-spin text-[#E8622A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] pb-24 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">รายจ่ายตั้งล่วงหน้า</h1>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#E8622A] text-white p-2 rounded-full shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <RefreshCw className="text-blue-500 shrink-0 mt-1" size={20} />
          <div>
            <p className="text-sm font-bold text-blue-900">ระบบสร้างรายการอัตโนมัติ</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              รายการเหล่านี้จะถูกบันทึกเข้าสู่ "รายการล่าสุด" ของคุณโดยอัตโนมัติเมื่อถึงกำหนดเวลาที่คุณตั้งไว้
            </p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#E8622A]" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={30} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">ยังไม่มีรายการตั้งล่วงหน้า</p>
            <button onClick={() => setShowForm(true)} className="text-[#E8622A] text-sm font-bold mt-2">
              เพิ่มรายการแรกเลย
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className={`bg-white rounded-2xl p-4 border transition-all ${rule.status === 'active' ? 'border-gray-100 shadow-sm' : 'border-gray-200 opacity-60'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl">
                      {getCategoryIcon(rule.categoryId)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A]">{rule.note}</h3>
                      <p className="text-xs text-gray-500">
                        {frequencies.find(f => f.id === rule.frequency)?.name} • {rule.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${rule.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {rule.type === 'income' ? '+' : '-'}฿{rule.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 justify-end text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      <Calendar size={10} />
                      {rule.nextOccurrence?.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    {rule.tripId && (
                      <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                        <Plane size={10} /> {getTripName(rule.tripId)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleStatus(rule)}
                      className={`p-2 rounded-lg transition ${rule.status === 'active' ? 'text-orange-500 bg-orange-50' : 'text-green-600 bg-green-50'}`}
                      title={rule.status === 'active' ? 'พักรายการ' : 'เริ่มรายการใหม่'}
                    >
                      {rule.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="ลบ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col slide-in-from-bottom-8 sm:slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                <Plus size={20} className="text-[#E8622A]" /> ตั้งรายการล่วงหน้า
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Type Toggle */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button type="button" onClick={() => setForm({ ...form, type: 'expense' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${form.type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}>
                    <TrendingDown size={18} /> รายจ่าย
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, type: 'income' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${form.type === 'income' ? 'bg-white text-green-500 shadow-sm' : 'text-gray-500'}`}>
                    <TrendingUp size={18} /> รายรับ
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-[#6B6B6B] block mb-2 font-medium">จำนวนเงิน</label>
                  <div className="relative">
                    <input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-4 pr-12 rounded-xl text-[#1A1A1A] text-3xl font-bold text-center focus:outline-none focus:border-[#E8622A] transition" required />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">฿</span>
                  </div>
                </div>

                {/* Frequency & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1"><RefreshCw size={14} /> ความถี่</label>
                    <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] appearance-none transition pr-10">
                      {frequencies.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1"><Tag size={14} /> หมวดหมู่</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] appearance-none transition pr-10">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1"><Calendar size={14} /> เริ่มวันแรก</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition" required />
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-[#6B6B6B] block mb-2 font-medium">บันทึกช่วยจำ</label>
                  <input type="text" placeholder="เช่น ค่าที่พัก, ค่าเช่า..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition" />
                </div>

                {/* Trip Select */}
                <div>
                  <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1"><Plane size={14} /> ทริป (ถ้ามี)</label>
                  <select value={form.tripId} onChange={e => setForm({ ...form, tripId: e.target.value })}
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] appearance-none transition pr-10">
                    <option value="">ไม่ใช่รายจ่ายทริป</option>
                    {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
                  </select>
                </div>

                {/* Submit */}
                <button type="submit" disabled={submitting}
                  className="w-full bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 mt-2">
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <span>เริ่มตั้งรายการล่วงหน้า</span>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 fade-in">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3
            ${notification.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}

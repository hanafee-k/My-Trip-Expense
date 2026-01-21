"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { ChevronRight, Image as ImageIcon, Plus, Trash2, Save, X, Filter, Plane } from "lucide-react"; 

export default function Home() {
  const { user } = useAuth();
  
  // --- Helper ---
  const getStartOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  const getEndOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // --- State ---
  const [filterStart, setFilterStart] = useState(getStartOfMonth());
  const [filterEnd, setFilterEnd] = useState(getEndOfMonth());
  const [filterTrip, setFilterTrip] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const [form, setForm] = useState({ 
    amount: "", 
    note: "", 
    type: "expense", 
    category: "food",
    date: getTodayDate()
  });
  
  const [isTrip, setIsTrip] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false); 
  const [editId, setEditId] = useState(null); 

  const categories = [
    { id: "food", name: "อาหาร", icon: "🍜" },
    { id: "transport", name: "เดินทาง", icon: "🚕" },
    { id: "shopping", name: "ช็อปปิ้ง", icon: "🛍️" },
    { id: "hotel", name: "ที่พัก", icon: "🏨" },
    { id: "other", name: "อื่นๆ", icon: "📝" },
  ];

  // --- Fetch Data ---
  useEffect(() => {
    if (!user) return;
    const qTrans = query(collection(db, `users/${user.uid}/transactions`), orderBy("date", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const qTrips = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      const tripsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(tripsData);
      if (tripsData.length > 0 && !selectedTrip) setSelectedTrip(tripsData[0].id);
    });
    return () => { unsubTrans(); unsubTrips(); };
  }, [user]);

  // --- Filter Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const tDate = t.date.toDate().toISOString().split('T')[0];
      const dateMatch = tDate >= filterStart && tDate <= filterEnd;
      let tripMatch = true;
      if (filterTrip === "all") tripMatch = true;
      else if (filterTrip === "no_trip") tripMatch = !t.tripId;
      else tripMatch = t.tripId === filterTrip;
      return dateMatch && tripMatch;
    });
  }, [transactions, filterStart, filterEnd, filterTrip]);

  // --- Submit/Delete ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        amount: Number(form.amount),
        note: form.note,
        type: form.type,
        categoryId: form.category,
        tripId: isTrip ? selectedTrip : null,
        date: Timestamp.fromDate(new Date(form.date)), 
      };
      if (editId) {
        await updateDoc(doc(db, `users/${user.uid}/transactions`, editId), payload);
      } else {
        await addDoc(collection(db, `users/${user.uid}/transactions`), { ...payload, createdAt: serverTimestamp() });
      }
      resetForm();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (confirm("⚠️ ยืนยันที่จะลบรายการนี้?")) {
        setLoading(true);
        try {
            await deleteDoc(doc(db, `users/${user.uid}/transactions`, editId));
            resetForm();
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    }
  };

  const handleEditClick = (t) => {
    setForm({
        amount: t.amount,
        note: t.note,
        type: t.type,
        category: t.categoryId,
        date: t.date.toDate().toISOString().split('T')[0]
    });
    setIsTrip(!!t.tripId);
    if(t.tripId) setSelectedTrip(t.tripId);
    setEditId(t.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ ...form, amount: "", note: "" });
    setEditId(null);
    setShowForm(false);
  };

  // Helpers
  const getTripName = (id) => trips.find(t => t.id === id)?.name || "";
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };
  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || "📝";
  const summary = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  if (!user) return null;

  return (
    // 🟥 BG หลัก: เปลี่ยนเป็น Zinc 950 (ดำเทาเข้มสุด)
    <div className="min-h-screen bg-zinc-800 text-zinc-100 pb-24 font-sans selection:bg-teal-800">
      
      {/* 🟥 Header: เปลี่ยนเป็น Zinc 900 (เทาเข้ม) และตัดเงาฟุ้งๆ ออก */}
      <div className="bg-[#18181b] p-4 text-center border-b border-zinc-800 sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-white tracking-wide">
          <span className="text-2xl"></span>
          <span>NOMAD<span className="text-teal-500">TRIP</span> WALLET</span>
        </h1>
      </div>

      <div className="max-w-md mx-auto pt-6">
        
        {/* --- Filter Bar --- */}
        <div className="px-4 mb-4">
            {/* 🟥 ปุ่ม Filter: ใช้สีพื้น Zinc 900 ตัดขอบ Zinc 800 เน้นสี Teal */}
            <button 
                onClick={() => setShowFilter(!showFilter)}
                className="w-full flex justify-between items-center bg-[#18181b] p-3 rounded-lg border border-zinc-800 text-sm text-zinc-300 hover:border-teal-600 transition"
            >
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-teal-500"/>
                    <span className="font-medium">
                      {filterTrip === 'all' ? 'ทุกรายการ' : filterTrip === 'no_trip' ? 'ชีวิตประจำวัน' : `ทริป: ${getTripName(filterTrip)}`} 
                      {' '}| {new Date(filterStart).toLocaleDateString('th-TH', {day:'numeric', month:'short'})} - ...
                    </span>
                </div>
                <ChevronRight size={16} className={`transform transition ${showFilter ? 'rotate-90' : ''}`}/>
            </button>
            
            {showFilter && (
                <div className="mt-2 p-4 bg-[#18181b] rounded-lg border border-zinc-800 animate-in fade-in slide-in-from-top-2 space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-2 font-medium flex items-center gap-1"><Plane size={14}/> เลือกดูรายการของ</label>
                      <select 
                        value={filterTrip} 
                        onChange={(e) => setFilterTrip(e.target.value)} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition"
                      >
                        <option value="all">🌐 รายการทั้งหมด</option>
                        <option value="no_trip">🏠 ชีวิตประจำวัน (ไม่เข้าทริป)</option>
                        <option disabled>──────────</option>
                        {trips.map(t => (
                          <option key={t.id} value={t.id}>✈️ {t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="border-t border-zinc-800"></div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                          <label className="text-xs text-zinc-400 block mb-2 font-medium">ตั้งแต่วันที่</label>
                          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs text-zinc-400 block mb-2 font-medium">ถึงวันที่</label>
                          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" />
                      </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- 🟥 การ์ดสรุปยอด: เปลี่ยนจากสีเหลืองไล่สี เป็นสี Teal เข้มแบบ Solid --- */}
        <div className="px-4">
          {/* ใช้สี Teal-800 แบบทึบ ตัดขอบ Teal-700 เอา blur ออกให้หมด */}
          <div className="bg-[#115e59] rounded-2xl p-6 text-white relative border border-[#134e4a] overflow-hidden">
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div>
                <div className="text-sm font-medium text-teal-100 opacity-80 mb-1">
                  {filterTrip === 'all' ? 'ยอดใช้จ่ายรวม' : filterTrip === 'no_trip' ? 'ใช้จ่าย (ชีวิตประจำวัน)' : `ใช้จ่าย (${getTripName(filterTrip)})`}
                </div>
                <div className="text-4xl font-extrabold tracking-tight">
                  {summary.expense.toLocaleString()} <span className="text-xl text-teal-200">฿</span>
                </div>
              </div>
              {/* ไอคอนมุมขวา */}
              <div className="bg-teal-900/50 p-3 rounded-xl border border-teal-700/50">
                <ImageIcon size={22} className="text-teal-100"/>
              </div>
            </div>
            {/* ส่วนสรุปย่อยด้านล่าง */}
            <div className="flex justify-between text-sm border-t border-teal-700/50 pt-4 bg-teal-800/20 -mx-6 -mb-6 px-6 py-4">
               <div className="text-teal-100 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 รายรับ: <span className="font-bold text-white">+{summary.income.toLocaleString()}</span>
               </div>
               <div className="text-teal-100 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                 คงเหลือ: <span className="font-bold text-white">{(summary.income - summary.expense).toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>

        {/* --- ปุ่มจดเพิ่ม --- */}
        {!showForm && (
            <div className="flex justify-end px-4 mt-5 mb-2">
                {/* 🟥 ปุ่มหลักใช้สี Teal Solid */}
                <button 
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-bold text-sm transition-all active:scale-95 border border-teal-500"
                >
                    <Plus size={18} /> จดเพิ่ม
                </button>
            </div>
        )}

        {/* --- ฟอร์มบันทึก / แก้ไข --- */}
        {showForm && (
          <div className="mx-4 mt-4 mb-6 bg-[#18181b] p-5 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 relative shadow-none">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-800">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    {editId ? <><span className="text-teal-400">✏️</span> แก้ไขรายการ</> : <><span className="text-teal-400">📝</span> จดรายการใหม่</>}
                </h3>
                <button onClick={resetForm} className="bg-zinc-800 p-1.5 rounded-full hover:bg-zinc-700 transition text-zinc-400"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
               {/* 🟥 ปุ่มเลือกประเภท ใช้สีทึบ เข้มๆ */}
               <div className="flex gap-3 p-1 bg-zinc-900 rounded-lg">
                  <button type="button" onClick={() => setForm({...form, type: 'expense'})} className={`flex-1 py-2.5 rounded-md font-bold text-sm transition-all ${form.type==='expense' ? 'bg-[#be123c] text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>รายจ่าย</button>
                  <button type="button" onClick={() => setForm({...form, type: 'income'})} className={`flex-1 py-2.5 rounded-md font-bold text-sm transition-all ${form.type==='income' ? 'bg-[#047857] text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>รายรับ</button>
               </div>
               
               <div className="relative">
                   <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-white text-3xl font-bold text-center focus:outline-none focus:border-teal-600 transition" required />
                   <span className="absolute right-5 top-6 text-zinc-500 font-bold text-lg">฿</span>
               </div>
               
               <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white text-sm focus:outline-none focus:border-teal-600 appearance-none transition">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
               </select>

               <div className="flex gap-3">
                  <input type="text" placeholder="บันทึก (เช่น ข้าว)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="flex-1 bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white text-sm focus:outline-none focus:border-teal-600 transition" />
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white text-sm focus:outline-none focus:border-teal-600 transition" />
               </div>

               <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <input type="checkbox" checked={isTrip} onChange={() => setIsTrip(!isTrip)} className="w-4 h-4 accent-teal-600 rounded" />
                     <span className="text-sm font-medium text-zinc-300">เข้าทริปเที่ยว?</span>
                  </div>
                  {isTrip && (
                     <select value={selectedTrip} onChange={e => setSelectedTrip(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-xs p-1.5 rounded text-white max-w-[150px] focus:outline-none focus:border-teal-600">
                        {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                  )}
               </div>

               <div className="flex gap-3 pt-2">
                   {editId && (
                       <button type="button" onClick={handleDelete} className="bg-zinc-900 hover:bg-red-950 text-red-500 p-3 rounded-xl font-bold transition flex items-center justify-center border border-zinc-800 hover:border-red-800">
                           <Trash2 size={20} />
                       </button>
                   )}
                   {/* 🟥 ปุ่มบันทึกหลัก สี Teal */}
                   <button type="submit" disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 border border-teal-500">
                     {loading ? '...' : <><Save size={18}/> {editId ? 'อัปเดต' : 'บันทึก'}</>}
                   </button>
               </div>
            </form>
          </div>
        )}

        {/* --- List รายการ --- */}
        <div className="space-y-px bg-[#09090b] mt-6 pb-10"> 
          <div className="px-4 py-3 text-teal-500 font-bold text-lg flex justify-between items-end border-b border-zinc-800">
             <span>รายการล่าสุด</span>
             <span className="text-xs text-zinc-500 font-medium">แสดง {filteredTransactions.length} รายการ</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 bg-[#18181b] mx-4 mt-4 rounded-xl border border-zinc-800 border-dashed font-medium">
                <p>ไม่พบรายการ</p>
            </div>
          ) : (
            filteredTransactions.map(t => (
              <div 
                key={t.id} 
                onClick={() => handleEditClick(t)} 
                // 🟥 รายการ: ใช้สีพื้น Zinc 900 ตัดขอบ Zinc 800 ไม่มีเงาฟุ้ง
                className="bg-[#18181b] hover:bg-[#202024] p-4 flex items-center justify-between relative group transition-all border-b border-zinc-800 cursor-pointer"
              >
                 {/* 🟥 ขีดข้างหน้าเปลี่ยนเป็นสี Teal */}
                 <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-teal-600"></div>
                 <div className="flex items-center gap-4 ml-3">
                    {/* ไอคอนวงกลมสีเข้ม */}
                    <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center text-2xl border border-zinc-800">
                       {getCategoryIcon(t.categoryId)}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-zinc-100 font-bold text-[15px]">
                         {t.note || categories.find(c=>c.id===t.categoryId)?.name}
                       </span>
                       <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-zinc-500 text-xs font-medium">{formatDate(t.date)}</span>
                         {/* 🟥 ป้ายทริป สี Teal เข้ม */}
                         {t.tripId && <span className="text-[10px] bg-teal-950 text-teal-400 px-2 py-0.5 rounded-md border border-teal-800/50 font-bold">✈️ {getTripName(t.tripId)}</span>}
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    {/* 🟥 ตัวเลขเงิน รายรับเขียวเข้ม รายจ่ายแดงเข้ม */}
                    <div className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-500' : 'text-white'}`}>
                       {Number(t.amount).toLocaleString()}
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
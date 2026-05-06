"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  doc, updateDoc, getDoc, collection, addDoc,
  query, onSnapshot, orderBy, deleteDoc, serverTimestamp
} from "firebase/firestore";
import {
  Plus, Trash2, Save, AlertCircle, Loader2, CheckCircle2,
  TrendingUp, Wallet, Calendar, BarChart3, ChevronDown,
  ChevronUp, Settings, BookOpen, PlusCircle, Copy, Share2
} from "lucide-react";

const DEFAULT_CATS = [
  { id: "save",   name: "ออม/เก็บ",  pct: 50 },
  { id: "spend",  name: "ใช้จ่าย",   pct: 30 },
  { id: "invest", name: "ลงทุน",     pct: 20 },
];

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function AllocationPage() {
  const { user } = useAuth();

  // ── State ──
  const [tab, setTab] = useState("log"); // "log" | "setup" | "history"
  const [categories, setCategories] = useState([]);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupNote, setSetupNote] = useState(null);

  const [form, setForm] = useState({ date: getTodayDate(), income: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);

  const [incomes, setIncomes] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // ── Load config from Firestore ──
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, `users/${user.uid}/allocationConfig/main`)).then((snap) => {
      if (snap.exists() && snap.data().categories?.length) {
        setCategories(snap.data().categories);
      } else {
        setCategories(DEFAULT_CATS);
      }
    });
  }, [user]);

  // ── Real-time income history ──
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/dailyIncomes`),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setIncomes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingHistory(false);
    });
    return () => unsub();
  }, [user]);

  // ── Computed ──
  const total = categories.reduce((s, c) => s + (Number(c.pct) || 0), 0);
  const isValid = total === 100 && categories.every((c) => c.name.trim());

  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.income, 0), [incomes]);
  const avgIncome = incomes.length > 0 ? totalIncome / incomes.length : 0;

  const catTotals = useMemo(() =>
    categories.map((cat) => ({
      ...cat,
      total: incomes.reduce((s, inc) => s + (inc.income * cat.pct) / 100, 0),
    })), [categories, incomes]);

  // Group history by Month
  const groupedIncomes = useMemo(() => {
    const groups = {};
    incomes.forEach((inc) => {
      const dateObj = new Date(inc.date + "T00:00:00");
      const month = dateObj.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
      if (!groups[month]) groups[month] = [];
      groups[month].push(inc);
    });
    return groups;
  }, [incomes]);

  // ── Handlers ──
  const updateCat = (id, field, value) =>
    setCategories((p) => p.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const addCat = () =>
    setCategories((p) => [...p, { id: `cat_${Date.now()}`, name: "", pct: Math.max(0, 100 - total) }]);

  const removeCat = (id) => categories.length > 1 && setCategories((p) => p.filter((c) => c.id !== id));

  const saveSetup = async () => {
    if (!isValid) return;
    setSavingSetup(true);
    try {
      await updateDoc(doc(db, `users/${user.uid}/allocationConfig/main`), { categories });
    } catch {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, `users/${user.uid}/allocationConfig/main`), { categories });
    }
    setSetupNote("success");
    setTimeout(() => setSetupNote(null), 3000);
    setSavingSetup(false);
  };

  const handleLog = async (e) => {
    e.preventDefault();
    if (!categories.length) return;
    const amt = parseFloat(form.income);
    if (!amt || amt <= 0) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/dailyIncomes`), {
        date: form.date,
        income: amt,
        note: form.note.trim(),
        categories: categories.map((c) => ({ ...c, amount: (amt * c.pct) / 100 })),
        createdAt: serverTimestamp(),
      });
      setLastEntry({ income: amt, categories: [...categories] });
      setForm({ date: getTodayDate(), income: "", note: "" });
      setTab("log");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    await deleteDoc(doc(db, `users/${user.uid}/dailyIncomes`, id));
  };

  const copyResults = (amt, cats) => {
    const text = `💰 สรุปการจัดสรรรายรับ (฿${amt.toLocaleString()})\n` +
      cats.map(c => `- ${c.name} (${c.pct}%): ฿${((amt * c.pct) / 100).toLocaleString()}`).join('\n');
    navigator.clipboard.writeText(text);
    alert("คัดลอกลงคลิปบอร์ดแล้ว!");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-28">

      {/* Header with Visual Accent */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8622A]/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-0 relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-black text-[#1A1A1A]">
                💰 จัดสรร<span className="text-[#E8622A]">รายรับ</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Income Allocation Tool</p>
            </div>
            <div className="bg-[#FFF4EF] rounded-2xl px-5 py-3 text-right border border-orange-100 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">สะสมทั้งหมด</p>
              <p className="text-[#E8622A] font-black text-xl leading-none">
                ฿{totalIncome.toLocaleString("th-TH")}
              </p>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex bg-gray-50 p-1 rounded-xl mb-4">
            {[
              { id: "log",     label: "บันทึก",       icon: PlusCircle },
              { id: "history", label: "ประวัติ",       icon: BookOpen },
              { id: "setup",   label: "ตั้งค่า %",     icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-2 rounded-lg transition-all duration-300 ${
                  tab === id
                    ? "bg-white text-[#E8622A] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon size={14} strokeWidth={2.5} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* ════ TAB: บันทึกรายรับ ════ */}
        {tab === "log" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">จำนวนวันที่บันทึก</p>
                <p className="text-2xl font-black text-[#1A1A1A]">{incomes.length} <span className="text-xs text-gray-400 font-bold uppercase">วัน</span></p>
              </div>
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">เฉลี่ยรายรับ/วัน</p>
                <p className="text-2xl font-black text-[#E8622A]">฿{Math.round(avgIncome).toLocaleString()}</p>
              </div>
            </div>

            {/* Category accumulation progress */}
            {incomes.length > 0 && categories.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <p className="text-sm font-black text-[#1A1A1A] flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#E8622A]" /> สรุปแยกหมวดหมู่ (สะสม)
                </p>
                <div className="space-y-4">
                  {catTotals.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-sm text-[#1A1A1A] font-bold">{cat.name}</span>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-black uppercase mr-2">{cat.pct}%</span>
                          <span className="text-[#E8622A] font-black text-sm">
                            ฿{cat.total.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                        <div
                          className="h-full bg-gradient-to-r from-[#E8622A] to-[#ff8c5a] rounded-full transition-all duration-1000"
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Log Form */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-[#E8622A]"></div>
              <p className="text-lg font-black text-[#1A1A1A] mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-[#E8622A]" /> บันทึกรายรับวันนี้
              </p>

              <form onSubmit={handleLog} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">วันที่รับเงิน</label>
                    <input
                      type="date" value={form.date} required
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">จำนวนเงิน (บาท)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                      <input
                        type="number" step="0.01" min="1" placeholder="0.00"
                        value={form.income} required
                        onChange={(e) => setForm((p) => ({ ...p, income: e.target.value }))}
                        className="w-full border border-gray-200 rounded-2xl pl-8 pr-4 py-3.5 text-lg font-black text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">หมายเหตุ (เช่น เงินเดือน, งานเสริม)</label>
                  <input
                    type="text" placeholder="ระบุแหล่งที่มาของเงิน..."
                    value={form.note}
                    onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-medium focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
                  />
                </div>

                {/* Live Preview Table */}
                {form.income > 0 && categories.length > 0 && (
                  <div className="bg-[#FFF4EF] rounded-2xl p-5 space-y-3 border border-orange-100 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center border-b border-orange-200 pb-2 mb-1">
                       <p className="text-[10px] font-black text-[#E8622A] uppercase tracking-widest">พรีวิวการจัดสรร</p>
                       <p className="text-[10px] font-black text-[#E8622A] uppercase tracking-widest">รวม {total}%</p>
                    </div>
                    {categories.map((cat) => {
                      const amt = (parseFloat(form.income) * cat.pct) / 100;
                      return (
                        <div key={cat.id} className="flex justify-between items-center text-sm">
                          <span className="text-orange-900/70 font-bold">{cat.name} <span className="text-[10px] opacity-50 ml-1">({cat.pct}%)</span></span>
                          <span className="font-black text-[#E8622A]">฿{isNaN(amt) ? "0" : amt.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="submit" disabled={submitting || !categories.length}
                  className="w-full py-4 bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 text-base active:scale-[0.98]"
                >
                  {submitting
                    ? <><Loader2 size={20} className="animate-spin" /> กำลังบันทึก...</>
                    : <><PlusCircle size={20} strokeWidth={2.5} /> บันทึกและคำนวณ</>
                  }
                </button>
              </form>
            </div>

            {/* Last entry success highlight */}
            {lastEntry && (
              <div className="bg-white rounded-3xl border-2 border-[#E8622A]/20 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-[#E8622A] to-[#ff8c5a] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-white" />
                    <p className="text-white font-black text-sm uppercase tracking-wider">คำนวณสำเร็จ!</p>
                  </div>
                  <button
                    onClick={() => copyResults(lastEntry.income, lastEntry.categories)}
                    className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-black px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={12} /> COPY สรุป
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                    <span className="text-gray-400 text-xs font-black uppercase">รายรับ</span>
                    <span className="text-2xl font-black text-[#1A1A1A]">฿{lastEntry.income.toLocaleString()}</span>
                  </div>
                  <div className="space-y-4">
                    {lastEntry.categories.map((cat) => (
                      <div key={cat.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A]"></div>
                          <p className="text-sm text-gray-700 font-bold">{cat.name}</p>
                          <span className="text-[10px] text-gray-400 font-black">{cat.pct}%</span>
                        </div>
                        <p className="font-black text-[#E8622A] text-lg">
                          ฿{((lastEntry.income * cat.pct) / 100).toLocaleString("th-TH", { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: ประวัติ (Monthly Grouping) ════ */}
        {tab === "history" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {loadingHistory ? (
              <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-[#E8622A]" /></div>
            ) : Object.keys(groupedIncomes).length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <BookOpen size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-black">ยังไม่มีประวัติการบันทึก</p>
                <p className="text-gray-300 text-xs mt-1">เริ่มบันทึกรายรับครั้งแรกได้ที่แท็บ "บันทึก"</p>
              </div>
            ) : (
              Object.entries(groupedIncomes).map(([month, items]) => (
                <div key={month} className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <h3 className="text-sm font-black text-[#1A1A1A]">{month}</h3>
                    <div className="flex-1 h-[1px] bg-gray-200"></div>
                  </div>

                  <div className="space-y-3">
                    {items.map((inc) => (
                      <div key={inc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                          onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-colors ${expandedId === inc.id ? 'bg-[#E8622A] text-white shadow-lg shadow-orange-500/20' : 'bg-gray-50 text-[#1A1A1A]'}`}>
                               <span className="text-[10px] font-black leading-none opacity-60 mb-0.5">
                                 {new Date(inc.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short" })}
                               </span>
                               <span className="text-sm font-black leading-none">
                                 {new Date(inc.date + "T00:00:00").getDate()}
                               </span>
                            </div>
                            <div>
                              <p className="text-[#1A1A1A] text-sm font-black truncate max-w-[120px] md:max-w-none">
                                {inc.note || "ไม่มีหมายเหตุ"}
                              </p>
                              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <Calendar size={10} /> {new Date(inc.date + "T00:00:00").toLocaleDateString("th-TH", { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[#E8622A] font-black text-base">฿{inc.income.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1">
                               <button
                                 onClick={(e) => { e.stopPropagation(); handleDelete(inc.id); }}
                                 className="p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                               >
                                 <Trash2 size={14} />
                               </button>
                               <div className={`transition-transform duration-300 ${expandedId === inc.id ? 'rotate-180 text-[#E8622A]' : 'text-gray-300'}`}>
                                 <ChevronDown size={18} />
                               </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Breakdown */}
                        {expandedId === inc.id && (
                          <div className="px-5 pb-5 bg-gray-50 animate-in slide-in-from-top-2 duration-300">
                             <div className="bg-white rounded-xl border border-gray-100 shadow-inner overflow-hidden">
                                <table className="w-full text-xs">
                                   <thead className="bg-gray-50/50 border-b border-gray-100">
                                      <tr>
                                         <th className="px-4 py-2 text-left font-black text-gray-400 uppercase tracking-widest text-[9px]">การจัดสรร</th>
                                         <th className="px-4 py-2 text-right font-black text-gray-400 uppercase tracking-widest text-[9px]">จำนวนเงิน</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-50">
                                      {(inc.categories || categories).map((cat) => (
                                        <tr key={cat.id} className="hover:bg-orange-50/30 transition-colors">
                                           <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-2">
                                                 <div className="w-1 h-1 rounded-full bg-[#E8622A]"></div>
                                                 <span className="font-bold text-gray-600">{cat.name}</span>
                                                 <span className="text-[9px] text-gray-400">({cat.pct}%)</span>
                                              </div>
                                           </td>
                                           <td className="px-4 py-2.5 text-right font-black text-[#1A1A1A]">
                                              ฿{((inc.income * cat.pct) / 100).toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                                           </td>
                                        </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                             <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => copyResults(inc.income, inc.categories || categories)}
                                  className="text-[10px] font-black text-[#E8622A] flex items-center gap-1.5 bg-white border border-orange-100 px-3 py-1.5 rounded-full hover:bg-orange-50 transition active:scale-95"
                                >
                                  <Copy size={10} /> คัดลอกผลสรุปรายการนี้
                                </button>
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════ TAB: ตั้งค่า % ════ */}
        {tab === "setup" && (
          <div className="space-y-6 animate-in fade-in duration-500">

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div>
                  <p className="font-black text-[#1A1A1A] text-lg">ตั้งค่าสัดส่วนรายรับ</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Define Your Allocation Strategy</p>
                </div>
                <div className={`text-xs font-black px-4 py-2 rounded-xl border transition-all ${
                  total === 100 ? "bg-green-50 text-green-600 border-green-200"
                  : total > 100 ? "bg-red-50 text-red-500 border-red-200 shadow-lg shadow-red-500/10"
                  : "bg-gray-50 text-gray-400 border-gray-200"
                }`}>
                   {total}%
                </div>
              </div>

              <div className="space-y-3">
                {categories.map((cat, i) => (
                  <div key={cat.id} className="flex items-center gap-3 bg-gray-50/50 rounded-2xl px-4 py-3 group hover:bg-white hover:border-gray-100 border border-transparent transition-all">
                    <span className="text-gray-300 text-[10px] font-black w-4">{i + 1}</span>
                    <input
                      type="text" value={cat.name} placeholder="ชื่อหมวดหมู่..."
                      onChange={(e) => updateCat(cat.id, "name", e.target.value)}
                      className="flex-1 bg-transparent text-[#1A1A1A] text-sm font-bold focus:outline-none placeholder:text-gray-300 min-w-0"
                    />
                    <div className="flex items-center gap-2">
                       <input
                         type="number" value={cat.pct} min={0} max={100}
                         onChange={(e) => updateCat(cat.id, "pct", Number(e.target.value))}
                         className="w-16 border border-gray-100 bg-white rounded-xl px-2 py-2 text-[#E8622A] font-black text-sm text-center focus:outline-none focus:border-[#E8622A] transition"
                       />
                       <span className="text-gray-400 text-[10px] font-black uppercase tracking-tighter">%</span>
                    </div>
                    <button
                      onClick={() => removeCat(cat.id)} disabled={categories.length <= 1}
                      className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition disabled:opacity-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addCat}
                className="w-full py-3.5 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:text-[#E8622A] hover:border-[#E8622A]/40 hover:bg-orange-50 transition-all text-sm font-black flex items-center justify-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> เพิ่มหมวดหมู่ใหม่
              </button>

              {total !== 100 && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
                  <AlertCircle size={18} className="text-red-500 shrink-0" />
                  <p className="text-red-600 text-xs font-black uppercase tracking-wider leading-relaxed">
                    {total > 100 ? `ผลรวมเกิน 100% (เกินมา ${total - 100}%)` : `ผลรวมยังไม่ครบ 100% (ขาดอีก ${100 - total}%)`}
                    <br/><span className="text-[9px] opacity-60">คุณต้องตั้งค่าให้ครบ 100% ก่อนจึงจะบันทึกรายรับได้</span>
                  </p>
                </div>
              )}

              {setupNote === "success" && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4 animate-in slide-in-from-top-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <p className="text-green-600 text-xs font-black uppercase tracking-widest">บันทึกการตั้งค่าเรียบร้อย!</p>
                </div>
              )}

              <button
                onClick={saveSetup} disabled={!isValid || savingSetup}
                className="w-full py-4 bg-[#1A1A1A] hover:bg-black disabled:bg-gray-100 disabled:text-gray-300 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 text-base active:scale-[0.98]"
              >
                {savingSetup
                  ? <><Loader2 size={20} className="animate-spin" /> กำลังบันทึก...</>
                  : <><Save size={20} /> บันทึกการตั้งค่า</>
                }
              </button>
            </div>

            {/* Quick Preview Insight */}
            <div className="bg-[#FFF4EF] rounded-3xl p-6 border border-orange-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <BarChart3 size={80} />
               </div>
               <p className="text-[10px] font-black text-[#E8622A] uppercase tracking-[0.2em] mb-4">ตัวอย่างการจัดสรร (รายรับ ฿10,000)</p>
               <div className="space-y-3 relative z-10">
                 {categories.filter((c) => c.name).map((cat) => (
                   <div key={cat.id} className="flex justify-between items-center py-0.5">
                     <span className="text-[#1A1A1A] font-bold text-sm">{cat.name} <span className="opacity-40 font-black text-[9px] ml-1">({cat.pct}%)</span></span>
                     <span className="font-black text-[#E8622A] text-base">฿{(10000 * cat.pct / 100).toLocaleString()}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

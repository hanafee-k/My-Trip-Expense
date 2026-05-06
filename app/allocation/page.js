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
  ChevronUp, Settings, BookOpen, PlusCircle, Copy, Share2,
  MinusCircle, X, ArrowDownCircle, ArrowUpCircle, Edit2
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
  const [spends, setSpends] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Edit State
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null); // 'income' | 'spend'

  // Spend Form Modal State
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [spendForm, setSpendForm] = useState({ 
    categoryId: "", 
    categoryName: "", 
    amount: "", 
    note: "", 
    date: getTodayDate() 
  });

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

  // ── Real-time spending history ──
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/allocationSpends`),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setSpends(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // ── Computed ──
  const total = categories.reduce((s, c) => s + (Number(c.pct) || 0), 0);
  const isValid = total === 100 && categories.every((c) => c.name.trim());

  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.income, 0), [incomes]);
  const totalSpent = useMemo(() => spends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0), [spends]);
  const totalInitial = useMemo(() => categories.reduce((s, c) => s + (Number(c.initialBalance) || 0), 0), [categories]);
  const currentBalance = totalInitial + totalIncome - totalSpent;
  const avgIncome = incomes.length > 0 ? totalIncome / incomes.length : 0;

  const catTotals = useMemo(() =>
    categories.map((cat) => {
      const allocated = incomes.reduce((s, inc) => {
        // Try to find the exact amount saved in history (to handle past % changes correctly)
        const found = inc.categories?.find(c => c.name === cat.name || c.id === cat.id);
        if (found && typeof found.amount === "number") return s + found.amount;
        // Fallback for entries that don't have the breakdown stored
        return s + (inc.income * (cat.pct || 0)) / 100;
      }, 0);

      const spent = spends
        .filter(s => s.categoryId === cat.id || s.categoryName === cat.name)
        .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);

      const initial = Number(cat.initialBalance) || 0;
      const totalAllocated = allocated + initial;

      return { ...cat, total: totalAllocated, spent, remaining: totalAllocated - spent };
    }), [categories, incomes, spends]);

  // Group history by Month
  const groupedIncomes = useMemo(() => {
    const groups = {};
    const allTransactions = [
      ...incomes.map(i => ({ ...i, type: 'income' })),
      ...spends.map(s => ({ ...s, type: 'spend' }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    allTransactions.forEach((tx) => {
      const dateObj = new Date(tx.date + "T00:00:00");
      const month = dateObj.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
      if (!groups[month]) groups[month] = [];
      groups[month].push(tx);
    });
    return groups;
  }, [incomes, spends]);

  // ── Handlers ──
  const updateCat = (id, field, value) =>
    setCategories((p) => p.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const addCat = () =>
    setCategories((p) => [...p, { id: `cat_${Date.now()}`, name: "", pct: Math.max(0, 100 - total), initialBalance: 0 }]);

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
      const payload = {
        date: form.date,
        income: amt,
        note: form.note.trim(),
        categories: categories.map((c) => ({ ...c, amount: (amt * c.pct) / 100 })),
        updatedAt: serverTimestamp(),
      };

      if (editId && editType === 'income') {
        await updateDoc(doc(db, `users/${user.uid}/dailyIncomes`, editId), payload);
        setEditId(null);
        setEditType(null);
      } else {
        await addDoc(collection(db, `users/${user.uid}/dailyIncomes`), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      
      setLastEntry({ income: amt, categories: [...categories] });
      setForm({ date: getTodayDate(), income: "", note: "" });
      // Keep on log tab to show success highlight
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const handleSpend = async (e) => {
    e.preventDefault();
    const amt = parseFloat(spendForm.amount);
    if (!amt || amt <= 0 || !spendForm.categoryId) return;
    setSubmitting(true);
    try {
      const payload = {
        date: spendForm.date,
        amount: amt,
        categoryId: spendForm.categoryId,
        categoryName: spendForm.categoryName,
        note: spendForm.note.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editId && editType === 'spend') {
        await updateDoc(doc(db, `users/${user.uid}/allocationSpends`, editId), payload);
        setEditId(null);
        setEditType(null);
      } else {
        await addDoc(collection(db, `users/${user.uid}/allocationSpends`), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      
      setShowSpendModal(false);
      setSpendForm({ categoryId: "", categoryName: "", amount: "", note: "", date: getTodayDate() });
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const handleEditClick = (tx) => {
    if (tx.type === 'income') {
      setForm({
        date: tx.date,
        income: tx.income.toString(),
        note: tx.note || ""
      });
      setEditId(tx.id);
      setEditType('income');
      setTab("log");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSpendForm({
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        amount: tx.amount.toString(),
        note: tx.note || "",
        date: tx.date
      });
      setEditId(tx.id);
      setEditType('spend');
      setShowSpendModal(true);
    }
  };

  const handleDelete = async (id, type = 'income') => {
    if (!confirm("ลบรายการนี้?")) return;
    if (type === 'income') {
      await deleteDoc(doc(db, `users/${user.uid}/dailyIncomes`, id));
    } else {
      await deleteDoc(doc(db, `users/${user.uid}/allocationSpends`, id));
    }
  };

  const copyResults = (amt, cats) => {
    const text = `💰 สรุปการจัดสรรรายรับ (฿${amt.toLocaleString()})\n` +
      cats.map(c => `- ${c.name} (${c.pct}%): ฿${((amt * c.pct) / 100).toLocaleString()}`).join('\n');
    navigator.clipboard.writeText(text);
    alert("คัดลอกลงคลิปบอร์ดแล้ว!");
  };

  const copyOverallSummary = () => {
    const text = `📊 สรุปยอดจัดสรรคงเหลือ (ยอดรวมคงเหลือ ฿${currentBalance.toLocaleString()})\n` +
      catTotals.map(cat => `- ${cat.name}: ฿${cat.remaining.toLocaleString("th-TH", { maximumFractionDigits: 0 })} (ใช้ไปแล้ว ฿${cat.spent.toLocaleString()})`).join('\n');
    navigator.clipboard.writeText(text);
    alert("คัดลอกสรุปคงเหลือทั้งหมดแล้ว!");
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
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">ยอดเงินคงเหลือรวม</p>
              <p className={`font-black text-xl leading-none ${currentBalance >= 0 ? 'text-[#E8622A]' : 'text-rose-500'}`}>
                ฿{currentBalance.toLocaleString("th-TH")}
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
                  <BarChart3 size={16} className="text-[#E8622A]" /> ยอดเงินคงเหลือรายหมวดหมู่
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {catTotals.map((cat) => (
                    <div key={cat.id} className="bg-gray-50/40 rounded-2xl p-3 border border-gray-50">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-gray-600 font-bold">{cat.name}</span>
                        <span className={`text-sm font-black ${cat.remaining >= 0 ? 'text-[#E8622A]' : 'text-rose-500'}`}>
                          ฿{cat.remaining.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${cat.remaining >= 0 ? 'bg-[#E8622A]' : 'bg-rose-400'}`}
                          style={{ width: `${cat.total > 0 ? Math.min(100, (cat.remaining / cat.total) * 100) : 0}%` }}
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
              <p className="text-lg font-black text-[#1A1A1A] mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-[#E8622A]" /> {editId && editType === 'income' ? 'แก้ไขรายรับ' : 'บันทึกรายรับวันนี้'}
                </span>
                {editId && editType === 'income' && (
                  <button 
                    type="button"
                    onClick={() => { setEditId(null); setEditType(null); setForm({ date: getTodayDate(), income: "", note: "" }); }}
                    className="text-[10px] text-gray-400 font-bold uppercase hover:text-rose-500 transition"
                  >
                    ยกเลิกแก้ไข
                  </button>
                )}
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
                    : <>{editId && editType === 'income' ? <><Save size={20} strokeWidth={2.5} /> อัปเดตข้อมูล</> : <><PlusCircle size={20} strokeWidth={2.5} /> บันทึกและคำนวณ</>}</>
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
            
            {/* Overall Summary Dashboard */}
            {incomes.length > 0 && categories.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md space-y-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <BarChart3 size={100} className="text-[#E8622A]" />
                </div>
                
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <h3 className="text-lg font-black text-[#1A1A1A] flex items-center gap-2">
                      <BarChart3 size={20} className="text-[#E8622A]" /> สรุปยอดสะสมและยอดคงเหลือ
                    </h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Remaining Balance per Category</p>
                  </div>
                  <button 
                    onClick={copyOverallSummary}
                    className="p-2.5 bg-orange-50 text-[#E8622A] rounded-xl hover:bg-orange-100 transition active:scale-95"
                    title="คัดลอกสรุปทั้งหมด"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 relative z-10">
                  {catTotals.map((cat) => (
                    <div key={cat.id} className="bg-gray-50/50 rounded-2xl p-4 border border-transparent hover:border-orange-100 hover:bg-white transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#E8622A]"></div>
                          <div>
                             <span className="text-sm text-gray-700 font-bold block leading-none">{cat.name}</span>
                             <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mt-1 block">เป้าหมาย {cat.pct}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className={`text-base font-black ${cat.remaining >= 0 ? 'text-[#E8622A]' : 'text-rose-500'}`}>
                             ฿{cat.remaining.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                           </span>
                           <span className="text-[9px] text-gray-400 font-black uppercase block">คงเหลือ</span>
                        </div>
                      </div>
                      
                      <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100 mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${cat.remaining >= 0 ? 'bg-gradient-to-r from-[#E8622A] to-[#ff8c5a]' : 'bg-rose-400'}`}
                          style={{ width: `${cat.total > 0 ? Math.min(100, (cat.remaining / cat.total) * 100) : 0}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <div className="flex gap-4">
                           <div className="text-[9px]">
                              <span className="text-gray-400 font-bold uppercase block tracking-tighter">ยอดจัดสรร</span>
                              <span className="text-gray-600 font-black">฿{cat.total.toLocaleString()}</span>
                           </div>
                           <div className="text-[9px]">
                              <span className="text-gray-400 font-bold uppercase block tracking-tighter">ใช้ไปแล้ว</span>
                              <span className="text-gray-600 font-black">฿{cat.spent.toLocaleString()}</span>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSpendForm({ ...spendForm, categoryId: cat.id, categoryName: cat.name });
                            setShowSpendModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8622A] text-white text-[10px] font-black rounded-lg hover:bg-[#d65722] transition active:scale-95 shadow-sm"
                        >
                          <MinusCircle size={12} /> หักยอด
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                   <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter italic">** คำนวณจาก (ยอดจัดสรร - รายการที่หักออก)</p>
                   <div className="text-right">
                      <p className="text-[9px] text-gray-400 font-black uppercase">คงเหลือรวม</p>
                      <p className="text-sm font-black text-[#1A1A1A]">฿{catTotals.reduce((s, c) => s + c.remaining, 0).toLocaleString()}</p>
                   </div>
                </div>
              </div>
            )}

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
                    {items.map((tx) => (
                      <div key={tx.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                          onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-colors ${expandedId === tx.id ? (tx.type === 'income' ? 'bg-[#E8622A]' : 'bg-rose-500') + ' text-white shadow-lg' : 'bg-gray-50 text-[#1A1A1A]'}`}>
                               <span className="text-[10px] font-black leading-none opacity-60 mb-0.5">
                                 {new Date(tx.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short" })}
                               </span>
                               <span className="text-sm font-black leading-none">
                                 {new Date(tx.date + "T00:00:00").getDate()}
                               </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {tx.type === 'spend' && <ArrowDownCircle size={10} className="text-rose-500" />}
                                {tx.type === 'income' && <ArrowUpCircle size={10} className="text-emerald-500" />}
                                <p className="text-[#1A1A1A] text-sm font-black truncate max-w-[120px] md:max-w-none">
                                  {tx.note || (tx.type === 'spend' ? `ใช้จากหมวด ${tx.categoryName}` : "ไม่มีหมายเหตุ")}
                                </p>
                              </div>
                              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <Calendar size={10} /> {new Date(tx.date + "T00:00:00").toLocaleDateString("th-TH", { day: 'numeric', month: 'short' })}
                                {tx.type === 'spend' && <span className="ml-1 text-rose-400">· {tx.categoryName}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`font-black text-base ${tx.type === 'income' ? 'text-[#E8622A]' : 'text-rose-500'}`}>
                                {tx.type === 'income' ? '+' : '-'}฿{tx.income?.toLocaleString() || tx.amount?.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                               <button
                                 onClick={(e) => { e.stopPropagation(); handleEditClick(tx); }}
                                 className="p-2 text-gray-200 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                 title="แก้ไข"
                               >
                                 <Edit2 size={14} />
                               </button>
                               <button
                                 onClick={(e) => { e.stopPropagation(); handleDelete(tx.id, tx.type); }}
                                 className="p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                                 title="ลบ"
                               >
                                 <Trash2 size={14} />
                               </button>
                               <div className={`transition-transform duration-300 ${expandedId === tx.id ? 'rotate-180 text-[#E8622A]' : 'text-gray-300'}`}>
                                 <ChevronDown size={18} />
                               </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Breakdown (Income only) */}
                        {expandedId === tx.id && tx.type === 'income' && (
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
                                      {(tx.categories || categories).map((cat) => (
                                        <tr key={cat.id} className="hover:bg-orange-50/30 transition-colors">
                                           <td className="px-4 py-2.5">
                                              <div className="flex items-center gap-2">
                                                 <div className="w-1 h-1 rounded-full bg-[#E8622A]"></div>
                                                 <span className="font-bold text-gray-600">{cat.name}</span>
                                                 <span className="text-[9px] text-gray-400">({cat.pct}%)</span>
                                              </div>
                                           </td>
                                           <td className="px-4 py-2.5 text-right font-black text-[#1A1A1A]">
                                               ฿{((tx.income * cat.pct) / 100).toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                                           </td>
                                        </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                             <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => copyResults(tx.income, tx.categories || categories)}
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
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-3 bg-gray-50/50 rounded-2xl px-4 py-3 group hover:bg-white hover:border-gray-100 border border-transparent transition-all">
                        <span className="text-gray-300 text-[10px] font-black w-4">{i + 1}</span>
                        <input
                          type="text" value={cat.name} placeholder="ชื่อหมวดหมู่..."
                          onChange={(e) => updateCat(cat.id, "name", e.target.value)}
                          className="flex-1 bg-transparent text-[#1A1A1A] text-sm font-bold focus:outline-none placeholder:text-gray-300 min-w-0"
                        />
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                           <input
                             type="number" value={cat.pct} min={0} max={100}
                             onChange={(e) => updateCat(cat.id, "pct", Number(e.target.value))}
                             className="w-12 border border-gray-100 bg-white rounded-xl px-1 py-1.5 text-[#E8622A] font-black text-xs text-center focus:outline-none focus:border-[#E8622A] transition"
                           />
                           <span className="text-gray-400 text-[9px] font-black uppercase tracking-tighter">%</span>
                        </div>
                        <button
                          onClick={() => removeCat(cat.id)} disabled={categories.length <= 1}
                          className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition disabled:opacity-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* Initial Balance Input */}
                      <div className="flex items-center gap-2 px-7 mb-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">ยอดยกมา (เงินตั้งต้น):</label>
                        <div className="relative flex-1 max-w-[150px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 font-bold">฿</span>
                          <input
                            type="number" value={cat.initialBalance || 0}
                            onChange={(e) => updateCat(cat.id, "initialBalance", Number(e.target.value))}
                            className="w-full border border-gray-100 bg-white rounded-lg pl-5 pr-2 py-1 text-gray-500 font-bold text-[11px] focus:outline-none focus:border-[#E8622A] transition"
                          />
                        </div>
                      </div>
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

      {/* ════ MODAL: บันทึกการใช้เงิน (หักยอด) ════ */}
      {showSpendModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500">
            <div className="flex justify-between items-center p-6 border-b border-gray-50">
              <div>
                <h3 className="text-xl font-black text-[#1A1A1A]">{editId && editType === 'spend' ? 'แก้ไขการหักยอด' : 'หักยอดออกจากหมวดหมู่'}</h3>
                <p className="text-xs text-[#E8622A] font-bold mt-0.5">หมวด: {spendForm.categoryName}</p>
              </div>
              <button 
                onClick={() => { setShowSpendModal(false); setEditId(null); setEditType(null); }} 
                className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSpend} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">จำนวนเงินที่ใช้ (บาท)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">฿</span>
                  <input
                    type="number" step="0.01" min="1" placeholder="0.00" autoFocus
                    value={spendForm.amount} required
                    onChange={(e) => setSpendForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-rose-500 focus:outline-none focus:border-rose-400 transition bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">วันที่ใช้เงิน</label>
                  <input
                    type="date" value={spendForm.date} required
                    onChange={(e) => setSpendForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">หมายเหตุ (เช่น ค่าน้ำมัน, ค่าข้าว)</label>
                  <input
                    type="text" placeholder="ระบุว่าใช้ทำอะไร..."
                    value={spendForm.note}
                    onChange={(e) => setSpendForm((p) => ({ ...p, note: e.target.value }))}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-medium focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={submitting}
                className={`w-full py-4 font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 text-base active:scale-[0.98] mt-2 ${editId && editType === 'spend' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'} text-white`}
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <>{editId && editType === 'spend' ? <><Save size={20} /> อัปเดตการหักยอด</> : <><MinusCircle size={20} /> บันทึกการหักยอด</>}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

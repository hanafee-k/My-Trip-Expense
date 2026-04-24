"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  collection, query, onSnapshot, orderBy, addDoc, serverTimestamp
} from "firebase/firestore";
import {
  ArrowLeft, Users, Calculator, CheckCircle2, Plus, Minus,
  Receipt, Plane, AlertCircle, Split, ArrowRight, Loader2, History
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SplitBillPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState("all");
  const [selectedTxns, setSelectedTxns] = useState([]);
  const [people, setPeople] = useState([
    { name: "คุณ", paid: 0 },
    { name: "เพื่อน 1", paid: 0 },
  ]);
  const [step, setStep] = useState(1); // 1=select txn, 2=set people, 3=result
  const [saving, setSaving] = useState(false);
  const [savedHistory, setSavedHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [customTxns, setCustomTxns] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [customAmount, setCustomAmount] = useState("");

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
    const unsubT = onSnapshot(qT, snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qTr = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubTr = onSnapshot(qTr, snap => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubT(); unsubTr(); };
  }, [user]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== "expense") return false;
      if (selectedTrip === "all") return true;
      if (selectedTrip === "no_trip") return !t.tripId;
      return t.tripId === selectedTrip;
    });
  }, [transactions, selectedTrip]);

  const combinedTxns = useMemo(() => {
    return [...customTxns, ...filteredTxns];
  }, [filteredTxns, customTxns]);

  const totalSelected = useMemo(() =>
    selectedTxns.reduce((s, id) => {
      const t = transactions.find(tx => tx.id === id) || customTxns.find(ctx => ctx.id === id);
      return s + (t?.amount || 0);
    }, 0),
    [selectedTxns, transactions, customTxns]
  );

  const perPerson = people.length > 0 ? totalSelected / people.length : 0;

  // Settlement calculation
  const settlement = useMemo(() => {
    if (people.length === 0 || totalSelected === 0) return [];
    const pp = perPerson;
    const balances = people.map(p => ({ name: p.name, balance: (p.paid || 0) - pp }));
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const txns = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].balance, -debtors[di].balance);
      if (amount > 0.01) txns.push({ from: debtors[di].name, to: creditors[ci].name, amount });
      creditors[ci].balance -= amount;
      debtors[di].balance += amount;
      if (Math.abs(creditors[ci].balance) < 0.01) ci++;
      if (Math.abs(debtors[di].balance) < 0.01) di++;
    }
    return txns;
  }, [people, perPerson, totalSelected]);

  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || "📝";
  const getTripName = (id) => trips.find(t => t.id === id)?.name || "ไม่ระบุทริป";
  const formatDate = (ts) => {
    if (!ts) return "";
    try { return ts.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }); }
    catch { return ""; }
  };

  const toggleTxn = (id) => {
    setSelectedTxns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addPerson = () => setPeople(prev => [...prev, { name: `คน ${prev.length + 1}`, paid: 0 }]);
  const removePerson = (i) => setPeople(prev => prev.filter((_, idx) => idx !== i));
  const updatePerson = (i, field, val) => {
    setPeople(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const handleAddCustomTxn = () => {
    if (!customNote.trim() || !customAmount || isNaN(customAmount)) return;
    const newCustomTxn = {
      id: `custom_${Date.now()}`,
      note: customNote,
      amount: parseFloat(customAmount),
      categoryId: "other",
      date: { toDate: () => new Date() }
    };
    setCustomTxns(prev => [newCustomTxn, ...prev]);
    setSelectedTxns(prev => [...prev, newCustomTxn.id]);
    setCustomNote("");
    setCustomAmount("");
    setShowCustomForm(false);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedTxns([]);
    setCustomTxns([]);
    setPeople([
      { name: "คุณ", paid: 0 },
      { name: "เพื่อน 1", paid: 0 },
    ]);
  };

  const handleSave = async () => {
    if (!user || selectedTxns.length === 0) return;
    setSaving(true);
    try {
      const tripId = selectedTrip !== "all" && selectedTrip !== "no_trip" ? selectedTrip : null;
      const splitData = {
        transactionIds: selectedTxns.filter(id => !id.toString().startsWith("custom_")),
        customItems: customTxns.filter(c => selectedTxns.includes(c.id)),
        totalAmount: totalSelected,
        perPerson,
        people,
        settlement,
        tripId,
        createdAt: serverTimestamp(),
      };
      const colRef = tripId
        ? collection(db, `users/${user.uid}/trips/${tripId}/splits`)
        : collection(db, `users/${user.uid}/splits`);
      await addDoc(colRef, splitData);
      setShowHistory(true);
      alert("✅ บันทึกการหารบิลสำเร็จ!");
    } catch (e) {
      console.error(e);
      alert("❌ เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-32 text-[#1A1A1A] bg-[#F7F6F3]">

      {/* Header */}
      <div className="bg-white/95 border-b border-[#EBEBEB] sticky top-0 z-50 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={20} className="text-[#1A1A1A]" />
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-[#1A1A1A] flex items-center gap-2">
              <Split size={20} className="text-[#E8622A]" />
              หารบิล
            </h1>

            <p className="text-xs sm:text-sm text-[#6B6B6B]">Split Bill Calculator</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-1.5 rounded-full transition-all ${step >= s ? 'bg-[#E8622A]' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="max-w-3xl mx-auto">

        {/* Step 1 — เลือก Transactions */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Receipt size={16} className="text-[#E8622A]" /> เลือกรายจ่ายที่จะหาร
              </p>
              {/* Trip Filter */}
              <select
                value={selectedTrip}
                onChange={e => setSelectedTrip(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] mb-4 transition"
              >
                <option value="all">🌐 ทุกรายการ</option>
                <option value="no_trip">🏠 ชีวิตประจำวัน</option>
                {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
              </select>

              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="w-full bg-white border border-dashed border-gray-300 hover:border-[#E8622A] text-[#6B6B6B] hover:text-[#E8622A] p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition mb-4 shadow-sm"
                >
                  <Plus size={16} /> ระบุรายการใหม่เอง
                </button>
              ) : (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 space-y-3">
                  <input
                    type="text"
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    placeholder="ชื่อรายการ (เช่น ค่าอาหาร)"
                    className="w-full bg-white border border-gray-200 text-[#1A1A1A] text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#E8622A]"
                  />
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    placeholder="จำนวนเงิน (฿)"
                    className="w-full bg-white border border-gray-200 text-[#1A1A1A] text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#E8622A]"
                  />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowCustomForm(false)} className="flex-1 bg-white hover:bg-gray-100 border border-gray-200 text-[#1A1A1A] py-2.5 rounded-lg text-xs font-bold transition">ยกเลิก</button>
                    <button onClick={handleAddCustomTxn} className="flex-1 bg-[#E8622A] hover:bg-[#d65722] text-white py-2.5 rounded-lg text-xs font-bold transition">เพิ่ม</button>
                  </div>
                </div>
              )}

              {combinedTxns.length === 0 ? (
                <div className="text-center py-10 text-[#6B6B6B]">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-40 text-gray-400" />
                  <p className="text-sm font-medium">ไม่พบรายจ่าย</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-hide">
                  {combinedTxns.map(t => {
                    const selected = selectedTxns.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTxn(t.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          selected
                            ? 'bg-[#FFF4EF] border-[#E8622A]'
                            : 'bg-white border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selected ? 'bg-[#E8622A] border-[#E8622A]' : 'border-gray-300'
                          }`}>
                            {selected && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gray-100">
                            {getCategoryIcon(t.categoryId)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A1A1A]">{t.note || "ไม่ระบุ"}</p>
                            <p className="text-xs text-[#6B6B6B] mt-0.5">{formatDate(t.date)} {t.tripId && `• ✈️ ${getTripName(t.tripId)}`}</p>
                          </div>
                        </div>
                        <span className={`font-black text-sm ${selected ? 'text-[#E8622A]' : 'text-[#1A1A1A]'}`}>
                          ฿{Number(t.amount).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            {selectedTxns.length > 0 && (
              <div className="bg-[#FFF4EF] rounded-2xl p-5 border border-[#fbdcd0] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[#E8622A] text-xs font-bold mb-1">เลือกแล้ว {selectedTxns.length} รายการ</p>
                    <p className="text-3xl font-black text-[#1A1A1A]">฿{totalSelected.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="bg-[#E8622A] hover:bg-[#d65722] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                  >
                    ถัดไป <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — กำหนดคน */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Users size={16} className="text-[#E8622A]" /> กำหนดผู้ร่วมจ่าย
                </p>
                <button onClick={addPerson} className="bg-white border border-gray-200 hover:bg-gray-50 text-[#1A1A1A] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm">
                  <Plus size={14} className="text-[#E8622A]"/> เพิ่มคน
                </button>
              </div>

              <div className="space-y-3">
                {people.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="w-8 h-8 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center text-sm font-black text-[#E8622A]">
                      {i + 1}
                    </div>
                    <input
                      value={p.name}
                      onChange={e => updatePerson(i, "name", e.target.value)}
                      className="flex-1 bg-transparent text-[#1A1A1A] text-sm font-bold focus:outline-none"
                      placeholder={`คน ${i + 1}`}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[#6B6B6B] text-xs font-medium">จ่ายไปแล้ว ฿</span>
                      <input
                        type="number"
                        value={p.paid}
                        onChange={e => updatePerson(i, "paid", parseFloat(e.target.value) || 0)}
                        className="w-20 bg-white border border-gray-200 text-[#1A1A1A] font-bold text-sm text-right px-2 py-1.5 rounded-lg focus:outline-none focus:border-[#E8622A] shadow-sm"
                      />
                    </div>
                    {people.length > 2 && (
                      <button onClick={() => removePerson(i)} className="text-red-500 hover:text-red-600 p-1 transition bg-white border border-gray-200 rounded-lg shadow-sm">
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B6B6B] font-medium">ยอดรวม</span>
                <span className="text-[#1A1A1A] font-bold">฿{totalSelected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-[#6B6B6B] font-medium">จำนวนคน</span>
                <span className="text-[#1A1A1A] font-bold">{people.length} คน</span>
              </div>
              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                <span className="text-[#E8622A] font-bold">แต่ละคนจ่าย</span>
                <span className="text-[#1A1A1A] font-black text-2xl">฿{perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-[#1A1A1A] py-3.5 rounded-xl font-bold text-sm transition shadow-sm">
                ← ย้อนกลับ
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-[#E8622A] hover:bg-[#d65722] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm">
                <Calculator size={16} /> คำนวณ
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — ผลลัพธ์ */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] text-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-orange-500 opacity-5 text-7xl">🧮</div>
              <p className="text-[#E8622A] text-sm font-bold mb-4 flex items-center justify-center gap-2 relative z-10">
                <Calculator size={16} /> ผลการคำนวณ
              </p>
              <div className="py-2 relative z-10">
                <p className="text-5xl font-black text-[#1A1A1A]">฿{perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[#6B6B6B] text-sm mt-2 font-medium">ต่อคน ({people.length} คน)</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
                {people.map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-left">
                    <p className="text-xs text-[#6B6B6B] mb-1 font-bold">{p.name}</p>
                    <p className={`font-black text-sm ${(p.paid || 0) >= perPerson ? 'text-green-600' : 'text-red-500'}`}>
                      {(p.paid || 0) >= perPerson
                        ? `+฿${((p.paid || 0) - perPerson).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`
                        : `-฿${(perPerson - (p.paid || 0)).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Settlement */}
            {settlement.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <p className="text-sm font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <ArrowRight size={16} className="text-orange-500" /> ใครโอนให้ใคร
                </p>
                <div className="space-y-3">
                  {settlement.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FFF4EF] rounded-xl p-4 border border-[#fbdcd0]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1A1A1A]">{s.from}</span>
                        <ArrowRight size={14} className="text-[#E8622A]" />
                        <span className="text-sm font-bold text-[#1A1A1A]">{s.to}</span>
                      </div>
                      <span className="font-black text-[#E8622A] text-lg">฿{s.amount.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settlement.length === 0 && (
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
                <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                <p className="text-green-700 font-bold">ทุกคนจ่ายเท่ากัน! 🎉</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-[#1A1A1A] py-3.5 rounded-xl font-bold text-sm transition shadow-sm">
                  ← ย้อนกลับ
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {saving ? "กำลังบันทึก..." : "บันทึกการหาร"}
                </button>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-[#6B6B6B] hover:text-[#1A1A1A] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition mt-2 shadow-sm"
              >
                <Plus size={16} /> เริ่มการหารบิลใหม่
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

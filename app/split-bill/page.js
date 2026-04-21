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

  const totalSelected = useMemo(() =>
    selectedTxns.reduce((s, id) => {
      const t = transactions.find(tx => tx.id === id);
      return s + (t?.amount || 0);
    }, 0),
    [selectedTxns, transactions]
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

  const handleSave = async () => {
    if (!user || selectedTxns.length === 0) return;
    setSaving(true);
    try {
      const tripId = selectedTrip !== "all" && selectedTrip !== "no_trip" ? selectedTrip : null;
      const splitData = {
        transactionIds: selectedTxns,
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 font-sans">
      {/* Header */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-800 rounded-lg transition">
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Split size={20} className="text-teal-500" />
              หารบิล
            </h1>
            <p className="text-xs text-zinc-500">Split Bill Calculator</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-1.5 rounded-full transition-all ${step >= s ? 'bg-teal-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Step 1 — เลือก Transactions */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Receipt size={16} className="text-teal-500" /> เลือกรายจ่ายที่จะหาร
              </p>
              {/* Trip Filter */}
              <select
                value={selectedTrip}
                onChange={e => setSelectedTrip(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 mb-3"
              >
                <option value="all">🌐 ทุกรายการ</option>
                <option value="no_trip">🏠 ชีวิตประจำวัน</option>
                {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
              </select>

              {filteredTxns.length === 0 ? (
                <div className="text-center py-10 text-zinc-600">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">ไม่พบรายจ่าย</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {filteredTxns.map(t => {
                    const selected = selectedTxns.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTxn(t.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          selected
                            ? 'bg-teal-950 border-teal-600'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selected ? 'bg-teal-500 border-teal-500' : 'border-zinc-600'
                          }`}>
                            {selected && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                          <span className="text-xl">{getCategoryIcon(t.categoryId)}</span>
                          <div>
                            <p className="text-sm font-medium text-white">{t.note || "ไม่ระบุ"}</p>
                            <p className="text-xs text-zinc-500">{formatDate(t.date)} {t.tripId && `• ✈️ ${getTripName(t.tripId)}`}</p>
                          </div>
                        </div>
                        <span className={`font-black text-sm ${selected ? 'text-teal-400' : 'text-zinc-300'}`}>
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
              <div className="bg-gradient-to-r from-teal-950 to-teal-900 rounded-2xl p-4 border border-teal-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-teal-300 text-xs">เลือกแล้ว {selectedTxns.length} รายการ</p>
                    <p className="text-3xl font-black text-white">฿{totalSelected.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
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
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-teal-500" /> กำหนดผู้ร่วมจ่าย
                </p>
                <button onClick={addPerson} className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition">
                  <Plus size={14} /> เพิ่มคน
                </button>
              </div>

              <div className="space-y-3">
                {people.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="w-8 h-8 bg-teal-900 rounded-full flex items-center justify-center text-sm font-black text-teal-300">
                      {i + 1}
                    </div>
                    <input
                      value={p.name}
                      onChange={e => updatePerson(i, "name", e.target.value)}
                      className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none"
                      placeholder={`คน ${i + 1}`}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500 text-xs">จ่ายไปแล้ว ฿</span>
                      <input
                        type="number"
                        value={p.paid}
                        onChange={e => updatePerson(i, "paid", parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-900 border border-zinc-700 text-white text-sm text-right px-2 py-1 rounded-lg focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    {people.length > 2 && (
                      <button onClick={() => removePerson(i)} className="text-red-500 hover:text-red-400 p-1 transition">
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">ยอดรวม</span>
                <span className="text-white font-bold">฿{totalSelected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-zinc-400">จำนวนคน</span>
                <span className="text-white font-bold">{people.length} คน</span>
              </div>
              <div className="border-t border-zinc-700 mt-3 pt-3 flex justify-between">
                <span className="text-teal-300 font-bold">แต่ละคนจ่าย</span>
                <span className="text-teal-400 font-black text-xl">฿{perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition">
                ← ย้อนกลับ
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition">
                <Calculator size={16} /> คำนวณ
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — ผลลัพธ์ */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-teal-950 to-zinc-900 rounded-2xl p-5 border border-teal-800">
              <p className="text-teal-300 text-sm font-bold mb-3 flex items-center gap-2">
                <Calculator size={16} /> ผลการคำนวณ
              </p>
              <div className="text-center py-3">
                <p className="text-4xl font-black text-white">฿{perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-teal-400 text-sm mt-1">ต่อคน ({people.length} คน)</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {people.map((p, i) => (
                  <div key={i} className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-700">
                    <p className="text-xs text-zinc-400 mb-1">{p.name}</p>
                    <p className={`font-black text-sm ${(p.paid || 0) >= perPerson ? 'text-emerald-400' : 'text-rose-400'}`}>
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
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <ArrowRight size={16} className="text-amber-400" /> ใครโอนให้ใคร
                </p>
                <div className="space-y-2">
                  {settlement.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-amber-950/40 rounded-xl p-3 border border-amber-800/40">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{s.from}</span>
                        <ArrowRight size={14} className="text-amber-400" />
                        <span className="text-sm font-bold text-white">{s.to}</span>
                      </div>
                      <span className="font-black text-amber-400">฿{s.amount.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settlement.length === 0 && (
              <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40 text-center">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-300 font-bold text-sm">ทุกคนจ่ายเท่ากัน! 🎉</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition">
                ← ย้อนกลับ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? "กำลังบันทึก..." : "บันทึกการหาร"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

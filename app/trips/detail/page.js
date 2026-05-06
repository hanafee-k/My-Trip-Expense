"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthContext";
import {
  doc, onSnapshot, collection, query, orderBy, where
} from "firebase/firestore";
import {
  ArrowLeft, BarChart3, Wallet, TrendingDown, TrendingUp,
  Calendar, Target, Zap, AlertTriangle, Clock, Loader2
} from "lucide-react";

import AllocationSetup from "../../../components/allocation/AllocationSetup";
import DailyIncomeForm from "../../../components/allocation/DailyIncomeForm";
import AllocationOverview from "../../../components/allocation/AllocationOverview";

// ── Tabs ──
const TABS = [
  { id: "overview",    label: "ภาพรวม",         icon: Target },
  { id: "expenses",   label: "รายจ่าย",          icon: TrendingDown },
  { id: "allocation", label: "รายรับ/จัดสรร",    icon: TrendingUp },
  { id: "timeline",   label: "ไทม์ไลน์",          icon: BarChart3 },
];

const CATEGORIES = [
  { id: "food",          name: "อาหาร & เครื่องดื่ม", icon: "🍜" },
  { id: "transport",     name: "เดินทาง & น้ำมัน",    icon: "🚕" },
  { id: "shopping",      name: "ช็อปปิ้ง",             icon: "🛍️" },
  { id: "hotel",         name: "ที่พัก",               icon: "🏨" },
  { id: "entertainment", name: "บันเทิง",               icon: "🎡" },
  { id: "medical",       name: "ค่ารักษาพยาบาล",       icon: "💊" },
  { id: "other",         name: "อื่นๆ",                icon: "📝" },
];

function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch { return "—"; }
}

export default function TripDetailPage() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id");
  const { user } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // ── Real-time trip document ──
  useEffect(() => {
    if (!user || !tripId) { setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, `users/${user.uid}/trips/${tripId}`),
      (snap) => {
        if (snap.exists()) setTrip({ id: snap.id, ...snap.data() });
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tripId, user]);

  // ── Real-time transactions for this trip ──
  useEffect(() => {
    if (!user || !tripId) return;
    const q = query(
      collection(db, `users/${user.uid}/transactions`),
      where("tripId", "==", tripId),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [tripId, user]);

  // ── Stats ──
  const stats = useMemo(() => {
    const expense = transactions.filter((t) => t.type === "expense");
    const income  = transactions.filter((t) => t.type === "income");
    const totalSpent  = expense.reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
    const budget  = Number(trip?.budget) || 0;
    const percent = budget > 0 ? (totalSpent / budget) * 100 : 0;
    return { totalSpent, totalIncome, budget, percent, count: expense.length };
  }, [transactions, trip]);

  // ── Timeline data ──
  const timelineData = useMemo(() => {
    const dayMap = {};
    transactions
      .filter((t) => t.type === "expense" && t.date)
      .forEach((t) => {
        try {
          const d = t.date.toDate().toISOString().split("T")[0];
          if (!dayMap[d]) dayMap[d] = { date: d, total: 0, count: 0 };
          dayMap[d].total += Number(t.amount);
          dayMap[d].count++;
        } catch { /* ignore */ }
      });
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const maxDayTotal = useMemo(
    () => timelineData.reduce((m, d) => Math.max(m, d.total), 0),
    [timelineData]
  );

  const allocationCategories = trip?.allocationCategories || [];

  // ── Guards ──
  if (!tripId) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่ได้ระบุ Trip ID</p>
          <button onClick={() => router.push("/trips")} className="text-[#E8622A] font-bold">
            ← กลับไปหน้าทริป
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#E8622A]" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่พบข้อมูลทริป</p>
          <button onClick={() => router.push("/trips")} className="text-[#E8622A] font-bold">
            ← กลับ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-24">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/trips")}
            className="p-2 hover:bg-gray-100 rounded-full transition shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-[#1A1A1A] truncate">{trip.name}</h1>
            {(trip.startDate || trip.endDate) && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Calendar size={11} />
                {formatDate(trip.startDate)}
                {trip.endDate && ` — ${formatDate(trip.endDate)}`}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-400">ใช้ไป</p>
            <p className="text-sm font-black text-[#E8622A]">
              ฿{stats.totalSpent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-t border-gray-100 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[80px] py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap px-3 ${
                  activeTab === tab.id
                    ? "border-[#E8622A] text-[#E8622A]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">

        {/* ════ TAB: ภาพรวม ════ */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {/* Budget Card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={16} className="text-[#E8622A]" />
                <h2 className="font-bold text-[#1A1A1A]">งบประมาณทริป</h2>
              </div>
              {stats.budget > 0 ? (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">
                      ใช้ไป{" "}
                      <span className="text-[#1A1A1A] font-black">
                        ฿{stats.totalSpent.toLocaleString()}
                      </span>
                    </span>
                    <span className="text-gray-400">งบ ฿{stats.budget.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.percent >= 100 ? "bg-red-500" : stats.percent >= 80 ? "bg-orange-400" : "bg-[#E8622A]"
                      }`}
                      style={{ width: `${Math.min(stats.percent, 100)}%` }}
                    />
                  </div>
                  {stats.percent >= 80 && (
                    <div className={`mt-3 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl ${
                      stats.percent >= 100
                        ? "bg-red-50 text-red-500 border border-red-100"
                        : "bg-orange-50 text-orange-500 border border-orange-100"
                    }`}>
                      <AlertTriangle size={13} />
                      {stats.percent >= 100
                        ? `เกินงบ ฿${(stats.totalSpent - stats.budget).toLocaleString()}`
                        : `ใช้ไปแล้ว ${stats.percent.toFixed(0)}% ของงบ`}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm">ไม่ได้ตั้งงบประมาณไว้</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-red-400">
                  <TrendingDown size={13} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">รายจ่ายรวม</p>
                </div>
                <p className="text-2xl font-black text-[#1A1A1A]">
                  ฿{stats.totalSpent.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{stats.count} รายการ</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-green-500">
                  <TrendingUp size={13} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">รายรับรวม</p>
                </div>
                <p className="text-2xl font-black text-[#1A1A1A]">
                  ฿{stats.totalIncome.toLocaleString()}
                </p>
              </div>
              {trip.dailyLimit > 0 && (
                <div className="col-span-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-indigo-400">
                    <Zap size={13} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">วงเงินต่อวัน</p>
                  </div>
                  <p className="text-xl font-black text-[#1A1A1A]">
                    ฿{Number(trip.dailyLimit).toLocaleString()} / วัน
                  </p>
                </div>
              )}
            </div>

            {/* Allocation preview */}
            {allocationCategories.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                <p className="text-teal-400 text-xs font-black uppercase tracking-widest mb-3">
                  สัดส่วนการจัดสรรที่ตั้งไว้
                </p>
                <div className="space-y-2">
                  {allocationCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${cat.pct}%` }} />
                      </div>
                      <span className="text-zinc-300 text-xs w-24 truncate">{cat.name}</span>
                      <span className="text-teal-400 text-xs font-black w-10 text-right">{cat.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: รายจ่าย ════ */}
        {activeTab === "expenses" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            {transactions.filter((t) => t.type === "expense").length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <TrendingDown size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 font-bold">ยังไม่มีรายจ่ายในทริปนี้</p>
              </div>
            ) : (
              transactions
                .filter((t) => t.type === "expense")
                .map((t) => {
                  const cat = CATEGORIES.find((c) => c.id === t.categoryId);
                  return (
                    <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl shrink-0">
                        {cat?.icon || "📝"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1A1A1A] font-medium text-sm truncate">
                          {t.note || cat?.name}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(t.date)}
                          {cat && <span className="ml-1">• {cat.name}</span>}
                        </p>
                      </div>
                      <p className="text-red-500 font-black text-sm shrink-0">
                        -฿{Number(t.amount).toLocaleString()}
                      </p>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ════ TAB: รายรับ/จัดสรร ════ */}
        {activeTab === "allocation" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                ขั้นตอนที่ 1 — ตั้งค่าหมวดหมู่
              </p>
              <AllocationSetup
                tripId={tripId}
                userId={user.uid}
                categories={allocationCategories}
                onUpdate={() => {}}
              />
            </div>

            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                ขั้นตอนที่ 2 — บันทึกรายรับ
              </p>
              <DailyIncomeForm
                tripId={tripId}
                userId={user.uid}
                categories={allocationCategories}
              />
            </div>

            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                ขั้นตอนที่ 3 — ภาพรวมรายรับ
              </p>
              <AllocationOverview
                tripId={tripId}
                userId={user.uid}
                categories={allocationCategories}
              />
            </div>
          </div>
        )}

        {/* ════ TAB: ไทม์ไลน์ ════ */}
        {activeTab === "timeline" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {timelineData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <BarChart3 size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 font-bold">ยังไม่มีรายจ่ายในทริปนี้</p>
              </div>
            ) : (
              <>
                {/* Summary Banner */}
                <div className="bg-[#FFF4EF] rounded-2xl p-5 border border-orange-100">
                  <h2 className="font-black text-[#1A1A1A] text-lg">✈️ {trip.name}</h2>
                  <div className="flex gap-6 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">รายจ่ายรวม</p>
                      <p className="text-[#E8622A] font-black text-lg">
                        ฿{timelineData.reduce((s, d) => s + d.total, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">วันที่ใช้จ่าย</p>
                      <p className="text-[#1A1A1A] font-bold text-lg">{timelineData.length} วัน</p>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-sm font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#E8622A]" />
                    ยอดรายจ่ายแต่ละวัน
                  </p>
                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                      {timelineData.map((day) => {
                        const h = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
                        const isMax = day.total === maxDayTotal;
                        const dailyLim = Number(trip.dailyLimit) || 0;
                        const over = dailyLim > 0 && day.total > dailyLim;
                        const dateObj = new Date(day.date + "T00:00:00");
                        return (
                          <div key={day.date} className="flex flex-col items-center" style={{ minWidth: 64 }}>
                            <div className={`text-[10px] font-black mb-2 ${isMax ? "text-orange-500" : over ? "text-red-500" : "text-gray-400"}`}>
                              ฿{day.total >= 1000 ? (day.total / 1000).toFixed(1) + "K" : day.total.toLocaleString()}
                            </div>
                            <div className="w-12 h-32 flex flex-col justify-end bg-gray-50 rounded-t-lg relative">
                              {dailyLim > 0 && maxDayTotal > 0 && (
                                <div
                                  className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-400 z-10"
                                  style={{ bottom: `${(dailyLim / maxDayTotal) * 128}px` }}
                                />
                              )}
                              <div
                                className={`w-full rounded-t-lg ${isMax ? "bg-orange-400" : over ? "bg-red-400" : "bg-[#E8622A]"}`}
                                style={{ height: `${Math.max(h, 4)}%`, opacity: 0.85 }}
                              />
                            </div>
                            <div className="text-center mt-2">
                              <div className={`text-[10px] font-bold ${over ? "text-red-500" : "text-[#1A1A1A]"}`}>
                                {dateObj.toLocaleDateString("th-TH", { weekday: "short" })}
                              </div>
                              <div className="text-[9px] text-gray-400">
                                {dateObj.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                              </div>
                            </div>
                            <div className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1">
                              {day.count} รายการ
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Daily List */}
                <div className="space-y-2">
                  {timelineData.map((day) => {
                    const dailyLim = Number(trip.dailyLimit) || 0;
                    const over = dailyLim > 0 && day.total > dailyLim;
                    const dateObj = new Date(day.date + "T00:00:00");
                    return (
                      <div key={day.date} className={`bg-white rounded-xl p-4 border flex items-center justify-between shadow-sm ${over ? "border-red-200" : "border-gray-100"}`}>
                        <div className="flex items-center gap-3">
                          {over && <span className="text-red-500 text-xs">🔴</span>}
                          <div>
                            <p className="text-sm font-bold text-[#1A1A1A]">
                              {dateObj.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                            <p className="text-xs text-gray-400">{day.count} รายการ</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${over ? "text-red-500" : "text-[#1A1A1A]"}`}>
                            ฿{day.total.toLocaleString()}
                          </p>
                          {over && (
                            <p className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded inline-block mt-0.5">
                              เกิน ฿{(day.total - dailyLim).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

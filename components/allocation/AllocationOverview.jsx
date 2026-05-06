"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import { TrendingUp, Calendar, Wallet, BarChart3, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function AllocationOverview({ tripId, userId, categories }) {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // ── onSnapshot with mandatory cleanup (ป้องกัน memory leak) ──
  useEffect(() => {
    if (!userId || !tripId) return;
    const q = query(
      collection(db, `users/${userId}/trips/${tripId}/dailyIncomes`),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setIncomes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub(); // cleanup ทุกครั้งเมื่อ tripId / userId เปลี่ยน หรือ unmount
  }, [tripId, userId]);

  // ── Summary stats ──
  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.income, 0), [incomes]);
  const avgIncome = incomes.length > 0 ? totalIncome / incomes.length : 0;

  // ── Cross-tab: category totals per row ──
  const categoryTotals = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return categories.map((cat) => {
      const total = incomes.reduce((s, inc) => s + (inc.income * cat.pct) / 100, 0);
      return { ...cat, total };
    });
  }, [categories, incomes]);

  const handleDelete = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/trips/${tripId}/dailyIncomes`, id));
    } catch (err) {
      console.error(err);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
        <Loader2 size={24} className="animate-spin text-teal-400" />
      </div>
    );
  }

  // ── Empty ──
  if (incomes.length === 0) {
    return (
      <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
        <TrendingUp size={40} className="mx-auto mb-3 text-zinc-700" />
        <p className="text-zinc-500 font-bold">ยังไม่มีรายรับที่บันทึก</p>
        <p className="text-zinc-600 text-xs mt-1">กรอกรายรับด้านบนแล้วกด "บันทึก"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Wallet size={13} className="text-teal-400" />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">รายรับรวม</p>
          </div>
          <p className="text-teal-400 font-black text-lg leading-none">
            ฿{totalIncome.toLocaleString("th-TH")}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={13} className="text-teal-400" />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">จำนวนวัน</p>
          </div>
          <p className="text-white font-black text-lg leading-none">{incomes.length} วัน</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={13} className="text-teal-400" />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">เฉลี่ย/วัน</p>
          </div>
          <p className="text-white font-black text-lg leading-none">
            ฿{Math.round(avgIncome).toLocaleString("th-TH")}
          </p>
        </div>
      </div>

      {/* ── Category Breakdown with Progress Bars ── */}
      {categories && categories.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-white font-bold text-sm">สรุปแยกตามหมวดหมู่</p>
          {categoryTotals.map((cat) => {
            const pct = totalIncome > 0 ? (cat.total / totalIncome) * 100 : 0;
            return (
              <div key={cat.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-white text-sm font-medium">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-xs">{cat.pct}%</span>
                    <span className="text-teal-400 font-bold text-sm">
                      ฿{cat.total.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cross-Tab Table: Category × Date ── */}
      {categories && categories.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-white font-bold text-sm">ตารางรายรับแยกหมวดหมู่ × วัน</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: `${200 + incomes.length * 100}px` }}>
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest sticky left-0 bg-zinc-900 min-w-[120px]">
                    หมวดหมู่
                  </th>
                  {incomes.map((inc) => (
                    <th
                      key={inc.id}
                      className="text-right px-3 py-2.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap min-w-[90px]"
                    >
                      {new Date(inc.date + "T00:00:00").toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-teal-400 uppercase tracking-widest min-w-[90px] sticky right-0 bg-zinc-900">
                    รวม
                  </th>
                </tr>
              </thead>

              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium sticky left-0 bg-zinc-900">
                      {cat.name}
                      <span className="ml-2 text-zinc-600 text-[10px]">{cat.pct}%</span>
                    </td>
                    {incomes.map((inc) => (
                      <td key={inc.id} className="px-3 py-3 text-right text-zinc-300 font-medium">
                        ฿{((inc.income * cat.pct) / 100).toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-teal-400 font-black sticky right-0 bg-zinc-900">
                      ฿
                      {incomes
                        .reduce((s, inc) => s + (inc.income * cat.pct) / 100, 0)
                        .toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}

                {/* Total row */}
                <tr className="bg-teal-500/10 border-t border-teal-500/20">
                  <td className="px-4 py-3 text-teal-400 font-black sticky left-0 bg-teal-500/10">รวมทั้งหมด</td>
                  {incomes.map((inc) => (
                    <td key={inc.id} className="px-3 py-3 text-right text-teal-400 font-black">
                      ฿{inc.income.toLocaleString("th-TH")}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-teal-400 font-black sticky right-0 bg-teal-500/10">
                    ฿{totalIncome.toLocaleString("th-TH")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Daily Income List with Delete ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-white font-bold text-sm">รายการบันทึกทั้งหมด</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {[...incomes].reverse().map((inc) => (
            <div key={inc.id}>
              <div
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp size={14} className="text-teal-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">
                      {new Date(inc.date + "T00:00:00").toLocaleDateString("th-TH", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    {inc.note && <p className="text-zinc-500 text-xs">{inc.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-teal-400 font-black">
                    ฿{inc.income.toLocaleString("th-TH")}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(inc.id); }}
                    className="p-1.5 text-zinc-600 hover:text-rose-400 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                  {expandedId === inc.id ? (
                    <ChevronUp size={14} className="text-zinc-500" />
                  ) : (
                    <ChevronDown size={14} className="text-zinc-500" />
                  )}
                </div>
              </div>

              {/* Expanded: show allocation for this day */}
              {expandedId === inc.id && categories && categories.length > 0 && (
                <div className="px-4 pb-3 space-y-1 border-t border-zinc-800/50 bg-zinc-800/20">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between text-xs py-1">
                      <span className="text-zinc-400">{cat.name} ({cat.pct}%)</span>
                      <span className="text-white font-bold">
                        ฿{((inc.income * cat.pct) / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getTodayDate } from "../../lib/dateUtils";
import { useAllocationCalculations } from "../../hooks/useAllocationCalculations";
import { PlusCircle, Loader2, CheckCircle2, CalendarDays, Banknote, FileText, AlertCircle } from "lucide-react";
import DailyAllocationTable from "./DailyAllocationTable";

export default function DailyIncomeForm({ tripId, userId, categories: externalCategories }) {
  const [form, setForm] = useState({ date: getTodayDate(), income: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitIncome, setLastSubmitIncome] = useState(null); // Just store the income value
  const [notification, setNotification] = useState(null);

  // ─── Use the custom hook for real-time categories ───
  // Now the preview will show CURRENT percentages, not percentages from submit time
  const { categories: hookCategories } = useAllocationCalculations(userId, tripId);

  // Use external categories if provided (for backward compatibility), otherwise use from hook
  const activeCategories = externalCategories && externalCategories.length > 0 ? externalCategories : hookCategories;
  const hasCategories = activeCategories && activeCategories.length > 0;

  const showNotif = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasCategories) {
      showNotif("error", "⚠️ กรุณาตั้งค่าหมวดหมู่ก่อนบันทึกรายรับ");
      return;
    }
    const incomeAmount = parseFloat(form.income);
    if (!incomeAmount || incomeAmount <= 0) return;

    setSubmitting(true);
    try {
      // ─── Store only income + date + note ───
      // NO pre-calculated allocated_amount — calculations happen on-the-fly
      await addDoc(
        collection(db, `users/${userId}/trips/${tripId}/dailyIncomes`),
        {
          date: form.date,
          income: incomeAmount,
          note: form.note.trim(),
          createdAt: serverTimestamp(),
        }
      );
      setLastSubmitIncome(incomeAmount); // Store just the income
      setForm({ date: getTodayDate(), income: "", note: "" });
      showNotif("success", "✅ บันทึกรายรับสำเร็จ");
    } catch (err) {
      console.error(err);
      showNotif("error", "❌ บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form Card */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Banknote size={16} className="text-teal-400" />
          บันทึกรายรับรายวัน
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date + Amount row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <CalendarDays size={11} /> วันที่
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Banknote size={11} /> จำนวนเงิน (฿)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.income}
                onChange={(e) => setForm((p) => ({ ...p, income: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                required
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <FileText size={11} /> หมายเหตุ (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น เงินเดือน, ยอดขาย..."
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
            />
          </div>

          {/* No categories warning */}
          {!hasCategories && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <p className="text-amber-400 text-xs font-bold">กรุณาตั้งค่าหมวดหมู่ด้านบนก่อนบันทึกรายรับ</p>
            </div>
          )}

          {/* Notification */}
          {notification && (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border ${
                notification.type === "success"
                  ? "bg-teal-500/10 border-teal-500/20 text-teal-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !hasCategories}
            className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-black rounded-xl transition flex items-center justify-center gap-2 text-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> กำลังบันทึก...
              </>
            ) : (
              <>
                <PlusCircle size={16} /> บันทึกรายรับ
              </>
            )}
          </button>
        </form>
      </div>

      {/* Allocation Preview — shows with CURRENT percentages (real-time updates!) */}
      {lastSubmitIncome && (
        <div className="animate-in slide-in-from-bottom-4 fade-in">
          <div className="flex items-center gap-2 mb-3 px-1">
            <CheckCircle2 size={15} className="text-teal-400" />
            <p className="text-teal-400 text-sm font-bold">
              จัดสรร ฿{lastSubmitIncome.toLocaleString("th-TH")} ออกเป็น:
            </p>
          </div>
          {/* ─── KEY FIX: Display uses activeCategories from hook ───
              This means if user changes percentages in settings,
              the preview will automatically update! */}
          <DailyAllocationTable income={lastSubmitIncome} categories={activeCategories} />
        </div>
      )}
    </div>
  );
}

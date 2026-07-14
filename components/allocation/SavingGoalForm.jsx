"use client";
import { useState, useEffect } from 'react';
import { X, Target, Loader2, Save, PlusCircle } from 'lucide-react';
import { getTodayDate } from '../../lib/dateUtils';

export function SavingGoalForm({ show, onClose, onSubmit, categories, editGoal }) {
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    trackCategoryId: categories[0]?.id || '',
    trackCategoryName: categories[0]?.name || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [dateMode, setDateMode] = useState('date'); // 'date' | 'months'
  const [months, setMonths] = useState('');

  useEffect(() => {
    if (editGoal) {
      setForm({
        name: editGoal.name || '',
        targetAmount: editGoal.targetAmount?.toString() || '',
        targetDate: editGoal.targetDate || '',
        trackCategoryId: editGoal.trackCategoryId || categories[0]?.id || '',
        trackCategoryName: editGoal.trackCategoryName || categories[0]?.name || '',
      });
    } else {
      setForm({
        name: '',
        targetAmount: '',
        targetDate: '',
        trackCategoryId: categories[0]?.id || '',
        trackCategoryName: categories[0]?.name || '',
      });
      setMonths('');
    }
  }, [editGoal, show, categories]);

  const handleCategoryChange = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    setForm((f) => ({
      ...f,
      trackCategoryId: catId,
      trackCategoryName: cat?.name || '',
    }));
  };

  const handleMonthsChange = (val) => {
    setMonths(val);
    if (val && Number(val) > 0) {
      const target = new Date();
      target.setMonth(target.getMonth() + Number(val));
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      setForm((f) => ({ ...f, targetDate: `${y}-${m}-${d}` }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.targetAmount);
    if (!form.name.trim() || !amt || amt <= 0 || !form.targetDate) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        targetAmount: amt,
        targetDate: form.targetDate,
        trackCategoryId: form.trackCategoryId,
        trackCategoryName: form.trackCategoryName,
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  // Compute required monthly savings preview
  const previewMonthly = (() => {
    const amt = parseFloat(form.targetAmount);
    if (!amt || !form.targetDate) return null;
    const today = new Date();
    const target = new Date(form.targetDate + 'T00:00:00');
    const diffMonths = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    if (diffMonths <= 0) return null;
    return Math.ceil(amt / diffMonths);
  })();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF4EF] rounded-2xl flex items-center justify-center">
              <Target size={20} className="text-[#E8622A]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1A1A1A]">
                {editGoal ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมายการออม'}
              </h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Saving Goal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">ชื่อเป้าหมาย</label>
            <input
              type="text"
              placeholder="เช่น ทริปญี่ปุ่น, ซื้อ iPhone..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">จำนวนเงินเป้าหมาย (บาท)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">฿</span>
              <input
                type="number" step="1" min="1" placeholder="30,000"
                value={form.targetAmount}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-3.5 text-lg font-black text-[#E8622A] focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Date mode toggle */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">ระยะเวลา</label>
            <div className="flex bg-gray-50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDateMode('date')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  dateMode === 'date' ? 'bg-white text-[#E8622A] shadow-sm' : 'text-gray-400'
                }`}
              >
                เลือกวันที่
              </button>
              <button
                type="button"
                onClick={() => setDateMode('months')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  dateMode === 'months' ? 'bg-white text-[#E8622A] shadow-sm' : 'text-gray-400'
                }`}
              >
                จำนวนเดือน
              </button>
            </div>

            {dateMode === 'date' ? (
              <input
                type="date"
                value={form.targetDate}
                min={getTodayDate()}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50"
              />
            ) : (
              <div className="relative">
                <input
                  type="number" min="1" max="120" placeholder="6"
                  value={months}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50 placeholder:text-gray-300"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">เดือน</span>
              </div>
            )}
          </div>

          {/* Category selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">ติดตามจากหมวดหมู่</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    form.trackCategoryId === cat.id
                      ? 'bg-[#E8622A] border-[#E8622A] text-white shadow-md shadow-orange-500/20'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-[#E8622A]/40'
                  }`}
                >
                  {cat.name} ({cat.pct}%)
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          {previewMonthly && (
            <div className="bg-[#FFF4EF] rounded-2xl px-4 py-3 border border-orange-100 animate-in fade-in duration-300">
              <p className="text-[10px] text-[#E8622A] font-black uppercase tracking-widest mb-1">ต้องออมต่อเดือน</p>
              <p className="text-lg font-black text-[#E8622A]">฿{previewMonthly.toLocaleString()}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 text-base active:scale-[0.98]"
          >
            {submitting ? (
              <><Loader2 size={20} className="animate-spin" /> กำลังบันทึก...</>
            ) : editGoal ? (
              <><Save size={20} /> อัปเดตเป้าหมาย</>
            ) : (
              <><PlusCircle size={20} /> สร้างเป้าหมาย</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";
import { TrendingUp, TrendingDown, X, Calendar, CheckCircle2 } from 'lucide-react';

export function MonthlyRecapModal({ recapData, onDismiss, lastMonthLabel }) {
  if (!recapData) return null;

  const ChangeIndicator = ({ value, invertColor = false }) => {
    if (Math.abs(value) < 0.5) return <span className="text-gray-400 text-[10px] font-bold">—</span>;
    const isUp = value > 0;
    // For spending, going up is bad (red), for savings going up is good (green)
    const isPositive = invertColor ? !isUp : isUp;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-black ${
        isPositive ? 'text-emerald-500' : 'text-rose-500'
      }`}>
        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(value).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-[#E8622A] to-[#ff8c5a] px-6 py-6 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Monthly Recap</p>
              <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                <Calendar size={20} />
                📊 สรุปเดือน{lastMonthLabel}
              </h2>
              <p className="text-white/60 text-xs font-bold mt-1">บันทึก {recapData.daysLogged} วัน</p>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50/50 rounded-2xl p-3 text-center">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">รายรับรวม</p>
              <p className="text-sm font-black text-[#1A1A1A]">฿{Math.round(recapData.totalIncome).toLocaleString()}</p>
              <ChangeIndicator value={recapData.comparison.incomeChange} />
            </div>
            <div className="bg-[#FFF4EF] rounded-2xl p-3 text-center border border-orange-100">
              <p className="text-[9px] text-[#E8622A] font-black uppercase tracking-widest mb-1">ออมได้</p>
              <p className="text-sm font-black text-[#E8622A]">฿{Math.round(recapData.totalSaved).toLocaleString()}</p>
              <ChangeIndicator value={recapData.comparison.savingsChange} />
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-3 text-center">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">ใช้จ่าย</p>
              <p className="text-sm font-black text-[#1A1A1A]">฿{Math.round(recapData.totalSpent).toLocaleString()}</p>
            </div>
          </div>

          {/* Highlights */}
          {recapData.highlights.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Highlights</p>
              {recapData.highlights.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold border ${
                    h.type === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  <span className="text-base">{h.emoji}</span>
                  {h.message}
                </div>
              ))}
            </div>
          )}

          {/* Category Breakdown */}
          <div className="space-y-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">รายหมวดหมู่</p>
            {recapData.categoryBreakdown.map((cat) => (
              <div key={cat.id || cat.name} className="bg-gray-50/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      cat.status === 'good' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}></div>
                    <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                    <span className="text-[9px] text-gray-400">({cat.pct}%)</span>
                  </div>
                  <ChangeIndicator value={cat.spentChange} invertColor />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">จัดสรร: ฿{Math.round(cat.allocated).toLocaleString()}</span>
                  <span className={cat.status === 'good' ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                    ใช้ไป: ฿{Math.round(cat.spent).toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      cat.status === 'good'
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-rose-400 to-rose-500'
                    }`}
                    style={{
                      width: `${cat.allocated > 0 ? Math.min(100, (cat.spent / cat.allocated) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={onDismiss}
            className="w-full py-4 bg-[#E8622A] hover:bg-[#d65722] text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 text-base active:scale-[0.98]"
          >
            <CheckCircle2 size={20} />
            รับทราบ
          </button>
        </div>
      </div>
    </div>
  );
}

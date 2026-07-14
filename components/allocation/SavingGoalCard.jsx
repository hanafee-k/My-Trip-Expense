import { Target, TrendingUp, Calendar, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

export function SavingGoalCard({ goal, progress, onEdit, onDelete }) {
  if (!progress) return null;

  const isCompleted = progress.isCompleted;

  return (
    <div className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${
      isCompleted
        ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30'
        : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className={`px-5 pt-5 pb-3 flex items-start justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-[#FFF4EF] text-[#E8622A]'
          }`}>
            {isCompleted ? <CheckCircle2 size={20} /> : <Target size={20} />}
          </div>
          <div>
            <h4 className="text-sm font-black text-[#1A1A1A]">{goal.name}</h4>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <Calendar size={9} />
              {goal.trackCategoryName} · เป้าหมาย {(() => {
                if (!goal.targetDate) return "ไม่ระบุ";
                const d = new Date(goal.targetDate + 'T00:00:00');
                return isNaN(d.getTime())
                  ? "ไม่ระบุ"
                  : d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(goal)}
            className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-2 text-gray-300 hover:text-rose-400 hover:bg-rose-50 rounded-xl transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-5 pb-5 space-y-4">
        {/* Amount display */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">ออมได้แล้ว</p>
            <p className={`text-xl font-black ${isCompleted ? 'text-emerald-600' : 'text-[#E8622A]'}`}>
              ฿{Math.round(progress.currentSaved).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">เป้าหมาย</p>
            <p className="text-sm font-black text-[#1A1A1A]">฿{goal.targetAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-[#E8622A] to-[#ff8c5a]'
              }`}
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className={`font-black ${isCompleted ? 'text-emerald-600' : 'text-[#E8622A]'}`}>
              {progress.progressPercent.toFixed(1)}%
            </span>
            <span className="text-gray-400 font-bold">
              เหลืออีก ฿{Math.round(progress.remaining).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Status message */}
        {isCompleted ? (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-2xl px-4 py-3 text-xs font-bold border border-emerald-100">
            <CheckCircle2 size={14} />
            🎉 ถึงเป้าหมายแล้ว! ยินดีด้วย!
          </div>
        ) : (
          <div className="space-y-2">
            {progress.isOnTrack ? (
              <div className="flex items-center gap-2 bg-[#FFF4EF] text-[#E8622A] rounded-2xl px-4 py-2.5 text-[11px] font-bold border border-orange-100">
                <TrendingUp size={12} />
                กำลังไปได้ดี! เฉลี่ย ฿{Math.round(progress.currentMonthlyPace).toLocaleString()}/เดือน
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-2xl px-4 py-2.5 text-[11px] font-bold border border-amber-100">
                <TrendingUp size={12} className="rotate-180" />
                ต้องออมเพิ่มอีก ฿{Math.round(progress.shortfall).toLocaleString()}/เดือน เพื่อให้ทันเป้า
              </div>
            )}
            {progress.monthsRemaining > 0 && (
              <p className="text-[10px] text-gray-400 font-bold text-center">
                เหลือเวลาอีก {progress.monthsRemaining} เดือน
                {progress.projectedDate && !progress.isOnTrack && (
                  <span> · คาดว่าจะถึงเป้า {progress.projectedDate}</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

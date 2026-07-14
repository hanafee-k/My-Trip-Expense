"use client";
import { useStreaks } from '../../hooks/useStreaks';
import { Flame, Trophy, Star, Award } from 'lucide-react';

export function StreakBadge({ incomes }) {
  const { currentStreak, longestStreak, milestones, streakStatus } = useStreaks(incomes);

  if (!incomes || incomes.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Main streak counter */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm transition-all duration-500 ${streakStatus === 'active'
            ? 'bg-gradient-to-r from-[#E8622A] to-[#ff8c5a] text-white shadow-lg shadow-orange-500/30'
            : streakStatus === 'at_risk'
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : 'bg-gray-50 text-gray-400 border border-gray-200'
          }`}>
          <Flame
            size={18}
            className={streakStatus === 'active' ? 'animate-pulse' : ''}
          />
          <span>{currentStreak} วันติดต่อกัน</span>
        </div>

        {/* Longest streak badge */}
        {longestStreak > currentStreak && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FFF4EF] text-[#E8622A] rounded-2xl text-xs font-bold">
            <Trophy size={14} />
            <span>สูงสุด {longestStreak} วัน</span>
          </div>
        )}

        {/* At risk / broken message */}
        {streakStatus === 'at_risk' && (
          <span className="text-[10px] text-amber-500 font-bold animate-pulse"> อย่าลืมบันทึกวันนี้!</span>
        )}
        {streakStatus === 'broken' && currentStreak === 0 && (
          <span className="text-[10px] text-gray-400 font-bold">💪 เริ่มใหม่วันนี้!</span>
        )}
      </div>

      {/* Milestone badges */}
      {milestones.some((m) => m.achieved) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Milestones</span>
          <div className="flex gap-1.5">
            {milestones.map((m) => (
              <div
                key={m.days}
                title={m.description}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500 ${m.achieved
                    ? 'bg-[#FFF4EF] border border-orange-200 shadow-sm scale-100'
                    : 'bg-gray-50 border border-gray-100 opacity-30 scale-90'
                  }`}
              >
                {m.emoji}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

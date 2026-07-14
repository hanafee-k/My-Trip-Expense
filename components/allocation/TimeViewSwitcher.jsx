"use client";
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react';

export function TimeViewSwitcher({
  viewMode, setViewMode,
  selectedYear, selectedMonth, selectedWeek, selectedDate,
  setSelectedWeek, setSelectedDate,
  selectMonth, prevMonth, nextMonth,
  monthOptions, weekOptions, currentMonthLabel
}) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const modes = [
    { id: 'daily', label: 'รายวัน' },
    { id: 'weekly', label: 'รายสัปดาห์' },
    { id: 'monthly', label: 'รายเดือน' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
      {/* Mode Toggle */}
      <div className="flex bg-gray-50 p-1 rounded-xl">
        {modes.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all duration-300 ${
              viewMode === id
                ? 'bg-white text-[#E8622A] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month Navigator (for weekly and monthly modes) */}
      {(viewMode === 'monthly' || viewMode === 'weekly') && (
        <div className="relative">
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-[#E8622A] transition active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-[#FFF4EF] transition text-sm font-black text-[#1A1A1A]"
            >
              <Calendar size={14} className="text-[#E8622A]" />
              {currentMonthLabel}
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-[#E8622A] transition active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Month Dropdown */}
          {showMonthDropdown && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowMonthDropdown(false)} />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-[100] w-64 max-h-60 overflow-y-auto">
                {monthOptions.map((opt) => (
                  <button
                    key={`${opt.year}-${opt.month}`}
                    onClick={() => {
                      selectMonth(opt.year, opt.month);
                      setShowMonthDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      selectedYear === opt.year && selectedMonth === opt.month
                        ? 'bg-[#FFF4EF] text-[#E8622A] font-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Week Selector (weekly mode only) */}
      {viewMode === 'weekly' && weekOptions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {weekOptions.map((week) => (
            <button
              key={week.weekNum}
              onClick={() => setSelectedWeek(week.weekNum)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border ${
                selectedWeek === week.weekNum
                  ? 'bg-[#E8622A] border-[#E8622A] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-[#E8622A]/40 hover:text-[#E8622A]'
              }`}
            >
              {week.label}
            </button>
          ))}
        </div>
      )}

      {/* Daily Date Picker */}
      {viewMode === 'daily' && (
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-[#E8622A]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition bg-gray-50/50"
          />
        </div>
      )}
    </div>
  );
}

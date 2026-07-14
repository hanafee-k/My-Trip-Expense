"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { ArrowLeft, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────
const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const THAI_WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const THAI_WEEKDAYS_CHART = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_MONTHS_LONG = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function getWeeksForMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];
  let weekNum = 1;
  let current = new Date(firstDay);

  const dow = current.getDay();
  if (dow !== 1) {
    current.setDate(current.getDate() - (dow === 0 ? 6 : dow - 1));
  }

  while (weekNum <= 6) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekStart > lastDay && weekNum > 1) break;

    weeks.push({
      weekNum,
      start: fmt(weekStart),
      end: fmt(weekEnd),
      startDay: weekStart.getDate(),
      endDay: weekEnd.getDate(),
      startMonth: weekStart.getMonth(),
      endMonth: weekEnd.getMonth(),
    });

    weekNum++;
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getDaysOfWeek(weekStart) {
  const start = new Date(weekStart + "T00:00:00");
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(fmt(d));
  }
  return days;
}

function generateMonthDateStrip(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  let current = new Date(firstDay);
  while (current <= lastDay) {
    days.push({
      dateStr: fmt(current),
      dayOfMonth: current.getDate(),
      weekdayIndex: current.getDay(),
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ─── Component ─────────────────────────────────────────────
export function IncomeHistoryView({ incomes = [], spends = [], onBack }) {
  const now = new Date();
  const [viewMode, setViewMode] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(fmt(now));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedWeekNum, setSelectedWeekNum] = useState(1);

  const selectedDayRef = useRef(null);

  const weeks = useMemo(
    () => getWeeksForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  useEffect(() => {
    const todayStr = fmt(now);
    const found = weeks.find((w) => todayStr >= w.start && todayStr <= w.end);
    if (found) setSelectedWeekNum(found.weekNum);
    else setSelectedWeekNum(1);
  }, []);

  const selectedWeek = weeks.find((w) => w.weekNum === selectedWeekNum) || weeks[0];

  const dateStrip = useMemo(
    () => generateMonthDateStrip(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  useEffect(() => {
    if (viewMode === "daily" && selectedDayRef.current) {
      selectedDayRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDate, viewMode, selectedMonth]);

  const goToPrevMonth = () => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedWeekNum(1);
    setSelectedDate(fmt(d));
  };

  const goToNextMonth = () => {
    const d = new Date(selectedYear, selectedMonth + 1, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedWeekNum(1);
    setSelectedDate(fmt(d));
  };

  const monthLabel = useMemo(() => {
    if (viewMode === "weekly" && selectedWeek) {
      if (selectedWeek.startMonth !== selectedWeek.endMonth) {
        return `${THAI_MONTHS_SHORT[selectedWeek.startMonth]} - ${THAI_MONTHS_SHORT[selectedWeek.endMonth]}`;
      }
    }
    return THAI_MONTHS_LONG[selectedMonth];
  }, [viewMode, selectedMonth, selectedWeek]);

  const dailyNetIncome = useMemo(() => {
    const inc = incomes
      .filter((i) => i.date === selectedDate)
      .reduce((s, i) => s + (i.income || 0), 0);
    const sp = spends
      .filter((s) => s.date === selectedDate)
      .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    return inc - sp;
  }, [incomes, spends, selectedDate]);

  const weeklyNetIncome = useMemo(() => {
    if (!selectedWeek) return 0;
    const inc = incomes
      .filter((i) => i.date >= selectedWeek.start && i.date <= selectedWeek.end)
      .reduce((s, i) => s + (i.income || 0), 0);
    const sp = spends
      .filter((s) => s.date >= selectedWeek.start && s.date <= selectedWeek.end)
      .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    return inc - sp;
  }, [incomes, spends, selectedWeek]);

  const barChartData = useMemo(() => {
    if (!selectedWeek) return [];
    const days = getDaysOfWeek(selectedWeek.start);
    return days.map((dateStr, idx) => {
      const dayIncome = incomes
        .filter((i) => i.date === dateStr)
        .reduce((s, i) => s + (i.income || 0), 0);
      return { dateStr, label: THAI_WEEKDAYS_CHART[idx], income: dayIncome };
    });
  }, [incomes, selectedWeek]);

  const maxBarValue = useMemo(
    () => Math.max(...barChartData.map((d) => d.income), 1),
    [barChartData]
  );

  const canGoNext = selectedYear < now.getFullYear() ||
    (selectedYear === now.getFullYear() && selectedMonth < now.getMonth());

  // Check if a day has income data (for dot indicator)
  const hasDataForDate = (dateStr) => {
    return incomes.some((i) => i.date === dateStr) || spends.some((s) => s.date === dateStr);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ═══ HEADER — minimal & compact ═══ */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-gray-50 transition active:scale-95">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <h2 className="text-lg font-black text-[#1A1A1A]">ประวัติรายได้</h2>
          </div>
          <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#E8622A] hover:text-[#E8622A] transition text-gray-300">
            <HelpCircle size={14} />
          </button>
        </div>

        {/* Toggle + Month nav — single clean row */}
        <div className="flex items-center justify-between">
          <div className="flex bg-gray-50 rounded-full p-0.5">
            {[
              { id: "daily", label: "รายวัน" },
              { id: "weekly", label: "รายสัปดาห์" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${
                  viewMode === id
                    ? "bg-[#E8622A] text-white shadow-sm"
                    : "text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={goToPrevMonth}
              className="p-1 rounded-full hover:bg-gray-50 text-gray-300 hover:text-[#E8622A] transition active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-400 min-w-[70px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              className={`p-1 rounded-full transition active:scale-90 ${
                canGoNext ? "hover:bg-gray-50 text-gray-300 hover:text-[#E8622A]" : "text-gray-100 cursor-not-allowed"
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* thin separator */}
      <div className="h-[0.5px] bg-gray-100" />

      {/* ═══ DAILY VIEW ═══ */}
      {viewMode === "daily" && (
        <div>
          {/* Date Strip */}
          <div
            className="flex gap-0.5 overflow-x-auto px-3 py-3 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {dateStrip.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              const hasData = hasDataForDate(day.dateStr);
              const isToday = day.dateStr === fmt(now);
              return (
                <button
                  key={day.dateStr}
                  ref={isSelected ? selectedDayRef : null}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`flex flex-col items-center shrink-0 w-11 py-1.5 rounded-xl transition-all duration-200 relative ${
                    isSelected
                      ? "bg-[#E8622A] text-white shadow-md shadow-orange-400/25"
                      : isToday
                        ? "bg-orange-50 text-[#E8622A]"
                        : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-[9px] font-medium leading-none mb-1 ${isSelected ? "text-white/70" : ""}`}>
                    {THAI_WEEKDAYS_SHORT[day.weekdayIndex]}
                  </span>
                  <span className={`text-sm font-bold leading-none ${isSelected ? "font-black" : ""}`}>
                    {day.dayOfMonth}
                  </span>
                  {/* Data indicator dot */}
                  {hasData && !isSelected && (
                    <div className="w-1 h-1 rounded-full bg-[#E8622A] mt-1 opacity-40" />
                  )}
                  {hasData && isSelected && (
                    <div className="w-1 h-1 rounded-full bg-white mt-1 opacity-60" />
                  )}
                  {!hasData && <div className="w-1 h-1 mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Net Income */}
          <div className="px-5 pt-4 pb-6 text-center">
            <p className="text-[11px] text-gray-300 font-medium mb-1.5 uppercase tracking-wider">ยอดรายได้สุทธิ</p>
            <p className={`text-[36px] font-black leading-none tracking-tight ${dailyNetIncome >= 0 ? "text-[#1A1A1A]" : "text-rose-500"}`}>
              <span className="text-xl font-semibold text-gray-300 mr-0.5">฿</span>
              {Math.abs(dailyNetIncome).toLocaleString("th-TH")}
            </p>
            {dailyNetIncome === 0 && (
              <p className="text-[10px] text-gray-200 mt-2 font-medium">ไม่มีรายการ</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ WEEKLY VIEW ═══ */}
      {viewMode === "weekly" && (
        <div>
          {/* Week pills */}
          <div
            className="flex gap-1.5 overflow-x-auto px-4 py-3 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {weeks.map((week) => {
              const isSelected = selectedWeekNum === week.weekNum;
              return (
                <button
                  key={week.weekNum}
                  onClick={() => setSelectedWeekNum(week.weekNum)}
                  className={`flex flex-col items-center shrink-0 px-3.5 py-2 rounded-xl transition-all duration-200 min-w-[78px] ${
                    isSelected
                      ? "bg-[#E8622A] text-white shadow-md shadow-orange-400/25"
                      : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-[9px] font-medium mb-0.5 ${isSelected ? "text-white/70" : ""}`}>
                    สัปดาห์ {week.weekNum}
                  </span>
                  <span className="text-xs font-bold leading-none">
                    {week.startDay} - {week.endDay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Net Income */}
          <div className="px-5 pt-3 pb-2 text-center">
            <p className="text-[11px] text-gray-300 font-medium mb-1.5 uppercase tracking-wider">ยอดรายได้สุทธิ</p>
            <p className={`text-[36px] font-black leading-none tracking-tight ${weeklyNetIncome >= 0 ? "text-[#1A1A1A]" : "text-rose-500"}`}>
              <span className="text-xl font-semibold text-gray-300 mr-0.5">฿</span>
              {Math.abs(weeklyNetIncome).toLocaleString("th-TH")}
            </p>
          </div>

          {/* Bar Chart — compact & tight */}
          <div className="px-8 pt-2 pb-5">
            <div className="flex items-end justify-center gap-[6px]" style={{ height: "110px" }}>
              {barChartData.map((bar, idx) => {
                const pct = maxBarValue > 0 ? (bar.income / maxBarValue) * 100 : 0;
                const barHeight = Math.max(pct, 4);
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 w-[30px]">
                    {/* Bar container */}
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-md transition-all duration-500 ease-out"
                        style={{
                          height: `${barHeight}%`,
                          backgroundColor: bar.income > 0 ? "#E8622A" : "#F3F4F6",
                          opacity: bar.income > 0 ? 0.85 : 1,
                        }}
                      />
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-medium text-gray-300 leading-none">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

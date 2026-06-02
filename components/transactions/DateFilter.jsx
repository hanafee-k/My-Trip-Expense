"use client";
import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { getTodayDate, formatLocalDate, getStartOfMonth, getEndOfMonth, getDateRange } from "../../lib/dateUtils";

/**
 * DateFilter
 * Quick-select presets + custom date picker + day navigator arrows.
 * Emits { start: "YYYY-MM-DD", end: "YYYY-MM-DD", label: string } on every change.
 *
 * Design notes:
 *  - Default is "Today" — the most common daily use case.
 *  - The day navigator arrows let users swipe through single days without opening a picker.
 *  - Custom date picker is hidden by default to keep UI clean.
 */

const PRESETS = [
  { id: "today", label: "วันนี้" },
  { id: "yesterday", label: "เมื่อวาน" },
  { id: "week", label: "สัปดาห์นี้" },
  { id: "month", label: "เดือนนี้" },
  { id: "lastmonth", label: "เดือนที่แล้ว" },
];

/** Returns { start, end, label } for a given preset id */
function resolvePreset(id) {
  const today = new Date();
  const todayStr = formatLocalDate(today);

  switch (id) {
    case "today":
      return { start: todayStr, end: todayStr, label: "วันนี้" };

    case "yesterday": {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      const s = formatLocalDate(d);
      return { start: s, end: s, label: "เมื่อวาน" };
    }

    case "week": {
      const d = new Date(today);
      const day = d.getDay(); // 0 = Sun
      const diff = day === 0 ? -6 : 1 - day; // Monday as week start
      d.setDate(d.getDate() + diff);
      return { start: formatLocalDate(d), end: todayStr, label: "สัปดาห์นี้" };
    }

    case "month": {
      const start = getStartOfMonth();
      const end = getEndOfMonth();
      return { start, end, label: "เดือนนี้" };
    }

    case "lastmonth": {
      const range = getDateRange('lastmonth');
      return { start: range.start, end: range.end, label: "เดือนที่แล้ว" };
    }

    default:
      return { start: todayStr, end: todayStr, label: "วันนี้" };
  }
}

export default function DateFilter({ onChange }) {
  const today = getTodayDate();
  const [activePreset, setActivePreset] = useState("today");
  const [customDate, setCustomDate] = useState(""); // non-empty only when user picked a custom date
  const [showPicker, setShowPicker] = useState(false);

  /** True when the current selection is a single day (not a range) */
  const isSingleDay = activePreset === "today" || activePreset === "yesterday" || activePreset === "custom";

  /** The currently displayed date string for the navigator */
  const currentSingleDate = activePreset === "custom" ? customDate : resolvePreset(activePreset).start;

  // ─── Handlers ───────────────────────────────────────────────
  const selectPreset = (id) => {
    setActivePreset(id);
    setCustomDate("");
    setShowPicker(false);
    onChange(resolvePreset(id));
  };

  const selectCustom = (dateStr) => {
    if (!dateStr) return;
    setCustomDate(dateStr);
    setActivePreset("custom");
    setShowPicker(false);
    onChange({ start: dateStr, end: dateStr, label: dateStr });
  };

  /** Shift the currently shown single-day by `delta` days */
  const shiftDay = (delta) => {
    const base = currentSingleDate || today;
    const d = new Date(base + "T12:00:00"); // noon avoids DST edge cases
    d.setDate(d.getDate() + delta);
    const newStr = formatLocalDate(d);
    setCustomDate(newStr);
    setActivePreset("custom");
    onChange({ start: newStr, end: newStr, label: newStr });
  };

  // ─── Helpers ────────────────────────────────────────────────
  const formatDayLabel = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr + "T12:00:00").toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="px-4 pt-3 pb-2 bg-white">
      {/* ── Preset pills row ── */}
      <div
        className="flex items-center gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {PRESETS.map((p) => {
          const isActive = activePreset === p.id && !customDate;
          return (
            <button
              key={p.id}
              onClick={() => selectPreset(p.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-bold transition-all border ${
                isActive
                  ? "bg-[#E8622A] border-[#E8622A] text-white shadow-sm shadow-orange-500/20"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Custom date picker trigger */}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-bold transition-all border flex items-center gap-1.5 ${
            activePreset === "custom"
              ? "bg-[#E8622A] border-[#E8622A] text-white shadow-sm shadow-orange-500/20"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          <Calendar size={11} />
          {activePreset === "custom" && customDate ? customDate : "เลือกวัน"}
        </button>
      </div>

      {/* ── Inline date picker (shown on demand) ── */}
      {showPicker && (
        <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-150">
          <input
            type="date"
            max={today}
            defaultValue={currentSingleDate || today}
            onChange={(e) => selectCustom(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition"
          />
        </div>
      )}

      {/* ── Day navigator (only for single-day modes) ── */}
      {isSingleDay && currentSingleDate && (
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => shiftDay(-1)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            aria-label="วันก่อนหน้า"
          >
            <ChevronLeft size={15} />
          </button>

          <span className="text-[11px] font-semibold text-gray-500 text-center leading-tight">
            {formatDayLabel(currentSingleDate)}
          </span>

          <button
            onClick={() => shiftDay(1)}
            disabled={currentSingleDate >= today}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition disabled:opacity-25"
            aria-label="วันถัดไป"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

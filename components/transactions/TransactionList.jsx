"use client";
import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { getTodayDate } from "../../lib/dateUtils";
import DateFilter from "./DateFilter";
import DailySummary from "./DailySummary";
import TransactionItem from "./TransactionItem";

/**
 * TransactionList
 *
 * Self-contained transaction panel with:
 *  - Its own DateFilter (defaults to Today)
 *  - Sticky header: DateFilter + DailySummary
 *  - Scrollable list of ALL transactions for the selected date range
 *  - Date-group dividers when a multi-day range is selected
 *  - Respects the global `filterTrip` prop from the parent
 *
 * Architecture note:
 *  - Does NOT duplicate Firestore listeners. Receives already-live `transactions`
 *    from the parent (page.js) and filters client-side. Zero extra reads.
 *  - Offline: Firestore SDK caches the full snapshot in IndexedDB, so all
 *    filtering (including "Today") works offline automatically.
 */
export default function TransactionList({
  transactions,  // Full live array from parent's onSnapshot
  categories,
  trips,
  filterTrip,    // Global trip filter from FilterBar
  onEdit,        // Opens the edit modal in parent
}) {
  const today = getTodayDate();

  // Local date range state — independent of the global FilterBar
  const [dateRange, setDateRange] = useState({
    start: today,
    end: today,
    label: "วันนี้",
  });

  const isMultiDay = dateRange.start !== dateRange.end;

  // ─── Filtered transactions ────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date?.toDate) return false;

      const tDate = t.date.toDate().toISOString().split("T")[0];
      const inRange = tDate >= dateRange.start && tDate <= dateRange.end;
      if (!inRange) return false;

      // Respect the global trip filter
      if (filterTrip === "all") return true;
      if (filterTrip === "no_trip") return !t.tripId;
      return t.tripId === filterTrip;
    });
  }, [transactions, dateRange, filterTrip]);

  // ─── Group by date (multi-day ranges only) ────────────────────
  const grouped = useMemo(() => {
    if (!isMultiDay) return null;
    const groups = {};
    filtered.forEach((t) => {
      const key = t.date
        .toDate()
        .toLocaleDateString("th-TH", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filtered, isMultiDay]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

      {/* ── Sticky header: DateFilter + DailySummary ── */}
      <div className="sticky top-0 z-10 bg-white">
        <DateFilter onChange={setDateRange} />
        {filtered.length > 0 && (
          <DailySummary transactions={filtered} />
        )}
        {/* Bottom separator */}
        <div className="h-px bg-gray-100" />
      </div>

      {/* ── Scrollable transaction list ── */}
      <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Receipt size={22} className="text-gray-300" />
            </div>
            <p className="text-[13px] font-semibold text-gray-400">
              ไม่พบรายการ
            </p>
            <p className="text-[11px] text-gray-300 mt-1">
              {filterTrip !== "all"
                ? "ลองเปลี่ยนตัวกรองทริป"
                : "ยังไม่มีรายการในช่วงนี้"}
            </p>
          </div>
        ) : isMultiDay && grouped ? (
          /* Multi-day: render with date group headers */
          Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {dateKey}
                </span>
              </div>
              {items.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  categories={categories}
                  trips={trips}
                  onClick={onEdit}
                />
              ))}
            </div>
          ))
        ) : (
          /* Single day: flat list */
          filtered.map((t) => (
            <TransactionItem
              key={t.id}
              transaction={t}
              categories={categories}
              trips={trips}
              onClick={onEdit}
            />
          ))
        )}
      </div>

      {/* ── Footer: item count ── */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <p className="text-[11px] text-gray-400 text-center font-medium">
            {filtered.length} รายการ
          </p>
        </div>
      )}
    </div>
  );
}

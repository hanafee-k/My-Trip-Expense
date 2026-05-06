"use client";
import { Plane } from "lucide-react";

/**
 * TransactionItem
 * A single transaction row. Designed for dense, scrollable lists.
 * Tapping opens the edit modal via the `onClick` callback.
 */
export default function TransactionItem({ transaction, categories, trips, onClick }) {
  const category = categories.find((c) => c.id === transaction.categoryId);
  const trip = trips?.find((t) => t.id === transaction.tripId);
  const isIncome = transaction.type === "income";

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div
      onClick={() => onClick?.(transaction)}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors duration-150 group"
    >
      {/* Category Icon */}
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-gray-100 group-hover:scale-105 transition-transform duration-150">
        {category?.icon ?? "📝"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-800 truncate leading-snug">
          {transaction.note || category?.name || "ไม่ระบุ"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-400">
            {formatDateShort(transaction.date)} · {formatTime(transaction.date)}
          </span>
          {trip && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#E8622A] bg-[#FFF4EF] px-1.5 py-0.5 rounded-full border border-orange-100 leading-none">
              <Plane size={9} />
              {trip.name}
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <span
          className={`text-[15px] font-bold tabular-nums ${
            isIncome ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {isIncome ? "+" : "-"}฿{Number(transaction.amount).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

"use client";
import { useState, useMemo } from "react";
import { Edit2, Trash2, TrendingUp, MinusCircle, Search, Calendar } from "lucide-react";

/**
 * Component to list all historical income allocations & spend deductions
 * Allows searching, filtering, editing (✏️), and deleting (🗑️) any transaction.
 */
export function TransactionHistoryList({
  incomes = [],
  spends = [],
  onEditClick,
  onDeleteClick,
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "income" | "spend"

  // Merge and sort all transactions descending by date
  const transactions = useMemo(() => {
    const combined = [
      ...incomes.map((i) => ({ ...i, type: "income" })),
      ...spends.map((s) => ({ ...s, type: "spend" })),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return combined.filter((tx) => {
      // Type filter
      if (filterType === "income" && tx.type !== "income") return false;
      if (filterType === "spend" && tx.type !== "spend") return false;

      // Search query filter
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchNote = (tx.note || "").toLowerCase().includes(q);
      const matchCat = (tx.categoryName || "").toLowerCase().includes(q);
      const matchAmt = (tx.income || tx.amount || 0).toString().includes(q);
      const matchDate = (tx.date || "").includes(q);

      return matchNote || matchCat || matchAmt || matchDate;
    });
  }, [incomes, spends, filterType, search]);

  // Group by Month
  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach((tx) => {
      if (!tx.date) return;
      const d = new Date(tx.date + "T00:00:00");
      const monthKey = isNaN(d.getTime())
        ? tx.date
        : d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(tx);
    });
    return groups;
  }, [transactions]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-4">
        <div>
          <h3 className="text-lg font-black text-[#1A1A1A] flex items-center gap-2">
            <Calendar size={20} className="text-[#E8622A]" /> ประวัติรายการบันทึกย้อนหลัง
          </h3>
          <p className="text-[10px] text-gray-400 font-bold mt-0.5">
            รวม {incomes.length} รายรับ · {spends.length} การหักใช้เงิน
          </p>
        </div>

        {/* Filter Switcher */}
        <div className="flex bg-gray-50 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "income", label: "💰 รายรับ" },
            { id: "spend", label: "💸 รายจ่าย" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterType(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterType === id
                  ? "bg-white text-[#E8622A] shadow-xs"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาตามวันที่, หมายเหตุ, หรือจำนวนเงิน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-[#1A1A1A] font-bold focus:outline-none focus:border-[#E8622A] transition placeholder:text-gray-300"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold bg-gray-200/60 rounded-full w-5 h-5 flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>

      {/* Transactions Grouped List */}
      {Object.keys(groupedTransactions).length === 0 ? (
        <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
          <p className="text-xs font-bold text-gray-400">ไม่พบรายการบันทึกข้อมูล</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([monthLabel, items]) => (
            <div key={monthLabel} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  {monthLabel}
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {items.length} รายการ
                </span>
              </div>

              <div className="space-y-2">
                {items.map((tx) => {
                  const isIncome = tx.type === "income";
                  const amount = isIncome ? tx.income : tx.amount;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 bg-gray-50/70 hover:bg-orange-50/30 rounded-2xl border border-gray-100 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isIncome
                              ? "bg-orange-100 text-[#E8622A]"
                              : "bg-rose-100 text-rose-500"
                          }`}
                        >
                          {isIncome ? <TrendingUp size={18} /> : <MinusCircle size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-[#1A1A1A] truncate">
                              {isIncome ? "รายรับจัดสรร" : tx.categoryName || "หักใช้เงิน"}
                            </p>
                            <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-lg border border-gray-100 shrink-0">
                              {tx.date}
                            </span>
                          </div>
                          {tx.note && (
                            <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                              {tx.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <p
                          className={`text-sm font-black ${
                            isIncome ? "text-[#E8622A]" : "text-rose-500"
                          }`}
                        >
                          {isIncome ? "+" : "-"}฿
                          {Number(amount || 0).toLocaleString("th-TH", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </p>

                        {/* Action Buttons: Edit ✏️ & Delete 🗑️ */}
                        <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                          <button
                            type="button"
                            onClick={() => onEditClick(tx)}
                            title="แก้ไขรายการ"
                            className="p-1.5 text-gray-400 hover:text-[#E8622A] hover:bg-orange-100/60 rounded-xl transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteClick(tx.id, tx.type)}
                            title="ลบรายการ"
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-100/60 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

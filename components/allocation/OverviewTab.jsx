"use client";
import { useMemo } from "react";
import { useTimeFilter } from "../../hooks/useTimeFilter";
import { TimeViewSwitcher } from "./TimeViewSwitcher";
import { MonthComparison } from "./MonthComparison";
import { IncomeHistoryView } from "./IncomeHistoryView";
import { TransactionHistoryList } from "./TransactionHistoryList";
import {
  Copy, MinusCircle, FileText, BarChart3
} from "lucide-react";


export function OverviewTab({
  incomes,
  spends,
  categories,
  savingStartDate,
  calculateAllocation,
  onEditClick,
  onDeleteClick,
  onDeductClick,
  onOpenRecap,
  onOpenSetup,
  expandedId,
  setExpandedId
}) {
  const timeFilter = useTimeFilter();
  const { dateRange, viewMode } = timeFilter;

  // Filter incomes and spends based on selected dateRange
  const filteredIncomes = useMemo(() => {
    return incomes.filter(
      (inc) => inc.date >= dateRange.start && inc.date <= dateRange.end
    );
  }, [incomes, dateRange]);

  const filteredSpends = useMemo(() => {
    return spends.filter(
      (sp) => sp.date >= dateRange.start && sp.date <= dateRange.end
    );
  }, [spends, dateRange]);

  // Compute category totals for the filtered range
  const filteredCatTotals = useMemo(() => {
    return categories.map((cat) => {
      // Filter incomes after savingStartDate if set
      const relevantIncomes = savingStartDate
        ? filteredIncomes.filter((inc) => inc.date >= savingStartDate)
        : filteredIncomes;

      // Allocated from filtered incomes
      const allocated = relevantIncomes.reduce(
        (sum, inc) => sum + calculateAllocation(inc.income, cat.pct),
        0
      );

      // Spent in this category during the range (only after savingStartDate)
      const relevantSpends = savingStartDate
        ? filteredSpends.filter((sp) => sp.date >= savingStartDate)
        : filteredSpends;

      const spent = relevantSpends
        .filter((s) => s.categoryId === cat.id || s.categoryName === cat.name)
        .reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);

      const initial = Number(cat.initialBalance) || 0;

      return {
        ...cat,
        total: initial + allocated,
        spent,
        remaining: (initial + allocated) - spent,
      };
    });
  }, [categories, filteredIncomes, filteredSpends, calculateAllocation, savingStartDate]);

  // Summary figures
  const totalIncome = useMemo(
    () => filteredIncomes.reduce((s, i) => s + i.income, 0),
    [filteredIncomes]
  );
  const totalSpent = useMemo(
    () => filteredSpends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0),
    [filteredSpends]
  );
  const totalRemaining = totalIncome - totalSpent;

  // All-time overall figures (unfiltered)
  const allTimeIncome = useMemo(
    () => incomes.reduce((s, i) => s + i.income, 0),
    [incomes]
  );
  const allTimeSpent = useMemo(
    () => spends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0),
    [spends]
  );
  const allTimeBalance = allTimeIncome - allTimeSpent;

  const copyOverallSummary = () => {
    const text =
      `📊 สรุปยอดจัดสรรคงเหลือ (ยอดรวมคงเหลือ ฿${totalRemaining.toLocaleString()})\n` +
      filteredCatTotals
        .map(
          (cat) =>
            `- ${cat.name}: ฿${cat.remaining.toLocaleString("th-TH", {
              maximumFractionDigits: 0,
            })} (ใช้ไปแล้ว ฿${cat.spent.toLocaleString()})`
        )
        .join("\n");
    navigator.clipboard.writeText(text);
    alert("คัดลอกสรุปคงเหลือทั้งหมดแล้ว!");
  };

  return (
    <div className="space-y-6">
      {/* ═══ Income History View (Grab-style) — TOP ═══ */}
      <IncomeHistoryView
        incomes={incomes}
        spends={spends}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
      />

      {/* Time View Switcher */}
      <TimeViewSwitcher {...timeFilter} />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
            รายรับช่วงนี้
          </p>
          <p className="text-base font-black text-[#E8622A]">
            ฿{totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
            หักยอดใช้
          </p>
          <p className="text-base font-black text-rose-500">
            ฿{totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
            คงเหลือช่วงนี้
          </p>
          <p
            className={`text-base font-black ${
              totalRemaining >= 0 ? "text-[#E8622A]" : "text-rose-500"
            }`}
          >
            ฿{totalRemaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recap & Chart section */}
      <div className="flex gap-3">
        <button
          onClick={onOpenRecap}
          className="flex-1 py-3 px-4 bg-white border border-orange-100 text-[#E8622A] hover:bg-[#FFF4EF] font-black rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs"
        >
          <FileText size={16} /> ดูสรุปรายงานเดือนที่แล้ว
        </button>
      </div>

      {/* Month Comparison Chart (Only in Monthly Mode) */}
      {viewMode === "monthly" && (
        <MonthComparison
          incomes={incomes}
          spends={spends}
          categories={categories}
          calculateAllocation={calculateAllocation}
        />
      )}

      {/* ═══ MAKE by KBank Style Cloud Pockets Dashboard ═══ */}
      {categories.length > 0 && (
        <div className="bg-gradient-to-b from-[#FFF5F5] via-[#FFFDF0] to-[#F3FCFA] rounded-[32px] p-5 border border-orange-100/50 shadow-xs space-y-5">
          {/* Top Cashbox Card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#059669] flex items-center justify-center text-white font-black text-xl shadow-xs">
                m
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">Cashbox</p>
                <p className="text-lg font-black text-gray-800">
                  ฿{totalRemaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <span className="text-[9px] text-gray-400 font-bold text-right leading-tight">
              กดค้างและลาก<br />เพื่อจัดสรร
            </span>
          </div>

          {/* Section Header */}
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                Cloud Pocket
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">ของฉัน</p>
            </div>
            {onOpenSetup && (
              <button
                onClick={onOpenSetup}
                className="text-xs font-black text-[#0070E0] hover:text-[#005CB8] transition cursor-pointer"
              >
                เพิ่ม Cloud Pocket +
              </button>
            )}
          </div>

          {/* Cloud Pockets Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {filteredCatTotals.map((cat) => {
              // Custom illustrations/themes to replicate MAKE by KBank style
              const getPocketTheme = (name) => {
                const n = name.toLowerCase();
                if (n.includes("เที่ยว") || n.includes("ออม") || n.includes("เก็บ") || n.includes("save")) {
                  return {
                    bg: "from-[#FFEAEB] to-[#FFD1D8]", // Pink/peach gradient
                    emoji: n.includes("เที่ยว") ? "✈️" : "🐷",
                    isLocked: true
                  };
                }
                if (n.includes("กิน") || n.includes("อาหาร") || n.includes("ฟู้ด")) {
                  return {
                    bg: "from-[#FFF5E6] to-[#FFE2B3]", // Orange/yellow gradient
                    emoji: "🍣",
                    isLocked: false
                  };
                }
                if (n.includes("น้ำมัน") || n.includes("รถ")) {
                  return {
                    bg: "from-[#EBF5FB] to-[#D5E8F7]", // Soft blue gradient
                    emoji: "⛽",
                    isLocked: false
                  };
                }
                if (n.includes("หอ") || n.includes("บ้าน")) {
                  return {
                    bg: "from-[#F5EEF8] to-[#E8DAEF]", // Light purple gradient
                    emoji: "🏠",
                    isLocked: false
                  };
                }
                // Default / Spend / Maintenance
                return {
                  bg: "from-[#E8F8F5] to-[#D1F2EB]", // Mint green gradient
                  emoji: "🛠️",
                  isLocked: false
                };
              };

              const theme = getPocketTheme(cat.name);
              const remainingPercent = cat.total > 0 ? Math.round((cat.remaining / cat.total) * 100) : 0;

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between h-[165px] relative group hover:scale-[1.03] transition-all duration-300"
                >
                  {/* Top Illustration Box */}
                  <div className={`h-[48%] w-full bg-gradient-to-br ${theme.bg} relative overflow-hidden`}>
                    {/* Wavy bottom divider curves to mimic the screenshot illustration */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-white rounded-t-[60%]" />
                  </div>

                  {/* Bottom Text Sheet */}
                  <div className="p-3 pt-1 flex flex-col justify-between h-[52%] bg-white">
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 truncate" title={cat.name}>
                        {cat.name}
                      </p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">
                        ฿{cat.remaining.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Progress Bar & Deduct Button */}
                    <div className="space-y-2 mt-auto">
                      {/* Sub-bar showing remaining percentage indicator */}
                      <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, remainingPercent))}%` }}
                        />
                      </div>

                      {/* Deduct button */}
                      <button
                        onClick={() => onDeductClick(cat)}
                        className="w-full py-1 bg-gray-50 hover:bg-orange-50 text-gray-400 hover:text-[#E8622A] text-[9px] font-bold rounded-lg transition active:scale-95 border border-transparent hover:border-orange-100 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        หักใช้เงิน
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Total Account Balance Card (MAKE style) */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between mt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#E8622A] font-black text-sm">
                ฿
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">ยอดเงินรวมในบัญชีทั้งหมด (All-Time)</p>
                <p className="text-base font-black text-gray-800">
                  ฿{allTimeBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="text-[8px] text-gray-400 font-bold text-right leading-tight">
              รวมทุกรายการ<br />ตั้งแต่เริ่มบันทึก
            </div>
          </div>
        </div>
      )}

      {/* ═══ Transaction History List (Edit & Delete) ═══ */}
      <TransactionHistoryList
        incomes={incomes}
        spends={spends}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
      />
    </div>
  );
}



"use client";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

/**
 * DailySummary
 * Three-card summary: total expense / income / net for a given set of transactions.
 * Displayed as a sticky sub-header inside TransactionList.
 */
export default function DailySummary({ transactions }) {
  const { income, expense } = transactions.reduce(
    (acc, t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") acc.income += amt;
      else acc.expense += amt;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const net = income - expense;

  const stats = [
    {
      label: "รายจ่าย",
      value: expense,
      color: "text-red-500",
      icon: <TrendingDown size={11} className="text-red-400" />,
      prefix: "-",
    },
    {
      label: "รายรับ",
      value: income,
      color: "text-emerald-500",
      icon: <TrendingUp size={11} className="text-emerald-400" />,
      prefix: "+",
    },
    {
      label: "ยอดสุทธิ",
      value: net,
      color: net >= 0 ? "text-emerald-600" : "text-red-500",
      icon: <Wallet size={11} className="text-[#E8622A]" />,
      prefix: net >= 0 ? "+" : "",
    },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-gray-100 bg-[#FAFAFA] border-b border-gray-100">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center py-2.5 px-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {s.icon}
            <span>{s.label}</span>
          </div>
          <p className={`text-[13px] font-bold tabular-nums ${s.color}`}>
            {s.prefix}฿{Math.abs(s.value).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

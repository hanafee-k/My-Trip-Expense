"use client";
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, ChevronDown, BarChart3 } from 'lucide-react';
import { getMonthRange, getMonthLabel } from '../../lib/dateUtils';

export function MonthComparison({ incomes, spends, categories, calculateAllocation }) {
  const [showPerCategory, setShowPerCategory] = useState(false);

  const now = new Date();
  const thisMonthRange = getMonthRange(now.getFullYear(), now.getMonth());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthRange = getMonthRange(lastMonthDate.getFullYear(), lastMonthDate.getMonth());

  const thisMonthLabel = getMonthLabel(now.getFullYear(), now.getMonth());
  const lastMonthLabel = getMonthLabel(lastMonthDate.getFullYear(), lastMonthDate.getMonth());

  const comparisonData = useMemo(() => {
    const filterByRange = (items, range) =>
      items.filter((item) => item.date >= range.start && item.date <= range.end);

    const tmIncomes = filterByRange(incomes, thisMonthRange);
    const tmSpends = filterByRange(spends, thisMonthRange);
    const lmIncomes = filterByRange(incomes, lastMonthRange);
    const lmSpends = filterByRange(spends, lastMonthRange);

    const tmTotalIncome = tmIncomes.reduce((s, i) => s + i.income, 0);
    const lmTotalIncome = lmIncomes.reduce((s, i) => s + i.income, 0);
    const tmTotalSpent = tmSpends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    const lmTotalSpent = lmSpends.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);

    // Savings = first category (typically "ออม/เก็บ")
    const savingsCat = categories[0];
    const tmSaved = savingsCat
      ? tmIncomes.reduce((s, inc) => s + (inc.income * savingsCat.pct / 100), 0) -
        tmSpends.filter(sp => sp.categoryId === savingsCat.id || sp.categoryName === savingsCat.name)
          .reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
      : 0;
    const lmSaved = savingsCat
      ? lmIncomes.reduce((s, inc) => s + (inc.income * savingsCat.pct / 100), 0) -
        lmSpends.filter(sp => sp.categoryId === savingsCat.id || sp.categoryName === savingsCat.name)
          .reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
      : 0;

    // Per-category data
    const perCategory = categories.map((cat) => {
      const tmAllocated = tmIncomes.reduce((s, inc) => s + (inc.income * cat.pct / 100), 0);
      const lmAllocated = lmIncomes.reduce((s, inc) => s + (inc.income * cat.pct / 100), 0);
      const tmCatSpent = tmSpends.filter(sp => sp.categoryId === cat.id || sp.categoryName === cat.name)
        .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
      const lmCatSpent = lmSpends.filter(sp => sp.categoryId === cat.id || sp.categoryName === cat.name)
        .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
      const change = lmAllocated > 0 ? ((tmAllocated - lmAllocated) / lmAllocated * 100) : 0;
      return {
        name: cat.name,
        thisMonth: Math.round(tmAllocated),
        lastMonth: Math.round(lmAllocated),
        thisMonthSpent: Math.round(tmCatSpent),
        lastMonthSpent: Math.round(lmCatSpent),
        change,
      };
    });

    const chartData = [
      {
        name: 'รายรับ',
        thisMonth: Math.round(tmTotalIncome),
        lastMonth: Math.round(lmTotalIncome),
        change: lmTotalIncome > 0 ? ((tmTotalIncome - lmTotalIncome) / lmTotalIncome * 100) : 0,
      },
      {
        name: 'เงินออม',
        thisMonth: Math.round(Math.max(0, tmSaved)),
        lastMonth: Math.round(Math.max(0, lmSaved)),
        change: lmSaved > 0 ? ((tmSaved - lmSaved) / lmSaved * 100) : 0,
      },
      {
        name: 'ใช้จ่าย',
        thisMonth: Math.round(tmTotalSpent),
        lastMonth: Math.round(lmTotalSpent),
        change: lmTotalSpent > 0 ? ((tmTotalSpent - lmTotalSpent) / lmTotalSpent * 100) : 0,
      },
    ];

    return { chartData, perCategory, thisMonthLabel, lastMonthLabel };
  }, [incomes, spends, categories, thisMonthRange, lastMonthRange]);

  if (!incomes.length) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-black text-[#1A1A1A] mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-bold" style={{ color: p.color }}>
            {p.name}: ฿{p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const ChangeIndicator = ({ value }) => {
    if (Math.abs(value) < 0.5) return <span className="text-gray-400 text-[10px]">—</span>;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-0.5 text-[10px] font-black ${
        isPositive ? 'text-emerald-500' : 'text-rose-500'
      }`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {Math.abs(value).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-[#1A1A1A] flex items-center gap-2">
            <BarChart3 size={16} className="text-[#E8622A]" />
            เปรียบเทียบรายเดือน
          </h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            {comparisonData.thisMonthLabel} vs {comparisonData.lastMonthLabel}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {comparisonData.chartData.map((item) => (
          <div key={item.name} className="bg-gray-50/50 rounded-2xl p-3 text-center">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{item.name}</p>
            <p className="text-sm font-black text-[#1A1A1A]">฿{item.thisMonth.toLocaleString()}</p>
            <ChangeIndicator value={item.change} />
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={comparisonData.chartData} barGap={4} barSize={20}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 9 }}
              tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="lastMonth" name={comparisonData.lastMonthLabel} radius={[6, 6, 0, 0]} fill="#E5E7EB" />
            <Bar dataKey="thisMonth" name={comparisonData.thisMonthLabel} radius={[6, 6, 0, 0]} fill="#E8622A" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#E5E7EB]"></div>
          <span className="text-gray-500 font-bold">{comparisonData.lastMonthLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#E8622A]"></div>
          <span className="text-gray-500 font-bold">{comparisonData.thisMonthLabel}</span>
        </div>
      </div>

      {/* Per-Category Toggle */}
      <button
        onClick={() => setShowPerCategory(!showPerCategory)}
        className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#E8622A] transition py-2"
      >
        เปรียบเทียบรายหมวดหมู่
        <ChevronDown size={12} className={`transition-transform ${showPerCategory ? 'rotate-180' : ''}`} />
      </button>

      {showPerCategory && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
          {comparisonData.perCategory.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between bg-gray-50/50 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-bold text-gray-700">{cat.name}</p>
                <p className="text-[9px] text-gray-400">
                  ฿{cat.thisMonth.toLocaleString()} vs ฿{cat.lastMonth.toLocaleString()}
                </p>
              </div>
              <ChangeIndicator value={cat.change} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

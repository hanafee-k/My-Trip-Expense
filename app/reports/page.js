"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { db, auth } from "../../lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,BarChart,Bar,XAxis,YAxis,CartesianGrid} from "recharts";
import { Filter, ChevronRight, Plane,TrendingDown,Calendar,PieChart as PieChartIcon,BarChart3,Loader2,ArrowLeft,Download,Sparkles,Target,AlertCircle } from "lucide-react";

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth State Management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Helper Functions ---
  const getStartOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const getEndOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const getStartOfYear = () => {
    const date = new Date();
    return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
  };

  // --- State Management ---
  const [trips, setTrips] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Filter State
  const [filterStart, setFilterStart] = useState(getStartOfMonth());
  const [filterEnd, setFilterEnd] = useState(getEndOfMonth());
  const [filterTrip, setFilterTrip] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  
  // Chart Type Toggle
  const [chartType, setChartType] = useState("pie"); // pie or bar

  // --- Categories Configuration ---
  const categories = [
    { id: "food", name: "อาหาร & เครื่องดื่ม", icon: "🍜", color: "#f97316" }, // Orange
    { id: "transport", name: "เดินทาง & ขนส่ง", icon: "🚕", color: "#0ea5e9" }, // Sky
    { id: "shopping", name: "ช็อปปิ้ง", icon: "🛍️", color: "#ec4899" }, // Pink
    { id: "hotel", name: "ที่พัก", icon: "🏨", color: "#8b5cf6" }, // Violet
    { id: "entertainment", name: "ความบันเทิง", icon: "🎭", color: "#a855f7" }, // Purple
    { id: "health", name: "สุขภาพ", icon: "💊", color: "#10b981" }, // Emerald
    { id: "other", name: "อื่นๆ", icon: "📝", color: "#6b7280" }, // Gray
  ];

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) return;
    
    const qTrips = query(
      collection(db, `users/${user.uid}/trips`),
      orderBy("createdAt", "desc")
    );
    
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qTrans = query(
      collection(db, `users/${user.uid}/transactions`),
      orderBy("date", "desc")
    );
    
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTrips();
      unsubTrans();
    };
  }, [user]);

  // --- Data Processing ---
  const { chartData, totalExpense, filteredTransactions, stats } = useMemo(() => {
    // Filter transactions
    const filtered = transactions.filter(t => {
      if (!t.date || t.type !== 'expense') return false;
      
      const tDate = t.date.toDate().toISOString().split('T')[0];
      const dateMatch = tDate >= filterStart && tDate <= filterEnd;

      let tripMatch = true;
      if (filterTrip === "all") {
        tripMatch = true;
      } else if (filterTrip === "no_trip") {
        tripMatch = !t.tripId;
      } else {
        tripMatch = t.tripId === filterTrip;
      }

      return dateMatch && tripMatch;
    });

    // Calculate total
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const grouped = filtered.reduce((acc, curr) => {
      acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
      return acc;
    }, {});

    // Process for charts
    const processed = Object.keys(grouped)
      .map(catId => {
        const cat = categories.find(c => c.id === catId);
        return {
          id: catId,
          name: cat ? cat.name : "อื่นๆ",
          icon: cat ? cat.icon : "📝",
          value: grouped[catId],
          color: cat ? cat.color : "#6b7280",
          percentage: total > 0 ? ((grouped[catId] / total) * 100).toFixed(1) : 0
        };
      })
      .sort((a, b) => b.value - a.value);

    // Calculate statistics
    const avgPerDay = filtered.length > 0 
      ? total / Math.max(1, Math.ceil((new Date(filterEnd) - new Date(filterStart)) / (1000 * 60 * 60 * 24)))
      : 0;

    const stats = {
      totalTransactions: filtered.length,
      avgPerDay: avgPerDay,
      highestCategory: processed[0]?.name || "ไม่มีข้อมูล",
      highestAmount: processed[0]?.value || 0
    };

    return {
      chartData: processed,
      totalExpense: total,
      filteredTransactions: filtered,
      stats
    };
  }, [transactions, filterStart, filterEnd, filterTrip, categories]);

  // --- Quick Filter Presets ---
  const quickFilters = [
    {
      id: "this_month",
      label: "เดือนนี้",
      action: () => {
        setFilterStart(getStartOfMonth());
        setFilterEnd(getEndOfMonth());
      }
    },
    {
      id: "last_month",
      label: "เดือนที่แล้ว",
      action: () => {
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth() - 1, 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
        setFilterStart(firstDay.toISOString().split('T')[0]);
        setFilterEnd(lastDay.toISOString().split('T')[0]);
      }
    },
    {
      id: "this_year",
      label: "ปีนี้",
      action: () => {
        setFilterStart(getStartOfYear());
        setFilterEnd(getEndOfMonth());
      }
    }
  ];

  // --- Helper Functions ---
  const getTripName = (id) => trips.find(t => t.id === id)?.name || "ไม่พบทริป";

  // --- Custom Chart Components ---
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{payload[0].payload.icon}</span>
            <p className="font-bold text-white">{payload[0].name}</p>
          </div>
          <p className="text-teal-400 font-bold text-lg">
            ฿{payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {payload[0].payload.percentage}% ของยอดรวม
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-zinc-400">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // --- Loading State ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
          <p className="text-zinc-400 text-sm">กำลังโหลดรายงาน...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-zinc-400">คุณต้องเข้าสู่ระบบก่อนดูรายงาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-24 font-sans selection:bg-teal-800/30">
      
      {/* Header */}
      <div className="bg-[#18181b] p-5 border-b border-zinc-800/50 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-zinc-800 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-white tracking-tight">
            <PieChartIcon size={22} className="text-teal-400" />
            <span>รายงาน<span className="text-teal-400">สรุปยอด</span></span>
            <Sparkles className="w-5 h-5 text-teal-400" />
          </h1>
          
          <button
            className="p-2 hover:bg-zinc-800 rounded-lg transition opacity-0 cursor-default"
            disabled
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* Filter Bar */}
        <div className="mb-5">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="w-full flex justify-between items-center bg-[#18181b] p-4 rounded-xl border border-zinc-800 text-sm text-zinc-300 hover:border-teal-600/50 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-teal-400" />
              <span className="font-semibold text-white">
                {filterTrip === 'all' ? '📊 ทุกรายการ' :
                 filterTrip === 'no_trip' ? '🏠 ชีวิตประจำวัน' :
                 `✈️ ${getTripName(filterTrip)}`}
              </span>
              <span className="text-xs text-zinc-500 font-normal">
                {new Date(filterStart).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                {' - '}
                {new Date(filterEnd).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <ChevronRight
              size={18}
              className={`transform transition-transform ${showFilter ? 'rotate-90' : ''} text-zinc-500`}
            />
          </button>

          {showFilter && (
            <div className="mt-3 p-5 bg-[#18181b] rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200 space-y-5">
              
              {/* Quick Filters */}
              <div className="flex gap-2">
                {quickFilters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={filter.action}
                    className="flex-1 bg-zinc-900 hover:bg-teal-600 text-zinc-300 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-zinc-800"></div>

              {/* Trip Filter */}
              <div>
                <label className="text-xs text-zinc-400 font-semibold flex items-center gap-2 mb-2.5">
                  <Plane size={14} className="text-teal-400" />
                  เลือกดูข้อมูลของ
                </label>
                <select
                  value={filterTrip}
                  onChange={(e) => setFilterTrip(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                >
                  <option value="all">🌐 รายการทั้งหมด</option>
                  <option value="no_trip">🏠 ชีวิตประจำวัน (ไม่เข้าทริป)</option>
                  {trips.length > 0 && <option disabled>──────────</option>}
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>✈️ {t.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-zinc-800"></div>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="text-xs text-zinc-400 font-semibold flex items-center gap-2">
                  <Calendar size={14} className="text-teal-400" />
                  ช่วงเวลา
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1.5 ml-1">ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={filterStart}
                      onChange={e => setFilterStart(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1.5 ml-1">ถึงวันที่</label>
                    <input
                      type="date"
                      value={filterEnd}
                      onChange={e => setFilterEnd(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Total Expense */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 shadow-2xl shadow-teal-900/30 border border-teal-500/30 col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-teal-100 text-sm font-semibold">
                <TrendingDown size={16} />
                รายจ่ายรวม
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/30">
                <Target size={16} className="text-white" />
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {totalExpense.toLocaleString()}
            </div>
            <div className="text-teal-100 text-sm font-medium">บาท</div>
          </div>

          {/* Transactions Count */}
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-2 font-semibold">จำนวนรายการ</div>
            <div className="text-2xl font-bold text-white mb-1">
              {stats.totalTransactions}
            </div>
            <div className="text-xs text-zinc-500">รายการ</div>
          </div>

          {/* Average Per Day */}
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-2 font-semibold">เฉลี่ยต่อวัน</div>
            <div className="text-2xl font-bold text-white mb-1">
              {Math.round(stats.avgPerDay).toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500">บาท/วัน</div>
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex gap-3 p-1.5 bg-zinc-900 rounded-xl border border-zinc-800 mb-5">
          <button
            onClick={() => setChartType('pie')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              chartType === 'pie'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <PieChartIcon size={16} />
            กราฟวงกลม
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              chartType === 'bar'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <BarChart3 size={16} />
            กราฟแท่ง
          </button>
        </div>

        {/* Charts */}
        <div className="bg-[#18181b] rounded-2xl p-5 border border-zinc-800 shadow-xl mb-6">
          {chartData.length > 0 ? (
            <div className="w-full">
              {chartType === 'pie' ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#71717a"
                        tick={{ fill: '#a1a1aa', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#71717a"
                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mb-4 text-5xl">📊</div>
              <p className="text-zinc-400 font-semibold mb-2">ไม่มีข้อมูลรายจ่าย</p>
              <p className="text-zinc-600 text-sm">ลองเปลี่ยนช่วงเวลาหรือทริปดูครับ</p>
            </div>
          )}
        </div>

        {/* Category Breakdown Table */}
        {chartData.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between px-1 mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <BarChart3 size={20} className="text-teal-400" />
                รายละเอียดตามหมวดหมู่
              </h3>
              <span className="text-xs text-zinc-500 font-semibold">
                {chartData.length} หมวด
              </span>
            </div>
            
            {chartData.map((item, index) => (
              <div
                key={index}
                className="bg-[#18181b] p-4 rounded-xl border border-zinc-800 hover:border-teal-600/30 transition-all group animate-in fade-in slide-in-from-bottom-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/10"
                      style={{ 
                        background: `linear-gradient(135deg, ${item.color}dd, ${item.color})` 
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm mb-1">
                        {item.name}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        อันดับ {index + 1} • {item.percentage}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-lg">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="text-zinc-500 text-xs font-semibold">บาท</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Insights Section */}
        {chartData.length > 0 && (
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-5 border border-zinc-700 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-white font-bold text-sm">💡 สรุปข้อมูลเชิงลึก</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2"></div>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  คุณใช้จ่ายมากที่สุดกับหมวด <span className="font-bold text-white">{stats.highestCategory}</span> ถึง <span className="font-bold text-teal-400">{stats.highestAmount.toLocaleString()} บาท</span>
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2"></div>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  ค่าใช้จ่ายเฉลี่ย <span className="font-bold text-white">{Math.round(stats.avgPerDay).toLocaleString()} บาท/วัน</span> จากทั้งหมด <span className="font-bold text-white">{stats.totalTransactions} รายการ</span>
                </p>
              </div>
              
              {chartData.length >= 3 && (
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2"></div>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    หมวด 3 อันดับแรก คิดเป็น <span className="font-bold text-teal-400">{(parseFloat(chartData[0].percentage) + parseFloat(chartData[1].percentage) + parseFloat(chartData[2].percentage)).toFixed(1)}%</span> ของยอดรวม
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
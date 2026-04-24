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
    { id: "food", name: "อาหาร & เครื่องดื่ม", icon: "🍜", color: "#E8622A" }, // Burnt Orange
    { id: "transport", name: "เดินทาง & ขนส่ง", icon: "🚕", color: "#0ea5e9" }, // Sky
    { id: "shopping", name: "ช็อปปิ้ง", icon: "🛍️", color: "#ec4899" }, // Pink
    { id: "hotel", name: "ที่พัก", icon: "🏨", color: "#8b5cf6" }, // Violet
    { id: "entertainment", name: "ความบันเทิง", icon: "🎭", color: "#a855f7" }, // Purple
    { id: "health", name: "สุขภาพ", icon: "💊", color: "#10b981" }, // Emerald
    { id: "other", name: "อื่นๆ", icon: "📝", color: "#9ca3af" }, // Gray
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
          color: cat ? cat.color : "#9ca3af",
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
        <div className="bg-white border border-[#EBEBEB] p-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{payload[0].payload.icon}</span>
            <p className="font-bold text-[#1A1A1A]">{payload[0].name}</p>
          </div>
          <p className="text-[#E8622A] font-black text-lg">
            ฿{payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-[#6B6B6B] mt-1 font-medium">
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
            <span className="text-xs text-[#6B6B6B] font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // --- Loading State ---
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#E8622A] animate-spin" />
          <p className="text-[#6B6B6B] text-sm">กำลังโหลดรายงาน...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-[#6B6B6B]">คุณต้องเข้าสู่ระบบก่อนดูรายงาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 font-sans text-[#1A1A1A]">
      
      {/* Header */}
      <div className="bg-white/95 p-5 border-b border-[#EBEBEB] sticky top-0 z-50 backdrop-blur-md shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-[#1A1A1A]" />
          </button>
          
          <h1 className="text-xl font-bold flex items-center gap-2.5 text-[#1A1A1A] tracking-tight">
            <PieChartIcon size={22} className="text-[#E8622A]" />
            <span>รายงาน<span className="text-[#E8622A]">สรุปยอด</span></span>
            <Sparkles className="w-5 h-5 text-[#E8622A]" />
          </h1>
          
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition opacity-0 cursor-default"
            disabled
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-6 px-4 lg:px-8">
        
        {/* Filter Bar */}
        <div className="mb-5">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="w-full flex justify-between items-center bg-white p-4 rounded-xl border border-[#EBEBEB] shadow-sm text-sm text-[#1A1A1A] hover:border-[#E8622A] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-[#E8622A]" />
              <span className="font-bold">
                {filterTrip === 'all' ? '📊 ทุกรายการ' :
                 filterTrip === 'no_trip' ? '🏠 ชีวิตประจำวัน' :
                 `✈️ ${getTripName(filterTrip)}`}
              </span>
              <span className="text-xs text-[#6B6B6B] font-medium hidden sm:inline-block">
                {new Date(filterStart).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                {' - '}
                {new Date(filterEnd).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <ChevronRight
              size={18}
              className={`transform transition-transform ${showFilter ? 'rotate-90' : ''} text-[#6B6B6B]`}
            />
          </button>

          {showFilter && (
            <div className="mt-3 p-5 bg-white rounded-xl border border-[#EBEBEB] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 space-y-5">
              
              {/* Quick Filters */}
              <div className="flex gap-2">
                {quickFilters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={filter.action}
                    className="flex-1 bg-gray-50 border border-gray-200 hover:bg-[#FFF4EF] hover:border-[#fbdcd0] hover:text-[#E8622A] text-[#1A1A1A] px-3 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Trip Filter */}
              <div>
                <label className="text-xs text-[#6B6B6B] font-bold flex items-center gap-2 mb-2.5">
                  <Plane size={14} className="text-[#E8622A]" />
                  เลือกดูข้อมูลของ
                </label>
                <select
                  value={filterTrip}
                  onChange={(e) => setFilterTrip(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition"
                >
                  <option value="all">🌐 รายการทั้งหมด</option>
                  <option value="no_trip">🏠 ชีวิตประจำวัน (ไม่เข้าทริป)</option>
                  {trips.length > 0 && <option disabled>──────────</option>}
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>✈️ {t.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="text-xs text-[#6B6B6B] font-bold flex items-center gap-2">
                  <Calendar size={14} className="text-[#E8622A]" />
                  ช่วงเวลา
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#6B6B6B] block mb-1.5 ml-1 font-medium">ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={filterStart}
                      onChange={e => setFilterStart(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6B6B6B] block mb-1.5 ml-1 font-medium">ถึงวันที่</label>
                    <input
                      type="date"
                      value={filterEnd}
                      onChange={e => setFilterEnd(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition"
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
          <div className="bg-[#E8622A] rounded-xl p-5 shadow-[0_4px_12px_rgba(232,98,42,0.2)] border border-[#E8622A] col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white text-sm font-bold opacity-90">
                <TrendingDown size={16} />
                รายจ่ายรวม
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                <Target size={16} className="text-white" />
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {totalExpense.toLocaleString()}
            </div>
            <div className="text-white opacity-90 text-sm font-medium">บาท</div>
          </div>

          {/* Transactions Count */}
          <div className="bg-white rounded-xl p-4 border border-[#EBEBEB] shadow-sm">
            <div className="text-xs text-[#6B6B6B] mb-2 font-bold">จำนวนรายการ</div>
            <div className="text-2xl font-black text-[#1A1A1A] mb-1">
              {stats.totalTransactions}
            </div>
            <div className="text-xs text-[#6B6B6B] font-medium">รายการ</div>
          </div>

          {/* Average Per Day */}
          <div className="bg-white rounded-xl p-4 border border-[#EBEBEB] shadow-sm">
            <div className="text-xs text-[#6B6B6B] mb-2 font-bold">เฉลี่ยต่อวัน</div>
            <div className="text-2xl font-black text-[#1A1A1A] mb-1">
              {Math.round(stats.avgPerDay).toLocaleString()}
            </div>
            <div className="text-xs text-[#6B6B6B] font-medium">บาท/วัน</div>
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl border border-gray-200 mb-5">
          <button
            onClick={() => setChartType('pie')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              chartType === 'pie'
                ? 'bg-white text-[#1A1A1A] shadow-sm border border-gray-200'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}
          >
            <PieChartIcon size={16} />
            กราฟวงกลม
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              chartType === 'bar'
                ? 'bg-white text-[#1A1A1A] shadow-sm border border-gray-200'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}
          >
            <BarChart3 size={16} />
            กราฟแท่ง
          </button>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-2xl p-5 border border-[#EBEBEB] shadow-sm mb-6">
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#e5e7eb"
                        tick={{ fill: '#6B6B6B', fontSize: 10, fontWeight: 500 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#e5e7eb"
                        tick={{ fill: '#6B6B6B', fontSize: 12, fontWeight: 500 }}
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
              <p className="text-[#1A1A1A] font-bold mb-2">ไม่มีข้อมูลรายจ่าย</p>
              <p className="text-[#6B6B6B] text-sm">ลองเปลี่ยนช่วงเวลาหรือทริปดูครับ</p>
            </div>
          )}
        </div>

        {/* Category Breakdown Table */}
        {chartData.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between px-1 mb-4">
              <h3 className="text-[#1A1A1A] font-bold text-lg flex items-center gap-2">
                <BarChart3 size={20} className="text-[#E8622A]" />
                รายละเอียดตามหมวดหมู่
              </h3>
              <span className="text-xs text-[#6B6B6B] font-bold bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                {chartData.length} หมวด
              </span>
            </div>
            
            {chartData.map((item, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl border border-[#EBEBEB] hover:border-[#fbdcd0] hover:shadow-sm transition-all group animate-in fade-in slide-in-from-bottom-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-gray-100"
                      style={{ 
                        background: `linear-gradient(135deg, ${item.color}15, ${item.color}30)` 
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-[#1A1A1A] font-bold text-sm mb-1">
                        {item.name}
                      </div>
                      <div className="text-[#6B6B6B] text-xs font-medium">
                        อันดับ {index + 1} • {item.percentage}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#1A1A1A] font-black text-lg">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="text-[#6B6B6B] text-xs font-bold">บาท</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
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
          <div className="bg-[#FFF4EF] rounded-xl p-5 border border-[#fbdcd0] mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[#E8622A]" />
              <h3 className="text-[#1A1A1A] font-black text-sm">💡 สรุปข้อมูลเชิงลึก</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A] mt-2"></div>
                <p className="text-[#6B6B6B] text-sm leading-relaxed font-medium">
                  คุณใช้จ่ายมากที่สุดกับหมวด <span className="font-bold text-[#1A1A1A]">{stats.highestCategory}</span> ถึง <span className="font-bold text-[#E8622A]">{stats.highestAmount.toLocaleString()} บาท</span>
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A] mt-2"></div>
                <p className="text-[#6B6B6B] text-sm leading-relaxed font-medium">
                  ค่าใช้จ่ายเฉลี่ย <span className="font-bold text-[#1A1A1A]">{Math.round(stats.avgPerDay).toLocaleString()} บาท/วัน</span> จากทั้งหมด <span className="font-bold text-[#1A1A1A]">{stats.totalTransactions} รายการ</span>
                </p>
              </div>
              
              {chartData.length >= 3 && (
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E8622A] mt-2"></div>
                  <p className="text-[#6B6B6B] text-sm leading-relaxed font-medium">
                    หมวด 3 อันดับแรก คิดเป็น <span className="font-bold text-[#E8622A]">{(parseFloat(chartData[0].percentage) + parseFloat(chartData[1].percentage) + parseFloat(chartData[2].percentage)).toFixed(1)}%</span> ของยอดรวม
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
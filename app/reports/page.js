"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { db, auth } from "../../lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { 
  Filter, ChevronRight, Plane, TrendingDown, Calendar, PieChart as PieChartIcon, 
  BarChart3, Loader2, ArrowLeft, Download, Sparkles, Target, AlertCircle, X,
  FileSpreadsheet, FileText, ChevronDown, ArrowUpRight, TrendingUp, Tag, DollarSign,
  Wallet, Layers, Activity, Award, Receipt
} from "lucide-react";

import FilterBar from "../../components/FilterBar";
import { getStartOfMonth, getEndOfMonth, getDateRange, getTodayDate } from "../../lib/dateUtils";
import DailySummary from "../../components/transactions/DailySummary";
import TransactionItem from "../../components/transactions/TransactionItem";

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

  // --- State Management ---
  const [trips, setTrips] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Filter State
  const [reportTab, setReportTab] = useState('date'); // 'date' | 'trip'
  const [dateFrom, setDateFrom] = useState(getTodayDate());
  const [dateTo, setDateTo] = useState(getTodayDate());
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [filterStart, setFilterStart] = useState(getTodayDate());
  const [filterEnd, setFilterEnd] = useState(getTodayDate());
  const [filterTrip, setFilterTrip] = useState("all");
  const [timePreset, setTimePreset] = useState("today"); // today, week, month, year, all
  const [includeTrips, setIncludeTrips] = useState(false);
  
  // UI State
  const [chartType, setChartType] = useState("pie"); // pie or bar
  const [showExportModal, setShowExportModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // --- Categories Configuration ---
  const categories = [
    { id: "food", name: "อาหาร & เครื่องดื่ม", icon: "🍜", color: "#E8622A" },
    { id: "transport", name: "เดินทาง & ขนส่ง", icon: "🚕", color: "#0ea5e9" },
    { id: "shopping", name: "ช็อปปิ้ง", icon: "🛍️", color: "#ec4899" },
    { id: "hotel", name: "ที่พัก", icon: "🏨", color: "#8b5cf6" },
    { id: "entertainment", name: "ความบันเทิง", icon: "🎭", color: "#a855f7" },
    { id: "health", name: "สุขภาพ", icon: "💊", color: "#10b981" },
    { id: "other", name: "อื่นๆ", icon: "📝", color: "#9ca3af" },
  ];

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) return;
    
    const qTrips = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qTrans = query(collection(db, `users/${user.uid}/transactions`), orderBy("date", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubTrips(); unsubTrans(); };
  }, [user]);

  // --- Data Processing ---
  const { chartData, totalExpense, filteredTransactions, allFilteredTransactions, stats, top3Items } = useMemo(() => {
    // Filter ALL transactions (income + expense) for the Daily Transactions list
    const allFiltered = transactions.filter(t => {
      if (!t.date) return false;
      
      // Trip exclusion logic
      if (!includeTrips && t.tripId) return false;

      const tDate = t.date.toDate().toISOString().split('T')[0];
      const dateMatch = tDate >= filterStart && tDate <= filterEnd;
      let tripMatch = filterTrip === "all" ? true : (filterTrip === "no_trip" ? !t.tripId : t.tripId === filterTrip);
      return dateMatch && tripMatch;
    }).sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

    // Filter transactions (expenses only for charts)
    const filtered = allFiltered.filter(t => t.type === 'expense');

    const total = filtered.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const grouped = filtered.reduce((acc, curr) => {
      acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
      return acc;
    }, {});

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

    // Calculate daily average
    let avgPerDay = 0;
    if (filtered.length > 0) {
      const uniqueDays = new Set(filtered.map(t => t.date.toDate().toISOString().split('T')[0])).size;
      avgPerDay = total / Math.max(1, uniqueDays);
    }

    const top3 = [...filtered]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const stats = {
      totalTransactions: filtered.length,
      avgPerDay: avgPerDay,
      highestCategory: processed[0]?.name || "ไม่มีข้อมูล",
      highestAmount: processed[0]?.value || 0
    };

    return { chartData: processed, totalExpense: total, filteredTransactions: filtered, allFilteredTransactions: allFiltered, stats, top3Items: top3 };
  }, [transactions, filterStart, filterEnd, filterTrip, includeTrips]);

  // --- Export Functions ---
  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ["วันที่", "รายการ", "หมวดหมู่", "ประเภท", "จำนวนเงิน", "ทริป"];
    const rows = filteredTransactions.map(t => [
      t.date.toDate().toLocaleDateString('th-TH'),
      t.note || "-",
      categories.find(c => c.id === t.categoryId)?.name || "อื่นๆ",
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      t.amount,
      trips.find(trip => trip.id === t.tripId)?.name || "-"
    ]);
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const exportPDF = () => {
    window.print();
    setShowExportModal(false);
  };

  // --- Comparison Logic ---
  const previousTripComparison = useMemo(() => {
    if (!selectedTrip || trips.length < 2) return null;
    const currentIndex = trips.findIndex(t => t.id === selectedTrip.id);
    const prevTrip = trips[currentIndex + 1];
    if (!prevTrip) return null;

    const prevTripTotal = transactions
      .filter(t => t.tripId === prevTrip.id && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const diff = totalExpense - prevTripTotal;
    const percent = prevTripTotal > 0 ? (Math.abs(diff) / prevTripTotal) * 100 : 0;

    return { name: prevTrip.name, total: prevTripTotal, diff, percent };
  }, [selectedTrip, trips, totalExpense, transactions]);

  if (authLoading) return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center font-sans">
      <Loader2 className="w-12 h-12 text-[#E8622A] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-24 bg-[#F7F6F3] text-[#1A1A1A] font-sans print:bg-white print:pb-0">
      
      {/* Header */}
      <div className="bg-white p-5 border-b border-gray-100 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-xl font-bold text-[#1A1A1A]">รายงานสรุปยอด</h1>
          </div>
          <button onClick={() => setShowExportModal(true)} className="bg-[#FFF4EF] text-[#E8622A] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-orange-100 transition">
            <Download size={18} /> ส่งออก
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-8 px-4">
        
        {/* Tab Toggle */}
        <div className="mb-10 print:hidden">
          <div className="bg-white border border-gray-200 rounded-2xl p-1.5 flex shadow-sm">
            <button
              onClick={() => setReportTab('date')}
              className={`flex-1 py-3 rounded-xl text-[13px] transition-all flex items-center justify-center gap-2 ${
                reportTab === 'date' ? "bg-[#E8622A] text-white font-bold shadow-md shadow-orange-100" : "text-gray-400 font-medium hover:text-gray-600"
              }`}
            >
              <Calendar size={16} /> ช่วงวันที่
            </button>
            <button
              onClick={() => setReportTab('trip')}
              className={`flex-1 py-3 rounded-xl text-[13px] transition-all flex items-center justify-center gap-2 ${
                reportTab === 'trip' ? "bg-[#E8622A] text-white font-bold shadow-md shadow-orange-100" : "text-gray-400 font-medium hover:text-gray-600"
              }`}
            >
              <Layers size={16} /> รายการทริป
            </button>
          </div>

          {reportTab === 'date' ? (
            <div className="mt-6 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'today',  label: 'วันนี้' },
                  { id: 'week',   label: 'รายสัปดาห์' },
                  { id: 'month',  label: 'รายเดือน' },
                  { id: 'year',   label: 'รายปี' },
                  { id: 'all',    label: 'ทั้งหมด' }
                ].map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      setTimePreset(p.id);
                      const { start, end } = getDateRange(p.id);
                      setFilterStart(start);
                      setFilterEnd(end);
                      setDateFrom(start);
                      setDateTo(end);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      timePreset === p.id ? 'bg-[#E8622A] text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!includeTrips ? 'bg-orange-100 text-[#E8622A]' : 'bg-gray-200 text-gray-400'}`}>
                      <Plane size={20} />
                   </div>
                   <div>
                     <p className="text-sm font-bold">รวมทริปด้วยหรือไม่?</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">ปัจจุบัน: {!includeTrips ? 'ไม่รวม (เฉพาะชีวิตประจำวัน)' : 'รวมทุกรายการ'}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setIncludeTrips(!includeTrips)}
                  className={`w-12 h-6 rounded-full relative transition-all ${includeTrips ? 'bg-[#E8622A]' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${includeTrips ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">ตั้งแต่วันที่</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 w-full focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">ถึงวันที่</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 w-full focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all" />
                </div>
              </div>
              <button onClick={() => { setFilterStart(dateFrom); setFilterEnd(dateTo); setTimePreset('custom'); }}
                className="bg-[#1A1A1A] text-white rounded-2xl w-full py-4 font-bold text-sm shadow-xl hover:scale-[1.01] active:scale-95 transition-all">
                กรองตามช่วงวันที่กำหนดเอง
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {trips.map((trip) => (
                <button key={trip.id} onClick={() => {
                  setSelectedTrip(trip);
                  const start = trip.startDate?.toDate ? trip.startDate.toDate().toISOString().split('T')[0] : "1970-01-01";
                  const end = trip.endDate?.toDate ? trip.endDate.toDate().toISOString().split('T')[0] : "2099-12-31";
                  setFilterStart(start); setFilterEnd(end); setFilterTrip(trip.id);
                }}
                className={`text-left p-5 rounded-3xl border-2 transition-all ${selectedTrip?.id === trip.id ? "border-[#E8622A] bg-white shadow-xl shadow-orange-50 scale-[1.02]" : "bg-white border-transparent hover:border-gray-100"}`}>
                  <div className="font-bold text-sm text-gray-900 mb-1">{trip.name}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-400 flex items-center gap-1"><Calendar size={12} /> {trip.startDate ? trip.startDate.toDate().toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }) : 'ไม่ระบุ'}</p>
                    <p className="font-bold text-orange-500 text-sm">฿{transactions.filter(t => t.tripId === trip.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Trip Banner */}
        {selectedTrip && (
          <div className="mb-8 bg-[#E8622A] text-white px-6 py-5 rounded-3xl flex justify-between items-center shadow-xl shadow-orange-100 animate-in zoom-in-95">
            <div>
              <div className="flex items-center gap-3 font-bold text-xl">
                <Plane size={24} className="bg-white/20 p-1 rounded-lg" /> {selectedTrip.name}
              </div>
              <p className="text-[12px] text-white/90 mt-1 flex items-center gap-2">
                <Calendar size={14} />
                {selectedTrip.startDate ? 
                  `${selectedTrip.startDate.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${selectedTrip.endDate.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}` 
                  : 'ไม่ได้ระบุช่วงวันที่ไว้'}
              </p>
            </div>
            <button onClick={() => { setSelectedTrip(null); setFilterTrip('all'); setFilterStart(getStartOfMonth()); setFilterEnd(getEndOfMonth()); setReportTab('date'); }}
              className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition"><X size={20} /></button>
          </div>
        )}

        {/* Summary Grid 2x2 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-3xl p-5 border border-gray-50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={48} /></div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">รายจ่ายรวม</p>
            <p className="text-3xl font-black text-[#E8622A]">฿{totalExpense.toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
              <Activity size={12} className="text-orange-300" /> จาก {stats.totalTransactions} รายการ
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-5 border border-gray-50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={48} /></div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">เฉลี่ยต่อวัน</p>
            <p className="text-3xl font-black text-gray-900">฿{Math.round(stats.avgPerDay).toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
              <Calendar size={12} className="text-blue-300" /> โดยเฉลี่ย
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Award size={48} /></div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">หมวดสูงสุด</p>
            <p className="text-xl font-bold text-gray-900 truncate pr-6">{stats.highestCategory}</p>
            <p className="text-[14px] font-bold text-gray-400 mt-1">฿{stats.highestAmount.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={48} /></div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">จำนวนรายการ</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalTransactions}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
              <Tag size={12} className="text-purple-300" /> ทั้งหมด
            </div>
          </div>
        </div>

        {/* Trip Comparison Chip */}
        {previousTripComparison && (
          <div className="mb-8 px-2 flex justify-center">
            <button 
              onClick={() => setShowComparisonModal(true)} 
              className="bg-white px-6 py-3 rounded-full border border-gray-100 shadow-sm text-orange-500 text-xs font-bold flex items-center gap-2 hover:shadow-md transition-all active:scale-95"
            >
              <Activity size={14} /> เทียบกับทริปก่อนหน้า ({previousTripComparison.name}) ↗
            </button>
          </div>
        )}

        {/* Charts Container */}
        <div className="bg-white rounded-[40px] p-8 border border-gray-50 shadow-xl shadow-gray-200/40 mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#E8622A]/10"></div>
          <div className="flex justify-between items-center mb-10">
             <div>
               <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                 สัดส่วนรายจ่าย
               </h3>
               <p className="text-xs text-gray-400 font-medium">แยกตามหมวดหมู่ที่คุณใช้จ่าย</p>
             </div>
             <div className="flex bg-gray-50 p-1 rounded-xl">
                <button onClick={() => setChartType('pie')} className={`p-2 rounded-lg transition-all ${chartType === 'pie' ? 'bg-white text-[#E8622A] shadow-md' : 'text-gray-400'}`}><PieChartIcon size={18}/></button>
                <button onClick={() => setChartType('bar')} className={`p-2 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white text-[#E8622A] shadow-md' : 'text-gray-400'}`}><BarChart3 size={18}/></button>
             </div>
          </div>

          <div className="relative h-[320px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={85} outerRadius={115} paddingAngle={6} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50">
                          <p className="font-black text-sm mb-1">{payload[0].name}</p>
                          <p className="text-[#E8622A] font-black text-lg">฿{payload[0].value.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">{payload[0].payload.percentage}% จากทั้งหมด</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                </PieChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f9fafb' }} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-50">
                          <p className="font-black text-sm mb-1">{payload[0].name}</p>
                          <p className="text-[#E8622A] font-black text-lg">฿{payload[0].value.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
            
            {/* Donut Hole Text */}
            {chartType === 'pie' && chartData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-orange-50/50 p-6 rounded-full flex flex-col items-center justify-center">
                  <p className="text-[22px] font-black text-[#1A1A1A]">฿{totalExpense.toLocaleString()}</p>
                  <p className="text-[11px] text-orange-500 font-black uppercase tracking-widest mt-1">ยอดรวม</p>
                </div>
              </div>
            )}
            
            {chartData.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                <div className="bg-gray-50 p-8 rounded-full mb-4">
                  <PieChartIcon size={48} className="opacity-20" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">ไม่มีข้อมูล</p>
              </div>
            )}
          </div>
        </div>

        {/* Top 3 Spending Items */}
        {top3Items.length > 0 && (
          <div className="mb-10 px-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-[#E8622A] rounded-full"></div>
              <h3 className="font-black text-gray-900 text-lg">รายการใช้จ่ายสูงสุด 3 อันดับ</h3>
            </div>
            <div className="space-y-4">
              {top3Items.map((item, i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-gray-50 flex items-center justify-between shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl group-hover:bg-orange-50 transition-colors">
                      {categories.find(c => c.id === item.categoryId)?.icon || "📝"}
                    </div>
                    <div>
                      <p className="font-black text-[#1A1A1A] group-hover:text-[#E8622A] transition-colors">{item.note || "บันทึกรายการ"}</p>
                      <p className="text-[12px] text-gray-400 font-bold flex items-center gap-1.5 mt-1">
                        <Calendar size={12} /> {item.date.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">฿{item.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">จำนวนเงิน</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Detail List */}
        <div className="space-y-4 mb-12 px-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gray-300 rounded-full"></div>
            <h3 className="font-black text-gray-900 text-lg">สรุปตามหมวดหมู่</h3>
          </div>
          {chartData.map((item, index) => (
            <div key={index} className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${item.color}15` }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{item.name}</p>
                    <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.percentage}% จากทั้งหมด</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900">฿{item.value.toLocaleString()}</p>
                </div>
              </div>
              <div className="w-full bg-gray-50 h-2.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Daily Transactions Section */}
        <div className="mb-12 px-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-[#E8622A] rounded-full"></div>
            <h3 className="font-black text-gray-900 text-lg">รายการเดินบัญชี</h3>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-50 shadow-sm overflow-hidden flex flex-col">
            {/* Daily Summary */}
            {allFilteredTransactions.length > 0 && (
              <div className="sticky top-0 z-10 bg-white">
                <DailySummary transactions={allFilteredTransactions} />
                <div className="h-px bg-gray-100" />
              </div>
            )}

            {/* Scrollable list */}
            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "500px" }}>
              {allFilteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <Receipt size={22} className="text-gray-300" />
                  </div>
                  <p className="text-[13px] font-semibold text-gray-400">ไม่พบรายการ</p>
                </div>
              ) : (
                allFilteredTransactions.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    categories={categories}
                    trips={trips}
                  />
                ))
              )}
            </div>
            
            {allFilteredTransactions.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                <p className="text-[11px] text-gray-400 text-center font-bold uppercase">
                  ทั้งหมด {allFilteredTransactions.length} รายการ
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Export Modal (Bottom Sheet) */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 animate-in fade-in transition-all">
          <div className="bg-white w-full max-w-lg rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black mb-2">ส่งออกรายงาน</h3>
              <p className="text-gray-400 text-sm font-medium">เลือกรูปแบบไฟล์ที่ต้องการดาวน์โหลด</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button onClick={exportPDF} className="flex flex-col items-center gap-4 p-8 rounded-[40px] bg-red-50 border border-red-100 hover:bg-red-100 transition-all hover:scale-105 group">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-red-500 shadow-xl group-hover:rotate-6 transition-transform"><FileText size={32} /></div>
                <span className="font-black text-red-700">ไฟล์ PDF</span>
              </button>
              <button onClick={exportCSV} className="flex flex-col items-center gap-4 p-8 rounded-[40px] bg-green-50 border border-green-100 hover:bg-green-100 transition-all hover:scale-105 group">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-green-500 shadow-xl group-hover:-rotate-6 transition-transform"><FileSpreadsheet size={32} /></div>
                <span className="font-black text-green-700">ไฟล์ Excel (CSV)</span>
              </button>
            </div>
            <button onClick={() => setShowExportModal(false)} className="w-full mt-10 py-5 bg-gray-50 rounded-3xl text-gray-500 font-black hover:bg-gray-100 transition-colors uppercase tracking-widest text-sm">ปิดเมนู</button>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && previousTripComparison && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[48px] p-10 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={120} /></div>
            <div className="flex justify-between items-center mb-10 relative">
              <h3 className="text-2xl font-black">เปรียบเทียบทริป</h3>
              <button onClick={() => setShowComparisonModal(false)} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X size={20}/></button>
            </div>
            <div className="space-y-8 relative">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">ทริปปัจจุบัน</p>
                  <p className="font-black text-lg text-[#E8622A]">{selectedTrip?.name}</p>
                </div>
                <p className="font-black text-2xl italic">฿{totalExpense.toLocaleString()}</p>
              </div>
              <div className="h-px bg-gray-50 w-full"></div>
              <div className="flex justify-between items-center opacity-60">
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">ทริปก่อนหน้า</p>
                  <p className="font-black text-lg text-gray-600">{previousTripComparison.name}</p>
                </div>
                <p className="font-black text-2xl italic">฿{previousTripComparison.total.toLocaleString()}</p>
              </div>
              
              <div className={`p-8 rounded-[32px] flex items-center justify-between shadow-xl ${previousTripComparison.diff > 0 ? 'bg-red-500 text-white shadow-red-200' : 'bg-green-500 text-white shadow-green-200'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {previousTripComparison.diff > 0 ? <TrendingUp size={24}/> : <TrendingDown size={24}/>}
                    <span className="font-black text-xl">{previousTripComparison.diff > 0 ? 'ยอดสูงขึ้น' : 'ยอดลดลง'}</span>
                  </div>
                  <p className="text-white/80 font-bold text-sm tracking-wide">เปรียบเทียบจากทริปก่อนหน้า</p>
                </div>
                <div className="text-right">
                   <p className="font-black text-2xl">{Math.abs(previousTripComparison.diff).toLocaleString()}</p>
                   <p className="text-xs font-black bg-white/20 inline-block px-2 py-0.5 rounded-full mt-1">{previousTripComparison.percent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowComparisonModal(false)} className="w-full mt-10 bg-[#1A1A1A] text-white py-5 rounded-[24px] font-black shadow-xl hover:bg-black transition-colors uppercase tracking-widest text-sm">ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {/* Global CSS for scrollbar and print */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        @media print {
          nav, footer, .print\\:hidden, .shadow-xl, .shadow-2xl { display: none !important; }
          body { background: white !important; }
          .max-w-4xl { max-width: 100% !important; padding: 0 !important; }
          .rounded-3xl, .rounded-[40px], .rounded-[32px] { border: 1px solid #eee !important; border-radius: 12px !important; }
          .bg-[#F7F6F3] { background: white !important; }
        }
      `}</style>

    </div>
  );
}
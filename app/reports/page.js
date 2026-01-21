"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Filter, ChevronRight, Plane } from "lucide-react";

export default function ReportsPage() {
  const { user } = useAuth();

  // --- Helpers (เหมือนหน้าหลัก) ---
  const getStartOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  const getEndOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  // --- State ---
  const [trips, setTrips] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Filter State
  const [filterStart, setFilterStart] = useState(getStartOfMonth());
  const [filterEnd, setFilterEnd] = useState(getEndOfMonth());
  const [filterTrip, setFilterTrip] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  // Chart Data State
  const [chartData, setChartData] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);

  // หมวดหมู่ (เอาไว้แปล ID -> ชื่อไทย)
  const categories = [
    { id: "food", name: "อาหาร", color: "#0d9488" },      // Teal
    { id: "transport", name: "เดินทาง", color: "#ea580c" }, // Orange
    { id: "shopping", name: "ช็อปปิ้ง", color: "#be123c" }, // Rose
    { id: "hotel", name: "ที่พัก", color: "#7c3aed" },      // Violet
    { id: "other", name: "อื่นๆ", color: "#52525b" },       // Zinc
  ];

  // 1. ดึงข้อมูลทั้งหมด (Transactions & Trips)
  useEffect(() => {
    if (!user) return;
    
    // ดึง Trips
    const unsubTrips = onSnapshot(collection(db, `users/${user.uid}/trips`), (snap) => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // ดึง Transactions ทั้งหมด (แล้วค่อยมา Filter ใน Client)
    const qTrans = query(collection(db, `users/${user.uid}/transactions`), orderBy("date", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubTrips(); unsubTrans(); };
  }, [user]);

  // 2. Logic กรองข้อมูล + เตรียมข้อมูลกราฟ
  useEffect(() => {
    // กรองข้อมูล (Filter)
    const filtered = transactions.filter(t => {
      if (!t.date || t.type !== 'expense') return false; // เอาเฉพาะรายจ่าย
      
      const tDate = t.date.toDate().toISOString().split('T')[0];
      const dateMatch = tDate >= filterStart && tDate <= filterEnd;

      let tripMatch = true;
      if (filterTrip === "all") tripMatch = true;
      else if (filterTrip === "no_trip") tripMatch = !t.tripId;
      else tripMatch = t.tripId === filterTrip;

      return dateMatch && tripMatch;
    });

    // คำนวณยอดรวม
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);
    setTotalExpense(total);

    // Group ตามหมวดหมู่
    const grouped = filtered.reduce((acc, curr) => {
       acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.amount;
       return acc;
    }, {});

    // แปลงเป็น Format ของ Recharts
    const processedData = Object.keys(grouped).map(catId => {
       const cat = categories.find(c => c.id === catId);
       return {
         name: cat ? cat.name : "อื่นๆ",
         value: grouped[catId],
         color: cat ? cat.color : "#52525b"
       };
    }).sort((a, b) => b.value - a.value); // เรียงจากมากไปน้อย

    setChartData(processedData);

  }, [transactions, filterStart, filterEnd, filterTrip]);

  const getTripName = (id) => trips.find(t => t.id === id)?.name || "";

  // Custom Tooltip สำหรับกราฟ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl text-zinc-100">
          <p className="font-bold mb-1">{payload[0].name}</p>
          <p className="text-teal-400 font-bold">฿{payload[0].value.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">
             {((payload[0].value / totalExpense) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-zinc-800 text-zinc-100 pb-24 font-sans selection:bg-teal-800">
      
      {/* Header */}
      <div className="bg-[#18181b] p-4 text-center border-b border-zinc-800 sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-white tracking-wide">
          <span className="text-2xl">📊</span>
          <span>สรุป<span className="text-teal-500">รายจ่าย</span></span>
        </h1>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* --- Filter Bar (ใช้ดีไซน์เดียวกับหน้าหลัก) --- */}
        <div className="mb-6">
            <button 
                onClick={() => setShowFilter(!showFilter)}
                className="w-full flex justify-between items-center bg-[#18181b] p-3 rounded-lg border border-zinc-800 text-sm text-zinc-300 hover:border-teal-600 transition"
            >
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-teal-500"/>
                    <span className="font-medium">
                      {filterTrip === 'all' ? 'ทุกรายการ' : filterTrip === 'no_trip' ? 'ชีวิตประจำวัน' : `ทริป: ${getTripName(filterTrip)}`} 
                      {' '}| {new Date(filterStart).toLocaleDateString('th-TH', {day:'numeric', month:'short'})} - ...
                    </span>
                </div>
                <ChevronRight size={16} className={`transform transition ${showFilter ? 'rotate-90' : ''}`}/>
            </button>
            
            {showFilter && (
                <div className="mt-2 p-4 bg-[#18181b] rounded-lg border border-zinc-800 animate-in fade-in slide-in-from-top-2 space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-2 font-medium flex items-center gap-1"><Plane size={14}/> เลือกดูข้อมูลของ</label>
                      <select 
                        value={filterTrip} 
                        onChange={(e) => setFilterTrip(e.target.value)} 
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition"
                      >
                        <option value="all">🌐 รายการทั้งหมด</option>
                        <option value="no_trip">🏠 ชีวิตประจำวัน (ไม่เข้าทริป)</option>
                        <option disabled>──────────</option>
                        {trips.map(t => (
                          <option key={t.id} value={t.id}>✈️ {t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="border-t border-zinc-800"></div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                          <label className="text-xs text-zinc-400 block mb-2 font-medium">ตั้งแต่วันที่</label>
                          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs text-zinc-400 block mb-2 font-medium">ถึงวันที่</label>
                          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" />
                      </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- สรุปยอดเงิน --- */}
        <div className="bg-[#115e59] rounded-2xl p-6 mb-6 text-center shadow-lg border border-[#134e4a]">
           <p className="text-teal-200 text-sm font-medium mb-1">รายจ่ายรวม (ตามตัวกรอง)</p>
           <h2 className="text-4xl font-extrabold text-white">฿{totalExpense.toLocaleString()}</h2>
        </div>

        {/* --- กราฟวงกลม --- */}
        <div className="bg-[#18181b] rounded-2xl p-4 border border-zinc-800 shadow-sm min-h-[300px] flex flex-col items-center justify-center">
          {chartData.length > 0 ? (
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none" // ลบเส้นขอบขาวๆ ออก
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                     verticalAlign="bottom" 
                     height={36} 
                     iconType="circle"
                     formatter={(value) => <span className="text-zinc-400 text-xs ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-zinc-500 text-sm py-10">
                ไม่มีข้อมูลรายจ่ายในช่วงเวลานี้
            </div>
          )}
        </div>

        {/* --- รายละเอียดตาราง --- */}
        {chartData.length > 0 && (
           <div className="mt-6 space-y-3">
              <h3 className="text-zinc-400 text-sm font-bold">รายละเอียด</h3>
              {chartData.map((item, index) => (
                 <div key={index} className="flex justify-between items-center bg-[#18181b] p-3 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                       <span className="text-zinc-200 text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                       <div className="text-zinc-100 font-bold text-sm">฿{item.value.toLocaleString()}</div>
                       <div className="text-zinc-500 text-xs">{((item.value / totalExpense) * 100).toFixed(1)}%</div>
                    </div>
                 </div>
              ))}
           </div>
        )}

      </div>
    </div>
  );
}
"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  collection, addDoc, query, onSnapshot, orderBy,
  deleteDoc, doc, serverTimestamp, updateDoc, Timestamp
} from "firebase/firestore";
import {
  Trash2, Plane, Plus, Clock, TrendingDown, Edit2, X, Save,
  AlertTriangle, ShoppingBag, Home, Briefcase, Gift, Layers,
  MapPin, Wallet, List, BarChart3, Calendar, ChevronRight,
  Target, Zap, ExternalLink
} from "lucide-react";

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const projectTypes = [
    { id: 'trip', label: 'ท่องเที่ยว', icon: Plane, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'shopping', label: 'ช้อปปิ้ง', icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
    { id: 'home', label: 'แต่งบ้าน', icon: Home, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
    { id: 'event', label: 'อีเวนต์/งาน', icon: Gift, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
    { id: 'general', label: 'ทั่วไป', icon: Layers, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200' },
  ];

  // State
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("trip");
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDailyLimit, setEditDailyLimit] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list"); // "list" | "timeline"
  const [timelineTrip, setTimelineTrip] = useState(null);


  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const qProjects = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, () => setIsLoading(false));
    const qTrans = query(collection(db, `users/${user.uid}/transactions`));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProjects(); unsubTrans(); };
  }, [user]);

  // Actions
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/trips`), {
        name: name.trim(),
        budget: Number(budget) || 0,
        dailyLimit: Number(dailyLimit) || 0,
        startDate: startDate ? Timestamp.fromDate(new Date(startDate)) : null,
        endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
        type: selectedType,
        status: "active",
        createdAt: serverTimestamp(),
      });
      setName(""); setBudget(""); setDailyLimit(""); setStartDate(""); setEndDate(""); setSelectedType("trip");
    } catch (error) {
      console.error("Error adding project:", error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("⚠️ ยืนยันที่จะลบรายการนี้?")) {
      await deleteDoc(doc(db, `users/${user.uid}/trips`, id));
    }
  };

  const toggleStatus = async (project) => {
    const newStatus = project.status === 'completed' ? 'active' : 'completed';
    await updateDoc(doc(db, `users/${user.uid}/trips`, project.id), {
      status: newStatus,
      completedAt: newStatus === 'completed' ? serverTimestamp() : null
    });
  };

  const startEdit = (project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditBudget(project.budget?.toString() || "0");
    setEditDailyLimit(project.dailyLimit?.toString() || "0");
    setEditStartDate(project.startDate ? project.startDate.toDate().toISOString().split('T')[0] : "");
    setEditEndDate(project.endDate ? project.endDate.toDate().toISOString().split('T')[0] : "");
  };


  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, `users/${user.uid}/trips`, id), {
      name: editName.trim(),
      budget: Number(editBudget) || 0,
      dailyLimit: Number(editDailyLimit) || 0,
      startDate: editStartDate ? Timestamp.fromDate(new Date(editStartDate)) : null,
      endDate: editEndDate ? Timestamp.fromDate(new Date(editEndDate)) : null,
    });
    setEditingId(null);

  };

  // Helpers
  const getStats = (id, budget) => {
    const safeBudget = Number(budget) || 0;
    const items = transactions.filter(t => t.tripId === id && t.type === 'expense');
    const totalSpent = items.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const percent = safeBudget > 0 ? (totalSpent / safeBudget) * 100 : 0;
    const remaining = safeBudget - totalSpent;
    return { totalSpent, percent, remaining, safeBudget, count: items.length };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch { return ""; }
  };

  const displayProjects = projects.filter(t => (t.status || 'active') === activeTab);

  // ===== Feature 6 — Timeline Data =====
  const timelineData = useMemo(() => {
    if (!timelineTrip) return [];
    const tripTxns = transactions.filter(t => t.tripId === timelineTrip.id && t.type === 'expense' && t.date);
    const dayMap = {};
    tripTxns.forEach(t => {
      try {
        const d = t.date.toDate().toISOString().split('T')[0];
        if (!dayMap[d]) dayMap[d] = { date: d, total: 0, count: 0, txns: [] };
        dayMap[d].total += Number(t.amount) || 0;
        dayMap[d].count++;
        dayMap[d].txns.push(t);
      } catch { }
    });
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineTrip, transactions]);

  const maxDayTotal = useMemo(() =>
    timelineData.reduce((m, d) => Math.max(m, d.total), 0),
    [timelineData]
  );

  const dailyLimitForTimeline = timelineTrip?.dailyLimit || 0;

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 text-[#1A1A1A] bg-[#F7F6F3]">


      {/* Header */}
      <div className="bg-white/95 p-4 text-center border-b border-[#EBEBEB] sticky top-0 z-50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-[20px] font-bold flex items-center gap-2 text-[#1A1A1A] tracking-tight">
            <span>จัดการ<span className="text-[#E8622A]">โครงการ</span></span>
          </h1>

          {/* Feature 6 — View Toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => { setViewMode("list"); setTimelineTrip(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${viewMode === "list" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
                }`}
            >
              <List size={14} /> รายการ
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${viewMode === "timeline" ? "bg-[#E8622A] text-white shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
                }`}
            >
              <BarChart3 size={14} /> Timeline
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">

        {/* ===== LIST VIEW ===== */}
        {viewMode === "list" && (
          <>
            {/* Add Form */}
            <div className="bg-white p-5 rounded-2xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] mb-6">
              <h2 className="text-[15px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={16} className="text-[#E8622A]" /> สร้างรายการใหม่
              </h2>

              <form onSubmit={handleAddProject} className="space-y-4">
                {/* Type Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {projectTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button key={type.id} type="button" onClick={() => setSelectedType(type.id)}
                        className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-xl border transition-all ${isSelected ? `bg-white ${type.border} ${type.color} shadow-sm` : 'bg-gray-50 border-gray-200 text-[#6B6B6B] hover:bg-gray-100'
                          }`}
                      >
                        <Icon size={20} className="mb-1" />
                        <span className="text-[10px] font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-[#6B6B6B]"><MapPin size={18} /></span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="ชื่อโครงการ (เช่น เที่ยวเชียงใหม่)"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition placeholder:text-gray-400"
                    required
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-[#6B6B6B]"><Calendar size={18} /></span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition"
                    />
                    <label className="absolute left-10 -top-2 px-1 bg-white text-[10px] text-gray-500">วันที่เริ่ม</label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-[#6B6B6B]"><Calendar size={18} /></span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition"
                    />
                    <label className="absolute left-10 -top-2 px-1 bg-white text-[10px] text-gray-500">วันที่จบ</label>
                  </div>
                </div>

                {/* Budget + Daily Limit */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-[#6B6B6B]"><Wallet size={18} /></span>
                    <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                      placeholder="งบรวม (บาท)"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition placeholder:text-gray-400"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-[#6B6B6B]"><Zap size={18} /></span>
                    <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}
                      placeholder="วงเงิน/วัน (บาท)"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition placeholder:text-gray-400"
                    />
                  </div>
                </div>



                <button type="submit" className="w-full bg-[#E8622A] hover:bg-[#d65722] text-white py-3 rounded-xl font-bold transition shadow-sm">
                  + สร้างโครงการ
                </button>
              </form>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4 border border-gray-200">
              <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B]'}`}>
                🟢 กำลังดำเนินการ
              </button>
              <button onClick={() => setActiveTab('completed')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B]'}`}>
                ✅ เสร็จสิ้นแล้ว
              </button>
            </div>

            {/* List */}
            {!isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayProjects.length === 0 ? (
                  <div className="text-center py-12 text-[#6B6B6B] bg-white rounded-xl border border-[#EBEBEB] border-dashed col-span-2">
                    <Layers size={40} className="mx-auto mb-2 opacity-20" />
                    <p>ไม่มีรายการ</p>
                  </div>
                ) : (
                  displayProjects.map((item) => {
                    const stats = getStats(item.id, item.budget);
                    const isEditing = editingId === item.id;
                    const isOverBudget = stats.percent > 100;
                    const typeConfig = projectTypes.find(t => t.id === (item.type || 'trip')) || projectTypes[4];
                    const TypeIcon = typeConfig.icon;

                    // Daily limit check for today
                    const today = new Date().toISOString().split('T')[0];
                    const todaySpent = transactions
                      .filter(t => t.tripId === item.id && t.type === 'expense' && t.date)
                      .filter(t => { try { return t.date.toDate().toISOString().split('T')[0] === today; } catch { return false; } })
                      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
                    const dailyLimitVal = Number(item.dailyLimit) || 0;
                    const dailyExceeded = dailyLimitVal > 0 && todaySpent > dailyLimitVal;

                    return (
                      <div key={item.id} className="bg-white p-5 rounded-2xl border border-[#EBEBEB] transition hover:border-[#E8622A] group relative overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'completed' ? 'bg-gray-300' : typeConfig.bg.replace('50', '400')}`}></div>

                        <div className="flex justify-between items-start mb-3 pl-2">
                          <div className="flex-1 mr-2">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[#1A1A1A] text-sm" placeholder="ชื่อโครงการ" />
                                <div className="grid grid-cols-2 gap-2">
                                  <input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[#1A1A1A] text-sm" placeholder="งบรวม" />
                                  <input type="number" value={editDailyLimit} onChange={(e) => setEditDailyLimit(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[#1A1A1A] text-sm" placeholder="วงเงิน/วัน" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="relative">
                                    <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[#1A1A1A] text-[10px]" />
                                    <label className="absolute left-1 -top-2 px-1 bg-white text-[8px] text-gray-500">เริ่ม</label>
                                  </div>
                                  <div className="relative">
                                    <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[#1A1A1A] text-[10px]" />
                                    <label className="absolute left-1 -top-2 px-1 bg-white text-[8px] text-gray-500">จบ</label>
                                  </div>
                                </div>

                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeConfig.color} ${typeConfig.bg} ${typeConfig.border} flex items-center gap-1 font-bold`}>
                                    <TypeIcon size={10} /> {typeConfig.label}
                                  </span>
                                  {item.status === 'completed' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold">จบแล้ว</span>}
                                  {/* Feature 2 — Daily Limit Badge */}
                                  {dailyLimitVal > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${dailyExceeded
                                        ? 'bg-red-50 text-red-500 border-red-200'
                                        : 'bg-gray-50 text-gray-500 border-gray-200'
                                      }`}>
                                      <Zap size={9} /> ฿{Number(dailyLimitVal).toLocaleString()}/วัน
                                      {dailyExceeded && " 🔴"}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-lg sm:text-xl text-[#1A1A1A] flex items-center gap-2">
                                  {item.name}
                                  {isOverBudget && stats.safeBudget > 0 && <AlertTriangle size={14} className="text-red-500" />}
                                </h3>
                                <p className="text-xs text-[#6B6B6B] flex items-center gap-1 mt-1">
                                  <Clock size={12} /> {formatDate(item.createdAt)} • {stats.count} รายการ
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(item.id)} className="p-2 bg-[#E8622A] rounded text-white"><Save size={16} /></button>
                                <button onClick={() => setEditingId(null)} className="p-2 border border-gray-200 rounded text-gray-500"><X size={16} /></button>
                              </>
                            ) : (
                              <>
                                {/* Detail Page Button */}
                                <button
                                  onClick={() => router.push(`/trips/detail?id=${item.id}`)}
                                  className="p-2 border border-[#E8622A] rounded text-[#E8622A] bg-white hover:bg-[#FFF4EF] transition"
                                  title="ดูรายละเอียด"
                                >
                                  <ExternalLink size={16} />
                                </button>
                                {/* Feature 6 — Timeline Button */}
                                <button
                                  onClick={() => { setTimelineTrip(item); setViewMode("timeline"); }}
                                  className="p-2 border border-gray-200 rounded text-gray-500 hover:text-[#E8622A] hover:border-[#E8622A] transition bg-white"
                                  title="ดู Timeline"
                                >
                                  <BarChart3 size={16} />
                                </button>
                                <button onClick={() => startEdit(item)} className="p-2 border border-gray-200 rounded text-gray-500 hover:text-blue-500 bg-white"><Edit2 size={16} /></button>
                                <button onClick={() => toggleStatus(item)} className="p-2 border border-gray-200 rounded text-green-500 bg-white"><Layers size={16} /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 border border-gray-200 rounded text-gray-500 hover:text-red-500 bg-white"><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Progress */}
                        {!isEditing && (
                          <div className="pl-2 space-y-2">
                            {/* Budget Progress */}
                            {stats.safeBudget > 0 && (
                              <>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-[#6B6B6B] text-xs">ใช้ไป <span className="text-[#1A1A1A] font-bold text-sm">฿{stats.totalSpent.toLocaleString()}</span></span>
                                  <span className="text-[#6B6B6B] text-xs">งบ <span className="text-gray-500">฿{stats.safeBudget.toLocaleString()}</span></span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                  <div className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : stats.percent >= 80 ? 'bg-orange-400' : 'bg-[#E8622A]'}`}
                                    style={{ width: `${Math.min(stats.percent, 100)}%` }}>
                                  </div>
                                </div>
                                {/* Feature 1 — Budget Alert inline */}
                                {stats.percent >= 80 && (
                                  <div className={`text-xs flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold ${isOverBudget
                                      ? 'bg-red-50 text-red-500 border border-red-200'
                                      : 'bg-orange-50 text-orange-500 border border-orange-200'
                                    }`}>
                                    <AlertTriangle size={12} />
                                    {isOverBudget
                                      ? `⚠️ เกินงบ ฿${Math.abs(stats.remaining).toLocaleString()}`
                                      : `ใช้ไปแล้ว ${stats.percent.toFixed(0)}% ของงบ`}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Feature 2 — Daily Limit Progress */}
                            {dailyLimitVal > 0 && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-[#6B6B6B] flex items-center gap-1"><Zap size={10} /> วันนี้ใช้</span>
                                  <span className={`font-bold ${dailyExceeded ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
                                    ฿{todaySpent.toLocaleString()} / ฿{dailyLimitVal.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                  <div
                                    className={`h-full rounded-full transition-all ${dailyExceeded ? 'bg-red-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min((todaySpent / dailyLimitVal) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* ===== TIMELINE VIEW (Feature 6) ===== */}
        {viewMode === "timeline" && (
          <div>
            {/* Trip Selector */}
            <div className="mb-4 bg-white p-4 rounded-2xl border border-[#EBEBEB] shadow-sm">
              <label className="text-sm text-[#1A1A1A] font-bold mb-2 block">เลือกทริปที่ต้องการดู Timeline</label>
              <select
                value={timelineTrip?.id || ""}
                onChange={e => {
                  const trip = projects.find(p => p.id === e.target.value);
                  setTimelineTrip(trip || null);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[#1A1A1A] focus:outline-none focus:border-[#E8622A]"
              >
                <option value="">— เลือกทริป —</option>
                {projects.map(p => <option key={p.id} value={p.id}>✈️ {p.name}</option>)}
              </select>
            </div>

            {!timelineTrip ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-[#EBEBEB]">
                <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-[#6B6B6B]">เลือกทริปเพื่อดู Timeline</p>
              </div>
            ) : timelineData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-[#EBEBEB]">
                <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-[#6B6B6B]">ไม่พบรายจ่ายในทริปนี้</p>
              </div>
            ) : (
              <>
                {/* Trip Summary */}
                <div className="bg-[#FFF4EF] rounded-2xl p-5 border border-[#fbdcd0] mb-4 shadow-sm">
                  <h2 className="text-[#1A1A1A] font-black text-lg sm:text-xl lg:text-2xl">✈️ {timelineTrip.name}</h2>
                  <div className="flex gap-6 mt-3">
                    <div>
                      <p className="text-xs text-[#6B6B6B]">รวมทั้งหมด</p>
                      <p className="text-[#E8622A] font-black text-lg">฿{timelineData.reduce((s, d) => s + d.total, 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B]">วันที่ใช้จ่าย</p>
                      <p className="text-[#1A1A1A] font-bold text-lg">{timelineData.length} วัน</p>
                    </div>
                    {dailyLimitForTimeline > 0 && (
                      <div>
                        <p className="text-xs text-[#6B6B6B]">วงเงิน/วัน</p>
                        <p className="text-indigo-500 font-bold text-lg">฿{Number(dailyLimitForTimeline).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Horizontal Scroll */}
                <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 overflow-hidden shadow-sm">
                  <p className="text-sm text-[#1A1A1A] font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#E8622A]" />
                    ยอดรายจ่ายแต่ละวัน
                    {dailyLimitForTimeline > 0 && (
                      <span className="text-indigo-500 text-xs font-normal">• เส้นสีม่วง = วงเงิน/วัน</span>
                    )}
                  </p>

                  <div className="overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex gap-4 min-w-max">
                      {timelineData.map((day, idx) => {
                        const heightPercent = maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
                        const isMax = day.total === maxDayTotal;
                        const overDailyLimit = dailyLimitForTimeline > 0 && day.total > dailyLimitForTimeline;
                        const dateObj = new Date(day.date + 'T00:00:00');
                        const label = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                        const weekDay = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });

                        return (
                          <div key={day.date} className="flex flex-col items-center" style={{ minWidth: '64px' }}>
                            {/* Amount Label */}
                            <div className={`text-[10px] font-black mb-2 ${isMax ? 'text-orange-500' : overDailyLimit ? 'text-red-500' : 'text-[#6B6B6B]'}`}>
                              ฿{day.total >= 1000 ? (day.total / 1000).toFixed(1) + 'K' : day.total.toLocaleString()}
                            </div>

                            {/* Bar */}
                            <div className="w-12 h-32 flex flex-col justify-end relative bg-gray-50 rounded-t-lg">
                              {/* Daily limit line */}
                              {dailyLimitForTimeline > 0 && maxDayTotal > 0 && (
                                <div
                                  className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-500 z-10"
                                  style={{ bottom: `${(dailyLimitForTimeline / maxDayTotal) * 128}px` }}
                                />
                              )}
                              <div
                                className={`w-full rounded-t-lg transition-all duration-500 ${isMax
                                    ? 'bg-orange-400 shadow-sm'
                                    : overDailyLimit
                                      ? 'bg-red-400'
                                      : 'bg-[#E8622A]'
                                  }`}
                                style={{ height: `${Math.max(heightPercent, 4)}%`, opacity: 0.8 + (heightPercent / 100) * 0.2 }}
                              />
                            </div>

                            {/* Day Label */}
                            <div className="text-center mt-2">
                              <div className={`text-[10px] font-bold ${overDailyLimit ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
                                {weekDay}
                                {overDailyLimit && <span className="ml-0.5 text-red-500">●</span>}
                              </div>
                              <div className="text-[9px] text-[#6B6B6B] mt-0.5">{label}</div>
                            </div>

                            {/* Count badge */}
                            <div className="text-[9px] bg-gray-100 text-[#6B6B6B] px-2 py-0.5 rounded-full mt-2 font-medium">
                              {day.count} รายการ
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-orange-400" />
                      <span className="text-xs text-[#6B6B6B]">วันใช้มากสุด</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#E8622A]" />
                      <span className="text-xs text-[#6B6B6B]">ปกติ</span>
                    </div>
                    {dailyLimitForTimeline > 0 && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-red-400" />
                          <span className="text-xs text-[#6B6B6B]">เกินวงเงิน/วัน</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-0 border-t-2 border-dashed border-indigo-500" />
                          <span className="text-xs text-[#6B6B6B]">วงเงิน/วัน</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Daily Breakdown List */}
                <div className="mt-4 space-y-2">
                  {timelineData.map((day) => {
                    const overDailyLimit = dailyLimitForTimeline > 0 && day.total > dailyLimitForTimeline;
                    const dateObj = new Date(day.date + 'T00:00:00');
                    return (
                      <div key={day.date} className={`bg-white rounded-xl p-4 border flex items-center justify-between transition shadow-sm ${overDailyLimit ? 'border-red-200' : 'border-[#EBEBEB]'
                        }`}>
                        <div className="flex items-center gap-3">
                          {overDailyLimit && <span className="text-red-500 text-xs">🔴</span>}
                          <div>
                            <p className="text-sm font-bold text-[#1A1A1A]">
                              {dateObj.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-[#6B6B6B] mt-0.5">{day.count} รายการ</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${overDailyLimit ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
                            ฿{day.total.toLocaleString()}
                          </p>
                          {overDailyLimit && dailyLimitForTimeline > 0 && (
                            <p className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded inline-block mt-1">เกิน ฿{(day.total - dailyLimitForTimeline).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
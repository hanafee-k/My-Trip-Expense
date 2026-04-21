"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { 
  collection, addDoc, query, onSnapshot, orderBy, 
  deleteDoc, doc, serverTimestamp, updateDoc 
} from "firebase/firestore";
import { 
  Trash2, Plane, Plus, Clock, TrendingDown, Edit2, X, Save,
  AlertTriangle, ShoppingBag, Home, Briefcase, Gift, Layers,
  MapPin, Wallet, List, BarChart3, Calendar, ChevronRight, 
  Target, Zap
} from "lucide-react";

export default function ProjectsPage() {
  const { user } = useAuth();
  
  const projectTypes = [
    { id: 'trip', label: 'ท่องเที่ยว', icon: Plane, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
    { id: 'shopping', label: 'ช้อปปิ้ง', icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
    { id: 'home', label: 'แต่งบ้าน', icon: Home, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { id: 'event', label: 'อีเวนต์/งาน', icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { id: 'general', label: 'ทั่วไป', icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  ];

  // State
  const [name, setName] = useState("");
  const [budget, setBudget] = useState(""); 
  const [dailyLimit, setDailyLimit] = useState("");
  const [selectedType, setSelectedType] = useState("trip");
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]); 
  const [activeTab, setActiveTab] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDailyLimit, setEditDailyLimit] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Feature 6 — View Toggle
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
        type: selectedType,
        status: "active",
        createdAt: serverTimestamp(),
      });
      setName(""); setBudget(""); setDailyLimit(""); setSelectedType("trip");
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
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, `users/${user.uid}/trips`, id), {
      name: editName.trim(),
      budget: Number(editBudget) || 0,
      dailyLimit: Number(editDailyLimit) || 0,
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
      } catch {}
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 font-sans">
      
      {/* Header */}
      <div className="bg-zinc-900 p-4 text-center border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-sm bg-zinc-900/95">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2 text-white tracking-wide">
            <span className="text-2xl">✈️</span>
            <span>จัดการ<span className="text-teal-500">โครงการ</span></span>
          </h1>
          {/* Feature 6 — View Toggle */}
          <div className="flex gap-1 bg-zinc-800 p-1 rounded-xl border border-zinc-700">
            <button
              onClick={() => { setViewMode("list"); setTimelineTrip(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === "list" ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <List size={14} /> รายการ
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === "timeline" ? "bg-teal-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <BarChart3 size={14} /> Timeline
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-6 px-4 lg:px-8">

        {/* ===== LIST VIEW ===== */}
        {viewMode === "list" && (
          <>
            {/* Add Form */}
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-lg mb-6">
              <h2 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
                <Plus size={16} className="text-teal-500"/> สร้างรายการใหม่
              </h2>
              <form onSubmit={handleAddProject} className="space-y-4">
                {/* Type Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {projectTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button key={type.id} type="button" onClick={() => setSelectedType(type.id)}
                        className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-xl border transition-all ${
                          isSelected ? `bg-zinc-800 ${type.border} ${type.color}` : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                        }`}
                      >
                        <Icon size={20} className="mb-1" />
                        <span className="text-[10px] font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-zinc-500"><MapPin size={18}/></span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="ชื่อโครงการ (เช่น เที่ยวเชียงใหม่)"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                    required
                  />
                </div>

                {/* Budget + Daily Limit */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-zinc-500"><Wallet size={18}/></span>
                    <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                      placeholder="งบรวม (บาท)"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-zinc-500"><Zap size={18}/></span>
                    <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}
                      placeholder="วงเงิน/วัน (บาท)"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold transition shadow-lg">
                  + สร้างโครงการ
                </button>
              </form>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-900 p-1 rounded-xl mb-4 border border-zinc-800">
              <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
                🟢 กำลังดำเนินการ
              </button>
              <button onClick={() => setActiveTab('completed')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
                ✅ เสร็จสิ้นแล้ว
              </button>
            </div>

            {/* List */}
            {!isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayProjects.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed col-span-2">
                    <Layers size={40} className="mx-auto mb-2 opacity-20"/>
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
                      <div key={item.id} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 transition hover:border-zinc-700 group relative overflow-hidden shadow-lg">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'completed' ? 'bg-zinc-600' : typeConfig.bg.replace('/10', '')}`}></div>

                        <div className="flex justify-between items-start mb-3 pl-2">
                          <div className="flex-1 mr-2">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-sm" placeholder="ชื่อโครงการ" />
                                <div className="grid grid-cols-2 gap-2">
                                  <input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-sm" placeholder="งบรวม" />
                                  <input type="number" value={editDailyLimit} onChange={(e) => setEditDailyLimit(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-sm" placeholder="วงเงิน/วัน" />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeConfig.color} ${typeConfig.bg} ${typeConfig.border} flex items-center gap-1`}>
                                    <TypeIcon size={10} /> {typeConfig.label}
                                  </span>
                                  {item.status === 'completed' && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">จบแล้ว</span>}
                                  {/* Feature 2 — Daily Limit Badge */}
                                  {dailyLimitVal > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${
                                      dailyExceeded
                                        ? 'bg-red-950/50 text-red-400 border-red-800/50'
                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                    }`}>
                                      <Zap size={9} /> ฿{Number(dailyLimitVal).toLocaleString()}/วัน
                                      {dailyExceeded && " 🔴"}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                  {item.name}
                                  {isOverBudget && stats.safeBudget > 0 && <AlertTriangle size={14} className="text-red-500" />}
                                </h3>
                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                  <Clock size={12}/> {formatDate(item.createdAt)} • {stats.count} รายการ
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(item.id)} className="p-2 bg-teal-600 rounded text-white"><Save size={16}/></button>
                                <button onClick={() => setEditingId(null)} className="p-2 border border-zinc-700 rounded text-zinc-400"><X size={16}/></button>
                              </>
                            ) : (
                              <>
                                {/* Feature 6 — Timeline Button */}
                                <button
                                  onClick={() => { setTimelineTrip(item); setViewMode("timeline"); }}
                                  className="p-2 border border-zinc-800 rounded text-zinc-500 hover:text-teal-400 hover:border-teal-700 transition"
                                  title="ดู Timeline"
                                >
                                  <BarChart3 size={16}/>
                                </button>
                                <button onClick={() => startEdit(item)} className="p-2 border border-zinc-800 rounded text-zinc-500 hover:text-teal-400"><Edit2 size={16}/></button>
                                <button onClick={() => toggleStatus(item)} className="p-2 border border-zinc-800 rounded text-teal-500"><Layers size={16}/></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 border border-zinc-800 rounded text-zinc-600 hover:text-red-500"><Trash2 size={16}/></button>
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
                                  <span className="text-zinc-400 text-xs">ใช้ไป <span className="text-white font-bold text-sm">฿{stats.totalSpent.toLocaleString()}</span></span>
                                  <span className="text-zinc-500 text-xs">งบ <span className="text-zinc-300">฿{stats.safeBudget.toLocaleString()}</span></span>
                                </div>
                                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                                  <div className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : stats.percent >= 80 ? 'bg-amber-500' : 'bg-teal-500'}`}
                                    style={{ width: `${Math.min(stats.percent, 100)}%` }}>
                                  </div>
                                </div>
                                {/* Feature 1 — Budget Alert inline */}
                                {stats.percent >= 80 && (
                                  <div className={`text-xs flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold ${
                                    isOverBudget
                                      ? 'bg-red-950/50 text-red-400 border border-red-800/50'
                                      : 'bg-amber-950/50 text-amber-400 border border-amber-800/50'
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
                                  <span className="text-zinc-500 flex items-center gap-1"><Zap size={10} /> วันนี้ใช้</span>
                                  <span className={`font-bold ${dailyExceeded ? 'text-red-400' : 'text-zinc-300'}`}>
                                    ฿{todaySpent.toLocaleString()} / ฿{dailyLimitVal.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
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
            <div className="mb-4">
              <label className="text-xs text-zinc-400 font-bold mb-2 block">เลือกทริปที่ต้องการดู Timeline</label>
              <select
                value={timelineTrip?.id || ""}
                onChange={e => {
                  const trip = projects.find(p => p.id === e.target.value);
                  setTimelineTrip(trip || null);
                }}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">— เลือกทริป —</option>
                {projects.map(p => <option key={p.id} value={p.id}>✈️ {p.name}</option>)}
              </select>
            </div>

            {!timelineTrip ? (
              <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-dashed border-zinc-800">
                <BarChart3 size={40} className="mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-500">เลือกทริปเพื่อดู Timeline</p>
              </div>
            ) : timelineData.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-dashed border-zinc-800">
                <Calendar size={40} className="mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-500">ไม่พบรายจ่ายในทริปนี้</p>
              </div>
            ) : (
              <>
                {/* Trip Summary */}
                <div className="bg-gradient-to-r from-teal-950 to-zinc-900 rounded-2xl p-4 border border-teal-800 mb-4">
                  <h2 className="text-white font-black text-lg">✈️ {timelineTrip.name}</h2>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <p className="text-xs text-zinc-400">รวมทั้งหมด</p>
                      <p className="text-teal-400 font-black">฿{timelineData.reduce((s, d) => s + d.total, 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">วันที่ใช้จ่าย</p>
                      <p className="text-white font-bold">{timelineData.length} วัน</p>
                    </div>
                    {dailyLimitForTimeline > 0 && (
                      <div>
                        <p className="text-xs text-zinc-400">วงเงิน/วัน</p>
                        <p className="text-indigo-400 font-bold">฿{Number(dailyLimitForTimeline).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Horizontal Scroll */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
                  <p className="text-xs text-zinc-400 font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={14} className="text-teal-500" />
                    ยอดรายจ่ายแต่ละวัน
                    {dailyLimitForTimeline > 0 && (
                      <span className="text-indigo-400">• เส้นสีม่วง = วงเงิน/วัน</span>
                    )}
                  </p>

                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-3 min-w-max">
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
                            <div className={`text-[10px] font-black mb-1 ${isMax ? 'text-amber-400' : overDailyLimit ? 'text-red-400' : 'text-zinc-400'}`}>
                              ฿{day.total >= 1000 ? (day.total / 1000).toFixed(1) + 'K' : day.total.toLocaleString()}
                            </div>

                            {/* Bar */}
                            <div className="w-12 h-32 flex flex-col justify-end relative">
                              {/* Daily limit line */}
                              {dailyLimitForTimeline > 0 && maxDayTotal > 0 && (
                                <div
                                  className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-500/60 z-10"
                                  style={{ bottom: `${(dailyLimitForTimeline / maxDayTotal) * 128}px` }}
                                />
                              )}
                              <div
                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                  isMax
                                    ? 'bg-amber-500 shadow-lg shadow-amber-900/50'
                                    : overDailyLimit
                                    ? 'bg-red-500/80'
                                    : 'bg-teal-600'
                                }`}
                                style={{ height: `${Math.max(heightPercent, 4)}%`, opacity: 0.7 + (heightPercent / 100) * 0.3 }}
                              />
                            </div>

                            {/* Day Label */}
                            <div className="text-center mt-1">
                              <div className={`text-[10px] font-bold ${overDailyLimit ? 'text-red-400' : 'text-zinc-400'}`}>
                                {weekDay}
                                {overDailyLimit && <span className="ml-0.5 text-red-500">●</span>}
                              </div>
                              <div className="text-[9px] text-zinc-600">{label}</div>
                            </div>

                            {/* Count badge */}
                            <div className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full mt-1 border border-zinc-700">
                              {day.count} รายการ
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-amber-500" />
                      <span className="text-[10px] text-zinc-400">วันใช้มากสุด</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-teal-600" />
                      <span className="text-[10px] text-zinc-400">ปกติ</span>
                    </div>
                    {dailyLimitForTimeline > 0 && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                          <span className="text-[10px] text-zinc-400">เกินวงเงิน/วัน</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-0 border-t-2 border-dashed border-indigo-500" />
                          <span className="text-[10px] text-zinc-400">วงเงิน/วัน</span>
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
                      <div key={day.date} className={`bg-zinc-900 rounded-xl p-3 border flex items-center justify-between transition ${
                        overDailyLimit ? 'border-red-800/60' : 'border-zinc-800'
                      }`}>
                        <div className="flex items-center gap-3">
                          {overDailyLimit && <span className="text-red-500 text-xs">🔴</span>}
                          <div>
                            <p className="text-sm font-bold text-white">
                              {dateObj.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-xs text-zinc-500">{day.count} รายการ</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${overDailyLimit ? 'text-red-400' : 'text-white'}`}>
                            ฿{day.total.toLocaleString()}
                          </p>
                          {overDailyLimit && dailyLimitForTimeline > 0 && (
                            <p className="text-[10px] text-red-500">เกิน ฿{(day.total - dailyLimitForTimeline).toLocaleString()}</p>
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
"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  updateDoc 
} from "firebase/firestore";
import { 
  Trash2, 
  Plane, 
  Plus, 
  Clock,
  TrendingUp,
  TrendingDown,
  Edit2,
  X,
  Save,
  AlertTriangle,
  ShoppingBag,
  Home,
  Briefcase,
  Gift,
  Layers,
  MapPin,
  Wallet
} from "lucide-react";

export default function ProjectsPage() {
  const { user } = useAuth();
  
  // --- Config ประเภทของโปรเจกต์ ---
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
  const [selectedType, setSelectedType] = useState("trip"); // Default เป็น trip

  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]); 
  const [activeTab, setActiveTab] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Data (เหมือนเดิม)
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const qProjects = query(
      collection(db, `users/${user.uid}/trips`), // ใช้ Collection เดิมเพื่อความต่อเนื่อง
      orderBy("createdAt", "desc")
    );
    
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => setIsLoading(false));

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
        type: selectedType, // บันทึกประเภทลงไป
        status: "active",
        createdAt: serverTimestamp(),
      });
      setName("");
      setBudget("");
      setSelectedType("trip"); // Reset กลับเป็นค่า default
    } catch (error) {
      console.error("Error adding project:", error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("⚠️ ยืนยันที่จะลบรายการนี้? (บันทึกรายจ่ายข้างในจะหายไปด้วย)")) {
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
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, `users/${user.uid}/trips`, id), {
      name: editName.trim(),
      budget: Number(editBudget) || 0
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 font-sans">
      
      {/* Header */}
      <div className="bg-zinc-900 p-4 text-center border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-sm bg-zinc-900/95">
        <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-white tracking-wide">
          <span className="text-2xl"></span>
          <span>จัดการ<span className="text-teal-500">โครงการ</span></span>
        </h1>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* Add Form */}
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-lg mb-6">
          <h2 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
            <Plus size={16} className="text-teal-500"/> สร้างรายการใหม่
          </h2>
          
          <form onSubmit={handleAddProject} className="space-y-4">
            
            {/* Type Selector (เลือกประเภท) */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {projectTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-xl border transition-all ${
                      isSelected 
                        ? `bg-zinc-800 ${type.border} ${type.color}` 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
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
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อโครงการ (เช่น แต่งห้องนอน)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                  required
                />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3.5 text-zinc-500"><Wallet size={18}/></span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="ตั้งงบ (บาท)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition placeholder:text-zinc-600"
                />
              </div>
              <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-6 rounded-xl font-bold transition shadow-lg">
                เพิ่ม
              </button>
            </div>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-900 p-1 rounded-xl mb-4 border border-zinc-800">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
             กำลังดำเนินการ
          </button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
             เสร็จสิ้นแล้ว
          </button>
        </div>

        {/* List */}
        {!isLoading && (
          <div className="space-y-4">
            {displayProjects.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
                <Layers size={40} className="mx-auto mb-2 opacity-20"/>
                <p>ไม่มีรายการ</p>
              </div>
            ) : (
              displayProjects.map((item) => {
                const stats = getStats(item.id, item.budget);
                const isEditing = editingId === item.id;
                const isOverBudget = stats.percent > 100;
                
                // หา config ของ type นั้นๆ (ถ้าหาไม่เจอให้ใช้ General)
                const typeConfig = projectTypes.find(t => t.id === (item.type || 'trip')) || projectTypes[4];
                const TypeIcon = typeConfig.icon;

                return (
                  <div key={item.id} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 transition hover:border-zinc-700 group relative overflow-hidden shadow-lg">
                    {/* Color Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'completed' ? 'bg-zinc-600' : typeConfig.bg.replace('/10', '')}`}></div>

                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex-1 mr-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white" />
                            <input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white" />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeConfig.color} ${typeConfig.bg} ${typeConfig.border} flex items-center gap-1`}>
                                    <TypeIcon size={10} /> {typeConfig.label}
                                </span>
                                {item.status === 'completed' && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">จบแล้ว</span>}
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
                      
                      {/* Buttons */}
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(item.id)} className="p-2 bg-teal-600 rounded text-white"><Save size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="p-2 border border-zinc-700 rounded text-zinc-400"><X size={16}/></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="p-2 border border-zinc-800 rounded text-zinc-500 hover:text-teal-400"><Edit2 size={16}/></button>
                            <button onClick={() => toggleStatus(item)} className="p-2 border border-zinc-800 rounded text-teal-500"><Layers size={16}/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 border border-zinc-800 rounded text-zinc-600 hover:text-red-500"><Trash2 size={16}/></button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {!isEditing && (
                      <div className="pl-2">
                        <div className="flex justify-between text-sm mb-2">
                           <span className="text-zinc-400 text-xs">ใช้ไป <span className="text-white font-bold text-sm">฿{stats.totalSpent.toLocaleString()}</span></span>
                           <span className="text-zinc-500 text-xs">งบ <span className="text-zinc-300">฿{stats.safeBudget.toLocaleString()}</span></span>
                        </div>
                        <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                          <div className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${Math.min(stats.percent, 100)}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
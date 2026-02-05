"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { 
  ChevronRight, Image as ImageIcon, Plus, Trash2, Save, X, Filter, 
  Plane, ScanLine, Loader2, Calendar, Wallet, TrendingDown, TrendingUp,
  Clock, Tag, Receipt, AlertCircle, CheckCircle2, Camera
} from "lucide-react"; 
import Tesseract from 'tesseract.js';

export default function Home() {
  const { user } = useAuth();
  
  // === ฟังก์ชันช่วยเหลือ (Helpers) ===
  const getStartOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  
  const getEndOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };
  
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // === State Management ===
  // ฟิลเตอร์
  const [filterStart, setFilterStart] = useState(getStartOfMonth());
  const [filterEnd, setFilterEnd] = useState(getEndOfMonth());
  const [filterTrip, setFilterTrip] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  // ฟอร์ม
  const [form, setForm] = useState({ 
    amount: "", 
    note: "", 
    type: "expense", 
    category: "food",
    date: getTodayDate()
  });
  
  // ทริปและรายการ
  const [isTrip, setIsTrip] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [trips, setTrips] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false); 
  const [editId, setEditId] = useState(null); 
  const [notification, setNotification] = useState(null);
  
  // OCR Slip
  const [checkingSlip, setCheckingSlip] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef(null);

  // === หมวดหมู่ที่ปรับปรุงให้ครอบคลุมมากขึ้น ===
  const categories = [
    { id: "food", name: "อาหาร & เครื่องดื่ม", icon: "🍜", color: "bg-orange-500" },
    { id: "transport", name: "เดินทาง & น้ำมัน", icon: "🚕", color: "bg-blue-500" },
    { id: "shopping", name: "ช็อปปิ้ง & ของที่ระลึก", icon: "🛍️", color: "bg-pink-500" },
    { id: "hotel", name: "ที่พัก", icon: "🏨", color: "bg-purple-500" },
    { id: "entertainment", name: "บันเทิง & กิจกรรม", icon: "🎡", color: "bg-yellow-500" },
    { id: "medical", name: "ค่ารักษาพยาบาล", icon: "💊", color: "bg-red-500" },
    { id: "other", name: "อื่นๆ", icon: "📝", color: "bg-zinc-500" },
  ];

  // === ดึงข้อมูลจาก Firebase ===
  useEffect(() => {
    if (!user) return;
    
    // ดึงรายการธุรกรรม
    const qTrans = query(
      collection(db, `users/${user.uid}/transactions`), 
      orderBy("date", "desc")
    );
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // ดึงรายการทริป
    const qTrips = query(
      collection(db, `users/${user.uid}/trips`), 
      orderBy("createdAt", "desc")
    );
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      const tripsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(tripsData);
      if (tripsData.length > 0 && !selectedTrip) {
        setSelectedTrip(tripsData[0].id);
      }
    });
    
    return () => { 
      unsubTrans(); 
      unsubTrips(); 
    };
  }, [user]);

  // === ระบบแจ้งเตือน (Toast Notification) ===
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // === ฟิลเตอร์รายการตามเงื่อนไข ===
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      
      // ตรวจสอบวันที่
      const tDate = t.date.toDate().toISOString().split('T')[0];
      const dateMatch = tDate >= filterStart && tDate <= filterEnd;
      
      // ตรวจสอบทริป
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
  }, [transactions, filterStart, filterEnd, filterTrip]);

// === 🚀 ฟังก์ชันสแกนสลิป (ฉบับ Final: วันที่แม่น + การันตีเป็นรายจ่าย) ===
  const handleSlipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification("⚠️ กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error");
      return;
    }

    setCheckingSlip(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(
        file,
        'tha+eng', 
        { 
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const rawText = result.data.text;
      const text = rawText.replace(/,/g, ''); 
      console.log("📄 OCR Text:", text);

      // ==========================================
      // 📅 ส่วนที่ 1: อ่านวันที่ (เหมือนเดิม)
      // ==========================================
      let foundDate = getTodayDate();
      const thaiMonths = {
        'ม.ค.': '01', 'มค': '01', 'มกราคม': '01',
        'ก.พ.': '02', 'กพ': '02', 'กุมภาพันธ์': '02',
        'มี.ค.': '03', 'มีค': '03', 'มีนาคม': '03',
        'เม.ย.': '04', 'เมย': '04', 'เมษายน': '04',
        'พ.ค.': '05', 'พค': '05', 'พฤษภาคม': '05',
        'มิ.ย.': '06', 'มิย': '06', 'มิถุนายน': '06',
        'ก.ค.': '07', 'กค': '07', 'กรกฎาคม': '07',
        'ส.ค.': '08', 'สค': '08', 'สิงหาคม': '08',
        'ก.ย.': '09', 'กย': '09', 'กันยายน': '09',
        'ต.ค.': '10', 'ตค': '10', 'ตุลาคม': '10',
        'พ.ย.': '11', 'พย': '11', 'พฤศจิกายน': '11',
        'ธ.ค.': '12', 'ธค': '12', 'ธันวาคม': '12'
      };
      const monthKeys = Object.keys(thaiMonths).sort((a, b) => b.length - a.length).join('|').replace(/\./g, '\\.');
      const datePatterns = [
        new RegExp(`(\\d{1,2})\\s*(${monthKeys})\\s*(\\d{2,4})`),
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
        /(\d{4})-(\d{2})-(\d{2})/
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            let day, month, year;
            if (pattern.source.includes(monthKeys)) {
              day = match[1].padStart(2, '0');
              month = thaiMonths[match[2]];
              year = match[3];
            } else if (pattern.source.startsWith('(\\d{4})')) {
              year = match[1];
              month = match[2];
              day = match[3];
            } else {
              day = match[1].padStart(2, '0');
              month = match[2].padStart(2, '0');
              year = match[3];
            }
            
            let yearNum = parseInt(year);
            if (year.length === 2) yearNum += 2500; 
            if (yearNum > 2400) yearNum -= 543; 
            
            foundDate = `${yearNum}-${month}-${day}`;
            break;
          } catch (e) { console.log(e); }
        }
      }

      // ==========================================
      // 💸 ส่วนที่ 2: หาจำนวนเงิน (เหมือนเดิม)
      // ==========================================
      let foundAmount = "";
      const strongPatterns = [
        /(?:จำนวนเงิน|ยอดโอน|ยอดเงิน|amount|total)\s*[:.]?\s*(\d+(?:\.\d{2})?)/i,
        /(\d+(?:\.\d{2})?)\s*(?:บาท|baht|thb)/i
      ];
      for (const p of strongPatterns) {
        const m = text.match(p);
        if (m) { foundAmount = m[1]; break; }
      }
      if (!foundAmount) {
        const decimalPattern = /\b\d+\.\d{2}\b/g;
        const decimals = text.match(decimalPattern);
        if (decimals) foundAmount = Math.max(...decimals.map(d => parseFloat(d))).toString();
      }
      if (!foundAmount) {
        const allNumbers = text.match(/\b\d+\b/g);
        if (allNumbers) {
          const validNumbers = allNumbers.map(n => parseFloat(n)).filter(num => {
            if (num <= 0) return false;
            if (Number.isInteger(num)) {
               if (num >= 2500 && num <= 2600) return false;
               if (num >= 2000 && num <= 2100) return false;
            }
            return true;
          });
          if (validNumbers.length > 0) foundAmount = Math.max(...validNumbers).toString();
        }
      }

      // ==========================================
      // 🏷️ ส่วนที่ 3: ประเภทและหมวดหมู่
      // ==========================================
      
      // 🛑 แก้ไขตรงนี้: บังคับเป็น "expense" (รายจ่าย) เสมอ! 🛑
      let foundType = "expense"; 
      
      // (ผมเอา Logic ตรวจจับรายรับออกไปเลย เพื่อไม่ให้มันสับสน)
      
      let guessedCategory = "other";
      const categoryKeywords = {
        food: /อาหาร|ร้าน|กาแฟ|คาเฟ่|coffee|food|restaurant|shabu|sushi|mk|kfc|starbucks|amazon/i,
        transport: /แท็กซี่|bts|mrt|น้ำมัน|gas|taxi|grab|line man|bolt|ทางด่วน/i,
        shopping: /ห้าง|lotus|bigc|top|seven|mart|central|robinson|7-eleven|watson|boots/i,
      };
      for (const [cat, pat] of Object.entries(categoryKeywords)) {
        if (text.match(pat)) { guessedCategory = cat; break; }
      }

      // ==========================================
      // ✅ สรุปผลลัพธ์
      // ==========================================
      if (foundAmount) {
        setForm(prev => ({
          ...prev,
          amount: foundAmount,
          date: foundDate,
          type: foundType, // ✅ เป็น expense แน่นอน
          category: guessedCategory,
          note: "📸 สแกนจากสลิป"
        }));
        
        const dateMsg = foundDate !== getTodayDate() ? ` (วันที่ ${new Date(foundDate).toLocaleDateString('th-TH')})` : "";
        showNotification(`✅ เจอยอด ${parseFloat(foundAmount).toLocaleString()} บาท${dateMsg}`, "success");
      } else {
        showNotification("⚠️ หาตัวเลขเงินไม่เจอ (กรุณากรอกเอง)", "warning");
        setForm(prev => ({ ...prev, date: foundDate, type: foundType, note: "📸 สแกนแล้ว (ไม่พบยอดเงิน)" }));
      }

    } catch (err) {
      console.error(err);
      showNotification("❌ อ่านสลิปไม่ผ่าน", "error");
    } finally {
      setCheckingSlip(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // === บันทึก/อัปเดตรายการ ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    // ตรวจสอบข้อมูล
    if (!form.amount || parseFloat(form.amount) <= 0) {
      showNotification("⚠️ กรุณากรอกจำนวนเงินที่ถูกต้อง", "warning");
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        amount: parseFloat(form.amount),
        note: form.note.trim() || categories.find(c => c.id === form.category)?.name || "ไม่ระบุ",
        type: form.type,
        categoryId: form.category,
        tripId: isTrip ? selectedTrip : null,
        date: Timestamp.fromDate(new Date(form.date)), 
      };
      
      if (editId) {
        // อัปเดตรายการเดิม
        await updateDoc(doc(db, `users/${user.uid}/transactions`, editId), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        showNotification("✅ อัปเดตรายการสำเร็จ!", "success");
      } else {
        // เพิ่มรายการใหม่
        await addDoc(collection(db, `users/${user.uid}/transactions`), { 
          ...payload, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showNotification("✅ บันทึกรายการสำเร็จ!", "success");
      }
      
      resetForm();
      setShowForm(false);
      
    } catch (err) { 
      console.error("Save Error:", err);
      showNotification("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally { 
      setLoading(false); 
    }
  };

  // === ลบรายการ ===
  const handleDelete = async () => {
    if (!editId) return;
    
    if (confirm("⚠️ ยืนยันที่จะลบรายการนี้? (ไม่สามารถกู้คืนได้)")) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, `users/${user.uid}/transactions`, editId));
        showNotification("🗑️ ลบรายการสำเร็จ", "success");
        resetForm();
        setShowForm(false);
      } catch (err) { 
        showNotification("❌ ไม่สามารถลบรายการได้", "error");
      } finally { 
        setLoading(false); 
      }
    }
  };

  // === คลิกแก้ไขรายการ ===
  const handleEditClick = (t) => {
    setForm({
      amount: t.amount.toString(),
      note: t.note,
      type: t.type,
      category: t.categoryId,
      date: t.date.toDate().toISOString().split('T')[0]
    });
    setIsTrip(!!t.tripId);
    if (t.tripId) setSelectedTrip(t.tripId);
    setEditId(t.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === รีเซ็ตฟอร์ม ===
  const resetForm = () => {
    setForm({ 
      amount: "", 
      note: "", 
      type: "expense", 
      category: "food",
      date: getTodayDate()
    });
    setEditId(null);
    setIsTrip(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // === ฟังก์ชันช่วยเหลือการแสดงผล ===
  const getTripName = (id) => {
    const trip = trips.find(t => t.id === id);
    return trip?.name || "ทริปที่ถูกลบ";
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  const formatDateShort = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short' 
    });
  };
  
  const getCategoryIcon = (id) => {
    return categories.find(c => c.id === id)?.icon || "📝";
  };
  
  const getCategoryColor = (id) => {
    return categories.find(c => c.id === id)?.color || "bg-zinc-500";
  };

  // === คำนวณสรุปยอด ===
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // === จัดกลุ่มรายการตามวันที่ ===
  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date.toDate().toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // ถ้ายังไม่ได้ Login
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4"></div>
          <p className="text-zinc-400">กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 font-sans selection:bg-teal-800/30">
      
      {/* === 🔔 Toast Notification === */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in">
          <div className={`
            px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[300px]
            ${notification.type === 'success' ? 'bg-emerald-950 border-emerald-800 text-emerald-100' : ''}
            ${notification.type === 'error' ? 'bg-red-950 border-red-800 text-red-100' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-950 border-yellow-800 text-yellow-100' : ''}
          `}>
            {notification.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400"/>}
            {notification.type === 'error' && <AlertCircle size={20} className="text-red-400"/>}
            {notification.type === 'warning' && <AlertCircle size={20} className="text-yellow-400"/>}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* === Header === */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-white tracking-wide">
            <span className="text-2xl">🌏</span>
            <span>MY TRIP <span className="text-teal-500">EXPENSE</span></span>
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* === 📊 สรุปยอดเงิน (Enhanced Dashboard Cards) === */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* การ์ดรายจ่าย */}
          <div className="bg-gradient-to-br from-rose-950 to-rose-900 rounded-2xl p-5 border border-rose-800 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-rose-800 opacity-20 text-7xl">💸</div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-rose-200 text-sm font-medium mb-2">
                <TrendingDown size={16}/>
                <span>รายจ่าย</span>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">
                {summary.expense.toLocaleString()}
              </div>
              <div className="text-xs text-rose-200">บาท</div>
            </div>
          </div>

          {/* การ์ดรายรับ */}
          <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-2xl p-5 border border-emerald-800 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-emerald-800 opacity-20 text-7xl">💰</div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-emerald-200 text-sm font-medium mb-2">
                <TrendingUp size={16}/>
                <span>รายรับ</span>
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">
                {summary.income.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-200">บาท</div>
            </div>
          </div>

          {/* การ์ดคงเหลือ */}
          <div className="col-span-2 bg-gradient-to-br from-teal-950 to-teal-900 rounded-2xl p-5 border border-teal-800">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 text-teal-200 text-sm font-medium mb-2">
                  <Wallet size={16}/>
                  <span>ยอดคงเหลือ</span>
                </div>
                <div className="text-4xl font-extrabold text-white">
                  {(summary.income - summary.expense).toLocaleString()}
                </div>
                <div className="text-xs text-teal-200 mt-1">บาท</div>
              </div>
              <div className="bg-teal-800/50 p-4 rounded-xl">
                <Receipt size={32} className="text-teal-200"/>
              </div>
            </div>
          </div>
        </div>

        {/* === 🔍 Filter Bar (Enhanced) === */}
        <div className="mb-6">
          <button 
            onClick={() => setShowFilter(!showFilter)}
            className="w-full flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-teal-600 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-zinc-800 p-2 rounded-lg group-hover:bg-teal-900 transition">
                <Filter size={18} className="text-teal-500"/>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">
                  {filterTrip === 'all' ? '🌐 ทุกรายการ' : 
                   filterTrip === 'no_trip' ? '🏠 ชีวิตประจำวัน' : 
                   `✈️ ${getTripName(filterTrip)}`}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {new Date(filterStart).toLocaleDateString('th-TH', {day:'numeric', month:'short'})} - 
                  {new Date(filterEnd).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}
                </div>
              </div>
            </div>
            <ChevronRight 
              size={20} 
              className={`transform transition-transform text-zinc-500 ${showFilter ? 'rotate-90' : ''}`}
            />
          </button>
          
          {showFilter && (
            <div className="mt-3 p-5 bg-zinc-900 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2 space-y-5">
              {/* เลือกทริป */}
              <div>
                <label className="text-sm text-zinc-400 block mb-3 font-medium flex items-center gap-2">
                  <Plane size={16} className="text-teal-500"/>
                  เลือกดูรายการของ
                </label>
                <select 
                  value={filterTrip} 
                  onChange={(e) => setFilterTrip(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition"
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

              {/* เลือกช่วงวันที่ */}
              <div>
                <label className="text-sm text-zinc-400 block mb-3 font-medium flex items-center gap-2">
                  <Calendar size={16} className="text-teal-500"/>
                  ช่วงเวลา
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 block mb-2">ตั้งแต่วันที่</label>
                    <input 
                      type="date" 
                      value={filterStart} 
                      onChange={e => setFilterStart(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 block mb-2">ถึงวันที่</label>
                    <input 
                      type="date" 
                      value={filterEnd} 
                      onChange={e => setFilterEnd(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" 
                    />
                  </div>
                </div>
              </div>

              {/* ปุ่มรีเซ็ต */}
              <button
                onClick={() => {
                  setFilterStart(getStartOfMonth());
                  setFilterEnd(getEndOfMonth());
                  setFilterTrip("all");
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-sm font-medium transition"
              >
                🔄 รีเซ็ตตัวกรอง
              </button>
            </div>
          )}
        </div>

        {/* === ➕ ปุ่มเพิ่มรายการ === */}
        {!showForm && (
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => { 
                resetForm(); 
                setShowForm(true); 
              }}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold text-sm transition-all active:scale-95 shadow-lg shadow-teal-900/50"
            >
              <Plus size={20} strokeWidth={3}/> 
              <span>จดรายการใหม่</span>
            </button>
          </div>
        )}

        {/* === 📝 ฟอร์มบันทึกรายการ (Enhanced Form) === */}
        {showForm && (
          <div className="mb-6 bg-zinc-900 p-6 rounded-2xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
            {/* หัวข้อฟอร์ม */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {editId ? (
                  <>
                    <div className="bg-amber-900/30 p-2 rounded-lg">
                      <Save size={20} className="text-amber-500"/>
                    </div>
                    แก้ไขรายการ
                  </>
                ) : (
                  <>
                    <div className="bg-teal-900/30 p-2 rounded-lg">
                      <Plus size={20} className="text-teal-500"/>
                    </div>
                    จดรายการใหม่
                  </>
                )}
              </h3>
              <button 
                onClick={() => {
                  resetForm(); 
                  setShowForm(false);
                }} 
                className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition text-zinc-400 hover:text-white"
              >
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 📸 ส่วนสแกนสลิป (Enhanced OCR Section) */}
              {!editId && (
                <div 
                  onClick={() => !checkingSlip && fileInputRef.current.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center 
                    transition-all cursor-pointer overflow-hidden
                    ${checkingSlip 
                      ? 'border-teal-500 bg-teal-950/20' 
                      : 'border-zinc-700 hover:border-teal-500 hover:bg-zinc-800/50'
                    }
                  `}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleSlipUpload}
                    disabled={checkingSlip}
                  />
                  
                  {checkingSlip ? (
                    <div className="text-center">
                      <div className="flex items-center gap-3 text-teal-400 mb-3">
                        <Loader2 size={28} className="animate-spin"/> 
                        <span className="font-bold">กำลังอ่านสลิป...</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-teal-500 h-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-3">
                        ความคืบหน้า: {ocrProgress}%
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-teal-900/30 p-4 rounded-xl mb-3">
                        <Camera size={32} className="text-teal-400"/>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white mb-1">
                          📸 สแกนสลิปอัตโนมัติ (AI)
                        </p>
                        <p className="text-xs text-zinc-500">
                          แตะเพื่ออัปโหลดรูปสลิป จะอ่านยอดเงินให้อัตโนมัติ
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* สลับประเภท รายรับ/รายจ่าย */}
              <div className="flex gap-3 p-1.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setForm({...form, type: 'expense'})} 
                  className={`
                    flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
                    ${form.type==='expense' 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }
                  `}
                >
                  <TrendingDown size={18}/>
                  รายจ่าย
                </button>
                <button 
                  type="button" 
                  onClick={() => setForm({...form, type: 'income'})} 
                  className={`
                    flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
                    ${form.type==='income' 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }
                  `}
                >
                  <TrendingUp size={18}/>
                  รายรับ
                </button>
              </div>
              
              {/* จำนวนเงิน */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2 font-medium">
                  จำนวนเงิน
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={form.amount} 
                    onChange={e => setForm({...form, amount: e.target.value})} 
                    className="w-full bg-zinc-950 border border-zinc-800 p-4 pr-12 rounded-xl text-white text-3xl font-bold text-center focus:outline-none focus:border-teal-600 transition" 
                    required 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xl">
                    ฿
                  </span>
                </div>
              </div>
              
              {/* หมวดหมู่ */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2 font-medium flex items-center gap-1">
                  <Tag size={14}/>
                  หมวดหมู่
                </label>
                <select 
                  value={form.category} 
                  onChange={e => setForm({...form, category: e.target.value})} 
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-teal-600 appearance-none transition"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* บันทึกช่วยจำ + วันที่ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 block mb-2 font-medium">
                    บันทึกช่วยจำ (ถ้ามี)
                  </label>
                  <input 
                    type="text" 
                    placeholder="เช่น ข้าวเที่ยง, แท็กซี่..." 
                    value={form.note} 
                    onChange={e => setForm({...form, note: e.target.value})} 
                    className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-teal-600 transition" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 block mb-2 font-medium flex items-center gap-1">
                    <Clock size={14}/>
                    วันที่
                  </label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={e => setForm({...form, date: e.target.value})} 
                    className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-teal-600 transition" 
                  />
                </div>
              </div>

              {/* เลือกทริป */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isTrip} 
                      onChange={() => setIsTrip(!isTrip)} 
                      className="w-5 h-5 accent-teal-600 rounded cursor-pointer" 
                    />
                    <span className="text-sm font-medium text-zinc-300">
                      เข้าทริปเที่ยว?
                    </span>
                  </label>
                  {isTrip && trips.length > 0 && (
                    <Plane size={16} className="text-teal-500"/>
                  )}
                </div>
                
                {isTrip && (
                  <>
                    {trips.length > 0 ? (
                      <select 
                        value={selectedTrip} 
                        onChange={e => setSelectedTrip(e.target.value)} 
                        className="w-full bg-zinc-900 border border-zinc-700 text-sm p-2.5 rounded-lg text-white focus:outline-none focus:border-teal-600"
                      >
                        {trips.map(t => (
                          <option key={t.id} value={t.id}>
                            ✈️ {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-xs text-zinc-500">
                          ยังไม่มีทริป กรุณาสร้างทริปก่อน
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ปุ่มบันทึก/ลบ */}
              <div className="flex gap-3 pt-2">
                {editId && (
                  <button 
                    type="button" 
                    onClick={handleDelete} 
                    disabled={loading}
                    className="bg-zinc-900 hover:bg-red-950 text-red-500 p-3.5 rounded-xl font-bold transition flex items-center justify-center border border-zinc-800 hover:border-red-800 disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin"/>
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save size={20}/> 
                      <span>{editId ? 'อัปเดตรายการ' : 'บันทึกรายการ'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* === 📋 รายการธุรกรรม (Grouped by Date) === */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt size={20} className="text-teal-500"/>
              รายการล่าสุด
            </h2>
            <span className="text-xs text-zinc-500 font-medium bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              {filteredTransactions.length} รายการ
            </span>
          </div>

          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-dashed border-zinc-800">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-zinc-400 font-medium">ไม่พบรายการ</p>
              <p className="text-xs text-zinc-600 mt-1">ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([date, transactions]) => (
              <div key={date} className="space-y-2">
                {/* วันที่ */}
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-teal-500"/>
                  <h3 className="text-sm font-bold text-zinc-400">{date}</h3>
                  <div className="flex-1 h-px bg-zinc-800"></div>
                </div>

                {/* รายการในวันนั้น */}
                <div className="space-y-2">
                  {transactions.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleEditClick(t)} 
                      className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-xl flex items-center justify-between relative group transition-all border border-zinc-800 hover:border-teal-800 cursor-pointer"
                    >
                      {/* เส้นแนวตั้งซ้าย */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                        t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}></div>
                      
                      {/* ไอคอนและข้อมูล */}
                      <div className="flex items-center gap-4 ml-2">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-zinc-800 ${getCategoryColor(t.categoryId)}/20`}>
                          {getCategoryIcon(t.categoryId)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-zinc-100 font-bold text-sm">
                            {t.note || categories.find(c=>c.id===t.categoryId)?.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-zinc-500 text-xs font-medium flex items-center gap-1">
                              <Clock size={12}/>
                              {formatDateShort(t.date)}
                            </span>
                            {t.tripId && (
                              <span className="text-[10px] bg-teal-950 text-teal-400 px-2 py-0.5 rounded-md border border-teal-800/50 font-bold">
                                ✈️ {getTripName(t.tripId)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* จำนวนเงิน */}
                      <div className="text-right">
                        <div className={`font-black text-lg ${
                          t.type === 'income' ? 'text-emerald-500' : 'text-white'
                        }`}>
                          {t.type === 'income' ? '+' : ''}{Number(t.amount).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">
                          {categories.find(c=>c.id===t.categoryId)?.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* พื้นที่ว่างด้านล่าง */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
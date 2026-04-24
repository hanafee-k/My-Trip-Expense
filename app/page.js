"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  ChevronRight, Image as ImageIcon, Plus, Trash2, Save, X, Filter,
  Plane, ScanLine, Loader2, Calendar, Wallet, TrendingDown, TrendingUp,
  Clock, Tag, Receipt, AlertCircle, CheckCircle2, Camera, Download,
  FileText, FileSpreadsheet, Split, AlertTriangle, ZoomIn, Zap, RefreshCw, BarChart2
} from "lucide-react";
import Tesseract from 'tesseract.js';
import { useRouter } from "next/navigation";
import FilterBar from "../components/FilterBar";
import { formatDateThai, getStartOfMonth, getEndOfMonth, getTodayDate } from "../lib/dateUtils";


export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  // === Helpers ===
  // (Moved to lib/dateUtils.js)


  // === State ===
  const [filterStart, setFilterStart] = useState(getStartOfMonth());
  const [filterEnd, setFilterEnd] = useState(getEndOfMonth());
  const [filterTrip, setFilterTrip] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const [form, setForm] = useState({
    amount: "", note: "", type: "expense", category: "food", date: getTodayDate()
  });

  const [isTrip, setIsTrip] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [notification, setNotification] = useState(null);

  // OCR
  const [checkingSlip, setCheckingSlip] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);


  // Feature 5 — Export
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Categories
  const categories = [
    { id: "food", name: "อาหาร & เครื่องดื่ม", icon: "🍜", color: "bg-orange-500" },
    { id: "transport", name: "เดินทาง & น้ำมัน", icon: "🚕", color: "bg-blue-500" },
    { id: "shopping", name: "ช็อปปิ้ง & ของที่ระลึก", icon: "🛍️", color: "bg-pink-500" },
    { id: "hotel", name: "ที่พัก", icon: "🏨", color: "bg-purple-500" },
    { id: "entertainment", name: "บันเทิง & กิจกรรม", icon: "🎡", color: "bg-yellow-500" },
    { id: "medical", name: "ค่ารักษาพยาบาล", icon: "💊", color: "bg-red-500" },
    { id: "other", name: "อื่นๆ", icon: "📝", color: "bg-zinc-500" },
  ];

  // === Firebase Listeners ===
  useEffect(() => {
    if (!user) return;
    const qTrans = query(collection(db, `users/${user.uid}/transactions`), orderBy("date", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const qTrips = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      const tripsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(tripsData);
      if (tripsData.length > 0 && !selectedTrip) setSelectedTrip(tripsData[0].id);
    });
    return () => { unsubTrans(); unsubTrips(); };
  }, [user]);

  // === Notifications ===
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // === Filtered Transactions ===
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const tDate = t.date.toDate().toISOString().split('T')[0];
      const dateMatch = tDate >= filterStart && tDate <= filterEnd;
      let tripMatch = true;
      if (filterTrip === "all") tripMatch = true;
      else if (filterTrip === "no_trip") tripMatch = !t.tripId;
      else tripMatch = t.tripId === filterTrip;
      return dateMatch && tripMatch;
    });
  }, [transactions, filterStart, filterEnd, filterTrip]);

  // === Feature 1 — Budget Alert ===
  const budgetAlert = useMemo(() => {
    if (filterTrip === "all" || filterTrip === "no_trip") return null;
    const trip = trips.find(t => t.id === filterTrip);
    if (!trip || !trip.budget || trip.budget <= 0) return null;
    const totalExpense = transactions
      .filter(t => t.tripId === filterTrip && t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const percent = (totalExpense / trip.budget) * 100;
    if (percent < 80) return null;
    return { percent, totalExpense, budget: trip.budget, exceeded: percent >= 100 };
  }, [filterTrip, trips, transactions]);

  // === Feature 2 — Daily Spending ===
  const dailySpending = useMemo(() => {
    if (filterTrip === "all" || filterTrip === "no_trip") return null;
    const trip = trips.find(t => t.id === filterTrip);
    if (!trip || !trip.dailyLimit || trip.dailyLimit <= 0) return null;
    const today = getTodayDate();
    const todaySpent = transactions
      .filter(t => t.tripId === filterTrip && t.type === 'expense' && t.date)
      .filter(t => { try { return t.date.toDate().toISOString().split('T')[0] === today; } catch { return false; } })
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { todaySpent, dailyLimit: trip.dailyLimit, exceeded: todaySpent > trip.dailyLimit };
  }, [filterTrip, trips, transactions]);

  // === OCR Slip Upload ===
  const handleSlipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification("⚠️ กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error"); return;
    }
    setCheckingSlip(true);
    setOcrProgress(0);
    try {
      const result = await Tesseract.recognize(file, 'tha+eng', {
        logger: m => { 
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      const rawText = result.data.text;
      const text = rawText.replace(/,/g, ' ');



      // Date parsing
      const thaiMonths = {
        'ม.ค.': '01', 'มค': '01', 'มกราคม': '01', 'jan': '01',
        'ก.พ.': '02', 'กพ': '02', 'กุมภาพันธ์': '02', 'feb': '02',
        'มี.ค.': '03', 'มีค': '03', 'มีนาคม': '03', 'mar': '03',
        'เม.ย.': '04', 'เมย': '04', 'เมษายน': '04', 'apr': '04',
        'พ.ค.': '05', 'พค': '05', 'พฤษภาคม': '05', 'may': '05',
        'มิ.ย.': '06', 'มิย': '06', 'มิถุนายน': '06', 'jun': '06',
        'ก.ค.': '07', 'กค': '07', 'กรกฎาคม': '07', 'jul': '07',
        'ส.ค.': '08', 'สค': '08', 'สิงหาคม': '08', 'aug': '08',
        'ก.ย.': '09', 'กย': '09', 'กันยายน': '09', 'sep': '09',
        'ต.ค.': '10', 'ตค': '10', 'ตุลาคม': '10', 'oct': '10',
        'พ.ย.': '11', 'พย': '11', 'พฤศจิกายน': '11', 'nov': '11',
        'ธ.ค.': '12', 'ธค': '12', 'ธันวาคม': '12', 'dec': '12',
      };
      const monthKeys = Object.keys(thaiMonths).sort((a, b) => b.length - a.length).join('|').replace(/\./g, '\\.?');
      const datePatterns = [
        new RegExp(`(\\d{1,2})[\\s\\.\\-\\/]*(${monthKeys})[\\s\\.\\-\\/]*(\\d{2,4})`, 'i'),
        /(\\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
        /(\d{4})-(\d{2})-(\d{2})/
      ];
      let foundDate = getTodayDate();
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            let day, month, year;
            const isTextMonth = isNaN(parseInt(match[2]));
            if (isTextMonth) {
              day = match[1];
              let cleanMonth = match[2].replace(/\s/g, '');
              month = thaiMonths[cleanMonth] || thaiMonths[cleanMonth + '.'] || thaiMonths[cleanMonth.replace('.', '')];
              year = match[3];
            } else if (match[1].length === 4) {
              year = match[1]; month = match[2]; day = match[3];
            } else {
              day = match[1]; month = match[2]; year = match[3];
            }
            if (!month) continue;
            let yearNum = parseInt(year);
            if (year.length === 2) yearNum += (yearNum > 50) ? 2500 : 2000;
            if (yearNum > 2400) yearNum -= 543;
            foundDate = `${yearNum}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            break;
          } catch { }
        }
      }

      // Amount parsing
      let foundAmount = "";
      const strongPatterns = [
        /(?:จำนวนเงิน|ยอดโอน|ยอดเงิน|amount|total)\s*[:.]?\s*(\d+(?:\.\d{2})?)/i,
        /(\d+(?:\.\d{2})?)\s*(?:บาท|baht|thb)/i
      ];
      for (const p of strongPatterns) { const m = text.match(p); if (m) { foundAmount = m[1]; break; } }
      if (!foundAmount) {
        const decimals = text.match(/\b\d+\.\d{2}\b/g);
        if (decimals) foundAmount = Math.max(...decimals.map(d => parseFloat(d))).toString();
      }
      if (!foundAmount) {
        const allNumbers = text.match(/\b\d+\b/g);
        if (allNumbers) {
          const valid = allNumbers.map(n => parseFloat(n)).filter(n => n > 0 && !(n >= 2000 && n <= 2600));
          if (valid.length > 0) foundAmount = Math.max(...valid).toString();
        }
      }

      let guessedCategory = "other";
      const categoryKeywords = {
        food: /อาหาร|ร้าน|กาแฟ|coffee|food|restaurant|kfc|starbucks|amazon/i,
        transport: /แท็กซี่|bts|mrt|น้ำมัน|gas|taxi|grab|ทางด่วน/i,
        shopping: /ห้าง|lotus|bigc|central|7-eleven|watson/i,
      };
      for (const [cat, pat] of Object.entries(categoryKeywords)) {
        if (text.match(pat)) { guessedCategory = cat; break; }
      }

      if (foundAmount) {
        setForm(prev => ({ ...prev, amount: foundAmount, date: foundDate, type: "expense", category: guessedCategory, note: "📸 สแกนจากสลิป" }));
        showNotification(`✅ เจอยอด ${parseFloat(foundAmount).toLocaleString()} บาท`, "success");
      } else {
        showNotification("⚠️ หาตัวเลขเงินไม่เจอ (กรุณากรอกเอง)", "warning");
        setForm(prev => ({ ...prev, date: foundDate, type: "expense", note: "📸 สแกนแล้ว" }));
      }
    } catch (err) {
      console.error(err);
      showNotification("❌ อ่านสลิปไม่ผ่าน", "error");
    } finally {
      setCheckingSlip(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // === Save/Update Transaction ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!form.amount || parseFloat(form.amount) <= 0) {
      showNotification("⚠️ กรุณากรอกจำนวนเงินที่ถูกต้อง", "warning"); return;
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
        await updateDoc(doc(db, `users/${user.uid}/transactions`, editId), { ...payload, updatedAt: serverTimestamp() });
        showNotification("✅ อัปเดตรายการสำเร็จ!", "success");
      } else {
        await addDoc(collection(db, `users/${user.uid}/transactions`), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        showNotification("✅ บันทึกรายการสำเร็จ!", "success");
      }



      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Save Error:", err);
      showNotification("❌ เกิดข้อผิดพลาด: " + err.message, "error");
    } finally { setLoading(false); }
  };

  // === Delete ===
  const handleDelete = async () => {
    if (!editId) return;
    if (confirm("⚠️ ยืนยันที่จะลบรายการนี้?")) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, `users/${user.uid}/transactions`, editId));
        showNotification("🗑️ ลบรายการสำเร็จ", "success");
        resetForm(); setShowForm(false);
      } catch { showNotification("❌ ไม่สามารถลบรายการได้", "error"); }
      finally { setLoading(false); }
    }
  };

  const handleEditClick = (t) => {
    setForm({ amount: t.amount.toString(), note: t.note, type: t.type, category: t.categoryId, date: t.date.toDate().toISOString().split('T')[0] });
    setIsTrip(!!t.tripId);
    if (t.tripId) setSelectedTrip(t.tripId);
    setEditId(t.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ amount: "", note: "", type: "expense", category: "food", date: getTodayDate() });
    setEditId(null); setIsTrip(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };


  // === Helpers ===
  const getTripName = (id) => trips.find(t => t.id === id)?.name || "ทริปที่ถูกลบ";
  const formatDate = (ts) => { if (!ts) return ""; return ts.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const formatDateShort = (ts) => { if (!ts) return ""; return ts.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }); };
  const getCategoryIcon = (id) => categories.find(c => c.id === id)?.icon || "📝";
  const getCategoryColor = (id) => categories.find(c => c.id === id)?.color || "bg-zinc-500";

  // === Summary ===
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount; else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // === Grouped Transactions ===
  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // === Feature 5 — Export CSV ===
  const exportCSV = () => {
    const headers = "วันที่,ชื่อรายการ,หมวดหมู่,ประเภท,จำนวนเงิน,ทริป";
    const rows = filteredTransactions.map(t => {
      const date = formatDate(t.date);
      const note = `"${(t.note || "").replace(/"/g, '""')}"`;
      const cat = categories.find(c => c.id === t.categoryId)?.name || "-";
      const type = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';
      const amount = t.amount;
      const trip = t.tripId ? getTripName(t.tripId) : "-";
      return `${date},${note},${cat},${type},${amount},${trip}`;
    });
    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `my-trip-expense-${getTodayDate()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showNotification("✅ ดาวน์โหลด CSV สำเร็จ!", "success");
    setShowExportMenu(false);
  };

  // === Feature 5 — Export PDF ===
  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm" });

      // Header bg
      doc.setFillColor(20, 20, 20); doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(20, 184, 166); doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("MY TRIP EXPENSE", 105, 18, { align: "center" });
      doc.setFontSize(10); doc.setTextColor(161, 161, 170);
      const tripLabel = filterTrip === "all" ? "ทุกรายการ" : filterTrip === "no_trip" ? "ชีวิตประจำวัน" : getTripName(filterTrip);
      doc.text(`${tripLabel} | ${new Date(filterStart).toLocaleDateString('en-GB')} - ${new Date(filterEnd).toLocaleDateString('en-GB')}`, 105, 27, { align: "center" });

      // Summary boxes
      doc.setFillColor(39, 39, 42); doc.roundedRect(14, 46, 55, 18, 3, 3, "F");
      doc.setTextColor(244, 63, 94); doc.setFontSize(7); doc.text("รายจ่ายรวม", 16, 52);
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(`${summary.expense.toLocaleString()} THB`, 16, 60);

      doc.setFillColor(39, 39, 42); doc.roundedRect(77, 46, 55, 18, 3, 3, "F");
      doc.setTextColor(16, 185, 129); doc.setFontSize(7); doc.text("รายรับรวม", 79, 52);
      doc.setFontSize(12); doc.text(`${summary.income.toLocaleString()} THB`, 79, 60);

      doc.setFillColor(39, 39, 42); doc.roundedRect(140, 46, 55, 18, 3, 3, "F");
      doc.setTextColor(20, 184, 166); doc.setFontSize(7); doc.text("ยอดคงเหลือ", 142, 52);
      doc.setFontSize(12); doc.text(`${(summary.income - summary.expense).toLocaleString()} THB`, 142, 60);

      // Table
      const tableData = filteredTransactions.map(t => [
        t.date.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
        t.note || "-",
        categories.find(c => c.id === t.categoryId)?.name || "-",
        t.type === 'income' ? "รายรับ" : "รายจ่าย",
        `${t.amount.toLocaleString()} ฿`,
        t.tripId ? getTripName(t.tripId) : "-",
      ]);

      autoTable(doc, {
        startY: 70,
        head: [["วันที่", "รายการ", "หมวดหมู่", "ประเภท", "จำนวน", "ทริป"]],
        body: tableData,
        styles: { fontSize: 8, textColor: [220, 220, 220], fillColor: [24, 24, 27] },
        headStyles: { fillColor: [20, 184, 166], textColor: [0, 0, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [39, 39, 42] },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setTextColor(100); doc.setFontSize(7);
        doc.text(`My Trip Expense | สร้างเมื่อ ${new Date().toLocaleString('th-TH')} | หน้า ${i}/${pageCount}`, 105, 290, { align: "center" });
      }

      doc.save(`my-trip-expense-${getTodayDate()}.pdf`);
      showNotification("✅ ดาวน์โหลด PDF สำเร็จ!", "success");
      setShowExportMenu(false);
    } catch (err) {
      console.error(err);
      showNotification("❌ ไม่สามารถสร้าง PDF ได้: " + err.message, "error");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✈️</div>
          <p className="text-zinc-400">กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] pb-32 selection:bg-[#E8622A]/30">


      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in">
          <div className={`px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[300px]
            ${notification.type === 'success' ? 'bg-white border-green-500 text-green-700' : ''}
            ${notification.type === 'error' ? 'bg-white border-red-500 text-red-700' : ''}
            ${notification.type === 'warning' ? 'bg-white border-yellow-500 text-yellow-700' : ''}
          `}>
            {notification.type === 'success' && <CheckCircle2 size={20} className="text-green-500" />}
            {notification.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
            {notification.type === 'warning' && <AlertCircle size={20} className="text-yellow-500" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Task 1 — Redesigned Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <p className="text-[13px] text-gray-500 font-normal">ยินดีต้อนรับกลับมา </p>
              <h1 className="text-[18px] font-bold text-gray-900 leading-tight">
                {user.displayName || "นักเดินทาง"}
              </h1>
              <p className="text-[12px] text-gray-400 font-medium">
                {formatDateThai(getTodayDate())}
              </p>
            </div>


            <div className="w-20 h-20 rounded-full border-[3px] border-[#E8622A] overflow-hidden shadow-md bg-[#E8622A] flex items-center justify-center text-white font-bold shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{user.displayName?.charAt(0) || "U"}</span>
              )}
            </div>


          </div>

          {/* Balance Summary Pill */}
          <div className="mt-5 flex">
            <div className="bg-[#E8622A] text-white rounded-full px-4 py-1.5 text-[13px] font-semibold flex items-center gap-2 self-start">
              <span>💰 คงเหลือ ฿{(summary.income - summary.expense).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Smart Filter Bar */}
        <FilterBar
          trips={trips}
          onChange={({ start, end, tripId }) => {
            setFilterStart(start || getStartOfMonth());
            setFilterEnd(end || getEndOfMonth());
            setFilterTrip(tripId || "all");
          }}
        />
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pt-4">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Row */}
            {/* Task 1 — Standardized Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-500" />
                  <span>รายรับ</span>
                </div>
                <div className="text-[22px] font-bold text-gray-900 leading-none">
                  {summary.income.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">จำนวนรายการ</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                  <TrendingDown size={14} className="text-red-500" />
                  <span>รายจ่าย</span>
                </div>
                <div className="text-[22px] font-bold text-gray-900 leading-none">
                  {summary.expense.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">จำนวนรายการ</div>
              </div>

              <div className="bg-white col-span-2 rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-[-10px] top-[-10px] text-5xl opacity-5">💰</div>
                <div className="relative z-10">
                  <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                    <Wallet size={14} className="text-[#E8622A]" />
                    <span>คงเหลือ</span>
                  </div>
                  <div className="text-[22px] font-bold text-gray-900 leading-none">
                    {(summary.income - summary.expense).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 font-medium">ยอดคงเหลือสุทธิ</div>
                </div>
              </div>

            </div>


            {/* Active Trip Card */}
            {filterTrip !== 'all' && filterTrip !== 'no_trip' && (() => {
              const trip = trips.find(t => t.id === filterTrip);
              if (!trip) return null;
              const spent = transactions.filter(t => t.tripId === filterTrip && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
              const budget = trip.budget || 0;
              const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

              return (
                <div>
                  <div className="bg-white rounded-2xl p-4 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#FFF4EF] flex items-center justify-center"><Plane size={14} className="text-[#E8622A]" /></div>
                        <span className="font-bold text-[#1A1A1A]">{trip.name}</span>
                      </div>
                      <button onClick={() => setShowFilter(!showFilter)} className="text-[#E8622A] text-xs font-bold">รายละเอียด &gt;</button>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6B6B6B]">งบประมาณ: {budget.toLocaleString()}</span>
                        <span className={spent > budget ? 'text-red-500 font-bold' : 'text-[#1A1A1A]'}>{spent.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${spent > budget ? 'bg-red-500' : 'bg-[#E8622A]'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Actions */}
            <div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                  <div className="bg-[#FFF4EF] p-1.5 rounded-full"><Plus size={16} className="text-[#E8622A]" /></div>
                  <span className="text-sm font-semibold text-[#1A1A1A]">เพิ่มรายจ่าย</span>
                </button>
                <button onClick={() => { resetForm(); setShowForm(true); setTimeout(() => fileInputRef.current?.click(), 100); }} className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                  <div className="bg-gray-100 p-1.5 rounded-full"><Camera size={16} className="text-gray-700" /></div>
                  <span className="text-sm font-semibold text-[#1A1A1A]">สแกนสลิป</span>
                </button>
                <button onClick={() => router.push('/trips')} className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                  <div className="bg-blue-50 p-1.5 rounded-full"><Plane size={16} className="text-blue-500" /></div>
                  <span className="text-sm font-semibold text-[#1A1A1A]">ทริปใหม่</span>
                </button>
                <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-[0_1px_4px_rgba(0,0,0,0.02)] relative">
                  <div className="bg-purple-50 p-1.5 rounded-full"><BarChart2 size={16} className="text-purple-500" /></div>
                  <span className="text-sm font-semibold text-[#1A1A1A]">รายงาน</span>

                  {/* Export Dropdown */}
                  {showExportMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-[#EBEBEB] rounded-xl shadow-lg z-50 overflow-hidden min-w-[160px]">
                      <div onClick={(e) => { e.stopPropagation(); exportCSV(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left text-sm text-[#1A1A1A]">
                        <FileSpreadsheet size={16} className="text-green-500" /> <span>Export CSV</span>
                      </div>
                      <div className="border-t border-gray-100" />
                      <div onClick={(e) => { e.stopPropagation(); exportPDF(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left text-sm text-[#1A1A1A]">
                        <FileText size={16} className="text-red-500" /> <span>Export PDF</span>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>

          </div>
          <div className="lg:col-span-1 space-y-6">
            {/* Transactions List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-semibold text-gray-800">รายการล่าสุด</h3>
                <button onClick={() => setShowFilter(!showFilter)} className="text-[14px] text-[#E8622A] font-semibold flex items-center gap-1"><Filter size={14} /> ตัวกรอง</button>
              </div>


              <div className="bg-white rounded-2xl p-2 border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-[#6B6B6B] text-sm">ไม่พบรายการ</div>
                ) : (
                  filteredTransactions.slice(0, 5).map(t => (
                    <div key={t.id} onClick={() => handleEditClick(t)} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-gray-100">
                        {getCategoryIcon(t.categoryId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-normal text-gray-700 truncate">{t.note || categories.find(c => c.id === t.categoryId)?.name}</p>
                        <p className="text-[12px] text-gray-400">{formatDateShort(t.date)} {t.tripId && <span className="ml-1 text-[#E8622A]">({getTripName(t.tripId)})</span>}</p>
                      </div>
                      <div className={`text-right text-[15px] font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{Number(t.amount).toLocaleString()}
                      </div>
                    </div>

                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col slide-in-from-bottom-8 sm:slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                {editId ? 'แก้ไขรายการ' : 'จดรายการใหม่'}
              </h3>
              <button onClick={() => { resetForm(); setShowForm(false); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* OCR Scan Area */}
                {!editId && (
                  <div
                    onClick={() => !checkingSlip && fileInputRef.current.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
                      ${checkingSlip ? 'border-[#E8622A] bg-[#FFF4EF]' : pendingReceiptFile ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-[#E8622A] hover:bg-gray-50'}`}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSlipUpload} disabled={checkingSlip} />
                    {checkingSlip ? (
                      <div className="text-center">
                        <div className="flex items-center gap-3 text-[#E8622A] mb-3"><Loader2 size={28} className="animate-spin" /><span className="font-bold">กำลังอ่านสลิป...</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-[#E8622A] h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">{ocrProgress}%</p>
                      </div>
                    ) : pendingReceiptFile ? (
                      <div className="text-center">
                        <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-green-700">📎 แนบสลิปแล้ว</p>
                        <p className="text-xs text-gray-500">{pendingReceiptFile.name}</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-100 p-4 rounded-full mb-3"><Camera size={24} className="text-gray-500" /></div>
                        <p className="text-sm font-bold text-[#1A1A1A] mb-1">📸 สแกนสลิปอัตโนมัติ (AI)</p>
                        <p className="text-xs text-[#6B6B6B]">แตะเพื่ออัปโหลดรูปสลิป</p>
                      </>
                    )}
                  </div>
                )}

                {/* Type Toggle */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button type="button" onClick={() => setForm({ ...form, type: 'expense' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${form.type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}>
                    <TrendingDown size={18} /> รายจ่าย
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, type: 'income' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${form.type === 'income' ? 'bg-white text-green-500 shadow-sm' : 'text-gray-500'}`}>
                    <TrendingUp size={18} /> รายรับ
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-[#6B6B6B] block mb-2 font-medium">จำนวนเงิน</label>
                  <div className="relative">
                    <input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-4 pr-12 rounded-xl text-[#1A1A1A] text-3xl font-bold text-center focus:outline-none focus:border-[#E8622A] transition" required />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">฿</span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1"><Tag size={14} /> หมวดหมู่</label>
                  <div className="relative">
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] appearance-none transition pr-10">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                  </div>
                </div>

                {/* Note + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-[#6B6B6B] block mb-2 font-medium">บันทึกช่วยจำ</label>
                    <input type="text" placeholder="เช่น ข้าวเที่ยง, แท็กซี่..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1"><Clock size={14} /> วันที่</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E8622A] transition" />
                  </div>
                </div>

                {/* Trip Toggle */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={isTrip} onChange={() => setIsTrip(!isTrip)} className="w-5 h-5 accent-[#E8622A] rounded cursor-pointer" />
                      <span className="text-sm font-medium text-[#1A1A1A]">เข้าทริปเที่ยว?</span>
                    </label>
                    {isTrip && trips.length > 0 && <Plane size={16} className="text-[#E8622A]" />}
                  </div>
                  {isTrip && (
                    trips.length > 0 ? (
                      <select value={selectedTrip} onChange={e => setSelectedTrip(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-sm p-2.5 rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#E8622A]">
                        {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
                      </select>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-3">ยังไม่มีทริป กรุณาสร้างทริปก่อน</p>
                    )
                  )}
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2 pb-4">
                  {editId && (
                    <button type="button" onClick={handleDelete} disabled={loading}
                      className="bg-white hover:bg-red-50 text-red-500 p-3.5 rounded-xl font-bold transition flex items-center justify-center border border-red-200 disabled:opacity-50">
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-[#E8622A] hover:bg-[#d65722] disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    {loading ? (<><Loader2 size={20} className="animate-spin" /><span>กำลังบันทึก...</span></>) : (<><Save size={20} /><span>{editId ? 'อัปเดตรายการ' : 'บันทึกรายการ'}</span></>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in" onClick={() => setShowFilter(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 slide-in-from-bottom-8 sm:slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-[#1A1A1A]">ตัวกรอง</h3>
              <button onClick={() => setShowFilter(false)} className="text-gray-500"><X size={20} /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-[#6B6B6B] block mb-2 font-medium flex items-center gap-2">
                  <Plane size={16} className="text-[#E8622A]" /> เลือกดูรายการของ
                </label>
                <select value={filterTrip} onChange={(e) => setFilterTrip(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A] transition">
                  <option value="all">🌐 รายการทั้งหมด</option>
                  <option value="no_trip">🏠 ชีวิตประจำวัน</option>
                  {trips.length > 0 && <option disabled>──────────</option>}
                  {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#6B6B6B] block mb-2 font-medium flex items-center gap-2">
                  <Calendar size={16} className="text-[#E8622A]" /> ช่วงเวลา
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-2">ตั้งแต่วันที่</label>
                    <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-2">ถึงวันที่</label>
                    <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8622A]" />
                  </div>
                </div>
              </div>
              <button onClick={() => { setFilterStart(getStartOfMonth()); setFilterEnd(getEndOfMonth()); setFilterTrip("all"); setShowFilter(false); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] py-3 rounded-xl text-sm font-bold transition mt-2">
                🔄 รีเซ็ตตัวกรอง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
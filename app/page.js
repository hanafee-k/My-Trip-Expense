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
  FileText, FileSpreadsheet, Split, AlertTriangle, ZoomIn, Zap
} from "lucide-react"; 
import Tesseract from 'tesseract.js';
import { useRouter } from "next/navigation";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  
  // === Helpers ===
  const getStartOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  const getEndOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  };
  const getTodayDate = () => new Date().toISOString().split('T')[0];

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
  const [pendingReceiptFile, setPendingReceiptFile] = useState(null); // Feature 4

  // Feature 4 — Lightbox
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
    // Feature 4 — store file for later upload
    setPendingReceiptFile(file);
    setCheckingSlip(true);
    setOcrProgress(0);
    try {
      const result = await Tesseract.recognize(file, 'tha+eng', { 
        logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); }
      });
      const rawText = result.data.text;
      const text = rawText.replace(/,/g, ' ');

      // Date parsing
      const thaiMonths = {
        'ม.ค.': '01','มค': '01','มกราคม': '01','jan': '01',
        'ก.พ.': '02','กพ': '02','กุมภาพันธ์': '02','feb': '02',
        'มี.ค.': '03','มีค': '03','มีนาคม': '03','mar': '03',
        'เม.ย.': '04','เมย': '04','เมษายน': '04','apr': '04',
        'พ.ค.': '05','พค': '05','พฤษภาคม': '05','may': '05',
        'มิ.ย.': '06','มิย': '06','มิถุนายน': '06','jun': '06',
        'ก.ค.': '07','กค': '07','กรกฎาคม': '07','jul': '07',
        'ส.ค.': '08','สค': '08','สิงหาคม': '08','aug': '08',
        'ก.ย.': '09','กย': '09','กันยายน': '09','sep': '09',
        'ต.ค.': '10','ตค': '10','ตุลาคม': '10','oct': '10',
        'พ.ย.': '11','พย': '11','พฤศจิกายน': '11','nov': '11',
        'ธ.ค.': '12','ธค': '12','ธันวาคม': '12','dec': '12',
      };
      const monthKeys = Object.keys(thaiMonths).sort((a,b) => b.length - a.length).join('|').replace(/\./g, '\\.?');
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
            foundDate = `${yearNum}-${month.padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
            break;
          } catch {}
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

      let receiptUrl = null;

      if (editId) {
        // Feature 4 — upload receipt if new file attached during edit
        if (pendingReceiptFile) {
          const sRef = storageRef(storage, `receipts/${user.uid}/${editId}_${Date.now()}.jpg`);
          const snap = await uploadBytes(sRef, pendingReceiptFile);
          receiptUrl = await getDownloadURL(snap.ref);
          payload.receiptUrl = receiptUrl;
        }
        await updateDoc(doc(db, `users/${user.uid}/transactions`, editId), { ...payload, updatedAt: serverTimestamp() });
        showNotification("✅ อัปเดตรายการสำเร็จ!", "success");
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/transactions`), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        // Feature 4 — upload receipt after getting doc ID
        if (pendingReceiptFile) {
          const sRef = storageRef(storage, `receipts/${user.uid}/${docRef.id}.jpg`);
          const snap = await uploadBytes(sRef, pendingReceiptFile);
          receiptUrl = await getDownloadURL(snap.ref);
          await updateDoc(docRef, { receiptUrl });
        }
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
    setEditId(null); setIsTrip(false); setPendingReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // === Helpers ===
  const getTripName = (id) => trips.find(t => t.id === id)?.name || "ทริปที่ถูกลบ";
  const formatDate = (ts) => { if (!ts) return ""; return ts.toDate().toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' }); };
  const formatDateShort = (ts) => { if (!ts) return ""; return ts.toDate().toLocaleDateString('th-TH', { day:'numeric', month:'short' }); };
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
      const dateKey = t.date.toDate().toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' });
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
        t.date.toDate().toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }),
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 font-sans selection:bg-teal-800/30">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in">
          <div className={`px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[300px]
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

      {/* Header */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white tracking-wide">
            <span className="text-2xl">✈️</span>
            <span>MY TRIP <span className="text-teal-500">EXPENSE</span></span>
          </h1>
          {/* Feature 5 — Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-sm font-bold transition"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-12 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-2">
                <button onClick={exportCSV} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition text-left text-sm">
                  <FileSpreadsheet size={16} className="text-emerald-400" /> <span>Export CSV</span>
                </button>
                <div className="border-t border-zinc-700" />
                <button onClick={exportPDF} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition text-left text-sm">
                  <FileText size={16} className="text-rose-400" /> <span>Export PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-6 px-4 lg:px-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-rose-950 to-rose-900 rounded-2xl p-5 border border-rose-800 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-rose-800 opacity-20 text-7xl">💸</div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-rose-200 text-sm font-medium mb-2"><TrendingDown size={16}/><span>รายจ่าย</span></div>
              <div className="text-3xl font-extrabold text-white mb-1">{summary.expense.toLocaleString()}</div>
              <div className="text-xs text-rose-200">บาท</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-2xl p-5 border border-emerald-800 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-emerald-800 opacity-20 text-7xl">💰</div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-emerald-200 text-sm font-medium mb-2"><TrendingUp size={16}/><span>รายรับ</span></div>
              <div className="text-3xl font-extrabold text-white mb-1">{summary.income.toLocaleString()}</div>
              <div className="text-xs text-emerald-200">บาท</div>
            </div>
          </div>
          <div className="col-span-2 bg-gradient-to-br from-teal-950 to-teal-900 rounded-2xl p-5 border border-teal-800">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 text-teal-200 text-sm font-medium mb-2"><Wallet size={16}/><span>ยอดคงเหลือ</span></div>
                <div className="text-4xl font-extrabold text-white">{(summary.income - summary.expense).toLocaleString()}</div>
                <div className="text-xs text-teal-200 mt-1">บาท</div>
              </div>
              <div className="bg-teal-800/50 p-4 rounded-xl"><Receipt size={32} className="text-teal-200"/></div>
            </div>
          </div>
        </div>

        {/* Feature 1 — Budget Alert Bar */}
        {budgetAlert && (
          <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            budgetAlert.exceeded
              ? 'bg-red-950/60 border-red-700 text-red-200'
              : 'bg-amber-950/60 border-amber-700 text-amber-200'
          }`}>
            <AlertTriangle size={20} className={budgetAlert.exceeded ? 'text-red-400' : 'text-amber-400'} />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-sm">
                  {budgetAlert.exceeded
                    ? `🚨 เกินงบแล้ว! ใช้เกินไป ฿${(budgetAlert.totalExpense - budgetAlert.budget).toLocaleString()}`
                    : `⚠️ ใกล้ถึงงบแล้ว — ใช้ไป ${budgetAlert.percent.toFixed(0)}%`}
                </span>
                <span className="text-xs opacity-80">
                  ฿{budgetAlert.totalExpense.toLocaleString()} / ฿{budgetAlert.budget.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetAlert.exceeded ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(budgetAlert.percent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Feature 2 — Daily Spending Bar */}
        {dailySpending && (
          <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 ${
            dailySpending.exceeded ? 'bg-red-950/40 border-red-800' : 'bg-indigo-950/40 border-indigo-800'
          }`}>
            <Zap size={18} className={dailySpending.exceeded ? 'text-red-400' : 'text-indigo-400'} />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-white">วันนี้ใช้ไป</span>
                <span className={`text-xs font-bold ${dailySpending.exceeded ? 'text-red-400' : 'text-indigo-300'}`}>
                  ฿{dailySpending.todaySpent.toLocaleString()} จาก ฿{Number(dailySpending.dailyLimit).toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${dailySpending.exceeded ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((dailySpending.todaySpent / dailySpending.dailyLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
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
                  {filterTrip === 'all' ? '🌐 ทุกรายการ' : filterTrip === 'no_trip' ? '🏠 ชีวิตประจำวัน' : `✈️ ${getTripName(filterTrip)}`}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {new Date(filterStart).toLocaleDateString('th-TH', {day:'numeric', month:'short'})} - {new Date(filterEnd).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}
                </div>
              </div>
            </div>
            <ChevronRight size={20} className={`transform transition-transform text-zinc-500 ${showFilter ? 'rotate-90' : ''}`}/>
          </button>
          
          {showFilter && (
            <div className="mt-3 p-5 bg-zinc-900 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2 space-y-5">
              <div>
                <label className="text-sm text-zinc-400 block mb-3 font-medium flex items-center gap-2">
                  <Plane size={16} className="text-teal-500"/> เลือกดูรายการของ
                </label>
                <select value={filterTrip} onChange={(e) => setFilterTrip(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                  <option value="all">🌐 รายการทั้งหมด</option>
                  <option value="no_trip">🏠 ชีวิตประจำวัน</option>
                  {trips.length > 0 && <option disabled>──────────</option>}
                  {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
                </select>
              </div>
              <div className="border-t border-zinc-800"></div>
              <div>
                <label className="text-sm text-zinc-400 block mb-3 font-medium flex items-center gap-2">
                  <Calendar size={16} className="text-teal-500"/> ช่วงเวลา
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 block mb-2">ตั้งแต่วันที่</label>
                    <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 block mb-2">ถึงวันที่</label>
                    <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"/>
                  </div>
                </div>
              </div>
              <button onClick={() => { setFilterStart(getStartOfMonth()); setFilterEnd(getEndOfMonth()); setFilterTrip("all"); }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-sm font-medium transition">
                🔄 รีเซ็ตตัวกรอง
              </button>
            </div>
          )}
        </div>

        {/* Add Button */}
        {!showForm && (
          <div className="flex justify-end mb-4">
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold text-sm transition-all active:scale-95 shadow-lg shadow-teal-900/50">
              <Plus size={20} strokeWidth={3}/> <span>จดรายการใหม่</span>
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-6 bg-zinc-900 p-6 rounded-2xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                {editId ? (
                  <><div className="bg-amber-900/30 p-2 rounded-lg"><Save size={20} className="text-amber-500"/></div> แก้ไขรายการ</>
                ) : (
                  <><div className="bg-teal-900/30 p-2 rounded-lg"><Plus size={20} className="text-teal-500"/></div> จดรายการใหม่</>
                )}
              </h3>
              <button onClick={() => { resetForm(); setShowForm(false); }} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition text-zinc-400 hover:text-white">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* OCR Scan Area */}
              {!editId && (
                <div 
                  onClick={() => !checkingSlip && fileInputRef.current.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
                    ${checkingSlip ? 'border-teal-500 bg-teal-950/20' : pendingReceiptFile ? 'border-emerald-500 bg-emerald-950/10' : 'border-zinc-700 hover:border-teal-500 hover:bg-zinc-800/50'}`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSlipUpload} disabled={checkingSlip}/>
                  {checkingSlip ? (
                    <div className="text-center">
                      <div className="flex items-center gap-3 text-teal-400 mb-3"><Loader2 size={28} className="animate-spin"/><span className="font-bold">กำลังอ่านสลิป...</span></div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-teal-500 h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-3">{ocrProgress}%</p>
                    </div>
                  ) : pendingReceiptFile ? (
                    <div className="text-center">
                      <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2"/>
                      <p className="text-sm font-bold text-emerald-300">📎 แนบสลิปแล้ว</p>
                      <p className="text-xs text-zinc-500">{pendingReceiptFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-teal-900/30 p-4 rounded-xl mb-3"><Camera size={32} className="text-teal-400"/></div>
                      <p className="text-sm font-bold text-white mb-1">📸 สแกนสลิปอัตโนมัติ (AI)</p>
                      <p className="text-xs text-zinc-500">แตะเพื่ออัปโหลดรูปสลิป</p>
                    </>
                  )}
                </div>
              )}

              {/* Type Toggle */}
              <div className="flex gap-3 p-1.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <button type="button" onClick={() => setForm({...form, type:'expense'})}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${form.type==='expense' ? 'bg-rose-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  <TrendingDown size={18}/> รายจ่าย
                </button>
                <button type="button" onClick={() => setForm({...form, type:'income'})}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${form.type==='income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  <TrendingUp size={18}/> รายรับ
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2 font-medium">จำนวนเงิน</label>
                <div className="relative">
                  <input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 p-4 pr-12 rounded-xl text-white text-3xl font-bold text-center focus:outline-none focus:border-teal-600 transition" required/>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xl">฿</span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2 font-medium flex items-center gap-1"><Tag size={14}/> หมวดหมู่</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-teal-600 appearance-none transition">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              {/* Note + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 block mb-2 font-medium">บันทึกช่วยจำ</label>
                  <input type="text" placeholder="เช่น ข้าวเที่ยง, แท็กซี่..." value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-teal-600 transition"/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 block mb-2 font-medium flex items-center gap-1"><Clock size={14}/> วันที่</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-teal-600 transition"/>
                </div>
              </div>

              {/* Trip Toggle */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isTrip} onChange={() => setIsTrip(!isTrip)} className="w-5 h-5 accent-teal-600 rounded cursor-pointer"/>
                    <span className="text-sm font-medium text-zinc-300">เข้าทริปเที่ยว?</span>
                  </label>
                  {isTrip && trips.length > 0 && <Plane size={16} className="text-teal-500"/>}
                </div>
                {isTrip && (
                  trips.length > 0 ? (
                    <select value={selectedTrip} onChange={e => setSelectedTrip(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-sm p-2.5 rounded-lg text-white focus:outline-none focus:border-teal-600">
                      {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-zinc-500 text-center py-3">ยังไม่มีทริป กรุณาสร้างทริปก่อน</p>
                  )
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                {editId && (
                  <button type="button" onClick={handleDelete} disabled={loading}
                    className="bg-zinc-900 hover:bg-red-950 text-red-500 p-3.5 rounded-xl font-bold transition flex items-center justify-center border border-zinc-800 hover:border-red-800 disabled:opacity-50">
                    <Trash2 size={20}/>
                  </button>
                )}
                <button type="submit" disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50">
                  {loading ? (<><Loader2 size={20} className="animate-spin"/><span>กำลังบันทึก...</span></>) : (<><Save size={20}/><span>{editId ? 'อัปเดตรายการ' : 'บันทึกรายการ'}</span></>)}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt size={20} className="text-teal-500"/> รายการล่าสุด
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
            Object.entries(groupedTransactions).map(([date, dayTxns]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-teal-500"/>
                  <h3 className="text-sm font-bold text-zinc-400">{date}</h3>
                  <div className="flex-1 h-px bg-zinc-800"></div>
                </div>
                <div className="space-y-2">
                  {dayTxns.map(t => (
                    <div key={t.id} onClick={() => handleEditClick(t)}
                      className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-xl flex items-center justify-between relative group transition-all border border-zinc-800 hover:border-teal-800 cursor-pointer">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <div className="flex items-center gap-4 ml-2 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-zinc-800 ${getCategoryColor(t.categoryId)}/20 flex-shrink-0`}>
                          {getCategoryIcon(t.categoryId)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-zinc-100 font-bold text-sm truncate">{t.note || categories.find(c=>c.id===t.categoryId)?.name}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-zinc-500 text-xs font-medium flex items-center gap-1"><Clock size={12}/>{formatDateShort(t.date)}</span>
                            {t.tripId && (
                              <span className="text-[10px] bg-teal-950 text-teal-400 px-2 py-0.5 rounded-md border border-teal-800/50 font-bold">
                                ✈️ {getTripName(t.tripId)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                        {/* Feature 4 — Receipt Thumbnail */}
                        {t.receiptUrl && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(t.receiptUrl); }}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 hover:border-teal-500 transition relative group/img flex-shrink-0"
                          >
                            <img src={t.receiptUrl} alt="สลิป" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 flex items-center justify-center transition-all">
                              <ZoomIn size={12} className="text-white opacity-0 group-hover/img:opacity-100" />
                            </div>
                          </button>
                        )}
                        <div className="text-right">
                          <div className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-500' : 'text-white'}`}>
                            {t.type === 'income' ? '+' : ''}{Number(t.amount).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">{categories.find(c=>c.id===t.categoryId)?.name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="h-8"></div>
      </div>

      {/* Feature 4 — Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition" onClick={() => setLightboxUrl(null)}>
            <X size={20} className="text-white"/>
          </button>
          <img src={lightboxUrl} alt="สลิปเต็ม" className="max-w-lg w-full max-h-[85vh] object-contain rounded-2xl border border-zinc-700 shadow-2xl" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      {/* Feature 3 — FAB Split Bill */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => router.push('/split-bill')}
          className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-2xl shadow-amber-900/60 transition-all active:scale-95 hover:scale-105"
        >
          <Split size={18}/>
          <span>หารบิล</span>
        </button>
      </div>

      {/* Close export menu on outside click */}
      {showExportMenu && <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)}/>}
    </div>
  );
}
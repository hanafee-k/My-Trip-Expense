"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, getDoc, doc
} from "firebase/firestore";
import {
  ArrowLeft, Users, Calculator, CheckCircle2, Plus, Minus,
  Receipt, Plane, AlertCircle, Split, ArrowRight, Loader2, 
  Trash2, Settings, ChevronRight, Lock, Unlock, DollarSign,
  Percent, Info, Save, X, Edit3, HelpCircle, ScanLine, Smartphone, Download, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { calculateSplitBreakdown } from "../../lib/splitUtils";
import { generatePromptPayPayload } from "../../lib/promptpay.js";

// Helper component for numeric inputs to avoid the "reset to 0" and "NaN" issues
const NumericInput = ({ value, onChange, placeholder, className, prefix, suffix, min = 0 }) => {
  const [localValue, setLocalValue] = useState(value?.toString() || "");

  useEffect(() => {
    // Update local value if the external value changes (but only if it's not the same number)
    if (parseFloat(localValue) !== value) {
      setLocalValue(value === 0 && localValue === "" ? "" : value?.toString() || "");
    }
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    // Allow empty string, numbers, and a single decimal point
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setLocalValue(val);
      const parsed = parseFloat(val);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  return (
    <div className="relative w-full">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{suffix}</span>}
    </div>
  );
};

export default function SplitBillPage() {
  const { user } = useAuth();
  const router = useRouter();

  // === State ===
  const [step, setStep] = useState(1); // 1=People & Tax, 2=Items, 3=Assignment, 4=Summary
  const [people, setPeople] = useState([
    { id: "p1", name: user?.displayName || "คุณ" },
    { id: "p2", name: "เพื่อน 1" }
  ]);
  const [items, setItems] = useState([
    { id: "i1", name: "", price: 0, qty: 1, assignedPeople: ["p1", "p2"], lockedShares: {} }
  ]);
  const [config, setConfig] = useState({
    serviceChargePercent: 0,
    vatPercent: 0,
    discountAmount: 0
  });
  
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [promptPayId, setPromptPayId] = useState("");
  const [qrData, setQrData] = useState(null); // { name, amount, payload }

  const downloadQR = async () => {
    if (!qrData) return;
    try {
      // Create a canvas to draw the receipt
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 600;
      // Calculate dynamic height based on items
      const itemHeight = qrData.items.length * 35;
      canvas.height = 850 + itemHeight;

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Banner (Solid Orange)
      ctx.fillStyle = "#E8622A";
      ctx.fillRect(0, 0, canvas.width, 100);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FINVOY WALLET", canvas.width / 2, 65);

      // Receipt Title
      ctx.fillStyle = "#1A1A1A";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`รายการของคุณ ${qrData.name}`, canvas.width / 2, 160);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#6B6B6B";
      ctx.fillText(new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }), canvas.width / 2, 190);

      // Divider
      ctx.strokeStyle = "#F3F4F6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 220);
      ctx.lineTo(550, 220);
      ctx.stroke();

      // Items List
      ctx.textAlign = "left";
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText("รายการ", 60, 260);
      ctx.textAlign = "right";
      ctx.fillText("ราคา (บาท)", 540, 260);

      let currentY = 300;
      qrData.items.forEach(item => {
        ctx.textAlign = "left";
        ctx.font = "18px sans-serif";
        ctx.fillStyle = "#4B5563";
        ctx.fillText(item.name || "รายการ", 60, currentY);
        ctx.textAlign = "right";
        ctx.fillText(item.share.toLocaleString(), 540, currentY);
        currentY += 35;
      });

      // Adjustments
      ctx.strokeStyle = "#F3F4F6";
      ctx.beginPath();
      ctx.moveTo(60, currentY);
      ctx.lineTo(540, currentY);
      ctx.stroke();
      currentY += 40;

      if (qrData.adjustments.discount > 0) {
        ctx.textAlign = "left";
        ctx.fillStyle = "#EF4444";
        ctx.fillText("ส่วนลดเฉลี่ย", 60, currentY);
        ctx.textAlign = "right";
        ctx.fillText(`- ${qrData.adjustments.discount.toLocaleString()}`, 540, currentY);
        currentY += 35;
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#6B6B6B";
      ctx.fillText("ค่าบริการ & ภาษี", 60, currentY);
      ctx.textAlign = "right";
      ctx.fillText(`+ ${(qrData.adjustments.serviceCharge + qrData.adjustments.vat).toLocaleString()}`, 540, currentY);
      currentY += 50;

      // Total Box
      ctx.fillStyle = "#F9FAFB";
      ctx.roundRect(50, currentY, 500, 80, 20);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText("ยอดสุทธิที่ต้องจ่าย", 80, currentY + 48);

      ctx.textAlign = "right";
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "#E8622A";
      ctx.fillText(`฿${qrData.amount.toLocaleString()}`, 520, currentY + 52);

      currentY += 120;

      // PromptPay QR Section
      ctx.textAlign = "center";
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText("สแกนจ่ายผ่าน PromptPay", canvas.width / 2, currentY);
      
      currentY += 30;

      // Load QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.payload)}`;
      
      await new Promise(resolve => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, canvas.width / 2 - 125, currentY, 250, 250);
          resolve();
        };
      });

      currentY += 280;
      ctx.fillStyle = "#6B6B6B";
      ctx.font = "14px sans-serif";
      ctx.fillText("ขอบคุณที่ร่วมหารบิลกับเรา :)", canvas.width / 2, currentY + 20);
      ctx.fillText("สร้างโดยแอป Finvoy Wallet", canvas.width / 2, currentY + 45);

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Bill_${qrData.name}_${new Date().getTime()}.png`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("ดาวน์โหลดรูปไม่สำเร็จ: " + err.message);
    }
  };

  // === Listeners ===
  useEffect(() => {
    if (!user) return;
    const qTrips = query(collection(db, `users/${user.uid}/trips`), orderBy("createdAt", "desc"));
    const unsubTrips = onSnapshot(qTrips, snap => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // Fetch PromptPay ID
    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) setPromptPayId(docSnap.data().promptPayId || "");
    };
    fetchProfile();

    return () => unsubTrips();
  }, [user]);

  // === Calculations ===
  const splitResult = useMemo(() => {
    return calculateSplitBreakdown(items, people, config);
  }, [items, people, config]);

  // === Handlers ===
  const addPerson = () => {
    const id = `p${Date.now()}`;
    const newPerson = { id, name: `เพื่อน ${people.length + 1}` };
    setPeople([...people, newPerson]);
    setItems(items.map(item => ({ ...item, assignedPeople: [...item.assignedPeople, id] })));
  };

  const removePerson = (id) => {
    if (people.length <= 2 || id === "p1") return; // Prevent deleting owner
    setPeople(people.filter(p => p.id !== id));
    setItems(items.map(item => ({
      ...item,
      assignedPeople: item.assignedPeople.filter(pid => pid !== id),
      lockedShares: (() => {
        const { [id]: removed, ...rest } = item.lockedShares;
        return rest;
      })()
    })));
  };

  const addItem = () => {
    const newItem = {
      id: `i${Date.now()}`,
      name: "",
      price: 0,
      qty: 1,
      assignedPeople: people.map(p => p.id),
      lockedShares: {}
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, val) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const togglePersonInItem = (itemId, personId) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const isAssigned = item.assignedPeople.includes(personId);
      const newAssigned = isAssigned 
        ? item.assignedPeople.filter(id => id !== personId)
        : [...item.assignedPeople, personId];
      
      const newLocked = { ...item.lockedShares };
      if (isAssigned) delete newLocked[personId];

      return { ...item, assignedPeople: newAssigned, lockedShares: newLocked };
    }));
  };

  const setLockedShare = (itemId, personId, amount) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const newLocked = { ...item.lockedShares };
      if (amount === null || amount === undefined || amount === "") {
        delete newLocked[personId];
      } else {
        newLocked[personId] = parseFloat(amount);
      }
      return { ...item, lockedShares: newLocked };
    }));
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSettle = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const sessionData = {
        people,
        items,
        config,
        totals: splitResult.totals,
        personBreakdown: splitResult.personBreakdown,
        paidStatus: people.reduce((acc, p) => ({ ...acc, [p.id]: p.id === "p1" }), {}), // Owner is always paid
        tripId: selectedTrip || null,
        status: "settled",
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, `users/${user.uid}/splitSessions`), sessionData);

      const { Timestamp } = await import("firebase/firestore");

      const batchPromises = Object.values(splitResult.personBreakdown)
        .filter(data => data.name === "คุณ") // ONLY record user's own share as main expense
        .map(async (data) => {
          const payload = {
            amount: data.totalFinal,
            note: `ค่าใช้จ่ายส่วนตัว (หารบิล: ${items.map(i => i.name).filter(n => n).slice(0, 2).join(", ")}${items.length > 2 ? '...' : ''})`,
            type: "expense",
            categoryId: "food",
            tripId: selectedTrip || null,
            date: Timestamp.now(), // Use local timestamp so it appears immediately in stats
            personName: "คุณ",
            isSplitShare: true
          };
          return addDoc(collection(db, `users/${user.uid}/transactions`), payload);
        });

      await Promise.all(batchPromises);
      showNotification("✅ บันทึกและลงบัญชีเรียบร้อย!");
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      console.error(err);
      showNotification("❌ เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-32 text-[#1A1A1A] bg-[#F7F6F3] font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg font-bold">หารบิลแบบละเอียด</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ขั้นตอนที่ {step} จาก 4</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-6 h-1.5 rounded-full transition-all ${step >= s ? 'bg-[#E8622A]' : 'bg-gray-100'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        
        {/* Step 1: People & Fees */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white rounded-[32px] p-8 border border-gray-50 shadow-xl shadow-gray-200/40">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-[#E8622A]"><Users size={20} /></div>
                   <h3 className="font-black text-lg">ใครร่วมหารบ้าง?</h3>
                </div>
                <button onClick={addPerson} className="bg-orange-50 text-[#E8622A] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-orange-100 transition">
                  <Plus size={14} /> เพิ่มคน
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {people.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-transparent focus-within:border-orange-100 focus-within:bg-white transition-all">
                    <span className="text-[10px] font-black text-gray-300 w-4">{idx + 1}</span>
                    <input 
                      value={p.name}
                      placeholder="ชื่อเพื่อน"
                      onChange={e => p.id !== "p1" && setPeople(people.map(person => person.id === p.id ? { ...person, name: e.target.value } : person))}
                      readOnly={p.id === "p1"}
                      className={`flex-1 bg-transparent text-sm font-bold focus:outline-none ${p.id === "p1" ? 'text-orange-500' : ''}`}
                    />
                    {people.length > 2 && p.id !== "p1" && (
                      <button onClick={() => removePerson(p.id)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[32px] p-8 border border-gray-50 shadow-xl shadow-gray-200/40">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500"><Settings size={20} /></div>
                 <h3 className="font-black text-lg">ค่าธรรมเนียม & ส่วนลด</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Charge</label>
                  <NumericInput value={config.serviceChargePercent} onChange={v => setConfig({...config, serviceChargePercent: v})} suffix="%" className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-100 transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">VAT</label>
                  <NumericInput value={config.vatPercent} onChange={v => setConfig({...config, vatPercent: v})} suffix="%" className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-100 transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">ส่วนลดรวม</label>
                  <NumericInput value={config.discountAmount} onChange={v => setConfig({...config, discountAmount: v})} prefix="฿" className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-100 transition" />
                </div>
              </div>
            </section>

            <button onClick={() => setStep(2)} className="w-full bg-[#E8622A] text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-100 hover:scale-[1.01] active:scale-95 transition-all">
              บันทึกและไปต่อ <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Items List */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-[#E8622A]"><Receipt size={22} /></div>
                 <h3 className="font-black text-xl">รายการอาหาร/สินค้า</h3>
              </div>
              <button onClick={addItem} className="bg-[#E8622A] text-white px-5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-orange-100">
                <Plus size={18} /> เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-5">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-white rounded-[32px] p-6 border border-gray-50 shadow-lg shadow-gray-200/20 space-y-6 group relative">
                  {items.length > 1 ? (
                    <button onClick={() => removeItem(item.id)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={20} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateItem(item.id, "name", "") || updateItem(item.id, "price", 0) || updateItem(item.id, "qty", 1)} 
                      className="absolute top-6 right-6 text-gray-300 hover:text-orange-500 transition-colors p-2"
                      title="ล้างข้อมูล"
                    >
                      <RefreshCw size={20} />
                    </button>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400">
                      {idx + 1}
                    </div>
                    <input 
                      placeholder="ชื่อรายการ เช่น ข้าวมันไก่"
                      value={item.name}
                      onChange={e => updateItem(item.id, "name", e.target.value)}
                      className="flex-1 text-xl font-black focus:outline-none placeholder:text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">ราคาต่อหน่วย</label>
                      <NumericInput value={item.price} onChange={v => updateItem(item.id, "price", v)} prefix="฿" className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-100 transition" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">จำนวน</label>
                      <NumericInput value={item.qty} onChange={v => updateItem(item.id, "qty", v)} className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-100 transition text-center" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[11px] font-black text-gray-400 uppercase tracking-widest">
                     <span>ยอดรวมรายการนี้</span>
                     <span className="text-[#E8622A] text-lg">฿{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setStep(1)} className="flex-1 bg-white border border-gray-100 py-5 rounded-[24px] font-black text-sm transition-all hover:bg-gray-50">ย้อนกลับ</button>
              <button onClick={() => setStep(3)} className="flex-[2] bg-[#E8622A] text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-100 transition-all hover:scale-[1.01]">
                ระบุคนจ่าย <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Assignment & Custom Amounts */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-[#E8622A]"><Calculator size={22} /></div>
               <h3 className="font-black text-xl">ระบุจำนวนที่แต่ละคนต้องจ่าย</h3>
            </div>
            
            <div className="space-y-8">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-[40px] border border-gray-50 shadow-xl shadow-gray-200/30 overflow-hidden">
                  <div className="bg-[#1A1A1A] p-6 text-white flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-lg">{item.name || "ไม่ระบุชื่อ"}</h4>
                      <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">ยอดรวม: ฿{(item.price * item.qty).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-2xl text-right">
                      <p className="text-[9px] text-white/50 font-black uppercase mb-1">เฉลี่ยต่อคน</p>
                      <p className="text-sm font-black text-orange-400">฿{( (item.price * item.qty) / (item.assignedPeople.length || 1) ).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-3">
                      <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> เลือกคนร่วมหาร (แตะเพื่อเปิด/ปิด)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {people.map(p => {
                          const isAssigned = item.assignedPeople.includes(p.id);
                          return (
                            <button 
                              key={p.id}
                              onClick={() => togglePersonInItem(item.id, p.id)}
                              className={`px-5 py-2.5 rounded-full text-xs font-black transition-all ${
                                isAssigned 
                                  ? 'bg-[#E8622A] text-white shadow-lg shadow-orange-100' 
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-50">
                      <div className="flex items-center justify-between">
                         <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest">ป้อนยอดจ่ายเอง (ถ้ามีคนจ่ายไม่เท่ากัน)</p>
                         <HelpCircle size={14} className="text-gray-300" title="ถ้าใครต้องจ่ายยอดแน่นอน ให้ป้อนที่นี่ ส่วนที่เหลือจะเฉลี่ยให้คนที่ไม่ได้ป้อน" />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {item.assignedPeople.map(pid => {
                          const p = people.find(person => person.id === pid);
                          const lockedVal = item.lockedShares[pid];
                          return (
                            <div key={pid} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl group transition-all focus-within:bg-orange-50/30">
                              <span className="text-sm font-black text-gray-600 flex-1">{p?.name}</span>
                              <div className="flex items-center gap-2">
                                <NumericInput 
                                  value={lockedVal} 
                                  onChange={v => setLockedShare(item.id, pid, v)} 
                                  placeholder="หารเท่ากัน"
                                  prefix="฿"
                                  className="w-32 bg-white border border-gray-100 text-sm font-black p-3 rounded-xl text-right focus:outline-none focus:border-orange-200"
                                />
                                {lockedVal !== undefined && (
                                  <button onClick={() => setLockedShare(item.id, pid, null)} className="text-orange-500 p-2 hover:bg-orange-100 rounded-lg transition">
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setStep(2)} className="flex-1 bg-white border border-gray-100 py-5 rounded-[24px] font-black text-sm transition-all hover:bg-gray-50">ย้อนกลับ</button>
              <button onClick={() => setStep(4)} className="flex-[2] bg-[#E8622A] text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-100 transition-all hover:scale-[1.01]">
                สรุปยอดรวม <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Summary */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white rounded-[40px] p-10 border border-gray-50 shadow-2xl shadow-gray-200/50 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><DollarSign size={120} /></div>
              <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4">ยอดรวมสุทธิทั้งสิ้น</p>
              <h2 className="text-6xl font-black text-[#1A1A1A] italic tracking-tighter">฿{splitResult.totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-50">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ยอดรวม</p>
                  <p className="text-base font-black">฿{splitResult.totals.subtotal.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ส่วนลด</p>
                  <p className="text-base font-black text-red-500">-฿{splitResult.totals.discount.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ค่าบริการ</p>
                  <p className="text-base font-black">฿{splitResult.totals.serviceCharge.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ภาษี</p>
                  <p className="text-base font-black">฿{splitResult.totals.vat.toLocaleString()}</p>
                </div>
              </div>
            </section>

            {!promptPayId && (
              <div className="p-5 bg-orange-50 rounded-[32px] border border-orange-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#E8622A] shadow-sm">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <p className="text-[14px] text-gray-900 font-black italic">ยังไม่ได้ตั้งค่าพร้อมเพย์?</p>
                    <p className="text-[10px] text-gray-500 font-bold">ตั้งค่าเลขบัญชีเพื่อรับเงินจากเพื่อนได้ที่หน้าโปรไฟล์</p>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/profile')}
                  className="bg-[#E8622A] text-white px-5 py-2.5 rounded-xl text-[12px] font-black shadow-lg shadow-orange-100 hover:scale-105 transition-transform"
                >
                  ตั้งค่าเลย
                </button>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-1 h-6 bg-[#E8622A] rounded-full"></div>
                 <h3 className="font-black text-lg">สรุปยอดที่แต่ละคนต้องจ่าย</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {Object.values(splitResult.personBreakdown).map((p, i) => (
                  <div key={i} className="bg-white rounded-[32px] p-6 border border-gray-50 shadow-lg shadow-gray-200/20 group hover:scale-[1.01] transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-black text-2xl text-[#1A1A1A]">{p.name}</h4>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">ยอดที่ต้องจ่าย</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-3xl font-black text-[#E8622A]">฿{p.totalFinal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                      {promptPayId && (
                        <button 
                          onClick={() => setQrData({ 
                            name: p.name, 
                            amount: p.totalFinal, 
                            payload: generatePromptPayPayload(promptPayId, p.totalFinal),
                            items: p.items,
                            adjustments: p.adjustments
                          })}
                          className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-green-100 hover:bg-green-100 transition"
                        >
                          <ScanLine size={12} /> สร้าง QR พร้อมเพย์
                        </button>
                      )}
                    </div>
                    </div>
                    <div className="space-y-3 bg-gray-50/50 p-5 rounded-3xl">
                      {p.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-bold text-gray-500">
                          <span>{it.name || "รายการ"}</span>
                          <span>฿{it.share.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200/50 pt-3 mt-3 space-y-2">
                        {p.adjustments.discount > 0 && (
                          <div className="flex justify-between text-[11px] text-red-500 font-black">
                            <span>ส่วนลดเฉลี่ย</span>
                            <span>-฿{p.adjustments.discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] text-gray-400 font-black">
                          <span>ค่าบริการ & ภาษี</span>
                          <span>+฿{(p.adjustments.serviceCharge + p.adjustments.vat).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="bg-white rounded-[32px] p-8 border border-gray-50 shadow-xl shadow-gray-200/40">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 block">ลงบันทึกรายจ่ายไปที่ทริป</label>
              <select value={selectedTrip} onChange={e => setSelectedTrip(e.target.value)}
                className="w-full bg-gray-50 border border-transparent p-5 rounded-2xl text-base font-black focus:bg-white focus:border-orange-100 focus:outline-none transition-all appearance-none cursor-pointer">
                <option value="">🏠 ไม่ใช่รายจ่ายทริป (บันทึกทั่วไป)</option>
                {trips.map(t => <option key={t.id} value={t.id}>✈️ {t.name}</option>)}
              </select>
            </section>

            <div className="flex gap-4 pt-6">
              <button onClick={() => setStep(3)} className="flex-1 bg-white border border-gray-100 py-5 rounded-[24px] font-black text-sm transition-all hover:bg-gray-50">ย้อนกลับ</button>
              <button onClick={handleSettle} disabled={saving} className="flex-[2] bg-[#1A1A1A] text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-black transition-all disabled:bg-gray-400">
                {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                {saving ? "กำลังบันทึก..." : "ยืนยันและบันทึกแยกรายคน"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-24 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className={`px-6 py-4 rounded-[24px] shadow-2xl border-2 flex items-center gap-4 backdrop-blur-md
            ${notification.type === 'success' ? 'bg-white/90 border-green-500 text-green-700' : 'bg-white/90 border-red-500 text-red-700'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
               {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <p className="font-black text-sm">{notification.message}</p>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrData && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-8 text-center shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setQrData(null)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X size={20}/></button>
            
            <div className="mb-6 pt-4">
              <h3 className="text-xl font-black mb-1">สแกนจ่ายให้ {user.displayName || 'ฉัน'}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">สำหรับ: {qrData.name}</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border-2 border-blue-500 mb-6 flex justify-center">
               <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.payload)}`} 
                alt="PromptPay QR" 
                className="w-full max-w-[200px] h-auto"
               />
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl mb-8">
               <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">ยอดเงินที่ต้องชำระ</p>
               <p className="text-3xl font-black text-blue-600 italic">฿{qrData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={downloadQR} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
                <Download size={20} /> บันทึกรูป
              </button>
              <button onClick={() => setQrData(null)} className="flex-1 py-4 bg-[#1A1A1A] text-white rounded-2xl font-black shadow-xl">ตกลง</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

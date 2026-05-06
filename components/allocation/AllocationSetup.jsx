"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Plus, Trash2, Save, AlertCircle, Loader2 } from "lucide-react";

const DEFAULT_CATEGORIES = [
  { id: "def_1", name: "ออม/เก็บ", pct: 50 },
  { id: "def_2", name: "ใช้จ่าย", pct: 30 },
  { id: "def_3", name: "ลงทุน", pct: 20 },
];

export default function AllocationSetup({ tripId, userId, categories: initialCategories, onUpdate }) {
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setCategories(
      initialCategories && initialCategories.length > 0
        ? initialCategories
        : DEFAULT_CATEGORIES
    );
  }, [initialCategories]);

  const total = categories.reduce((sum, c) => sum + (Number(c.pct) || 0), 0);
  const isValid = total === 100 && categories.length > 0 && categories.every((c) => c.name.trim());

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { id: `cat_${Date.now()}`, name: "", pct: Math.max(0, 100 - total) },
    ]);
  };

  const removeCategory = (id) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCategory = (id, field, value) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, `users/${userId}/trips/${tripId}`), {
        allocationCategories: categories,
      });
      setNotification({ type: "success", message: "✅ บันทึกหมวดหมู่เรียบร้อย" });
      onUpdate?.(categories);
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "❌ บันทึกไม่สำเร็จ กรุณาลองใหม่" });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">ตั้งค่าหมวดหมู่การจัดสรร</h3>
          <p className="text-zinc-500 text-xs mt-0.5">กำหนดสัดส่วน % ให้รวมได้ 100%</p>
        </div>
        <div
          className={`text-xs font-black px-3 py-1.5 rounded-full border ${
            total === 100
              ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
              : total > 100
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : "bg-zinc-800 text-zinc-400 border-zinc-700"
          }`}
        >
          {total}%
        </div>
      </div>

      {/* Category Rows */}
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <div key={cat.id} className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
            <span className="text-zinc-600 text-[10px] font-black w-4 shrink-0">{idx + 1}</span>
            <input
              type="text"
              value={cat.name}
              onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
              placeholder="ชื่อหมวดหมู่"
              className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-600 min-w-0"
            />
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={cat.pct}
                onChange={(e) => updateCategory(cat.id, "pct", Number(e.target.value))}
                min={0}
                max={100}
                className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-teal-400 font-black text-sm text-right focus:outline-none focus:border-teal-500 transition"
              />
              <span className="text-zinc-500 text-xs">%</span>
            </div>
            <button
              onClick={() => removeCategory(cat.id)}
              disabled={categories.length <= 1}
              className="p-1 text-zinc-600 hover:text-rose-400 transition disabled:opacity-30 shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={addCategory}
        className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-zinc-500 hover:text-teal-400 hover:border-teal-500/50 transition text-sm font-bold flex items-center justify-center gap-2"
      >
        <Plus size={14} /> เพิ่มหมวดหมู่
      </button>

      {/* Validation Warning */}
      {total !== 100 && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <p className="text-rose-400 text-xs font-bold">
            {total > 100
              ? `เกิน 100% อยู่ ${total - 100}%`
              : `ยังขาดอีก ${100 - total}% จะครบ 100%`}
          </p>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border ${
            notification.type === "success"
              ? "bg-teal-500/10 border-teal-500/20 text-teal-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-black rounded-xl transition flex items-center justify-center gap-2 text-sm"
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> กำลังบันทึก...
          </>
        ) : (
          <>
            <Save size={16} /> บันทึกการตั้งค่า
          </>
        )}
      </button>
    </div>
  );
}

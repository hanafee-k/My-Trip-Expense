"use client";
import { useState } from "react";
import { X, Plus, Edit2, Check, ArrowLeft } from "lucide-react";

// Predefined modern color options
const COLOR_OPTIONS = [
  { id: 'white', class: 'bg-white', hex: '#ffffff' },
  { id: 'orange', class: 'bg-orange-500', hex: '#f97316' },
  { id: 'blue', class: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'pink', class: 'bg-pink-500', hex: '#ec4899' },
  { id: 'purple', class: 'bg-purple-500', hex: '#a855f7' },
  { id: 'yellow', class: 'bg-yellow-500', hex: '#eab308' },
  { id: 'red', class: 'bg-red-500', hex: '#ef4444' },
  { id: 'green', class: 'bg-emerald-500', hex: '#10b981' },
  { id: 'teal', class: 'bg-teal-500', hex: '#14b8a6' },
  { id: 'indigo', class: 'bg-indigo-500', hex: '#6366f1' },
  { id: 'zinc', class: 'bg-zinc-500', hex: '#71717a' },
];

// Predefined common icons for categories
const ICON_OPTIONS = [
  "🍜", "🚕", "🛍️", "🏨", "🎡", "💊", "📝", "🛒", "✈️", "☕", 
  "🍔", "🚆", "🎁", "📱", "🎮", "🐾", "💇", "👕", "🏋️", "🔧"
];

export default function CategoryManagerModal({ isOpen, onClose, categories, onAddCategory, onUpdateCategory }) {
  const [view, setView] = useState("list"); // list, add, edit
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Form State
  const [form, setForm] = useState({ name: "", icon: "📝", color: "bg-zinc-500", hexColor: "#71717a" });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setForm({ name: "", icon: "📝", color: "bg-zinc-500", hexColor: "#71717a" });
    setEditingCategory(null);
    setView("list");
  };

  const handleEditClick = (category) => {
    setEditingCategory(category);
    setForm({ 
      name: category.name, 
      icon: category.icon, 
      color: category.color || "bg-zinc-500", 
      hexColor: category.hexColor || "#71717a" 
    });
    setView("edit");
  };

  const handleAddClick = () => {
    resetForm();
    setView("add");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    setSubmitting(true);
    try {
      if (view === "edit" && editingCategory) {
        await onUpdateCategory(editingCategory.id, {
          name: form.name.trim(),
          icon: form.icon,
          color: form.color,
          hexColor: form.hexColor
        });
      } else if (view === "add") {
        await onAddCategory({
          name: form.name.trim(),
          icon: form.icon,
          color: form.color,
          hexColor: form.hexColor
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button 
                onClick={() => setView("list")} 
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="font-black text-xl text-[#1A1A1A]">
              {view === "list" ? "จัดการหมวดหมู่" : view === "edit" ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {view === "list" ? (
            <div className="space-y-4">
              {/* Add New Button */}
              <button 
                onClick={handleAddClick}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#E8622A]/30 text-[#E8622A] bg-[#FFF4EF]/50 hover:bg-[#FFF4EF] rounded-2xl font-bold transition-all"
              >
                <Plus size={20} /> สร้างหมวดหมู่ใหม่
              </button>

              <div className="mt-6 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">หมวดหมู่ของคุณ</p>
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[14px] ${cat.color || 'bg-gray-100'} bg-opacity-15 flex items-center justify-center text-2xl shadow-sm`}>
                        {cat.icon}
                      </div>
                      <span className="font-bold text-gray-900">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => handleEditClick(cat)}
                      className="p-2.5 rounded-xl bg-gray-50 text-gray-400 group-hover:text-[#E8622A] group-hover:bg-[#FFF4EF] transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Preview */}
              <div className="flex justify-center mb-8">
                <div className={`w-24 h-24 rounded-3xl ${form.color} bg-opacity-20 flex items-center justify-center text-5xl shadow-inner border-2 border-white transition-all duration-300`}>
                  {form.icon}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">ชื่อหมวดหมู่</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น ค่าอาหาร, เดินทาง..."
                  className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-[#1A1A1A] font-bold focus:outline-none focus:ring-2 focus:ring-[#E8622A] focus:border-transparent transition-all"
                  required 
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">เลือกสี</label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.class, hexColor: c.hex })}
                      className={`w-10 h-10 rounded-full ${c.class} flex items-center justify-center transition-all ${
                        form.color === c.class ? 'ring-4 ring-offset-2 ring-gray-200 scale-110' : 'hover:scale-110 opacity-80'
                      }`}
                    >
                      {form.color === c.class && <Check size={16} className="text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">เลือกไอคอน</label>
                <div className="grid grid-cols-5 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 h-48 overflow-y-auto custom-scrollbar">
                  {ICON_OPTIONS.map((icon, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                        form.icon === icon ? 'bg-white shadow-md scale-110 ring-2 ring-[#E8622A]' : 'hover:bg-white hover:scale-105 hover:shadow-sm'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={submitting || !form.name.trim()}
                className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-black disabled:bg-gray-300 disabled:shadow-none transition-all mt-4"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึกหมวดหมู่"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

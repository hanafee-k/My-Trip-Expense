"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, Settings2, Tag } from "lucide-react";

export default function CategorySelector({ categories, selectedId, onChange, onManageClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedCategory = categories.find(c => c.id === selectedId) || categories[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs text-[#6B6B6B] block mb-2 font-medium flex items-center gap-1">
        <Tag size={14} /> หมวดหมู่
      </label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border ${isOpen ? 'border-[#E8622A] ring-2 ring-orange-100' : 'border-gray-200'} 
          p-3 rounded-xl text-[#1A1A1A] text-sm focus:outline-none transition-all flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          {selectedCategory ? (
            <>
              <span className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center text-lg`}>
                {selectedCategory.icon}
              </span>
              <span className="font-semibold">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-gray-400">เลือกหมวดหมู่</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="ค้นหาหมวดหมู่..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Category List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onChange(cat.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    selectedId === cat.id ? 'bg-orange-50/50 text-[#E8622A]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-white`}>
                      {cat.icon}
                    </span>
                    <span className={`text-sm font-semibold ${selectedId === cat.id ? 'text-[#E8622A]' : 'text-gray-700'}`}>
                      {cat.name}
                    </span>
                  </div>
                  {selectedId === cat.id && <Check size={16} className="text-[#E8622A]" />}
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                ไม่พบหมวดหมู่ที่ค้นหา
              </div>
            )}
          </div>

          {/* Manage Button */}
          <div className="p-2 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if(onManageClick) onManageClick();
              }}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-600 hover:text-[#E8622A] hover:bg-white rounded-lg transition-all"
            >
              <Settings2 size={16} />
              จัดการหมวดหมู่ของคุณ
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

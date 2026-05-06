import React, { useState, useEffect } from 'react';
import { Calendar, Filter, ChevronDown, Check, X, Plane, Clock } from 'lucide-react';
import { getDateRange, formatDateShortThai } from '../lib/dateUtils';

export default function FilterBar({ trips, onChange, initialPeriod = 'month' }) {
  const [filterMode, setFilterMode] = useState('period'); // 'period' | 'trip'
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showTripDropdown, setShowTripDropdown] = useState(false);

  const periods = [
    { id: 'today', label: 'วันนี้' },
    { id: 'month', label: 'เดือนนี้' },
    { id: 'year', label: 'ปีนี้' },
    { id: 'lastyear', label: 'ปีที่แล้ว' },
    { id: 'all', label: 'ทั้งหมด' }
  ];

  // Sync internal state with props if needed, but for now we'll just handle internal changes
  const handlePeriodChange = (periodId) => {
    setSelectedPeriod(periodId);
    setFilterMode('period');
    setSelectedTrip(null);
    const range = getDateRange(periodId);
    onChange({ ...range, tripId: 'all' });
  };

  const handleTripChange = (trip) => {
    setSelectedTrip(trip);
    setFilterMode('trip');
    setShowTripDropdown(false);
    
    // If trip has startDate/endDate, use them. Otherwise, use a wide range.
    // In our case, trips don't have startDate yet, so we'll use a wide range for now.
    // But we'll try to get it if it exists.
    const start = trip.startDate ? 
      (typeof trip.startDate.toDate === 'function' ? trip.startDate.toDate().toISOString().split('T')[0] : trip.startDate) 
      : "1970-01-01";
    const end = trip.endDate ? 
      (typeof trip.endDate.toDate === 'function' ? trip.endDate.toDate().toISOString().split('T')[0] : trip.endDate) 
      : "2099-12-31";
    
    onChange({ start, end, tripId: trip.id });
  };

  const clearTrip = () => {
    setSelectedTrip(null);
    handlePeriodChange('month');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Period Pills */}
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePeriodChange(p.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
              filterMode === 'period' && selectedPeriod === p.id
                ? "bg-[#E8622A] border-[#E8622A] text-white shadow-md shadow-orange-500/20"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="h-6 w-[1px] bg-gray-200 mx-1 flex-shrink-0"></div>

        {/* Trip Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowTripDropdown(!showTripDropdown);
          }}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border flex items-center gap-2 ${
            filterMode === 'trip'
              ? "bg-[#E8622A] border-[#E8622A] text-white shadow-md shadow-orange-500/20"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <Plane size={14} />
          ดูตามทริป
          <ChevronDown size={14} className={`transition-transform ${showTripDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Selected Trip Chip */}
      {selectedTrip && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
          <div className="bg-[#FFF4EF] text-[#E8622A] px-3 py-1.5 rounded-xl border border-[#fbdcd0] text-sm font-bold flex items-center gap-2 shadow-sm">
            <Plane size={14} />
            {selectedTrip.name}
            <button onClick={clearTrip} className="p-0.5 hover:bg-orange-100 rounded-full transition ml-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Trip Dropdown / Modal */}
      {showTripDropdown && (
        <>
          <div className="fixed inset-0 z-[300] bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setShowTripDropdown(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[301] bg-white rounded-t-3xl p-6 lg:absolute lg:top-full lg:bottom-auto lg:left-0 lg:right-auto lg:mt-2 lg:w-72 lg:rounded-2xl lg:shadow-xl lg:border lg:border-gray-100 max-h-[70vh] flex flex-col animate-in slide-in-from-bottom-full lg:slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#1A1A1A]">เลือกทริป</h3>
              <button onClick={() => setShowTripDropdown(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
              {trips.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm italic">ยังไม่มีทริป</div>
              ) : (
                trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => handleTripChange(trip)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${
                      selectedTrip?.id === trip.id
                        ? "bg-[#FFF4EF] border-[#E8622A] text-[#E8622A]"
                        : "bg-white border-gray-100 text-[#1A1A1A] hover:border-gray-200"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-bold text-sm">{trip.name}</p>
                      <p className="text-xs opacity-70 flex items-center gap-1 mt-1 font-medium">
                        <Clock size={10} />
                        {trip.startDate ? 
                          `${formatDateShortThai(typeof trip.startDate.toDate === 'function' ? trip.startDate.toDate().toISOString().split('T')[0] : trip.startDate)} - ${formatDateShortThai(typeof trip.endDate.toDate === 'function' ? trip.endDate.toDate().toISOString().split('T')[0] : trip.endDate)}` 
                          : 'ไม่ระบุวันที่'}
                      </p>
                    </div>
                    {selectedTrip?.id === trip.id && <Check size={18} className="shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { getMonthRange, getWeeksOfMonth, getMonthLabel, getTodayDate } from '../lib/dateUtils';

export function useTimeFilter() {
  const now = new Date();
  const [viewMode, setViewMode] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const weekOptions = useMemo(
    () => getWeeksOfMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return { start: selectedDate, end: selectedDate };
      case 'weekly': {
        const week = weekOptions[selectedWeek - 1];
        return week
          ? { start: week.start, end: week.end }
          : getMonthRange(selectedYear, selectedMonth);
      }
      case 'monthly':
      default:
        return getMonthRange(selectedYear, selectedMonth);
    }
  }, [viewMode, selectedYear, selectedMonth, selectedWeek, selectedDate, weekOptions]);

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: getMonthLabel(d.getFullYear(), d.getMonth()),
      });
    }
    return options;
  }, []);

  const selectMonth = (year, month) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedWeek(1);
  };

  const prevMonth = () => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    selectMonth(d.getFullYear(), d.getMonth());
  };

  const nextMonth = () => {
    const d = new Date(selectedYear, selectedMonth + 1, 1);
    selectMonth(d.getFullYear(), d.getMonth());
  };

  return {
    viewMode, setViewMode,
    selectedYear, selectedMonth, selectedWeek, selectedDate,
    setSelectedWeek, setSelectedDate,
    selectMonth, prevMonth, nextMonth,
    dateRange,
    monthOptions,
    weekOptions,
    currentMonthLabel: getMonthLabel(selectedYear, selectedMonth),
  };
}

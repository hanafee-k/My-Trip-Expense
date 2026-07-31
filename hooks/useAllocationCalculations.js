import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { doc, collection, query, onSnapshot, orderBy } from "firebase/firestore";

const DEFAULT_CATEGORIES = [
  { id: "bills", name: "ค่าหอ & ผ่อนชำระ", pct: 35 },
  { id: "gas",   name: "ค่าน้ำมันรถ",       pct: 12 },
  { id: "spend", name: "ใช้จ่ายรายวัน",     pct: 33 },
  { id: "save",  name: "เงินออมสะสม",       pct: 12 },
  { id: "fun",   name: "ความสุขส่วนตัว",    pct: 8 },
];

/**
 * Custom hook for managing allocation categories and calculating amounts
 * Uses real-time listeners (onSnapshot) to automatically update when:
 * 1. Category percentages change
 * 2. Daily incomes are added/modified
 *
 * @param {string} userId - The user ID for fetching user-specific data
 * @param {string} tripId - Optional trip ID (if using trip-scoped data)
 * @returns {Object} { categories, incomes, loading, calculateAllocation, getCategoryTotal }
 */
export function useAllocationCalculations(userId, tripId = null) {
  const [categories, setCategories] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [savingStartDate, setSavingStartDate] = useState("");
  const [loading, setLoading] = useState(true);

  // ─── Real-time listener for categories ───
  useEffect(() => {
    if (!userId) {
      setCategories(DEFAULT_CATEGORIES);
      setSavingStartDate("");
      setLoading(false);
      return;
    }

    const configPath = tripId
      ? `users/${userId}/trips/${tripId}`
      : `users/${userId}/allocationConfig`;

    const configDoc = tripId
      ? doc(db, configPath)
      : doc(db, configPath, "main");

    const unsubscribeConfig = onSnapshot(configDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const cats = data.allocationCategories || data.categories || [];
        setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
        setSavingStartDate(data.savingStartDate || "");
      } else {
        setCategories(DEFAULT_CATEGORIES);
        setSavingStartDate("");
      }
    });

    return () => unsubscribeConfig();
  }, [userId, tripId]);

  // ─── Real-time listener for incomes ───
  useEffect(() => {
    if (!userId) {
      setIncomes([]);
      setLoading(false);
      return;
    }

    const incomesPath = tripId
      ? `users/${userId}/trips/${tripId}/dailyIncomes`
      : `users/${userId}/dailyIncomes`;

    const q = query(
      collection(db, incomesPath),
      orderBy("date", "desc")
    );

    const unsubscribeIncomes = onSnapshot(q, (snap) => {
      setIncomes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsubscribeIncomes();
  }, [userId, tripId]);

  /**
   * Calculates the allocated amount for a specific category and income
   * Formula: (income * categoryPercentage) / 100
   *
   * @param {number} income - The total income amount
   * @param {number} percentage - The category percentage (0-100)
   * @returns {number} The calculated allocation amount
   */
  const calculateAllocation = (income, percentage) => {
    return (income * percentage) / 100;
  };

  /**
   * Gets the total allocation for a category across all incomes
   * Re-calculates whenever incomes or categories change
   *
   * @param {string} categoryId - The category ID
   * @returns {number} Total allocated amount for the category
   */
  const getCategoryTotal = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return 0;

    const relevantIncomes = savingStartDate
      ? incomes.filter((inc) => inc.date >= savingStartDate)
      : incomes;

    const allocatedSum = relevantIncomes.reduce(
      (sum, inc) => sum + calculateAllocation(inc.income, category.pct),
      0
    );

    return (Number(category.initialBalance) || 0) + allocatedSum;
  };

  /**
   * Gets category breakdown with calculated totals
   * Useful for summary displays
   *
   * @returns {Array} Array of categories with calculated totals
   */
  const getCategoryTotals = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      total: getCategoryTotal(cat.id),
    }));
  }, [categories, incomes, savingStartDate]);

  /**
   * Gets income breakdown by category
   * Returns income with all categories and their allocated amounts
   *
   * @returns {Array} Array of incomes with category allocations
   */
  const getIncomeWithAllocations = useMemo(() => {
    return incomes.map((inc) => ({
      ...inc,
      allocations: categories.map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        percentage: cat.pct,
        amount: calculateAllocation(inc.income, cat.pct),
      })),
    }));
  }, [incomes, categories]);

  return {
    categories,
    incomes,
    savingStartDate,
    loading,
    calculateAllocation,
    getCategoryTotal,
    getCategoryTotals,
    getIncomeWithAllocations,
  };
}

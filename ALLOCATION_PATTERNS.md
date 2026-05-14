# Allocation Refactoring - Implementation Checklist & Code Patterns

## ✅ Refactoring Completed

- [x] Created `useAllocationCalculations` hook with real-time listeners
- [x] Refactored `AllocationOverview` to use hook
- [x] Refactored `DailyIncomeForm` to use hook
- [x] Refactored `app/allocation/page.js` to use hook
- [x] Documented component patterns
- [x] Tested real-time updates
- [x] Verified Firestore data model

---

## 📋 Quick Verification Checklist

### Code Review
- [ ] `useAllocationCalculations.js` has proper JSDoc comments
- [ ] All components import and use the hook correctly
- [ ] No manual `onSnapshot` in components for categories/incomes
- [ ] No pre-calculated amounts stored in new Firestore documents
- [ ] `DailyAllocationTable` remains a pure presentational component
- [ ] No calculation logic duplicated across components

### Firestore
- [ ] New income documents only have: `date`, `income`, `note`, `createdAt`
- [ ] No `categories` field in new income documents
- [ ] Categories stored in: `users/{uid}/allocationConfig/main` or `users/{uid}/trips/{tripId}`
- [ ] Old documents with pre-calculated amounts still display correctly

### Real-time Functionality
- [ ] Changing percentage → all displays update immediately
- [ ] Adding income → preview shows current percentages
- [ ] Multiple tabs/windows → all update in sync
- [ ] No page refresh required for updates
- [ ] Loading states properly handled

---

## 🏗️ Architecture Reference

### Hook Integration Pattern

```javascript
import { useAllocationCalculations } from "@/hooks/useAllocationCalculations";

export default function ComponentName({ userId, tripId }) {
  // Step 1: Call the hook
  const { 
    categories,              // Array of current categories
    incomes,                 // Array of current incomes
    loading,                 // Boolean - true while fetching
    calculateAllocation,     // Function for calculations
    getCategoryTotals,       // Pre-calculated totals with useMemo
  } = useAllocationCalculations(userId, tripId);

  // Step 2: Handle loading state
  if (loading) return <LoadingSpinner />;

  // Step 3: Use the data - hook handles real-time updates automatically!
  return (
    <div>
      {getCategoryTotals.map(cat => (
        <div key={cat.id}>
          {cat.name}: ฿{cat.total.toLocaleString()}
        </div>
      ))}
    </div>
  );
}
```

---

## 💾 Firestore Data Structure

### New Pattern: Minimal Income Document
```javascript
// Collection: users/{uid}/dailyIncomes
{
  date: "2024-05-14",
  income: 1500,
  note: "Freelance project",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Categories Configuration
```javascript
// Document: users/{uid}/allocationConfig/main
{
  categories: [
    { id: "save", name: "ออม/เก็บ", pct: 50 },
    { id: "spend", name: "ใช้จ่าย", pct: 30 },
    { id: "invest", name: "ลงทุน", pct: 20 }
  ]
}

// Or for trips:
// Document: users/{uid}/trips/{tripId}
{
  allocationCategories: [
    { id: "save", name: "ออม/เก็บ", pct: 50 },
    // ...
  ]
}
```

---

## 🔄 Data Flow Diagrams

### User Changes Percentage

```
┌─────────────────────────────────────────┐
│  User edits: "Savings" 50% → 60%        │
│  AllocationSetup component              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  updateDoc(allocationConfig/main)       │
│  Firestore update                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Hook's onSnapshot(categories) fired    │
│  Listener detects change                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  setCategories([...new categories])     │
│  Hook state updates                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  getCategoryTotals recalculates         │
│  useMemo dependency: categories changed │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Components re-render                   │
│  All displays update instantly          │
└─────────────────────────────────────────┘
```

### User Adds New Income

```
┌─────────────────────────────────────────┐
│  User submits income form (1000฿)       │
│  DailyIncomeForm component              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  addDoc(dailyIncomes, {                 │
│    date, income, note, createdAt        │
│    // NO pre-calculated amounts!        │
│  })                                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Hook's onSnapshot(incomes) fired       │
│  New income added to incomes array      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  getCategoryTotals recalculates         │
│  Uses CURRENT percentages               │
│  useMemo dependency: incomes changed    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  AllocationOverview re-renders          │
│  Shows new allocations with latest %    │
└─────────────────────────────────────────┘
```

---

## 🎯 Common Code Patterns

### Pattern 1: Display Category Totals

```javascript
import { useAllocationCalculations } from "@/hooks/useAllocationCalculations";

export function CategorySummary({ userId, tripId }) {
  const { getCategoryTotals, loading } = useAllocationCalculations(userId, tripId);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-2">
      {getCategoryTotals.map(cat => (
        <div key={cat.id} className="flex justify-between">
          <span>{cat.name}</span>
          <strong>฿{cat.total.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Show Allocation for Specific Income

```javascript
import { useAllocationCalculations } from "@/hooks/useAllocationCalculations";

export function IncomeAllocationPreview({ income, userId, tripId }) {
  const { categories } = useAllocationCalculations(userId, tripId);

  return (
    <table>
      <tbody>
        {categories.map(cat => {
          const allocated = (income * cat.pct) / 100;
          return (
            <tr key={cat.id}>
              <td>{cat.name}</td>
              <td>{cat.pct}%</td>
              <td>฿{allocated.toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

### Pattern 3: Calculate Single Category Total

```javascript
import { useAllocationCalculations } from "@/hooks/useAllocationCalculations";

export function SavingsTotal({ userId, tripId }) {
  const { getCategoryTotal } = useAllocationCalculations(userId, tripId);

  const savingsTotal = getCategoryTotal("save");

  return <div>Total Savings: ฿{savingsTotal.toLocaleString()}</div>;
}
```

### Pattern 4: Compare Old vs New Calculations

```javascript
// For migration or auditing purposes
const { calculateAllocation } = useAllocationCalculations(userId, tripId);

const oldPercentage = 50;
const newPercentage = 55;
const income = 1000;

const oldAmount = calculateAllocation(income, oldPercentage);  // 500
const newAmount = calculateAllocation(income, newPercentage);  // 550
const difference = newAmount - oldAmount;                       // 50
```

---

## 🚨 Anti-Patterns (What NOT to Do)

### ❌ Pattern 1: Manual Categories State
```javascript
// DON'T do this:
const [categories, setCategories] = useState([]);

useEffect(() => {
  const unsub = onSnapshot(collection(db, "categories"), (snap) => {
    setCategories(snap.docs.map(d => d.data()));
  });
  return () => unsub();
}, []);

// DO this instead:
const { categories } = useAllocationCalculations(userId, tripId);
```

### ❌ Pattern 2: Storing Pre-Calculated Amounts
```javascript
// DON'T store this in Firestore:
{
  date: "2024-05-14",
  income: 1000,
  savingsAmount: 500,      // ❌ Pre-calculated
  spendAmount: 300,        // ❌ Pre-calculated
  investAmount: 200        // ❌ Pre-calculated
}

// DO store just this:
{
  date: "2024-05-14",
  income: 1000
  // ✅ Calculate on-the-fly when needed
}
```

### ❌ Pattern 3: Duplicate Calculation Logic
```javascript
// ❌ DON'T do calculations multiple places:
// In Component A:
const allocation = (income * percentage) / 100;

// In Component B:
const alloc = income * pct / 100;

// In Component C:
const amount = income / 100 * pct;

// DO use the hook's method:
const { calculateAllocation } = useAllocationCalculations(userId, tripId);
const allocation = calculateAllocation(income, percentage);
```

### ❌ Pattern 4: Prop Drilling Categories
```javascript
// ❌ DON'T pass categories through many levels:
<GrandParent categories={categories}>
  <Parent categories={categories}>
    <Child categories={categories}>
      <Display categories={categories} />
    </Child>
  </Parent>
</GrandParent>

// DO use the hook directly where needed:
export function Display({ userId, tripId }) {
  const { categories } = useAllocationCalculations(userId, tripId);
  // ...
}
```

---

## 🧪 Testing Guidelines

### Unit Test Example
```javascript
describe("useAllocationCalculations", () => {
  it("should calculate allocation correctly", () => {
    const { calculateAllocation } = renderHook(() =>
      useAllocationCalculations(testUserId)
    ).result.current;

    const result = calculateAllocation(1000, 50);
    expect(result).toBe(500);
  });

  it("should update when categories change", async () => {
    const { result } = renderHook(() =>
      useAllocationCalculations(testUserId)
    );

    // Simulate category change in Firestore
    act(() => {
      firebaseEmulator.update("categories", { pct: 60 });
    });

    await waitFor(() => {
      expect(result.current.getCategoryTotals).toHaveLength(3);
    });
  });
});
```

### Integration Test Example
```javascript
test("percentage change updates all displays", async () => {
  render(
    <AllocationOverview userId={testUserId} tripId={testTripId} />
  );

  // Verify initial display
  expect(screen.getByText(/฿1000/)).toBeInTheDocument();

  // Simulate percentage change
  await updateCategoryPercentage("save", 60);

  // Verify automatic update (no refresh needed)
  await waitFor(() => {
    expect(screen.getByText(/฿1200/)).toBeInTheDocument();
  });
});
```

---

## 📚 Reference Links

- **Hook Implementation**: [hooks/useAllocationCalculations.js](hooks/useAllocationCalculations.js)
- **Example: AllocationOverview**: [components/allocation/AllocationOverview.jsx](components/allocation/AllocationOverview.jsx)
- **Example: DailyIncomeForm**: [components/allocation/DailyIncomeForm.jsx](components/allocation/DailyIncomeForm.jsx)
- **Full Guide**: [ALLOCATION_REFACTORING.md](ALLOCATION_REFACTORING.md)
- **Quick Summary**: [ALLOCATION_REFACTORING_SUMMARY.md](ALLOCATION_REFACTORING_SUMMARY.md)

---

## 🎓 Lessons Learned

1. **Centralize State Logic**: Use custom hooks to manage complex data fetching
2. **Embrace Real-time**: Leverage Firestore listeners for reactive UX
3. **Minimal Data Storage**: Calculate what you can instead of storing it
4. **Separation of Concerns**: Keep components pure and presentational
5. **Document Patterns**: Help future developers understand the architecture

---

## 🔮 Future Improvements

- [ ] Add offline support with local caching
- [ ] Implement batch calculations for reports
- [ ] Add historical percentage tracking
- [ ] Create admin dashboard for analytics
- [ ] Add performance monitoring for listener efficiency

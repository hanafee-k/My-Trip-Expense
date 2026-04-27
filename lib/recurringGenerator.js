import { db } from "./firebase";
import { 
  collection, addDoc, updateDoc, doc, query, where, getDocs, 
  Timestamp, serverTimestamp 
} from "firebase/firestore";

/**
 * Process all active recurring rules for a user and generate transactions if due.
 * @param {Object} user - The authenticated user object from AuthContext
 */
export const processRecurringTransactions = async (user) => {
  if (!user) return;

  try {
    const now = new Date();
    const recurringRef = collection(db, `users/${user.uid}/recurring_rules`);
    
    // Query rules that are active and due (nextOccurrence <= now)
    const q = query(
      recurringRef, 
      where("status", "==", "active"),
      where("nextOccurrence", "<=", Timestamp.fromDate(now))
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;

    for (const ruleDoc of querySnapshot.docs) {
      const rule = ruleDoc.data();
      const ruleId = ruleDoc.id;

      // 1. Create the transaction
      const transactionPayload = {
        amount: rule.amount,
        note: rule.note + " (ประจำเป็นงวด)",
        type: rule.type,
        categoryId: rule.categoryId,
        tripId: rule.tripId,
        date: rule.nextOccurrence, // Use the date it was supposed to happen
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        generatedFrom: ruleId // Track which rule generated this
      };

      await addDoc(collection(db, `users/${user.uid}/transactions`), transactionPayload);

      // 2. Calculate next occurrence
      const currentOccurrence = rule.nextOccurrence.toDate();
      const nextDate = calculateNextOccurrence(currentOccurrence, rule.frequency);

      // 3. Update the rule
      await updateDoc(doc(db, `users/${user.uid}/recurring_rules`, ruleId), {
        nextOccurrence: Timestamp.fromDate(nextDate),
        updatedAt: serverTimestamp(),
        lastGenerated: serverTimestamp()
      });
      
      console.log(`Generated recurring transaction for rule: ${ruleId}`);
    }
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
  }
};

/**
 * Calculate the next date based on frequency
 * @param {Date} current - The current occurrence date
 * @param {string} frequency - 'daily', 'weekly', 'monthly', 'yearly'
 * @returns {Date}
 */
const calculateNextOccurrence = (current, frequency) => {
  const next = new Date(current);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }
  return next;
};

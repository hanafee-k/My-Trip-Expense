/**
 * Calculates the split breakdown for an itemized receipt.
 * 
 * @param {Array} items - Array of { id, name, price, qty, assignedPeople: [id], lockedShares: { personId: amount } }
 * @param {Array} people - Array of { id, name }
 * @param {Object} config - { serviceChargePercent, vatPercent, discountAmount }
 * @returns {Object} { personBreakdown: { personId: { total, items: [] } }, totals: { subtotal, serviceCharge, vat, discount, grandTotal } }
 */
export const calculateSplitBreakdown = (items, people, config) => {
  const { serviceChargePercent = 0, vatPercent = 0, discountAmount = 0 } = config;
  
  const personBreakdown = {};
  people.forEach(p => {
    personBreakdown[p.id] = { 
      name: p.name,
      totalBase: 0, 
      items: [] 
    };
  });

  let subtotal = 0;

  items.forEach(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    const assignedIds = item.assignedPeople || [];
    if (assignedIds.length === 0) return;

    // Calculate locked and unlocked amounts
    const lockedTotal = Object.entries(item.lockedShares || {})
      .filter(([pid]) => assignedIds.includes(pid))
      .reduce((sum, [_, amt]) => sum + amt, 0);
    
    const lockedCount = Object.keys(item.lockedShares || {})
      .filter(pid => assignedIds.includes(pid)).length;
    
    const remainingToSplit = itemTotal - lockedTotal;
    const shareForUnlocked = assignedIds.length > lockedCount 
      ? remainingToSplit / (assignedIds.length - lockedCount) 
      : 0;

    assignedIds.forEach(pid => {
      if (!personBreakdown[pid]) return;

      const isLocked = item.lockedShares && item.lockedShares[pid] !== undefined;
      const share = isLocked ? item.lockedShares[pid] : shareForUnlocked;

      personBreakdown[pid].totalBase += share;
      personBreakdown[pid].items.push({
        itemId: item.id,
        name: item.name,
        share: share
      });
    });
  });

  // Apply global adjustments (Service Charge, VAT, Discount)
  // These are usually applied proportionally to the subtotal
  const ratio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 0;
  
  // Calculate multipliers
  const scMultiplier = 1 + (serviceChargePercent / 100);
  const vatMultiplier = 1 + (vatPercent / 100);

  let finalGrandTotal = 0;
  Object.keys(personBreakdown).forEach(pid => {
    const p = personBreakdown[pid];
    
    // Apply discount proportionally
    const afterDiscount = p.totalBase * ratio;
    
    // Apply Service Charge and VAT
    const afterSC = afterDiscount * scMultiplier;
    const finalTotal = afterSC * vatMultiplier;

    p.totalFinal = finalTotal;
    p.adjustments = {
      discount: p.totalBase - afterDiscount,
      serviceCharge: afterSC - afterDiscount,
      vat: finalTotal - afterSC
    };
    
    finalGrandTotal += finalTotal;
  });

  const scTotal = (subtotal - discountAmount) * (serviceChargePercent / 100);
  const vatTotal = ((subtotal - discountAmount) + scTotal) * (vatPercent / 100);

  return {
    personBreakdown,
    totals: {
      subtotal,
      discount: discountAmount,
      serviceCharge: scTotal,
      vat: vatTotal,
      grandTotal: finalGrandTotal
    }
  };
};

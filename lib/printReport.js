export function openReportPrintWindow({
  transactions = [],
  categories = [],
  startDate,
  endDate,
  selectedTripName,
  reportTitle = "รายงานสรุปยอด"
} = {}) {
  // Helper to format date to YYYY-MM-DD using local timezone
  function formatLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper to safely get Date object from Firestore timestamp or string
  function toDateObj(t) {
    if (!t) return null;
    if (t.toDate && typeof t.toDate === 'function') return t.toDate();
    if (t instanceof Date) return t;
    return new Date(t);
  }

  function fmtDate(d, withTime = false) {
    if (!d) return "-";
    try {
      const opts = { day: 'numeric', month: 'short', year: 'numeric' };
      if (withTime) opts.hour = '2-digit', opts.minute = '2-digit';
      return d.toLocaleDateString('th-TH', opts);
    } catch (e) {
      return formatLocalDateString(d);
    }
  }

  function fmtAmount(v) {
    const num = Number(v) || 0;
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtAmountWithSymbol(v) {
    return '฿' + fmtAmount(v);
  }

  // Category color mapping
  const catColors = {
    food: { emoji: '🍜', name: 'อาหาร & เครื่องดื่ม', color: '#EA580C', bg: '#FEF3F0', text: '#9A2E0E' },
    transport: { emoji: '🚕', name: 'เดินทาง & ขนส่ง', color: '#0EA5E9', bg: '#F0F9FF', text: '#0C4A6E' },
    shopping: { emoji: '🛍️', name: 'ช็อปปิ้ง', color: '#EC4899', bg: '#FDF2F8', text: '#831843' },
    hotel: { emoji: '🏨', name: 'ที่พัก', color: '#8B5CF6', bg: '#FAF5FF', text: '#4C1D95' },
    entertainment: { emoji: '🎭', name: 'ความบันเทิง', color: '#A855F7', bg: '#FAFAF9', text: '#3F1F66' },
    health: { emoji: '💊', name: 'สุขภาพ', color: '#10B981', bg: '#F0FDF4', text: '#064E3B' },
    other: { emoji: '📝', name: 'อื่นๆ', color: '#6B7280', bg: '#F9FAFB', text: '#374151' }
  };

  function getCategoryStyle(catId) {
    return catColors[catId] || catColors.other;
  }

  // Sort transactions by date ascending
  const txs = (transactions || []).slice().sort((a, b) => {
    const da = toDateObj(a.date);
    const db = toDateObj(b.date);
    return (da?.getTime() || 0) - (db?.getTime() || 0);
  });

  // Category lookup
  const catMap = (categories || []).reduce((acc, c) => {
    acc[c.id] = c.name || c.id;
    return acc;
  }, {});

  // Calculate summary: expenses, income, net
  let totalExpense = 0, totalIncome = 0;
  txs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'expense') totalExpense += amt;
    else if (t.type === 'income') totalIncome += amt;
  });
  const netBalance = totalIncome - totalExpense;

  // Subtotal per category (expenses only)
  const subtotals = {};
  txs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'expense') {
      const key = t.categoryId || 'other';
      subtotals[key] = (subtotals[key] || 0) + amt;
    }
  });

  const subtotalRows = Object.keys(subtotals).map(k => ({
    id: k,
    name: catMap[k] || 'อื่นๆ',
    amount: subtotals[k],
    style: getCategoryStyle(k)
  })).sort((a,b) => b.amount - a.amount);

  const totalTransactions = txs.length;

  const today = new Date();
  const generatedAt = fmtDate(today);
  const rangeLabel = startDate && endDate ? `${fmtDate(new Date(startDate))} - ${fmtDate(new Date(endDate))}` : '-';

  // Build HTML with beautiful design
  const html = `
  <!doctype html>
  <html lang="th">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${reportTitle}</title>
    <style>
      @page { size: A4; margin: 0; }
      @media print {
        body { margin: 0; padding: 0; }
        .page { width: 210mm; height: 297mm; page-break-after: always; }
      }
      
      html, body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', 'Sarabun', sans-serif; 
        color: #1F2937; 
        line-height: 1.5;
      }
      body { margin: 0; padding: 0; background: #F9FAFB; }
      .page { 
        background: white; 
        padding: 40px; 
        box-sizing: border-box;
        position: relative;
      }

      /* Header */
      .header-section {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid #F3F4F6;
      }
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .app-title {
        font-size: 32px;
        font-weight: 900;
        color: #F97316;
        letter-spacing: -0.5px;
      }
      .report-title {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-top: 4px;
      }
      .header-meta {
        text-align: right;
        font-size: 12px;
        color: #6B7280;
      }
      .header-meta-line {
        margin-bottom: 6px;
        font-weight: 500;
      }
      .date-range {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-top: 12px;
      }

      /* Summary Cards */
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 32px;
      }
      .card {
        padding: 20px;
        border-radius: 12px;
        border-left: 4px solid;
      }
      .card-expense {
        background: #FEF2F2;
        border-left-color: #EF4444;
      }
      .card-income {
        background: #F0FDF4;
        border-left-color: #10B981;
      }
      .card-balance {
        background: #FEF3F0;
        border-left-color: #F97316;
      }
      .card-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      .card-expense .card-label { color: #991B1B; }
      .card-income .card-label { color: #15803D; }
      .card-balance .card-label { color: #9A3412; }
      .card-amount {
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -0.5px;
      }
      .card-expense .card-amount { color: #DC2626; }
      .card-income .card-amount { color: #16A34A; }
      .card-balance .card-amount { color: #F97316; }
      .card-note {
        font-size: 11px;
        color: #6B7280;
        margin-top: 8px;
      }

      /* Transaction Table Section */
      .section-header {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 16px;
        padding-left: 12px;
        border-left: 4px solid #F97316;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        margin-bottom: 32px;
      }
      thead {
        background: #F9FAFB;
        border-bottom: 2px solid #E5E7EB;
      }
      th {
        padding: 12px 8px;
        text-align: left;
        font-weight: 700;
        color: #6B7280;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.3px;
      }
      tbody tr {
        border-bottom: 1px solid #F3F4F6;
      }
      tbody tr:hover {
        background: #F9FAFB;
      }
      td {
        padding: 12px 8px;
        vertical-align: middle;
      }
      .tx-date { color: #6B7280; }
      .tx-item { font-weight: 600; color: #111827; }
      .tx-category {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
      }
      .tx-amount {
        text-align: right;
        font-weight: 700;
        font-family: 'Monaco', 'Courier New', monospace;
      }
      .amount-expense { color: #DC2626; }
      .amount-income { color: #16A34A; }

      /* Category Summary */
      .summary-section {
        margin-bottom: 24px;
        padding: 20px;
        background: #F9FAFB;
        border-radius: 12px;
        border-left: 4px solid #F97316;
      }
      .summary-title {
        font-size: 14px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 16px;
      }
      .category-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #E5E7EB;
        font-size: 13px;
      }
      .category-row:last-child {
        border-bottom: none;
      }
      .category-name {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .category-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 700;
      }
      .category-amount {
        text-align: right;
        font-weight: 700;
        font-family: 'Monaco', 'Courier New', monospace;
        color: #DC2626;
      }
      .grand-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;
        border-top: 2px solid #E5E7EB;
        margin-top: 12px;
        font-size: 16px;
        font-weight: 900;
        color: #111827;
      }
      .grand-total-amount {
        color: #F97316;
        font-size: 20px;
        font-family: 'Monaco', 'Courier New', monospace;
      }
      .tx-count {
        font-size: 12px;
        color: #6B7280;
        margin-top: 12px;
      }

      /* Footer */
      .footer {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #E5E7EB;
        text-align: center;
        font-size: 11px;
        color: #9CA3AF;
      }

      @media print {
        body { background: white; }
        .page { 
          width: 100%; 
          height: auto; 
          padding: 20mm; 
          margin: 0; 
          background: white;
          page-break-after: always;
        }
        table { page-break-inside: avoid; }
        .summary-cards { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <!-- Header -->
      <div class="header-section">
        <div class="header-top">
          <div>
            <div class="app-title">Finvoy Wallet</div>
            <div class="report-title">${escapeHtml(reportTitle)}</div>
            ${selectedTripName ? `<div class="date-range">📍 ${escapeHtml(selectedTripName)}</div>` : ''}
            <div class="date-range">${escapeHtml(rangeLabel)}</div>
          </div>
          <div class="header-meta">
            <div class="header-meta-line">สร้างเมื่อ</div>
            <div class="header-meta-line">${escapeHtml(generatedAt)}</div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="card card-expense">
          <div class="card-label">💸 รายจ่ายรวม</div>
          <div class="card-amount">฿${fmtAmount(totalExpense)}</div>
          <div class="card-note">${totalExpense > 0 ? 'ยอดรวมรายจ่าย' : 'ไม่มีรายจ่าย'}</div>
        </div>
        <div class="card card-income">
          <div class="card-label">💰 รายรับรวม</div>
          <div class="card-amount">฿${fmtAmount(totalIncome)}</div>
          <div class="card-note">${totalIncome > 0 ? 'ยอดรวมรายรับ' : 'ไม่มีรายรับ'}</div>
        </div>
        <div class="card card-balance">
          <div class="card-label">📊 สุทธิ</div>
          <div class="card-amount">฿${fmtAmount(Math.abs(netBalance))}</div>
          <div class="card-note">${netBalance >= 0 ? '✓ คุณมีเงินเหลือ' : '⚠ คุณมีหนี้'}</div>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="section-header">📝 รายละเอียดรายการทั้งหมด</div>
      <table>
        <thead>
          <tr>
            <th style="width: 100px;">วันที่ / เวลา</th>
            <th style="width: 1%;">รายการ</th>
            <th style="width: 160px;">หมวดหมู่</th>
            <th style="width: 120px; text-align: right;">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${txs.map(tx => {
            const d = toDateObj(tx.date);
            const dateLabel = fmtDate(d, true);
            const note = tx.note ? escapeHtml(tx.note) : '-';
            const catStyle = getCategoryStyle(tx.categoryId);
            const amt = fmtAmountWithSymbol(tx.amount);
            const amountClass = tx.type === 'expense' ? 'amount-expense' : 'amount-income';
            return `<tr>
              <td class="tx-date">${dateLabel}</td>
              <td class="tx-item">${note}</td>
              <td><span class="tx-category" style="background: ${catStyle.bg}; color: ${catStyle.text};">
                <span>${catStyle.emoji}</span> ${escapeHtml(catStyle.name)}
              </span></td>
              <td class="tx-amount ${amountClass}">${amt}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <!-- Category Summary -->
      <div class="summary-section">
        <div class="summary-title">📊 สรุปตามหมวดหมู่</div>
        ${subtotalRows.map(r => `<div class="category-row">
          <div class="category-name">
            <span class="category-badge" style="background: ${r.style.bg};">${r.style.emoji}</span>
            <span>${escapeHtml(r.name)}</span>
          </div>
          <div class="category-amount">฿${fmtAmount(r.amount)}</div>
        </div>`).join('')}
        <div class="grand-total-row">
          <span>รวมทั้งหมด</span>
          <span class="grand-total-amount">฿${fmtAmount(totalExpense)}</span>
        </div>
        <div class="tx-count">จำนวนรายการทั้งหมด: <strong>${totalTransactions}</strong> รายการ</div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>เอกสารนี้สร้างโดย Finvoy Wallet • ${escapeHtml(reportTitle)}</p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Open new window and write
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ โปรดลองปิด Popup blocker แล้วลองใหม่');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait until content is loaded then print
  printWindow.focus();
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
      // Do not auto-close - allow user to cancel/save
      // printWindow.close();
    }, 500);
  };
}

// Minimal HTML escape
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

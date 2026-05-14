export function openReportPrintWindow({
  transactions = [],
  categories = [],
  startDate,
  endDate,
  selectedTripName,
  reportTitle = "รายงานสรุปยอด"
} = {}) {
  // Helper to safely get Date object from Firestore timestamp or string
  function toDateObj(t) {
    if (!t) return null;
    if (t.toDate && typeof t.toDate === 'function') return t.toDate();
    if (t instanceof Date) return t;
    return new Date(t);
  }

  function fmtDate(d) {
    if (!d) return "-";
    try {
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return d.toISOString().split('T')[0];
    }
  }

  function fmtAmount(v) {
    const num = Number(v) || 0;
    return '฿' + num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Subtotal per category (expenses only)
  const subtotals = {};
  let grandTotal = 0;
  txs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'expense') {
      const key = t.categoryId || 'uncategorized';
      subtotals[key] = (subtotals[key] || 0) + amt;
      grandTotal += amt;
    }
  });

  const subtotalRows = Object.keys(subtotals).map(k => ({
    name: catMap[k] || 'อื่นๆ',
    amount: subtotals[k]
  })).sort((a,b) => b.amount - a.amount);

  const totalTransactions = txs.length;

  const today = new Date();
  const generatedAt = fmtDate(today);
  const rangeLabel = startDate && endDate ? `${fmtDate(new Date(startDate))} - ${fmtDate(new Date(endDate))}` : '-';

  // Build HTML
  const html = `
  <!doctype html>
  <html lang="th">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${reportTitle}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      html, body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', 'Sarabun', 'Helvetica', Arial, sans-serif; color:#111; }
      body { margin:0; padding:0; }
      .page { width:210mm; min-height:297mm; padding:15mm; box-sizing:border-box; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
      .project { font-weight:800; font-size:18px; }
      .meta { text-align:right; font-size:12px; color:#444; }
      .meta div { margin-bottom:6px; }
      hr { border:none; border-top:1px solid #eee; margin:12px 0 18px; }
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th { text-align:left; padding:8px 6px; background:#fafafa; border-bottom:1px solid #eee; font-weight:700; }
      td { padding:8px 6px; border-bottom:1px solid #f3f3f3; vertical-align:top; }
      .amount { text-align:right; white-space:nowrap; }
      .right { text-align:right; }
      .muted { color:#666; font-size:12px; }
      .footer { margin-top:18px; }
      .summary { width:100%; margin-top:8px; border-top:1px dashed #e6e6e6; padding-top:12px; }
      .summary-row { display:flex; justify-content:space-between; padding:6px 0; font-weight:600; }
      .grand { font-size:16px; font-weight:900; }
      .page-break { page-break-after: always; }
      /* Make table more compact on narrow rows */
      .tx-item { font-weight:700; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div>
          <div class="project">${selectedTripName ? escapeHtml(selectedTripName) : escapeHtml(reportTitle)}</div>
          <div class="muted">รายงานวันที่: ${escapeHtml(rangeLabel)}</div>
        </div>
        <div class="meta">
          <div>สร้างโดย: ${escapeHtml(reportTitle)}</div>
          <div>วันที่สร้าง: ${escapeHtml(generatedAt)}</div>
        </div>
      </div>

      <hr />

      <div>
        <table>
          <thead>
            <tr>
              <th style="width:90px;">วันที่</th>
              <th style="width:1%;">รายการ</th>
              <th style="width:140px;">หมวดหมู่</th>
              <th style="width:120px; text-align:right;">จำนวนเงิน (฿)</th>
            </tr>
          </thead>
          <tbody>
            ${txs.map(tx => {
              const d = toDateObj(tx.date);
              const dateLabel = fmtDate(d);
              const note = tx.note ? escapeHtml(tx.note) : '-';
              const catName = escapeHtml(catMap[tx.categoryId] || 'อื่นๆ');
              const amt = fmtAmount(tx.amount);
              return `<tr>
                <td style="vertical-align:middle;">${dateLabel}</td>
                <td style="vertical-align:middle;">${note}</td>
                <td style="vertical-align:middle;">${catName}</td>
                <td class="amount" style="vertical-align:middle;">${amt}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div class="summary">
          ${subtotalRows.map(r => `<div class="summary-row"><div>${escapeHtml(r.name)}</div><div class="amount">${fmtAmount(r.amount)}</div></div>`).join('')}

          <div class="summary-row grand"><div>รวมทั้งหมด</div><div class="amount">${fmtAmount(grandTotal)}</div></div>
          <div style="margin-top:8px; font-size:12px; color:#555">จำนวนรายการทั้งหมด: ${totalTransactions}</div>
        </div>
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

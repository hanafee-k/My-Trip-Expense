// Pure display component — no state, no Firestore
// Props: income (number), categories (array of { id, name, pct })
export default function DailyAllocationTable({ income, categories }) {
  if (!categories || categories.length === 0 || !income) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <p className="text-xs font-black text-teal-400 uppercase tracking-widest">การจัดสรรรายรับ</p>
        <p className="text-xs text-zinc-500 font-bold">
          รวม ฿{Number(income).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-2.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">หมวดหมู่</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">%</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">จำนวนเงิน</th>
          </tr>
        </thead>

        <tbody>
          {categories.map((cat) => {
            const amount = (income * cat.pct) / 100;
            return (
              <tr key={cat.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-sm text-white font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-sm text-teal-400 font-bold text-right">{cat.pct}%</td>
                <td className="px-4 py-3 text-sm text-white font-bold text-right">
                  ฿{amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="bg-teal-500/10 border-t border-teal-500/20">
            <td className="px-4 py-3 text-sm font-black text-teal-400">รวมทั้งหมด</td>
            <td className="px-4 py-3 text-sm font-black text-teal-400 text-right">100%</td>
            <td className="px-4 py-3 text-sm font-black text-teal-400 text-right">
              ฿{Number(income).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

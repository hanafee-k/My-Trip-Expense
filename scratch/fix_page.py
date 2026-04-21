import re

with open('d:/my-trip-expense/app/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix header
content = content.replace(
    '<div className="bg-white border border-slate-200 shadow-sm border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">',
    '<div className="bg-white/90 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-lg">'
)
content = content.replace(
    '<div className="max-w-md mx-auto px-4 py-4">',
    '<div className="max-w-6xl mx-auto px-4 lg:px-8 py-4">'
)
content = content.replace(
    '<h1 className="text-xl font-bold flex items-center justify-center gap-2 text-slate-900 tracking-wide">',
    '<h1 className="text-xl lg:text-2xl font-bold flex items-center justify-start gap-2 text-slate-900 tracking-wide">'
)

# 2. Main container and Cards Layout
content = content.replace(
    '<div className="max-w-md mx-auto pt-6 px-4">',
    '<div className="max-w-6xl mx-auto pt-6 px-4 lg:px-8">'
)
content = content.replace(
    '<div className="grid grid-cols-2 gap-3 mb-6">',
    '<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">'
)

# 3. Card 1 (Expense)
content = content.replace(
    '<div className="bg-gradient-to-br from-rose-950 to-rose-900 rounded-2xl p-5 border border-rose-800 relative overflow-hidden">',
    '<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">'
)
content = content.replace('text-rose-800 opacity-20', 'text-rose-500 opacity-10')
content = content.replace('text-rose-200', 'text-rose-600')

# 4. Card 2 (Income)
content = content.replace(
    '<div className="bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-2xl p-5 border border-emerald-800 relative overflow-hidden">',
    '<div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">'
)
content = content.replace('text-emerald-800 opacity-20', 'text-emerald-500 opacity-10')
content = content.replace('text-emerald-200', 'text-emerald-600')

# 5. Card 3 (Balance)
content = content.replace(
    '<div className="col-span-2 bg-gradient-to-br from-teal-950 to-teal-900 rounded-2xl p-5 border border-teal-800">',
    '<div className="col-span-2 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 border border-teal-500 shadow-sm text-white">'
)
content = content.replace('text-teal-200', 'text-teal-50')
# Balance card has text-slate-900, make it white
# <div className="flex items-center gap-2 text-teal-50 text-sm font-medium mb-2">
content = re.sub(
    r'<div className="text-4xl font-extrabold text-slate-900">\s*\{\(summary\.income - summary\.expense\)\.toLocaleString\(\)\}\s*<\/div>',
    '<div className="text-4xl font-extrabold text-white">{(summary.income - summary.expense).toLocaleString()}</div>',
    content
)
content = content.replace(
    '<div className="bg-teal-800/50 p-4 rounded-xl">',
    '<div className="bg-white/20 p-4 rounded-xl">'
)

# 6. Filter button
content = content.replace(
    '<button \n            onClick={() => setShowFilter(!showFilter)}\n            className="w-full flex justify-between items-center bg-white border border-slate-200 shadow-sm p-4 rounded-xl border border-slate-200 hover:border-teal-600 transition group"\n          >',
    '<button \n            onClick={() => setShowFilter(!showFilter)}\n            className="w-full flex justify-between items-center bg-white border border-slate-200 shadow-sm p-4 rounded-xl hover:border-teal-600 transition group"\n          >'
)

# 7. Form box 
content = content.replace(
    '<div className="mb-6 bg-white border text-slate-800 border-slate-200 p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 shadow-sm text-slate-800">',
    '<div className="mb-6 bg-white p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 shadow-sm text-slate-800">'
)
content = content.replace(
    '<div className="bg-teal-900/30 p-2 rounded-lg">',
    '<div className="bg-teal-50 p-2 rounded-lg">'
)
content = content.replace(
    '<div className="bg-amber-900/30 p-2 rounded-lg">',
    '<div className="bg-amber-50 p-2 rounded-lg">'
)
content = content.replace(
    '<div className="bg-teal-900/30 p-4 rounded-xl mb-3">',
    '<div className="bg-teal-50 p-4 rounded-xl mb-3 text-teal-600">'
)
content = content.replace(
    'bg-white border text-black border-slate-200',
    'bg-white border border-slate-200'
)

with open('d:/my-trip-expense/app/page.js', 'w', encoding='utf-8') as f:
    f.write(content)

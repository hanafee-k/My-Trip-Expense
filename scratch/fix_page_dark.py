import re

with open('d:/my-trip-expense/app/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Main container and header wrapper
content = content.replace(
    '<div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">',
    '<div className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg">'
)
content = content.replace(
    '<div className="max-w-md mx-auto px-4 py-4">',
    '<div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">'
)
content = content.replace(
    '<h1 className="text-xl font-bold flex items-center justify-center gap-2 text-white tracking-wide">',
    '<h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white tracking-wide">'
)

# 2. Main content container
content = content.replace(
    '<div className="max-w-md mx-auto pt-6 px-4">',
    '<div className="max-w-6xl mx-auto pt-6 px-4 lg:px-8">'
)

# 3. Grid cols for dashboard cards
content = content.replace(
    '<div className="grid grid-cols-2 gap-3 mb-6">',
    '<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">'
)

with open('d:/my-trip-expense/app/page.js', 'w', encoding='utf-8') as f:
    f.write(content)

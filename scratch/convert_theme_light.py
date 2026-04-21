import sys
import re

def process_file(filepath):
    print("Processing", filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Broad background and text color replacements
    content = content.replace('bg-zinc-950', 'bg-slate-50')
    content = content.replace('bg-zinc-900/80', 'bg-white/90 border-b border-slate-200 shadow-sm')
    content = content.replace('bg-zinc-900/50', 'bg-slate-50 border border-slate-200')
    content = content.replace('bg-zinc-900', 'bg-white border text-slate-800 border-slate-200 shadow-sm')
    
    # Let's fix cases where `text-slate-800 border-slate-200` gets duplicated if it was run twice
    content = content.replace('border text-slate-800 border-slate-200', 'border border-slate-200')
    
    content = content.replace('bg-zinc-800/50', 'bg-slate-100')
    content = content.replace('bg-zinc-800', 'bg-slate-100')
    content = content.replace('bg-zinc-700/50', 'bg-slate-200')
    content = content.replace('bg-zinc-700', 'bg-slate-200')
    
    content = content.replace('text-zinc-100', 'text-slate-900')
    # Use re to avoid replacing text-white on primary badges/buttons where we WANT white
    # "text-white" in `bg-zinc-900` -> `text-slate-900`
    content = content.replace('text-white', 'text-slate-900')
    # However we will selectively bring back `text-white` on teal backgrounds later
    
    content = content.replace('text-zinc-300', 'text-slate-700')
    content = content.replace('text-zinc-400', 'text-slate-500')
    content = content.replace('text-zinc-500', 'text-slate-500')
    content = content.replace('text-zinc-600', 'text-slate-400')
    content = content.replace('text-zinc-700', 'text-slate-400')
    
    content = content.replace('border-zinc-800', 'border-slate-200')
    content = content.replace('border-zinc-700', 'border-slate-300')
    
    # Step 2: Teal adjustments (Teal is the primary color for light theme too)
    # the original was `text-teal-400` because it was dark mode. Let's make it `text-teal-600`
    content = content.replace('text-teal-400', 'text-teal-600')
    # `bg-teal-500/10` -> `bg-teal-50 text-teal-700`
    content = content.replace('bg-teal-500/10', 'bg-teal-50 text-teal-700')
    content = content.replace('bg-teal-500/5', 'bg-teal-50')
    # `bg-teal-600` -> `bg-teal-600 text-white hover:bg-teal-700`
    content = content.replace('bg-teal-600', 'bg-teal-600 text-white shadow hover:bg-teal-700')
    content = content.replace('bg-teal-500', 'bg-teal-500 text-white')
    content = content.replace('border-teal-500/30', 'border-teal-200')
    content = content.replace('border-teal-500', 'border-teal-500')
    content = content.replace('shadow-teal-900/30', 'shadow-sm')
    content = content.replace('shadow-teal-900/20', 'shadow-sm')
    content = content.replace('shadow-teal-900/50', 'shadow')

    # Step 3: Red adjustments (Danger zones)
    content = content.replace('text-red-400', 'text-red-600')
    content = content.replace('text-red-500', 'text-red-600')
    content = content.replace('bg-red-500/10', 'bg-red-50 text-red-700')
    content = content.replace('bg-red-500/5', 'bg-red-50')
    content = content.replace('border-red-900/30', 'border-red-200')
    content = content.replace('border-red-500/30', 'border-red-200')

    # Step 4: Specific fixes
    content = content.replace('bg-gradient-to-br from-teal-900/60 via-zinc-900 to-zinc-900', 'bg-gradient-to-r from-teal-600 to-teal-500')
    # Fix the `text-slate-900` overriding `text-white` inside buttons/teal backgrounds!
    content = content.replace('bg-teal-600 text-slate-900', 'bg-teal-600 text-white')
    content = content.replace('bg-teal-500 text-slate-900', 'bg-teal-500 text-white')
    
    # For profile image placeholder in profile/page.js
    content = content.replace('ring-zinc-900', 'ring-white')
    
    # Reports chart data - change dark tooltip to light
    content = content.replace('bg-zinc-900 border border-zinc-700 p-3', 'bg-white border border-slate-200 p-3 shadow text-slate-900')
    
    # Tripe gradients and labels
    content = re.sub(r'bg-[a-z]+-500/10', lambda m: m.group(0).replace('500', '50').replace('/10', ''), content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('d:/my-trip-expense/app/profile/page.js')
process_file('d:/my-trip-expense/app/trips/page.js')
process_file('d:/my-trip-expense/app/reports/page.js')
process_file('d:/my-trip-expense/app/page.js')

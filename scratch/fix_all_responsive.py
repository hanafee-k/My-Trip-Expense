import re
import os

def fix_responsive(file_path, is_grid=True, grid_cols="lg:grid-cols-2", is_profile=False):
    if not os.path.exists(file_path): return
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Fix header
    content = content.replace(
        '<div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">',
        '<div className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-lg">'
    )
    content = content.replace(
        '<div className="max-w-md mx-auto px-4 py-4',
        '<div className="max-w-6xl mx-auto px-4 lg:px-8 py-4'
    )
    
    # 2. Fix main wrapper
    content = content.replace(
        '<div className="max-w-md mx-auto pt-4 px-4">',
        '<div className="max-w-6xl mx-auto pt-4 px-4 lg:px-8">'
    )
    content = content.replace(
        '<div className="max-w-md mx-auto p-4">',
        '<div className="max-w-6xl mx-auto p-4 lg:px-8">'
    )
    content = content.replace(
        '<div className="max-w-md mx-auto pt-6 px-4">',
        '<div className="max-w-6xl mx-auto pt-6 px-4 lg:px-8">'
    )

    # 3. Fix list/grid styling
    if is_grid:
        if is_profile:
            # Profile doesn't have a list of cards, it has sections. We can use a grid for sections or keep them max-w-xl.
            content = content.replace(
                '<div className="space-y-4 mb-24">',
                '<div className="max-w-3xl mx-auto space-y-4 mb-24">'
            )
            # Profile header
            content = content.replace(
                '<div className="flex flex-col items-center mb-8">',
                '<div className="flex flex-col items-center mb-8 mt-10">'
            )
        else:
            # Upgrade <div className="space-y-4"> to Grid!
            content = content.replace(
                '<div className="space-y-4 mb-24 animate-in fade-in slide-in-from-bottom-4">',
                f'<div className="grid grid-cols-1 {grid_cols} gap-4 mb-24 animate-in fade-in slide-in-from-bottom-4">'
            )
            content = content.replace(
                '<div className="space-y-4 pb-24">',
                f'<div className="grid grid-cols-1 {grid_cols} gap-4 pb-24">'
            )
            content = content.replace(
                '<div className="space-y-3 pb-24">',
                f'<div className="grid grid-cols-1 {grid_cols} gap-3 pb-24">'
            )
            content = content.replace(
                '<div className="space-y-4">',
                f'<div className="grid grid-cols-1 {grid_cols} gap-4">'
            )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_responsive('d:/my-trip-expense/app/trips/page.js', True, "lg:grid-cols-2")
fix_responsive('d:/my-trip-expense/app/reports/page.js', True, "lg:grid-cols-2")
fix_responsive('d:/my-trip-expense/app/profile/page.js', True, "lg:grid-cols-1", True)


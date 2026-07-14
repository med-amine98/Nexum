import os
import re
import glob

# Paths to update
PATHS = [
    r"C:\Users\salah\Desktop\mon-erp\frontend\src\components",
    r"C:\Users\salah\Desktop\mon-erp\frontend\src\layouts",
    r"C:\Users\salah\Desktop\mon-erp\frontend\src\pages",
]

def update_files():
    print("Updating JS/JSX and CSS files in components, layouts, pages...")
    
    all_files = []
    for base_path in PATHS:
        all_files.extend(glob.glob(os.path.join(base_path, "**", "*.js"), recursive=True))
        all_files.extend(glob.glob(os.path.join(base_path, "**", "*.jsx"), recursive=True))
        all_files.extend(glob.glob(os.path.join(base_path, "**", "*.css"), recursive=True))

    replacements = [
        # Indigos / purples -> Blue
        (r"(?i)#4f46e5", "#2563eb"),
        (r"(?i)#6366f1", "#2563eb"),
        
        # Violets -> Slate
        (r"(?i)#8b5cf6", "#475569"),
        (r"(?i)#7c3aed", "#334155"),
        (r"(?i)#a855f7", "#64748b"),
        
        # Oranges / Coral -> Emerald
        (r"(?i)#f59e0b", "#10b981"),
        (r"(?i)#f43f5e", "#059669"),
        (r"(?i)#14b8a6", "#34d399"),
        
        # Old Purchase blue to new Corporate Blue
        (r"(?i)#0052cc", "#2563eb"),
        (r"(?i)#4d8aff", "#60a5fa"),
        (r"(?i)#003d99", "#1d4ed8"),
        (r"(?i)#e6f0ff", "#eff6ff"),
        (r"(?i)#002d73", "#1e3a8a"),
        
        # Old Purchase cyan to Slate
        (r"(?i)#00a3c4", "#475569"),
        (r"(?i)#4fc4e6", "#64748b"),
        (r"(?i)#0086a3", "#334155"),
        (r"(?i)#e6f7f9", "#f1f5f9"),
    ]

    updated_count = 0

    for file_path in all_files:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = content
        
        for old, new in replacements:
            new_content = re.sub(old, new, new_content)

        if new_content != content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated: {file_path}")
            updated_count += 1
            
    print(f"Total files updated: {updated_count}")

if __name__ == '__main__':
    update_files()

import os
import re
import glob

MODULES_DIR = r"C:\Users\salah\Desktop\mon-erp\frontend\src\modules"

def update_js_files():
    print("Updating JS/JSX files...")
    js_files = glob.glob(os.path.join(MODULES_DIR, "**", "*.js"), recursive=True)
    jsx_files = glob.glob(os.path.join(MODULES_DIR, "**", "*.jsx"), recursive=True)
    all_js = js_files + jsx_files

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

    for file_path in all_js:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = content
        
        # Force specific COLORS keys
        new_content = re.sub(r"(primary:\s*['\"])[^'\"]+(['\"])", r"\1#2563eb\2", new_content)
        new_content = re.sub(r"(secondary:\s*['\"])[^'\"]+(['\"])", r"\1#475569\2", new_content)
        new_content = re.sub(r"(accent:\s*['\"])[^'\"]+(['\"])", r"\1#10b981\2", new_content)
        
        for old, new in replacements:
            new_content = re.sub(old, new, new_content)

        if new_content != content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated JS/JSX: {file_path}")

def update_css_files():
    print("Updating CSS files...")
    css_files = glob.glob(os.path.join(MODULES_DIR, "**", "*.css"), recursive=True)
    
    replacements = [
        # Same exact replacements for CSS hex codes
        (r"(?i)#4f46e5", "#2563eb"),
        (r"(?i)#6366f1", "#2563eb"),
        
        (r"(?i)#8b5cf6", "#475569"),
        (r"(?i)#7c3aed", "#334155"),
        (r"(?i)#a855f7", "#64748b"),
        
        (r"(?i)#f59e0b", "#10b981"),
        (r"(?i)#f43f5e", "#059669"),
        (r"(?i)#14b8a6", "#34d399"),
        
        (r"(?i)#0052cc", "#2563eb"),
        (r"(?i)#4d8aff", "#60a5fa"),
        (r"(?i)#003d99", "#1d4ed8"),
        (r"(?i)#e6f0ff", "#eff6ff"),
        (r"(?i)#002d73", "#1e3a8a"),
        
        (r"(?i)#00a3c4", "#475569"),
        (r"(?i)#4fc4e6", "#64748b"),
        (r"(?i)#0086a3", "#334155"),
        (r"(?i)#e6f7f9", "#f1f5f9"),
        
        # PurchaseDashboard bg-primary change
        (r"(?i)--bg-primary:\s*#f8fafc;", "--bg-primary: #0f172a;"),
        (r"(?i)--bg-secondary:\s*#ffffff;", "--bg-secondary: #1e293b;"),
        (r"(?i)--bg-tertiary:\s*#f1f5f9;", "--bg-tertiary: #334155;"),
        (r"(?i)--bg-card:\s*#ffffff;", "--bg-card: rgba(30, 41, 59, 0.7);"),
        (r"(?i)--bg-hover:\s*#f0f7ff;", "--bg-hover: rgba(37, 99, 235, 0.1);"),
        
        (r"(?i)--text-primary:\s*#1a2035;", "--text-primary: #f8fafc;"),
        (r"(?i)--text-secondary:\s*#2a3448;", "--text-secondary: #e2e8f0;"),
        (r"(?i)--text-muted:\s*#5a6e8a;", "--text-muted: #94a3b8;"),
        (r"(?i)--text-light:\s*#7a8b9f;", "--text-light: #64748b;"),
        
        (r"(?i)--border:\s*#e2e8f0;", "--border: rgba(255, 255, 255, 0.1);"),
        (r"(?i)--border-light:\s*#f1f5f9;", "--border-light: rgba(255, 255, 255, 0.05);"),
        (r"(?i)--border-medium:\s*#cbd5e1;", "--border-medium: rgba(255, 255, 255, 0.2);"),
    ]

    for file_path in css_files:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = content
        
        for old, new in replacements:
            new_content = re.sub(old, new, new_content)

        if new_content != content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated CSS: {file_path}")

if __name__ == '__main__':
    update_js_files()
    update_css_files()

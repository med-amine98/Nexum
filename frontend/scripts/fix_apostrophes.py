import re
import os

FRONTEND_SRC_DIR = r"c:\Users\salah\Desktop\mon-erp\frontend\src"

def fix_trailing_apostrophe(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix MODULE_COLORS.Xxx' -> MODULE_COLORS.Xxx (trailing apostrophe)
    new_content = re.sub(r"MODULE_COLORS\.([A-Za-z]+)'", r"MODULE_COLORS.\1", content)
    
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    count = 0
    for root, dirs, files in os.walk(FRONTEND_SRC_DIR):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                filepath = os.path.join(root, file)
                if fix_trailing_apostrophe(filepath):
                    print(f"Fixed: {filepath}")
                    count += 1
    print(f"\nFixed {count} files.")

if __name__ == '__main__':
    main()

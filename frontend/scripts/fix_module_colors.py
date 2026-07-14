import os
import re

FRONTEND_SRC_DIR = r"c:\Users\salah\Desktop\mon-erp\frontend\src"

def fix_module_colors(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find MODULE_'var(--ventes)' or MODULE_var(--ventes)
    def replacer(match):
        color_name = match.group(1).capitalize()
        return f"MODULE_COLORS.{color_name}"

    new_content = re.sub(r"MODULE_'?var\(--([a-zA-Z]+)'?\)", replacer, content)

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
                if fix_module_colors(filepath):
                    print(f"Fixed MODULE_COLORS in: {filepath}")
                    count += 1
    print(f"Fixed {count} files.")

if __name__ == '__main__':
    main()

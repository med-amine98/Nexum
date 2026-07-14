import os
import re

FRONTEND_SRC_DIR = r"c:\Users\salah\Desktop\mon-erp\frontend\src"

def fix_syntax_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(match):
        return f"'{match.group(0)}'"

    new_content = re.sub(r'(?<![\'"`])var\(--[a-zA-Z0-9\-]+\)(?![\'"`])', replacer, content)

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
                if fix_syntax_in_file(filepath):
                    print(f"Fixed syntax in: {filepath}")
                    count += 1
    print(f"Fixed {count} files.")

if __name__ == '__main__':
    main()

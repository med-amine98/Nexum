import os
import re

FRONTEND_SRC_DIR = r"c:\Users\salah\Desktop\mon-erp\frontend\src"

def camel_to_kebab(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

def migrate_colors_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove the local COLORS definition if it exists
    # This matches `const COLORS = { ... };` across multiple lines
    content = re.sub(r'const COLORS = \{.*?\};\n', '', content, flags=re.DOTALL)

    # 2. Find all COLORS.propertyName
    def replacer(match):
        prop_name = match.group(1)
        kebab_name = camel_to_kebab(prop_name)
        # Exception for white and black, which might not be mapped to themes, but usually they are
        # If the variable exists in index.css it will work. We assume it does.
        return f"var(--{kebab_name})"

    new_content = re.sub(r'COLORS\.([a-zA-Z0-9_]+)', replacer, content)

    # 3. Write back if changed
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    changed_files = 0
    for root, dirs, files in os.walk(FRONTEND_SRC_DIR):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                filepath = os.path.join(root, file)
                if migrate_colors_in_file(filepath):
                    print(f"Migrated colors in: {filepath}")
                    changed_files += 1
    
    print(f"\nMigration complète ! {changed_files} fichiers ont été mis à jour pour le Dark/Light mode.")

if __name__ == '__main__':
    main()

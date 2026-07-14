import os
import re
from collections import defaultdict

def check_cross_file_conflicts(directory):
    table_to_attrs = defaultdict(lambda: {"columns": set(), "relationships": set(), "files": []})
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py") and file != "__init__.py":
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Find classes and their tablenames
                classes = re.split(r'^class ', content, flags=re.MULTILINE)
                for cls_content in classes[1:]:
                    cls_match = re.search(r'^([a-zA-Z_0-9]+)\(', cls_content)
                    if not cls_match: continue
                    cls_name = cls_match.group(1)
                    
                    table_match = re.search(r'__tablename__\s*=\s*["\']([^"\']+)["\']', cls_content)
                    if not table_match: continue
                    table_name = table_match.group(1)
                    
                    columns = set(re.findall(r'^\s+([a-zA-Z_0-9]+)\s*=\s*Column\(', cls_content, re.MULTILINE))
                    relationships = set(re.findall(r'^\s+([a-zA-Z_0-9]+)\s*=\s*relationship\(', cls_content, re.MULTILINE))
                    
                    table_to_attrs[table_name]["columns"].update(columns)
                    table_to_attrs[table_name]["relationships"].update(relationships)
                    table_to_attrs[table_name]["files"].append(file)
                    
    for table, data in table_to_attrs.items():
        conflicts = data["columns"].intersection(data["relationships"])
        if conflicts:
            logger.info(f"Conflict on table '{table}' (found in {data['files']}): {conflicts}")

if __name__ == "__main__":
    check_cross_file_conflicts("backend/app/models")

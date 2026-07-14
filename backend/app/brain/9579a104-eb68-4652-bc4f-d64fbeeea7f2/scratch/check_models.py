import os
import re

def check_conflicts(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Simple heuristic to find class blocks
                classes = re.split(r'^class ', content, flags=re.MULTILINE)
                for cls_content in classes[1:]:
                    cls_name = cls_content.split('(')[0].split(':')[0].strip()
                    
                    columns = set(re.findall(r'^\s+([a-zA-Z_0-9]+)\s*=\s*Column\(', cls_content, re.MULTILINE))
                    relationships = set(re.findall(r'^\s+([a-zA-Z_0-9]+)\s*=\s*relationship\(', cls_content, re.MULTILINE))
                    
                    conflicts = columns.intersection(relationships)
                    if conflicts:
                        logger.info(f"Conflict in {file}, class {cls_name}: {conflicts}")

if __name__ == "__main__":
    check_conflicts("backend/app/models")

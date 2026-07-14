import re
import json

def parse_js():
    with open('c:/Users/salah/Desktop/mon-erp/frontend/src/modules/models/ModelsCatalog.js', 'r', encoding='utf-8') as f:
        content = f.read()

    start = content.find('const sidebarModels = {')
    end = content.find('  };', start)
    js_code = content[start+len('const sidebarModels = {'):end].strip()

    # Very naive parsing to grab keys and properties
    # We will look for blocks like: { key: 'dashboard', icon: <DashboardOutlined />, ... }
    blocks = re.findall(r'\{(.*?)\}', js_code, re.DOTALL)
    
    modules = []
    for b in blocks:
        # Extract key
        key_m = re.search(r"key:\s*'([^']+)'", b)
        if not key_m: continue
        key = key_m.group(1)

        name_m = re.search(r"label:\s*'([^']+)'", b)
        name = name_m.group(1) if name_m else key

        desc_m = re.search(r"description:\s*'([^']+)'", b)
        desc = desc_m.group(1) if desc_m else ""

        cat_m = re.search(r"category:\s*'([^']+)'", b)
        cat = cat_m.group(1) if cat_m else "Autre"

        icon_m = re.search(r"icon:\s*<([A-Za-z]+)\s*/>", b)
        icon = icon_m.group(1) if icon_m else "AppstoreOutlined"

        path_m = re.search(r"path:\s*'([^']+)'", b)
        path = path_m.group(1) if path_m else f"/{key}"

        color_m = re.search(r"color:\s*'([^']+)'", b)
        color = color_m.group(1) if color_m else "#1890ff"

        fields_m = re.search(r"fields:\s*(\d+)", b)
        fields = int(fields_m.group(1)) if fields_m else 10

        usage_m = re.search(r"usage:\s*(\d+)", b)
        usage = int(usage_m.group(1)) if usage_m else 50

        modules.append({
            "key": key,
            "name": name,
            "description": desc,
            "category": cat,
            "icon": icon,
            "path": path,
            "version": "1.0.0",
            "author": "Équipe Nexum",
            "fields_count": fields,
            "usage_percent": usage,
            "color": color
        })

    with open('c:/Users/salah/Desktop/mon-erp/backend/models_seed_data.py', 'w', encoding='utf-8') as f:
        f.write("MODULES_SEED = [\n")
        for m in modules:
            f.write(f"    {json.dumps(m, ensure_ascii=False)},\n")
        f.write("]\n")

if __name__ == "__main__":
    parse_js()

import os
import re
import logging
logger = logging.getLogger(__name__)

base = r'C:/Users/salah/Desktop/mon-erp/backend'

for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            # Ensure logger is imported if logging is imported
            if 'import logging' in content and 'logger = logging.getLogger' not in content:
                lines = content.splitlines()
                insert_idx = 0
                for i, line in enumerate(lines):
                    if line.startswith('import') or line.startswith('from'):
                        continue
                    insert_idx = i
                    break
                lines.insert(insert_idx, 'logger = logging.getLogger(__name__)')
                content = '\n'.join(lines)
            # replace print statements
            def repl(match):
                msg = match.group(1)
                # Determine level based on emoji or keywords
                if any(e in msg for e in ['❌', 'Error', 'Erreur']):
                    lvl = 'error'
                elif any(w in msg for w in ['⚠️', 'Warning']):
                    lvl = 'warning'
                else:
                    lvl = 'info'
                return f'logger.{lvl}({msg})'
            new_content = re.sub(r'print\((.+?)\)', repl, content)
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.write(new_content)
                logger.info(f'Updated {path}')

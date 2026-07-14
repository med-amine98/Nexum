/**
 * Removes all console.log statements from all JS/JSX/TS/TSX files in src/
 * Preserves console.error and console.warn as those may be intentional.
 */
const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'build') {
        walkSync(fullPath, filelist);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.ts')) {
      filelist.push(fullPath);
    }
  });
  return filelist;
}

const files = walkSync('./src');
let totalRemoved = 0;
let filesChanged = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let removed = 0;
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Match console.log( at start of trimmed line
    if (trimmed.startsWith('console.log(')) {
      // Check if the statement ends on this line
      let fullStatement = line;
      let braceCount = 0;
      let parenCount = 0;
      let inString = false;
      let stringChar = '';
      let j = i;
      
      // Count parens to find end of console.log(...)
      for (let ci = 0; ci < fullStatement.length; ci++) {
        const ch = fullStatement[ci];
        if (inString) {
          if (ch === stringChar && fullStatement[ci-1] !== '\\') inString = false;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = true;
          stringChar = ch;
          continue;
        }
        if (ch === '(') parenCount++;
        if (ch === ')') parenCount--;
      }
      
      // If parens aren't balanced, consume more lines
      while (parenCount > 0 && j + 1 < lines.length) {
        j++;
        fullStatement += '\n' + lines[j];
        const nextLine = lines[j];
        for (let ci = 0; ci < nextLine.length; ci++) {
          const ch = nextLine[ci];
          if (inString) {
            if (ch === stringChar && nextLine[ci-1] !== '\\') inString = false;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === '`') {
            inString = true;
            stringChar = ch;
            continue;
          }
          if (ch === '(') parenCount++;
          if (ch === ')') parenCount--;
        }
      }
      
      removed++;
      i = j + 1;
      continue;
    }
    
    newLines.push(line);
    i++;
  }
  
  if (removed > 0) {
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
    totalRemoved += removed;
    filesChanged++;
  }
});

console.log(`Removed ${totalRemoved} console.log statements from ${filesChanged} files`);

/**
 * This script converts Tabs with TabPane children to the modern `items` pattern.
 * 
 * Strategy: Rather than trying to parse complex JSX with regex (which is fragile),
 * we take a simpler approach:
 * 1. Remove `const { TabPane } = Tabs;` destructuring
 * 2. Remove `TabPane` from import lists
 * 3. Convert `<TabPane tab={...} key="...">...children...</TabPane>` blocks
 *    into items array entries and replace the Tabs component usage.
 * 
 * Due to the complexity of JSX parsing with regex, we'll use a targeted
 * brace-counting approach for each file.
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

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('TabPane')) return false;
  
  let changed = false;
  
  // Step 1: Remove `const { TabPane } = Tabs;`
  if (content.includes('const { TabPane } = Tabs;')) {
    content = content.replace(/const \{ TabPane \} = Tabs;\s*\n?/g, '');
    changed = true;
  }
  
  // Step 2: Remove TabPane from destructuring like `const { TabPane, ...other } = Tabs;` or `{ ..., TabPane, ... }`
  // Pattern: `TabPane, ` or `, TabPane`
  content = content.replace(/const \{([^}]*)\bTabPane\b,?\s*([^}]*)\} = Tabs;/g, (match, before, after) => {
    let items = (before + after).split(',').map(s => s.trim()).filter(s => s && s !== 'TabPane');
    if (items.length === 0) return '';
    return `const { ${items.join(', ')} } = Tabs;`;
  });
  
  // Step 3: Convert <TabPane> blocks within <Tabs> to items prop
  // We need a more sophisticated approach - find each <Tabs ...> block that contains TabPane children
  
  // Find all Tabs blocks with TabPane children and convert them
  const tabsRegex = /<Tabs\b/g;
  let match;
  let newContent = content;
  let offset = 0;
  
  while ((match = tabsRegex.exec(content)) !== null) {
    const tabsStart = match.index;
    
    // Find the matching closing </Tabs> by counting < and >
    let depth = 0;
    let i = tabsStart;
    let tabsEnd = -1;
    let insideString = false;
    let stringChar = '';
    let braceDepth = 0;
    
    // First find the end of the opening <Tabs ...> tag
    let openTagEnd = -1;
    let angleBracketDepth = 0;
    
    for (i = tabsStart; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
      if (ch === '<' && braceDepth === 0) angleBracketDepth++;
      if (ch === '>' && braceDepth === 0) {
        angleBracketDepth--;
        if (angleBracketDepth === 0) {
          openTagEnd = i;
          break;
        }
      }
    }
    
    if (openTagEnd === -1) continue;
    
    // Check if it's self-closing
    if (content[openTagEnd - 1] === '/') continue;
    
    // Now find the matching </Tabs>
    let tabsDepth = 1;
    braceDepth = 0;
    for (i = openTagEnd + 1; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
      
      if (braceDepth === 0 && ch === '<') {
        // Check for </Tabs>
        if (content.substring(i, i + 7) === '</Tabs>') {
          tabsDepth--;
          if (tabsDepth === 0) {
            tabsEnd = i + 7;
            break;
          }
        }
        // Check for <Tabs (nested)
        if (content.substring(i, i + 5) === '<Tabs' && /[\s>\/]/.test(content[i + 5])) {
          tabsDepth++;
        }
      }
    }
    
    if (tabsEnd === -1) continue;
    
    const fullTabsBlock = content.substring(tabsStart, tabsEnd);
    
    // Only process if it contains TabPane
    if (!fullTabsBlock.includes('<TabPane')) continue;
    
    // Extract the opening tag props
    const openTag = content.substring(tabsStart, openTagEnd + 1);
    const innerContent = content.substring(openTagEnd + 1, tabsEnd - 7).trim();
    
    // Parse TabPane children
    const items = [];
    let remaining = innerContent;
    let tabPaneCount = 0;
    
    while (remaining.includes('<TabPane')) {
      const tpStart = remaining.indexOf('<TabPane');
      
      // Extract the tab and key props from the opening tag
      let tpI = tpStart + 8; // after '<TabPane'
      let tpBraceDepth = 0;
      let tpTagEnd = -1;
      let isSelfClosing = false;
      
      for (; tpI < remaining.length; tpI++) {
        if (remaining[tpI] === '{') tpBraceDepth++;
        if (remaining[tpI] === '}') tpBraceDepth--;
        if (tpBraceDepth === 0 && remaining[tpI] === '>') {
          isSelfClosing = remaining[tpI - 1] === '/';
          tpTagEnd = tpI;
          break;
        }
      }
      
      if (tpTagEnd === -1) break;
      
      const tpOpenTag = remaining.substring(tpStart, tpTagEnd + 1);
      
      // Extract key
      let key = null;
      const keyMatch = tpOpenTag.match(/key=["']([^"']+)["']/);
      const keyMatchBrace = tpOpenTag.match(/key=\{["']([^"']+)["']\}/);
      if (keyMatch) key = keyMatch[1];
      else if (keyMatchBrace) key = keyMatchBrace[1];
      
      // Extract tab prop
      let tabProp = null;
      const tabStrMatch = tpOpenTag.match(/tab=["']([^"']+)["']/);
      if (tabStrMatch) {
        tabProp = `"${tabStrMatch[1]}"`;
      } else {
        // tab={...} - need to extract the JSX expression
        const tabIdx = tpOpenTag.indexOf('tab={');
        if (tabIdx !== -1) {
          let bd = 0;
          let tabEnd = -1;
          for (let j = tabIdx + 4; j < tpOpenTag.length; j++) {
            if (tpOpenTag[j] === '{') bd++;
            if (tpOpenTag[j] === '}') {
              bd--;
              if (bd === 0) {
                tabEnd = j;
                break;
              }
            }
          }
          if (tabEnd !== -1) {
            tabProp = tpOpenTag.substring(tabIdx + 5, tabEnd);
          }
        }
      }
      
      // Extract tab content (children)
      let tpChildren = '';
      let tpBlockEnd;
      
      if (isSelfClosing) {
        tpBlockEnd = tpTagEnd + 1;
        tpChildren = 'null';
      } else {
        // Find matching </TabPane>
        let tpDepth = 1;
        let bd2 = 0;
        let closeStart = -1;
        for (let j = tpTagEnd + 1; j < remaining.length; j++) {
          if (remaining[j] === '{') bd2++;
          if (remaining[j] === '}') bd2--;
          if (bd2 === 0 && remaining[j] === '<') {
            if (remaining.substring(j, j + 11) === '</TabPane>') {
              tpDepth--;
              if (tpDepth === 0) {
                closeStart = j;
                tpBlockEnd = j + 11;
                break;
              }
            }
            if (remaining.substring(j, j + 9) === '<TabPane' && /[\s>\/]/.test(remaining[j + 9])) {
              tpDepth++;
            }
          }
        }
        
        if (closeStart === -1) break;
        
        tpChildren = remaining.substring(tpTagEnd + 1, closeStart).trim();
      }
      
      items.push({
        key: key || `tab_${tabPaneCount}`,
        label: tabProp || `"Tab ${tabPaneCount}"`,
        children: tpChildren === 'null' ? null : tpChildren
      });
      
      tabPaneCount++;
      remaining = remaining.substring(tpBlockEnd);
    }
    
    if (items.length === 0) continue;
    
    // Build the items array
    const itemsStr = items.map(item => {
      let entry = `{\n              key: '${item.key}',\n              label: ${item.label}`;
      if (item.children) {
        entry += `,\n              children: (\n                ${item.children}\n              )`;
      }
      entry += '\n            }';
      return entry;
    }).join(',\n            ');
    
    // Build new Tabs tag with items prop
    // Remove the closing > from the opening tag to add items prop
    let newOpenTag = openTag.slice(0, -1).trimEnd();
    
    // Check if it already has items prop (shouldn't, but just in case)
    if (newOpenTag.includes('items={')) continue;
    
    const newTabsBlock = `${newOpenTag}\n          items={[\n            ${itemsStr}\n          ]}\n        />`;
    
    // Replace in newContent with offset tracking
    const adjustedStart = tabsStart + offset;
    const adjustedEnd = tabsEnd + offset;
    newContent = newContent.substring(0, adjustedStart) + newTabsBlock + newContent.substring(adjustedEnd);
    offset += newTabsBlock.length - (tabsEnd - tabsStart);
    
    changed = true;
  }
  
  if (changed) {
    // Final cleanup: remove any leftover TabPane imports
    newContent = newContent.replace(/,\s*TabPane\b/g, '');
    newContent = newContent.replace(/\bTabPane\s*,\s*/g, '');
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

// Main
const files = walkSync('./src');
let changedCount = 0;
const changedFiles = [];

files.forEach(file => {
  try {
    if (processFile(file)) {
      changedCount++;
      changedFiles.push(path.relative('.', file));
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

console.log(`\nFiles changed: ${changedCount}`);
changedFiles.forEach(f => console.log(`  - ${f}`));

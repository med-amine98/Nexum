const fs = require('fs');
const path = require('path');
function walkSync(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
}
const files = walkSync('./src');
let spinChanged = 0;
let cardChanged = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Fix Spin tip missing children (multiline support)
  // We match <Spin ... tip=... />
  newContent = newContent.replace(/<Spin([\s\S]*?)tip=({[^}]+}|"[^"]+")([\s\S]*?)\/>/g, (match, p1, tip, p3) => {
    return `<Spin${p1}tip=${tip}${p3}><div/></Spin>`;
  });
  
  // Fix Card bordered={false} -> variant="borderless"
  newContent = newContent.replace(/<Card([\s\S]*?)bordered={false}([\s\S]*?)>/g, '<Card$1variant="borderless"$2>');
  
  // Fix Card bordered={true} -> variant="outlined"
  newContent = newContent.replace(/<Card([\s\S]*?)bordered={true}([\s\S]*?)>/g, '<Card$1variant="outlined"$2>');
  
  // Remove boolean bordered (e.g. <Card bordered ...>) -> <Card variant="outlined" ...>
  // using regex with word boundary to avoid matching bordered={false}
  newContent = newContent.replace(/<Card([^>]*?)\bbordered\b(?!\s*=)([^>]*?)>/g, '<Card$1variant="outlined"$2>');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    spinChanged++;
  }
});
console.log('Files changed:', spinChanged);

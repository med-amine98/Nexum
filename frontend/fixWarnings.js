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
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/<Spin([^>]+)tip=({[^}]+}|"[^"]+")([^>]*?)\/>/g, (match, p1, tip, p3) => {
    return `<Spin${p1}tip=${tip}${p3}><div/></Spin>`;
  });
  
  newContent = newContent.replace(/<Card([^>]*?)bodyStyle=({[^}]+})([^>]*?)>/g, '<Card$1styles={{ body: $2 }}$3>');
  newContent = newContent.replace(/<Card([^>]*?)bodyStyle=({[^}]+})([^>]*?)\/>/g, '<Card$1styles={{ body: $2 }}$3/>');
  newContent = newContent.replace(/<Modal([^>]*?)bodyStyle=({[^}]+})([^>]*?)>/g, '<Modal$1styles={{ body: $2 }}$3>');
  newContent = newContent.replace(/<Modal([^>]*?)bodyStyle=({[^}]+})([^>]*?)\/>/g, '<Modal$1styles={{ body: $2 }}$3/>');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changed++;
  }
});
console.log('Changed files:', changed);

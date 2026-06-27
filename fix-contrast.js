const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(directoryPath);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // 1. Remove all dark backgrounds and borders
  content = content.replace(/bg-slate-900/g, 'bg-[#F8F4EE]');
  content = content.replace(/bg-slate-[786]00(\/[0-9]+)?/g, 'bg-[#FFFDF9]');
  content = content.replace(/bg-gray-[98]00/g, 'bg-[#F8F4EE]');
  content = content.replace(/bg-neutral-[98]00/g, 'bg-[#F8F4EE]');
  content = content.replace(/bg-black/g, 'bg-[#F8F4EE]');
  content = content.replace(/border-slate-[786]00(\/[0-9]+)?/g, 'border-[#EFE7DD]');

  // 2. Fix all light text that is now invisible on light backgrounds
  content = content.replace(/text-slate-[12345]00(\/[0-9]+)?/g, 'text-[#2F2F2F]');
  content = content.replace(/text-gray-[1234]00/g, 'text-[#2F2F2F]');
  content = content.replace(/text-white/g, 'text-[#2F2F2F]');
  content = content.replace(/hover:text-white/g, 'hover:text-[#2F2F2F]');
  
  // 3. Fix colors that don't contrast well
  content = content.replace(/text-emerald-400/g, 'text-green-700');
  content = content.replace(/text-red-400/g, 'text-red-600');
  content = content.replace(/text-amber-400/g, 'text-[#C68642]');
  content = content.replace(/text-indigo-400/g, 'text-[#8B5E3C]');
  content = content.replace(/bg-emerald-600/g, 'bg-[#C68642]');
  content = content.replace(/hover:bg-emerald-500/g, 'hover:bg-[#8B5E3C]');
  
  // 4. Restore light text ONLY on primary dark buttons
  // (Buttons with bg-gradient-to-r or bg-[#C68642] need light text)
  content = content.replace(/(bg-gradient-to-r from-\[#C68642\] to-\[#8B5E3C\][^"']*)text-\[#2F2F2F\]/g, '$1text-[#FFFDF9]');
  content = content.replace(/(bg-\[#C68642\][^"']*)text-\[#2F2F2F\]/g, '$1text-[#FFFDF9]');
  content = content.replace(/(bg-\[#8B5E3C\][^"']*)text-\[#2F2F2F\]/g, '$1text-[#FFFDF9]');
  
  // Destructive button fixes
  content = content.replace(/bg-red-500\/10/g, 'bg-[#FFFDF9]');
  content = content.replace(/hover:bg-red-500 hover:text-\[#2F2F2F\]/g, 'hover:bg-red-600 hover:text-[#FFFDF9]');
  
  // 5. Input rings
  content = content.replace(/focus:ring-indigo-500/g, 'focus:border-[#C68642] focus:ring-[#C68642]/30');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed contrast in: ${file}`);
  }
});
console.log('Contrast fix complete.');

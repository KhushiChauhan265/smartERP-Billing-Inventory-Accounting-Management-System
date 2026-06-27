const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

const replacements = [
  // Backgrounds
  { regex: /bg-amber-50/g, replacement: 'bg-[#F8F4EE]' },
  { regex: /bg-amber-100/g, replacement: 'bg-[#FFFDF9]' },
  { regex: /bg-amber-200/g, replacement: 'bg-[#E7C9A9]' },
  
  // Borders
  { regex: /border-amber-300/g, replacement: 'border-[#EFE7DD]' },
  { regex: /border-amber-200/g, replacement: 'border-[#EFE7DD]' },
  { regex: /border-orange-600/g, replacement: 'border-[#C68642]' },
  { regex: /border-orange-700/g, replacement: 'border-[#8B5E3C]' },
  
  // Text
  { regex: /text-stone-900/g, replacement: 'text-[#2F2F2F]' },
  { regex: /text-stone-800/g, replacement: 'text-[#2F2F2F]/90' },
  { regex: /text-stone-700/g, replacement: 'text-[#2F2F2F]/70' },
  { regex: /text-stone-600/g, replacement: 'text-[#2F2F2F]/50' },
  { regex: /text-orange-900/g, replacement: 'text-[#8B5E3C]' },
  { regex: /text-orange-800/g, replacement: 'text-[#8B5E3C]' },
  { regex: /text-orange-700/g, replacement: 'text-[#C68642]' },
  
  // Primary buttons & backgrounds
  { regex: /bg-orange-700/g, replacement: 'bg-gradient-to-r from-[#C68642] to-[#8B5E3C]' },
  { regex: /bg-orange-600/g, replacement: 'bg-[#C68642]' },
  
  // Hovers
  { regex: /hover:bg-orange-800/g, replacement: 'hover:shadow-lg transition-all duration-150 hover:scale-[1.01]' },
  { regex: /hover:bg-amber-200/g, replacement: 'hover:bg-[#E7C9A9]' },
  
  // Forms & Focus
  { regex: /focus:border-orange-600/g, replacement: 'focus:border-[#C68642] focus:ring-[#C68642]/30' },
  
  // Dividers
  { regex: /divide-amber-200/g, replacement: 'divide-[#EFE7DD]' },
  
  // Rounded Corners (General -> Premium)
  { regex: /rounded-lg/g, replacement: 'rounded-2xl' },
  { regex: /rounded-md/g, replacement: 'rounded-full' },
  
  // Shadows
  { regex: /shadow-sm/g, replacement: 'shadow-md' },
];

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
  
  replacements.forEach(rule => {
    content = content.replace(rule.regex, rule.replacement);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
console.log('Premium theme update complete.');

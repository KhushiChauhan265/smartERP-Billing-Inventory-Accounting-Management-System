const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

const replacements = [
  { regex: /bg-slate-900/g, replacement: 'bg-amber-50' },
  { regex: /bg-slate-800(\/\d+)?/g, replacement: 'bg-amber-100' },
  { regex: /bg-slate-700(\/\d+)?/g, replacement: 'bg-amber-200' },
  { regex: /border-slate-800(\/\d+)?/g, replacement: 'border-amber-300' },
  { regex: /border-slate-700(\/\d+)?/g, replacement: 'border-amber-200' },
  { regex: /text-slate-100/g, replacement: 'text-stone-900' },
  { regex: /text-slate-200/g, replacement: 'text-stone-900' },
  { regex: /text-slate-300/g, replacement: 'text-stone-800' },
  { regex: /text-slate-400/g, replacement: 'text-stone-700' },
  { regex: /text-slate-500/g, replacement: 'text-stone-600' },
  { regex: /bg-indigo-600/g, replacement: 'bg-orange-700' },
  { regex: /bg-indigo-500/g, replacement: 'bg-orange-600' },
  { regex: /hover:bg-indigo-500/g, replacement: 'hover:bg-orange-800' },
  { regex: /hover:bg-slate-700(\/\d+)?/g, replacement: 'hover:bg-amber-200' },
  { regex: /hover:bg-slate-800(\/\d+)?/g, replacement: 'hover:bg-amber-200' },
  { regex: /text-indigo-400/g, replacement: 'text-orange-800' },
  { regex: /border-indigo-500/g, replacement: 'border-orange-600' },
  { regex: /focus:border-indigo-500/g, replacement: 'focus:border-orange-600' },
  { regex: /divide-slate-800/g, replacement: 'divide-amber-200' },
  { regex: /text-white/g, replacement: 'text-white' } // Keep text-white for buttons
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
  
  // Specific tweaks
  if (file.endsWith('Sidebar.js')) {
     content = content.replace(/text-stone-800 hover:bg-amber-200/g, 'text-stone-700 hover:bg-amber-200 hover:text-orange-900');
     content = content.replace(/bg-orange-700 text-white font-semibold/g, 'bg-amber-200 text-stone-900 font-semibold border-l-4 border-orange-700');
  }

  if (file.endsWith('layout.js')) {
      content = content.replace(/className="min-h-full flex bg-amber-50 text-stone-900"/, 'className="min-h-full flex bg-amber-50 text-stone-900"');
      content = content.replace(/antialiased dark/, 'antialiased');
  }
  
  // Clean up cases where text-white might have been inappropriately kept in places it shouldn't be, 
  // but let's let the basic rules do the heavy lifting first.
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
console.log('Theme update complete.');

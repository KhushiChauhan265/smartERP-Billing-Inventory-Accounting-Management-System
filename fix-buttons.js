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
  
  if (file.endsWith('button.js')) {
    content = content.replace(
      /destructive: "bg-red-500 text-\[#2F2F2F\] shadow-md hover:bg-red-600 border border-transparent",/g,
      'destructive: "bg-red-600 text-white shadow-md hover:bg-red-700 border border-transparent",'
    );
  }

  // Remove the messy inline classes that conflict with the destructive button
  // These were left over from the previous regex passes
  const badDeleteClass = 'className="bg-[#FFFDF9] text-red-600 hover:bg-red-600 hover:text-[#FFFDF9] border border-red-500/20 hover:border-red-500"';
  content = content.replace(new RegExp(badDeleteClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'className="bg-red-600 text-white hover:bg-red-700 transition-colors"');

  const badXClass = 'className="bg-[#FFFDF9] text-red-600 hover:bg-red-600 hover:text-[#FFFDF9] border border-red-500/20 hover:border-red-500 p-2 h-9 w-9"';
  content = content.replace(new RegExp(badXClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'className="bg-red-500 text-white hover:bg-red-600 transition-colors p-2 h-9 w-9 flex items-center justify-center"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed buttons in: ${file}`);
  }
});
console.log('Button fix complete.');

const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove {/* ... */} React Comments
    content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    
    // Remove /* ... */ Block CSS/JS comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove single line // comments (skipping http:// URLs)
    content = content.replace(/(\s*)\/\/.*$/gm, (match, prefix) => {
      if (match.includes('://')) return match; // skip URLs perfectly
      return prefix; // preserve formatting without the comment
    });
    
    // Clean excessive empty spaces
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned: ${filePath}`);
  } catch (err) {
    console.error(`Failed to clean ${filePath}`, err);
  }
}

const basePath = '/Users/tani/Complaint System';
const files = [
  path.join(basePath, 'Backend/server.js'),
  path.join(basePath, 'frontend-react/src/App.jsx'),
  path.join(basePath, 'frontend-react/src/App.css'),
  path.join(basePath, 'frontend-react/src/index.css'),
];

files.forEach(cleanFile);

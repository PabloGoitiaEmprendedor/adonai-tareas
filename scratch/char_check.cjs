const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/Downloads/Antigravity/adonai-tareas/src/components/ui/event-manager.tsx', 'utf8');
const lines = content.split('\n');
const line956 = lines[955]; // 0-indexed
console.log(`Line 956: "${line956}"`);
for (let i = 0; i < line956.length; i++) {
  console.log(`Char at ${i}: ${line956[i]} (code: ${line956.charCodeAt(i)})`);
}

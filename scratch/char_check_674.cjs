const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/Downloads/Antigravity/adonai-tareas/src/components/ui/event-manager.tsx', 'utf8');
const lines = content.split('\n');
const line674 = lines[673]; // 0-indexed
console.log(`Line 674: "${line674}"`);
for (let i = 0; i < line674.length; i++) {
  console.log(`Char at ${i}: ${line674[i]} (code: ${line674.charCodeAt(i)})`);
}

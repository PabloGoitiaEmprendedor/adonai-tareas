const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/Downloads/Antigravity/adonai-tareas/src/components/ui/event-manager.tsx', 'utf8');

let parens = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let char of line) {
    if (char === '(') parens++;
    if (char === ')') parens--;
    if (parens < 0) {
      console.log(`Unmatched ) at line ${i + 1}`);
      parens = 0;
    }
  }
}
console.log(`Final parens balance: ${parens}`);

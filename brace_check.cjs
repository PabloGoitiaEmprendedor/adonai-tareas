
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Usuario\\Downloads\\Antigravity\\adonai-tareas\\src\\components\\ui\\event-manager.tsx', 'utf8');
let open = 0;
let close = 0;
for (const char of content) {
    if (char === '{') open++;
    if (char === '}') close++;
}
console.log(`Open: ${open}, Close: ${close}`);

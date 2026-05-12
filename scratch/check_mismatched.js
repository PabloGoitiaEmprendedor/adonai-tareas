const fs = require('fs');
const content = fs.readFileSync('c:/Users/Usuario/Downloads/Antigravity/adonai-tareas/src/components/ui/event-manager.tsx', 'utf8');
const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;
const openTags = (content.match(/<[^/!][^>]*>/g) || []).length;
const closeTags = (content.match(/<\/[^>]+>/g) || []).length;
console.log(`Braces: { ${openBraces}, } ${closeBraces} `);
console.log(`Tags: < ${openTags}, > ${closeTags} `);

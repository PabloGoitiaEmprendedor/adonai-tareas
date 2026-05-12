import sys

file_path = 'src/components/ui/event-manager.tsx'
with open(file_path, 'rb') as f:
    content = f.read()

# Target string for calendar cells
target = b'className="cursor-pointer hover:bg-white/10 transition-colors group relative"\r\n                         style={{ height: `${HOUR_HEIGHT / 4}px` }}\r\n                         onDragOver={(e) => e.preventDefault()}'

replacement = b'''className="cursor-pointer hover:bg-white/10 transition-colors group relative"
                         data-cell-day={day.toISOString()}
                         data-cell-hour={hour}
                         data-cell-mins={mins}
                         style={{ height: `${HOUR_HEIGHT / 4}px` }}
                         onDragOver={(e) => e.preventDefault()}'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'wb') as f:
        f.write(content)
    print("SUCCESS: Added data-cell attributes")
else:
    print("ERROR: Target string not found")

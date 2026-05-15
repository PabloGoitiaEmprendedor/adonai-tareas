import os

file_path = r'C:\Users\Usuario\Downloads\Antigravity\adonai-tareas\src\components\ui\event-manager.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The pattern to remove is from the first 'export interface Event {' (line 51)
# to the second 'export interface Event {' (line 106) but keeping the second one's properties.
# Actually, let's just find the block and replace it.

start_marker = 'export interface Event {\n  id: string\n  title: string\n  description?: string\n  startTime: Date\n"use client"'
end_marker = 'export interface Event {'

# Since there might be CRLF, let's handle both.
content = content.replace('\r\n', '\n')

import re
# We want to replace everything between the first 'export interface Event' and the second one.
# But we want to be careful.

pattern = re.compile(r'export interface Event \{.*?export interface Event \{', re.DOTALL)
new_content = pattern.sub('export interface Event {', content, count=1)

with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(new_content)

print("Replacement done.")

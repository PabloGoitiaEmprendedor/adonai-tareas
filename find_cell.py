content = open('src/components/ui/event-manager.tsx', 'rb').read()
idx = content.find(b'cursor-pointer hover:bg-white/10')
print('idx:', idx)
print(repr(content[idx-50:idx+300]))

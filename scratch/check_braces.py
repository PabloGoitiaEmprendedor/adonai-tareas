
import sys

def count_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    curly = 0
    square = 0
    round_b = 0
    line_no = 1
    col_no = 1
    
    stack = []
    
    for i, char in enumerate(content):
        if char == '\n':
            line_no += 1
            col_no = 1
        else:
            col_no += 1
            
        if char == '{':
            curly += 1
            stack.append(('{', line_no, col_no))
        elif char == '}':
            curly -= 1
            if stack and stack[-1][0] == '{':
                stack.pop()
            else:
                print(f"Extra '}}' at line {line_no}, col {col_no}")
        elif char == '[':
            square += 1
            stack.append(('[', line_no, col_no))
        elif char == ']':
            square -= 1
            if stack and stack[-1][0] == '[':
                stack.pop()
            else:
                print(f"Extra ']' at line {line_no}, col {col_no}")
        elif char == '(':
            round_b += 1
            stack.append(('(', line_no, col_no))
        elif char == ')':
            round_b -= 1
            if stack and stack[-1][0] == '(':
                stack.pop()
            else:
                print(f"Extra ')' at line {line_no}, col {col_no}")
                
    print(f"Final counts: Curly={curly}, Square={square}, Round={round_b}")
    if stack:
        print("Unclosed brackets:")
        for s in stack:
            print(f"  {s[0]} opened at line {s[1]}, col {s[2]}")

if __name__ == "__main__":
    count_braces(sys.argv[1])

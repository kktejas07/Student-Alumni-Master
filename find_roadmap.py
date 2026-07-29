with open(r'backend/server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '/ai/career-roadmap' in line and 'post' in line:
        print(f'Line {i+1}: {repr(line.rstrip())}')
        for j in range(max(0,i-2), min(len(lines), i+5)):
            print(f'  {j+1}: {repr(lines[j].rstrip())}')
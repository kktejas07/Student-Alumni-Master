import re

with open("routers/users.py", "r") as f:
    content = f.read()

# Replace exact calls to add `server.` prefix
content = re.sub(r'(?<!server\.)\bserialize_user\(', 'server.serialize_user(', content)
content = re.sub(r'(?<!server\.)\bvalidate_student_class\(', 'server.validate_student_class(', content)
content = re.sub(r'(?<!server\.)\bsend_push_notification\(', 'server.send_push(', content)
content = re.sub(r'(?<!server\.)\bsend_push\(', 'server.send_push(', content)

# Inject `import server` at the top of the functions that use these.
# A simple way is to just find all defs and if they contain server.serialize etc, add import server.
def add_import(match):
    func_body = match.group(0)
    # The regex matches from 'def ...:' to the next 'def ...:' or end of file
    if "server.serialize_user" in func_body or "server.validate_student_class" in func_body or "server.send_push" in func_body:
        # insert right after the def line
        lines = func_body.split('\n')
        # find first line after def that is not a docstring or just indent it properly
        for i, line in enumerate(lines):
            if line.strip().endswith(':'):
                indent = re.match(r'^\s*', lines[i+1]).group(0) if i+1 < len(lines) else '    '
                if not indent: indent = '    '
                lines.insert(i+1, indent + "import server")
                break
        return '\n'.join(lines)
    return func_body

# Split by async def or def
parts = re.split(r'(^(?:async )?def\b)', content, flags=re.MULTILINE)
new_content = parts[0]
for i in range(1, len(parts), 2):
    func_header = parts[i]
    func_body = parts[i+1]
    
    # We combine them back and then do the replacement
    combined = func_header + func_body
    
    if "server." in combined:
        lines = combined.split('\n')
        for j, line in enumerate(lines):
            if line.strip().endswith(':'):
                # find the indentation of the next non-empty line
                indent = '    '
                for k in range(j+1, len(lines)):
                    if lines[k].strip():
                        indent_match = re.match(r'^(\s+)', lines[k])
                        if indent_match:
                            indent = indent_match.group(1)
                        break
                lines.insert(j+1, indent + "import server")
                break
        new_content += '\n'.join(lines)
    else:
        new_content += combined

with open("routers/users.py", "w") as f:
    f.write(new_content)

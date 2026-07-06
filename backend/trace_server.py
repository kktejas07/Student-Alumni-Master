import ast
import sys

# Reconfigure stdout to write UTF-8 to avoid console encode errors
sys.stdout.reconfigure(encoding='utf-8')

with open("server.py", "r", encoding="utf-8") as f:
    tree = ast.parse(f.read())

print("Starting server.py AST trace...")
g = {**globals(), '__file__': 'server.py'}
for n in tree.body:
    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        code = compile(ast.Module(body=[n], type_ignores=[]), "<ast>", "exec")
        exec(code, g)
    else:
        line = getattr(n, 'lineno', '?')
        print(f"Line {line}: {ast.unparse(n)}")
        sys.stdout.flush()
        code = compile(ast.Module(body=[n], type_ignores=[]), "<ast>", "exec")
        exec(code, g)
print("Trace finished successfully!")

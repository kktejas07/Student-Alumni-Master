import os
import re

files_changed = []

def replace_in_file(filepath, pattern, repl):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    new_content, count = re.subn(pattern, repl, content)
    if count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        if filepath not in files_changed:
            files_changed.append(filepath)

base_dir = r"d:\my_proj\Student-Alumni-Master-main\backend"

for root, dirs, files in os.walk(base_dir):
    if 'venv' in dirs: dirs.remove('venv')
    if '__pycache__' in dirs: dirs.remove('__pycache__')
    if '.git' in dirs: dirs.remove('.git')
    for filename in files:
        if filename.endswith('.py'):
            filepath = os.path.join(root, filename)
            
            replace_in_file(filepath, r'\s*or\s+\w+\.get\([\'"]face_image_base64[\'"]\)', '')
            replace_in_file(filepath, r'\s*or\s+\w+\.get\([\'"]photo[\'"]\)', '')
            replace_in_file(filepath, r'\s*or\s+\w+\.get\([\'"]resume_url[\'"]\)', '')
            replace_in_file(filepath, r'\s*or\s+\w+\.get\([\'"]resume_data[\'"]\)', '')
            
            replace_in_file(filepath, r'\,?\s*[\'"]face_image_base64[\'"]\s*:\s*\w+\.get\([\'"]face_image_base64[\'"]\)', '')
            replace_in_file(filepath, r'\,?\s*[\'"]face_image_base64[\'"]\s*:\s*[Nn]one', '')
            
            replace_in_file(filepath, r'student\.get\([\'"]face_image_base64[\'"]\)', 'student.get("photo_data")')
            replace_in_file(filepath, r'user\.get\([\'"]face_image_base64[\'"]\)', 'user.get("photo_data")')
            
            replace_in_file(filepath, r'\,?\s*[\'"]face_image_base64[\'"]\s*:\s*[01]', '')
            replace_in_file(filepath, r'\,?\s*[\'"]photo[\'"]\s*:\s*[01]', '')
            
            replace_in_file(filepath, r'\,?\s*[\'"]face_image_base64[\'"]\s*:\s*req\.face_image_base64', '')

print("Updated files:", len(files_changed))
for f in files_changed:
    print(f)

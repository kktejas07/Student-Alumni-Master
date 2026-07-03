import re

def fix():
    with open('tests/test_all_endpoints.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(r'"name"\s*:', '"full_name":', content)
    content = re.sub(r'\'name\'\s*:', '\'full_name\':', content)

    with open('tests/test_all_endpoints.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!")

if __name__ == '__main__':
    fix()

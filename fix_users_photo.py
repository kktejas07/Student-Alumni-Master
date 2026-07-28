import re

filepath = 'backend/routers/users.py'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace: {"password_hash": 0, "face_image_base64": 0} -> {"password_hash": 0}
text = text.replace('{"password_hash": 0, "face_image_base64": 0}', '{"password_hash": 0}')

# Replace: {"password_hash": 0, "phone": 0, "face_image_base64": 0, "two_fa_secret": 0} -> {"password_hash": 0, "phone": 0, "two_fa_secret": 0}
text = text.replace('{"password_hash": 0, "phone": 0, "face_image_base64": 0, "two_fa_secret": 0}', '{"password_hash": 0, "phone": 0, "two_fa_secret": 0}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Removed face_image_base64 exclusions.")

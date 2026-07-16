import re
content = '"photo_data": s.get("photo_data"),'
new, c = re.subn(r'\s*or\s+\w+\.get\([\'"]face_image_base64[\'"]\)', '', content)
print(c, new)

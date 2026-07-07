import re

with open("server.py", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "class RegisterRequest" in line: print(f"RegisterRequest: {i+1}")
    elif "class TwoFADisableRequest" in line: print(f"TwoFADisableRequest: {i+1}")
    elif "class CheckEmailRequest" in line: print(f"CheckEmailRequest: {i+1}")
    elif "def register(" in line: print(f"register: {i+1}")
    elif "def check_email(" in line: print(f"check_email: {i+1}")
    elif "def forgot_password(" in line: print(f"forgot_password: {i+1}")
    elif "def login(" in line: print(f"login: {i+1}")
    elif "def refresh_token(" in line: print(f"refresh_token: {i+1}")
    elif "def two_fa_setup(" in line: print(f"two_fa_setup: {i+1}")
    elif "def two_fa_regenerate_backup(" in line: print(f"two_fa_regenerate_backup: {i+1}")
    elif "def oauth_config(" in line: print(f"oauth_config: {i+1}")
    elif "def auth_firebase(" in line: print(f"auth_firebase: {i+1}")

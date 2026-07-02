import subprocess
import sys
import os

req_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
log_path = os.path.join(os.path.dirname(__file__), "pip_run_log.txt")

with open(log_path, "w", encoding="utf-8") as f:
    f.write(f"Starting pip install with requirements: {req_path}\n")
    f.flush()
    try:
        proc = subprocess.Popen(
            [sys.executable, "-m", "pip", "install", "-r", req_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        for line in proc.stdout:
            f.write(line)
            f.flush()
        proc.wait()
        f.write(f"\nFinished with code {proc.returncode}\n")
    except Exception as e:
        f.write(f"Exception: {str(e)}\n")

import os
import subprocess
import time

repo_dir = r"c:\Users\kavya\OneDrive\Apps\Desktop\Master\Student-Alumni-Master"
os.chdir(repo_dir)

while os.path.exists(".git/rebase-merge"):
    print("Detected rebase in progress...")
    
    # Check what is unmerged
    status = subprocess.run(["git", "diff", "--name-only", "--diff-filter=U"], capture_output=True, text=True)
    unmerged = [f for f in status.stdout.strip().split('\n') if f]
    
    for f in unmerged:
        print(f"Resolving conflict in {f} by keeping --ours (COMMON-DEV)...")
        subprocess.run(["git", "checkout", "--ours", f])
        subprocess.run(["git", "add", f])
        
    # Check if there's anything left to commit
    status_output = subprocess.run(["git", "status"], capture_output=True, text=True).stdout
    if "no changes added to commit" in status_output or "nothing to commit" in status_output:
        print("Empty commit detected, skipping...")
        res = subprocess.run(["git", "rebase", "--skip"])
    else:
        print("Continuing rebase...")
        res = subprocess.run(["git", "-c", "core.editor=true", "rebase", "--continue"])
        
    if res.returncode != 0:
        # Check if it failed due to a new conflict or something else
        status3 = subprocess.run(["git", "diff", "--name-only", "--diff-filter=U"], capture_output=True, text=True)
        if status3.stdout.strip() == "":
            print("Rebase command failed for an unknown reason (not a merge conflict). Breaking loop.")
            print(subprocess.run(["git", "status"], capture_output=True, text=True).stdout)
            break
    time.sleep(1)

print("Rebase loop finished. Current status:")
subprocess.run(["git", "status"])

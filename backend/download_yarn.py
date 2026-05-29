import urllib.request
import tarfile
import os

url = "https://registry.npmjs.org/yarn/-/yarn-1.22.22.tgz"
target_dir = r"c:\Users\phane\OneDrive\Desktop\Master\Student-Alumni-Master-1\frontend\yarn-local"
tar_path = os.path.join(target_dir, "yarn.tgz")

os.makedirs(target_dir, exist_ok=True)

print(f"Downloading Yarn from {url}...")
urllib.request.urlretrieve(url, tar_path)
print("Downloaded successfully. Extracting...")

with tarfile.open(tar_path, "r:gz") as tar:
    tar.extractall(path=target_dir)

print(f"Yarn extracted to {target_dir}")
os.remove(tar_path)

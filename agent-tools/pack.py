import glob
import os
import zipfile

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOWNLOADS = os.path.dirname(SRC)
NAME = "MatouMafia-leger.zip"
OUT = os.path.join(DOWNLOADS, NAME)
DST = os.path.join(DOWNLOADS, "MatouMafia-envoi")
PART = 9 * 1024 * 1024
SKIP = {"__pycache__", ".git", "node_modules"}

os.makedirs(DST, exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, SRC))

for p in glob.glob(os.path.join(DST, NAME + ".*")):
    os.remove(p)
with open(OUT, "rb") as f:
    data = f.read()
names = []
for i in range(0, len(data), PART):
    n = f"{NAME}.{len(names) + 1:03d}"
    with open(os.path.join(DST, n), "wb") as w:
        w.write(data[i:i + PART])
    names.append(n)

bat = [
    "@echo off",
    'cd /d "%~dp0"',
    "copy /b " + "+".join(names) + " " + NAME,
    "echo.",
    "echo Termine : " + NAME,
    "pause",
]
with open(os.path.join(DST, "RECOLLER.bat"), "w", newline="\r\n") as f:
    f.write("\n".join(bat) + "\n")
print(len(names), "morceaux,", round(len(data) / 1048576, 2), "MB ->", DST)

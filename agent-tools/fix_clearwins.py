from pathlib import Path
p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = p.read_text(encoding="utf-8")
old = 'document.querySelectorAll(".cell").forEach((el)=>el.classList.remove("win","scatter","spark","hit","lit"));'
new = 'document.querySelectorAll(".cell").forEach((el)=>el.classList.remove("win","scatter","spark","hit","lit","explode","gone","tumbling"));'
assert s.count(old) == 1
p.write_text(s.replace(old, new), encoding="utf-8", newline="\n")
print("ok")

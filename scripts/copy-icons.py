import shutil
import os

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
src_dir = "/home/user/public/icons"
dst_dir = "/vercel/share/v0-project/public/icons"

os.makedirs(dst_dir, exist_ok=True)

for size in sizes:
    filename = f"icon-{size}x{size}.png"
    src = os.path.join(src_dir, filename)
    dst = os.path.join(dst_dir, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {filename} ({os.path.getsize(dst)} bytes)")
    else:
        print(f"MISSING: {src}")

print("Done!")

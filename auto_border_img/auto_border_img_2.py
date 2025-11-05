from PIL import Image, ImageFilter, ImageChops
import os

# === ⚙️ CẤU HÌNH TÙY BIẾN ===
input_folder = "output"                  # Thư mục ảnh gốc
output_folder = "output2"              # Thư mục lưu kết quả
os.makedirs(output_folder, exist_ok=True)

border_size = 2                      # 🔧 Độ dày viền (px)
softness = 0                          # 🔧 Độ mờ viền (0 = sắc nét, >0 = glow nhẹ)
border_color = (0, 0, 0, 255)   # 🔧 Màu viền (RGBA, trắng mặc định)

# ==============================

for filename in os.listdir(input_folder):
    if not filename.lower().endswith(".png"):
        continue

    img_path = os.path.join(input_folder, filename)
    img = Image.open(img_path).convert("RGBA")

    # --- Mở rộng canvas TRƯỚC để viền không bị cắt ---
    expanded_canvas = Image.new(
        "RGBA",
        (img.width + border_size * 2, img.height + border_size * 2),
        (0, 0, 0, 0)
    )
    expanded_canvas.paste(img, (border_size, border_size))

    # --- Xử lý alpha channel trên canvas đã mở rộng ---
    alpha = expanded_canvas.split()[-1]

    # Làm nở vùng alpha để tạo viền
    expanded_alpha = alpha.filter(ImageFilter.MaxFilter(border_size * 2 + 1))
    border_mask = ImageChops.difference(expanded_alpha, alpha)

    # Làm mờ rìa nếu softness > 0
    if softness > 0:
        border_mask = border_mask.filter(ImageFilter.GaussianBlur(softness))

    # --- Tạo lớp viền ---
    border_layer = Image.new("RGBA", expanded_canvas.size, border_color)
    border_layer.putalpha(border_mask)

    # --- Gộp viền và ảnh ---
    result = Image.alpha_composite(border_layer, expanded_canvas)

    # --- Lưu ---
    save_path = os.path.join(output_folder, filename)
    result.save(save_path)
    print(f"✅ Đã xử lý: {filename}")

print("🎉 Hoàn tất tất cả ảnh PNG!")
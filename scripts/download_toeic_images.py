import os
import io
import time
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

SRC_JSON = r"D:\vocab\src\data\toeic_1650.json"
OUTPUT_DIR = r"D:\vocab\public\images\toeic"
MAX_WORKERS = 6
MAX_RETRIES = 3
WEBP_QUALITY = 90

def is_valid_image(filepath):
    if not os.path.exists(filepath):
        return False
    if os.path.getsize(filepath) < 500:
        return False
    try:
        with Image.open(filepath) as img:
            img.verify()
        return True
    except Exception:
        return False

def download_and_convert(item, index, total):
    stt = index + 1
    filename = f"toeic_{stt}.webp"
    target_path = os.path.join(OUTPUT_DIR, filename)
    url = item.get("image") or item.get("imageUrl")
    word = item.get("word", "")

    # Check if already downloaded and valid
    if is_valid_image(target_path):
        return {
            "index": index,
            "stt": stt,
            "word": word,
            "filename": filename,
            "success": True,
            "skipped": True,
            "size": os.path.getsize(target_path),
            "url": url
        }

    if not url or not url.startswith("http"):
        return {
            "index": index,
            "stt": stt,
            "word": word,
            "filename": filename,
            "success": False,
            "error": "No valid URL",
            "url": url
        }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.getcode() != 200:
                    raise ValueError(f"HTTP status {resp.getcode()}")
                raw_bytes = resp.read()

            # Verify it's a valid image
            img = Image.open(io.BytesIO(raw_bytes))
            
            # Convert RGBA / P / CMYK modes cleanly if needed
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                converted = img.convert("RGBA")
            elif img.mode != "RGB":
                converted = img.convert("RGB")
            else:
                converted = img

            # Save as WebP with high quality
            temp_path = target_path + ".tmp"
            converted.save(temp_path, format="WEBP", quality=WEBP_QUALITY, method=6)

            # Atomic replace
            if os.path.exists(target_path):
                os.remove(target_path)
            os.rename(temp_path, target_path)

            file_size = os.path.getsize(target_path)
            return {
                "index": index,
                "stt": stt,
                "word": word,
                "filename": filename,
                "success": True,
                "skipped": False,
                "size": file_size,
                "url": url
            }

        except Exception as e:
            last_error = str(e)
            if attempt < MAX_RETRIES:
                time.sleep(1.0 * attempt)

    return {
        "index": index,
        "stt": stt,
        "word": word,
        "filename": filename,
        "success": False,
        "error": last_error,
        "url": url
    }

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(SRC_JSON, "r", encoding="utf-8") as f:
        words = json.load(f)

    total = len(words)
    print(f"Bắt đầu tải {total} ảnh TOEIC về '{OUTPUT_DIR}'...")
    print(f"Cấu hình: {MAX_WORKERS} luồng đồng thời, chất lượng WebP={WEBP_QUALITY}, tối đa {MAX_RETRIES} lần thử lại.")

    start_time = time.time()
    results = [None] * total
    completed = 0
    success_count = 0
    skipped_count = 0
    failed_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_map = {
            executor.submit(download_and_convert, item, idx, total): idx
            for idx, item in enumerate(words)
        }

        for future in as_completed(future_map):
            idx = future_map[future]
            try:
                res = future.result()
            except Exception as e:
                res = {
                    "index": idx,
                    "stt": idx + 1,
                    "word": words[idx].get("word", ""),
                    "filename": f"toeic_{idx + 1}.webp",
                    "success": False,
                    "error": str(e)
                }

            results[idx] = res
            completed += 1

            if res["success"]:
                success_count += 1
                if res.get("skipped"):
                    skipped_count += 1
            else:
                failed_count += 1
                print(f"[THẤT BẠI] Từ {res['stt']}: {res['word']} - Lỗi: {res.get('error')}")

            if completed % 100 == 0 or completed == total:
                elapsed = time.time() - start_time
                print(f"Tiến độ: {completed}/{total} ({completed/total*100:.1f}%) | Thành công: {success_count} | Thất bại: {failed_count} | Thời gian: {elapsed:.1f}s")

    # Thống kê dung lượng
    total_bytes = 0
    valid_files = 0
    for res in results:
        if res and res["success"]:
            target_path = os.path.join(OUTPUT_DIR, res["filename"])
            if os.path.exists(target_path):
                total_bytes += os.path.getsize(target_path)
                valid_files += 1

    total_mb = total_bytes / (1024 * 1024)
    avg_kb = (total_bytes / valid_files / 1024) if valid_files > 0 else 0

    print("\n" + "=" * 50)
    print("KẾT QUẢ TẢI ẢNH:")
    print(f"- Tổng số ảnh xử lý: {total}")
    print(f"- Tải thành công: {success_count}")
    print(f"- Đã có sẵn (bỏ qua): {skipped_count}")
    print(f"- Thất bại: {failed_count}")
    print(f"- Tổng dung lượng thư mục: {total_mb:.2f} MB")
    print(f"- Dung lượng trung bình mỗi ảnh: {avg_kb:.2f} KB")
    print("=" * 50)

    # Lưu log chi tiết nếu có lỗi
    if failed_count > 0:
        failed_items = [r for r in results if not r["success"]]
        log_path = os.path.join(OUTPUT_DIR, "_download_failed.json")
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(failed_items, f, ensure_ascii=False, indent=2)
        print(f"Đã lưu danh sách lỗi vào {log_path}")

if __name__ == "__main__":
    main()


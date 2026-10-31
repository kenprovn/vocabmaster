import json
import os
import re

AUDIO_DIR = os.path.join("public", "audio", "en-gb")
MANIFEST_PATH = os.path.join("src", "data", "audioManifest.js")
TOEIC_PATH = os.path.join("src", "data", "toeic_1650.json")

def load_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    pattern = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)",?', re.MULTILINE)
    manifest = {}
    for match in pattern.finditer(content):
        manifest[match.group(1)] = match.group(2)
    return manifest

def resolve_audio(manifest, word, word_id):
    if word_id and str(word_id) in manifest:
        return manifest[str(word_id)]
    clean_word = (word or '').strip().lower()
    if clean_word in manifest:
        return manifest[clean_word]
    norm_space = clean_word.replace(" ", "_")
    if norm_space in manifest:
        return manifest[norm_space]
    norm_hyphen = clean_word.replace("-", "_")
    if norm_hyphen in manifest:
        return manifest[norm_hyphen]
    return None

def main():
    manifest = load_manifest()
    print(f"Tổng số entries trong manifest: {len(manifest):,}")

    with open(TOEIC_PATH, "r", encoding="utf-8") as f:
        toeic_items = json.load(f)

    print(f"Tổng số từ TOEIC: {len(toeic_items)}")

    # 1. Kiểm tra 1,650 từ TOEIC
    missing_lookup = []
    missing_file = []
    zero_size = []

    for item in toeic_items:
        word = item["word"]
        item_id = item["id"]
        rel_path = resolve_audio(manifest, word, item_id)
        if not rel_path:
            missing_lookup.append((item_id, word))
            continue
        
        full_path = os.path.join("public", rel_path)
        if not os.path.exists(full_path):
            missing_file.append((item_id, word, rel_path))
        elif os.path.getsize(full_path) < 1000:
            zero_size.append((item_id, word, rel_path, os.path.getsize(full_path)))

    print("\n" + "=" * 60)
    print("KẾT QUẢ KIỂM TRA TOÀN BỘ 1.650 TỪ TOEIC:")
    print(f"- Số từ tra cứu thành công trong Manifest: {len(toeic_items) - len(missing_lookup)}/{len(toeic_items)}")
    print(f"- Số từ không tìm thấy trong Manifest: {len(missing_lookup)}")
    print(f"- Số file audio tồn tại thực tế trên đĩa: {len(toeic_items) - len(missing_file)}/{len(toeic_items)}")
    print(f"- Số file audio bị thiếu: {len(missing_file)}")
    print(f"- Số file rỗng hoặc lỗi (<1000 bytes): {len(zero_size)}")
    print("=" * 60)

    # 2. Kiểm tra 5 từ đặc biệt
    special_words = [
        "HIGH-RISE",
        "FORKLIFT TRUCK",
        "THOUGHT-PROVOKING",
        "UP-TO-DATE",
        "LAY-OFF"
    ]
    print("\nKIỂM TRA 5 TỪ / CỤM TỪ ĐẶC BIỆT:")
    for sp in special_words:
        # Tìm item tương ứng trong TOEIC
        found_item = next((it for it in toeic_items if it["word"].strip().upper() == sp), None)
        item_id = found_item["id"] if found_item else None
        rel_path = resolve_audio(manifest, sp, item_id)
        full_path = os.path.join("public", rel_path) if rel_path else None
        exists = os.path.exists(full_path) if full_path else False
        size = os.path.getsize(full_path) if exists else 0
        print(f"  • {sp:20} -> ID: {item_id:15} -> Path: {rel_path:30} -> Size: {size:,} B (OK: {exists and size > 1000})")

    # 3. Thống kê dung lượng kho audio
    audio_files = [os.path.join(AUDIO_DIR, f) for f in os.listdir(AUDIO_DIR) if f.endswith(".mp3")]
    total_audio_size = sum(os.path.getsize(f) for f in audio_files)
    print("\nTHỐNG KÊ KHO AUDIO public/audio/en-gb/:")
    print(f"- Tổng số file MP3: {len(audio_files):,}")
    print(f"- Tổng dung lượng: {total_audio_size / (1024*1024):.2f} MB")
    print(f"- Trung bình: {total_audio_size / len(audio_files) / 1024:.2f} KB / file")

    # 4. Kiểm tra Oxford 3000
    import glob
    oxford_files = glob.glob(os.path.join("unit", "*.json"))
    oxford_total = 0
    oxford_found = 0
    for u in oxford_files:
        with open(u, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                oxford_total += 1
                w = item.get("word", "").strip().lower()
                wid = str(item.get("id", ""))
                rel = resolve_audio(manifest, w, wid)
                if rel and os.path.exists(os.path.join("public", rel)):
                    oxford_found += 1

    print("\nKIỂM TRA OXFORD 3000 (BẢO TOÀN NGUYÊN VẸN):")
    print(f"- Tổng số từ Oxford: {oxford_total}")
    print(f"- Số từ có audio hợp lệ: {oxford_found}/{oxford_total} ({oxford_found/oxford_total*100:.2f}%)")

if __name__ == "__main__":
    main()

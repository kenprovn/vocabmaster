"""
Script tạo 641 file MP3 phát âm giọng Sonia (en-GB-SoniaNeural) còn thiếu cho TOEIC 1650
========================================================================================
- Giọng đọc: en-GB-SoniaNeural (Anh - Anh)
- Tốc độ đọc: chuẩn (+0%)
- Concurrency: 5 tác vụ đồng thời
- Output: public/audio/en-gb/
- Cập nhật và bảo toàn toàn bộ 5,966 entries Oxford trong src/data/audioManifest.js
- Đảm bảo 100% 1,650 từ TOEIC đều có ánh xạ audio và file MP3 tồn tại trên đĩa
"""

import asyncio
import json
import os
import re
import shutil
import edge_tts

VOICE = "en-GB-SoniaNeural"
AUDIO_DIR = os.path.join("public", "audio", "en-gb")
TEMP_20_DIR = os.path.join("temp_test_audio_20")
TOEIC_JSON_PATH = os.path.join("src", "data", "toeic_1650.json")
MANIFEST_PATH = os.path.join("src", "data", "audioManifest.js")
MISSING_LIST_PATH = os.path.join("scripts", "toeic_missing_audio.txt")

CONCURRENCY_LIMIT = 5

def sanitize_filename(word):
    clean = word.strip().lower()
    clean = re.sub(r'[\s/\\:]+', '_', clean)
    clean = re.sub(r'[^a-z0-9_-]', '', clean)
    return clean

async def generate_single(word, item_id, semaphore, stats, total_count):
    filename = f"{sanitize_filename(word)}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        stats["skipped"] += 1
        return

    # Retry loop up to 3 times
    for attempt in range(1, 4):
        try:
            async with semaphore:
                communicate = edge_tts.Communicate(word.strip(), voice=VOICE, rate="+0%")
                await communicate.save(filepath)
                await asyncio.sleep(0.1)

            if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
                stats["downloaded"] += 1
                done = stats["downloaded"] + stats["skipped"]
                if done % 25 == 0 or done == total_count:
                    print(f"[{done}/{total_count}] ✓ [{item_id}] '{word}' -> {filename} ({os.path.getsize(filepath):,} B)")
                return
        except Exception as e:
            if attempt == 3:
                stats["errors"] += 1
                print(f"[LỖI LẦN 3] [{item_id}] '{word}': {e}")
            else:
                await asyncio.sleep(1.0 * attempt)

def parse_existing_manifest(manifest_path):
    """Trích xuất toàn bộ entries hiện có trong audioManifest.js để bảo toàn 100% Oxford"""
    existing_entries = {}
    if not os.path.exists(manifest_path):
        return existing_entries

    with open(manifest_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Match patterns like: "word": "audio/en-gb/word.mp3"
    pattern = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)",?', re.MULTILINE)
    for match in pattern.finditer(content):
        key = match.group(1)
        val = match.group(2)
        existing_entries[key] = val

    return existing_entries

def update_manifest_file(manifest_entries):
    """Ghi đè audioManifest.js với tất cả các entries đã được cập nhật"""
    sorted_keys = sorted(manifest_entries.keys())
    
    entries_code = f"// src/data/audioManifest.js\n"
    entries_code += f"// Tự động cập nhật bởi scripts/generate_toeic_edge.py\n"
    entries_code += f"// Tổng số entries: {len(sorted_keys)} (Bao gồm Oxford 3000 + TOEIC 1650)\n\n"
    entries_code += "export const audioManifest = {\n"
    for key in sorted_keys:
        entries_code += f'  "{key}": "{manifest_entries[key]}",\n'
    entries_code += "};\n\n"

    helper_code = '''/**
 * Lấy URL audio cho từ vựng từ manifest, hỗ trợ Vite BASE_URL
 * @param {string} word - Từ vựng tiếng Anh
 * @param {string|number} [id] - ID từ vựng
 * @param {string} [type] - Từ loại (verb, noun, adjective...)
 * @returns {string|null} - URL file audio hoặc null nếu chưa có trong manifest
 */
export const getAudioUrlFromManifest = (word, id, type) => {
  if (!word && !id) return null;

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  // 1. Ưu tiên kiểm tra theo ID từ vựng
  if (id && audioManifest[String(id)]) {
    return `${cleanBase}${audioManifest[String(id)]}`;
  }

  const cleanWord = (word || '').trim().toLowerCase();

  // 2. Kiểm tra theo từ vựng + từ loại (dành cho từ dị âm theo từ loại)
  if (type && cleanWord) {
    const keyWithType = `${cleanWord}_${type.trim().toLowerCase()}`;
    if (audioManifest[keyWithType]) {
      return `${cleanBase}${audioManifest[keyWithType]}`;
    }
  }

  // 3. Kiểm tra theo từ vựng thông thường
  if (cleanWord && audioManifest[cleanWord]) {
    return `${cleanBase}${audioManifest[cleanWord]}`;
  }

  // 4. Kiểm tra theo từ đã chuẩn hóa (thay khoảng trắng bằng dấu gạch dưới)
  const normalizedWord = cleanWord.replace(/\\s+/g, '_');
  if (normalizedWord && audioManifest[normalizedWord]) {
    return `${cleanBase}${audioManifest[normalizedWord]}`;
  }

  // 5. Kiểm tra thay cả dấu gạch nối và khoảng trắng thành gạch dưới
  const sanitizedWord = cleanWord.replace(/[\\s\\-_]+/g, '_');
  if (sanitizedWord && audioManifest[sanitizedWord]) {
    return `${cleanBase}${audioManifest[sanitizedWord]}`;
  }

  return null;
};
'''

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write(entries_code + helper_code)

async def main():
    os.makedirs(AUDIO_DIR, exist_ok=True)

    # 1. Sao chép các file mẫu đã tạo thành công từ temp_test_audio_20 sang AUDIO_DIR nếu có
    if os.path.exists(TEMP_20_DIR):
        for fname in os.listdir(TEMP_20_DIR):
            if fname.endswith(".mp3"):
                src_file = os.path.join(TEMP_20_DIR, fname)
                dst_file = os.path.join(AUDIO_DIR, fname)
                if not os.path.exists(dst_file) or os.path.getsize(dst_file) == 0:
                    shutil.copy2(src_file, dst_file)
        print(f"-> Đã đồng bộ file từ '{TEMP_20_DIR}' sang '{AUDIO_DIR}'.")

    # 2. Đọc danh sách 641 từ cần tạo từ toeic_missing_audio.txt
    missing_items = []
    with open(MISSING_LIST_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) >= 3:
                missing_items.append({
                    "index": parts[0],
                    "id": parts[1],
                    "word": parts[2]
                })

    total_missing = len(missing_items)
    print(f"Tổng số từ TOEIC cần kiểm tra và tạo MP3: {total_missing}")

    # 3. Tạo các file còn thiếu
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    stats = {"downloaded": 0, "skipped": 0, "errors": 0}

    tasks = [
        generate_single(
            word=item["word"],
            item_id=item["id"],
            semaphore=semaphore,
            stats=stats,
            total_count=total_missing
        )
        for item in missing_items
    ]

    await asyncio.gather(*tasks)

    print("\n" + "=" * 60)
    print(f"KẾT QUẢ TỔNG HỢP MP3 TOEIC:")
    print(f"- Tải mới thành công : {stats['downloaded']}")
    print(f"- Đã có sẵn (bỏ qua) : {stats['skipped']}")
    print(f"- Lỗi                : {stats['errors']}")
    print("=" * 60)

    # 4. Đọc toeic_1650.json và cập nhật audioManifest.js
    with open(TOEIC_JSON_PATH, "r", encoding="utf-8") as f:
        toeic_data = json.load(f)

    # Nạp manifest cũ để bảo toàn Oxford
    manifest_entries = parse_existing_manifest(MANIFEST_PATH)
    print(f"\nSố entries ban đầu trong manifest (Oxford): {len(manifest_entries)}")

    # Bổ sung toàn bộ 1650 từ TOEIC vào manifest
    added_keys = 0
    missing_in_storage = []

    for item in toeic_data:
        item_id = item["id"]
        word = item["word"].strip()
        clean_key = sanitize_filename(word)
        lower_word = word.lower()

        # Tìm file mp3 tương ứng trên đĩa
        candidate_filenames = [
            f"{clean_key}.mp3",
            f"{lower_word}.mp3",
            f"{lower_word.replace('-', '_')}.mp3",
            f"{lower_word.replace('_', '-')}.mp3",
        ]

        found_filename = None
        for cand in candidate_filenames:
            cand_path = os.path.join(AUDIO_DIR, cand)
            if os.path.exists(cand_path) and os.path.getsize(cand_path) > 0:
                found_filename = cand
                break

        if found_filename:
            rel_path = f"audio/en-gb/{found_filename}"
            # Gán id
            manifest_entries[item_id] = rel_path
            # Gán từ gốc lower
            manifest_entries[lower_word] = rel_path
            # Gán clean_key
            manifest_entries[clean_key] = rel_path
            # Nếu có gạch nối
            if "-" in lower_word:
                manifest_entries[lower_word.replace("-", "_")] = rel_path
            if "_" in lower_word:
                manifest_entries[lower_word.replace("_", "-")] = rel_path
            # Nếu có khoảng trắng
            if " " in lower_word:
                manifest_entries[lower_word.replace(" ", "_")] = rel_path
        else:
            missing_in_storage.append((item_id, word))

    print(f"Số entries sau khi cập nhật manifest: {len(manifest_entries)}")
    if missing_in_storage:
        print(f"CẢNH BÁO: Còn {len(missing_in_storage)} từ TOEIC chưa tìm thấy file MP3 trên đĩa:")
        for mid, mword in missing_in_storage[:10]:
            print(f"  - [{mid}] {mword}")
    else:
        print("🎉 TOÀN BỘ 1.650 TỪ TOEIC ĐÃ ĐƯỢC ÁNH XẠ CHÍNH XÁC ĐẾN FILE MP3 TRÊN ĐĨA!")

    update_manifest_file(manifest_entries)
    print(f"-> Đã ghi file manifest mới tại '{MANIFEST_PATH}' thành công.")

if __name__ == "__main__":
    asyncio.run(main())


"""
Script tạo file MP3 phát âm toàn bộ từ vựng Oxford 3000 sử dụng edge-tts
=======================================================================
- Giọng đọc: en-GB-SoniaNeural (Giọng nữ chuẩn Anh-Anh cao cấp)
- Cơ chế chia lô: BATCH_SIZE = 500 (chỉ tải tối đa 500 từ mới chưa có trong mỗi lần chạy)
- Cơ chế bỏ qua: Tự động bỏ qua các từ đã có file MP3 (> 0 bytes)
- Cơ chế chống spam/rate-limit: Nghỉ 1 giây sau mỗi từ (await asyncio.sleep(1))
- Tự động cập nhật src/data/audioManifest.js sau khi hoàn thành lô
"""

import asyncio
import glob
import json
import os
import re
import sys
import edge_tts

# Cấu hình
BATCH_SIZE = 500
SLEEP_SECONDS = 1.0
VOICE = "en-GB-SoniaNeural"
OUTPUT_DIR = os.path.join("public", "audio", "en-gb")
MANIFEST_PATH = os.path.join("src", "data", "audioManifest.js")

def sanitize_filename(word):
    """Chuẩn hóa tên file an toàn: thay khoảng trắng và ký tự đặc biệt bằng dấu gạch dưới"""
    clean = word.strip().lower()
    clean = re.sub(r'[\s/\\:]+', '_', clean)
    clean = re.sub(r'[^a-z0-9_-]', '', clean)
    return clean

def load_all_words():
    """Tải toàn bộ từ vựng từ các file JSON trong unit/ hoặc src/data/unit/"""
    json_paths = sorted(glob.glob(os.path.join("unit", "*.json")))
    if not json_paths:
        json_paths = sorted(glob.glob(os.path.join("src", "data", "unit", "*.json")))
    if not json_paths:
        json_paths = [os.path.join("src", "data", "words.json")]

    all_words = []
    seen_ids = set()

    for path in json_paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                items = json.load(f)
                for item in items:
                    item_id = str(item.get("id", ""))
                    if item_id and item_id not in seen_ids:
                        seen_ids.add(item_id)
                        all_words.append(item)
                    elif not item_id:
                        all_words.append(item)
        except Exception as e:
            print(f"[Cảnh báo] Lỗi khi đọc file {path}: {e}")

    return all_words

def update_manifest_file(all_words):
    """Cập nhật audioManifest.js chứa toàn bộ các từ đã có file MP3 thực tế trên ổ đĩa"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest_entries = {}

    for item in all_words:
        word_text = item["word"].strip()
        word_id = str(item.get("id", ""))
        filename = f"{sanitize_filename(word_text)}.mp3"
        file_path = os.path.join(OUTPUT_DIR, filename)

        # Chỉ đưa vào manifest nếu file MP3 đã tồn tại và kích thước > 0
        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            rel_path = f"audio/en-gb/{filename}"
            if word_id:
                manifest_entries[word_id] = rel_path
            manifest_entries[word_text.lower()] = rel_path
            clean_key = sanitize_filename(word_text)
            if clean_key != word_text.lower():
                manifest_entries[clean_key] = rel_path

    # Tạo code JavaScript cho audioManifest.js
    entries_code = "export const audioManifest = {\n"
    for key, path in sorted(manifest_entries.items()):
        entries_code += f'  "{key}": "{path}",\n'
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

  return null;
};
'''

    full_code = f"// src/data/audioManifest.js\n// Tự động cập nhật bởi scripts/generate_all_edge.py\n// Tổng số từ đã có audio: {len(manifest_entries)} entries\n\n{entries_code}{helper_code}"

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write(full_code)

    return len(manifest_entries)

async def main():
    print("=" * 65)
    print("OXFORD 3000 - CHƯƠNG TRÌNH TẠO FILE MP3 HÀNG LOẠT (EDGE-TTS)")
    print(f"Giọng đọc: {VOICE} | Kích thước lô: {BATCH_SIZE} từ | Giãn cách: {SLEEP_SECONDS}s")
    print("=" * 65)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    all_words = load_all_words()
    total_words = len(all_words)
    print(f"[1/3] Đã quét tổng cộng: {total_words} từ vựng từ các file JSON.")

    # Phân loại từ đã có và chưa có file MP3
    existing_count = 0
    pending_words = []

    for item in all_words:
        word_text = item["word"].strip()
        filename = f"{sanitize_filename(word_text)}.mp3"
        dest_path = os.path.join(OUTPUT_DIR, filename)

        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
            existing_count += 1
        else:
            pending_words.append(item)

    print(f"[2/3] Tiến độ hiện tại trên đĩa:")
    print(f"      - Đã có file MP3: {existing_count}/{total_words} từ ({existing_count/total_words*100:.1f}%)")
    print(f"      - Chưa có MP3:    {len(pending_words)}/{total_words} từ")

    if not pending_words:
        print("\n🎉 Tuyệt vời! Toàn bộ từ vựng đã có file MP3 đầy đủ 100%. Không cần tải thêm!")
        update_manifest_file(all_words)
        return

    # Lấy tối đa BATCH_SIZE từ chưa có file
    current_batch = pending_words[:BATCH_SIZE]
    batch_total = len(current_batch)
    print(f"\n[3/3] Bắt đầu tải Lô hiện tại: {batch_total} từ (từ thứ {existing_count + 1} đến {existing_count + batch_total})...\n")

    downloaded_in_batch = 0

    for idx, item in enumerate(current_batch, start=1):
        word_text = item["word"].strip()
        word_id = item.get("id", f"item_{idx}")
        filename = f"{sanitize_filename(word_text)}.mp3"
        dest_path = os.path.join(OUTPUT_DIR, filename)

        print(f"  [{idx:3d}/{batch_total}] Đang tải: '{word_text}' ({word_id}) -> {filename}...")

        try:
            # Gọi edge-tts
            communicate = edge_tts.Communicate(word_text, voice=VOICE, rate="+0%")
            await communicate.save(dest_path)

            file_size = os.path.getsize(dest_path)
            downloaded_in_batch += 1
            print(f"        ✓ Thành công ({file_size:,} bytes)")

            # Cập nhật manifest định kỳ mỗi 50 từ để tránh mất tiến độ nếu bị ngắt giữa chừng
            if downloaded_in_batch % 50 == 0:
                update_manifest_file(all_words)

            # Cơ chế giãn cách chống rate-limit (nghỉ 1 giây sau mỗi từ)
            await asyncio.sleep(SLEEP_SECONDS)

        except Exception as e:
            print(f"        ✗ Lỗi tải từ '{word_text}': {e}")
            if os.path.exists(dest_path) and os.path.getsize(dest_path) == 0:
                os.remove(dest_path)
            # Nghỉ thêm 2 giây nếu gặp lỗi
            await asyncio.sleep(2.0)

    # Cập nhật manifest ngay sau khi kết thúc lô
    print("\nĐang cập nhật audioManifest.js...")
    manifest_count = update_manifest_file(all_words)

    total_done = existing_count + downloaded_in_batch
    remaining = total_words - total_done

    print("\n" + "=" * 65)
    print(f"KẾT QUẢ ĐỢT NÀY:")
    print(f"- Đã tải thành công: {downloaded_in_batch} từ trong lô này.")
    print(f"- Tổng số từ đã có MP3 trên máy: {total_done}/{total_words} từ ({total_done/total_words*100:.1f}%).")
    print(f"- Số từ còn lại cần tải: {remaining} từ.")
    print(f"- Audio Manifest đã đồng bộ: {manifest_count} entries.")
    print("=" * 65)

    if remaining > 0:
        print(f"\n👉 Đã hoàn thành đợt này ({downloaded_in_batch} từ). Vui lòng chạy lại script để tiếp tục đợt sau (còn {remaining} từ)!\n")
    else:
        print("\n🎉 Hoàn thành 100% toàn bộ kho từ vựng Oxford 3000!\n")

if __name__ == "__main__":
    asyncio.run(main())


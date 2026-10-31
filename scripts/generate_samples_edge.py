"""
Script tạo 20 file MP3 phát âm tiếng Anh mẫu sử dụng edge-tts (Microsoft Edge TTS)
Giọng đọc: en-GB-SoniaNeural (Giọng nữ chuẩn Anh-Anh tự nhiên, cực kỳ rõ ràng, tròn chữ)
"""

import asyncio
import json
import os
import re
import edge_tts

# Các đường dẫn dự án
POSSIBLE_JSON_PATHS = [
    os.path.join("unit", "Oxford_3000_Vong_1_516_tu.json"),
    os.path.join("src", "data", "unit", "Oxford_3000_Vong_1_516_tu.json"),
    os.path.join("src", "data", "words.json")
]

OUTPUT_DIR = os.path.join("public", "audio", "en-gb")
MANIFEST_PATH = os.path.join("src", "data", "audioManifest.js")
VOICE = "en-GB-SoniaNeural"
SAMPLE_COUNT = 20

def get_vocab_file():
    for p in POSSIBLE_JSON_PATHS:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("Không tìm thấy file dữ liệu từ vựng trong các thư mục unit!")

def sanitize_filename(word):
    # Thay thế khoảng trắng hoặc ký tự đặc biệt bằng dấu gạch dưới
    clean = word.strip().lower()
    clean = re.sub(r'[\s/\\:]+', '_', clean)
    clean = re.sub(r'[^a-z0-9_-]', '', clean)
    return clean

async def generate_audio_samples():
    vocab_file = get_vocab_file()
    print(f"[1/4] Đang đọc dữ liệu từ: {vocab_file}")

    with open(vocab_file, "r", encoding="utf-8") as f:
        words_data = json.load(f)

    samples = words_data[:SAMPLE_COUNT]
    print(f"[2/4] Lấy {len(samples)} từ vựng đầu tiên để tạo file MP3...")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest_entries = {}

    for idx, item in enumerate(samples, start=1):
        word_text = item["word"]
        word_id = item.get("id", f"sample_{idx}")
        filename = f"{sanitize_filename(word_text)}.mp3"
        dest_path = os.path.join(OUTPUT_DIR, filename)
        rel_path = f"audio/en-gb/{filename}"

        print(f"  ({idx}/{len(samples)}) Đang tổng hợp: '{word_text}' ({word_id}) -> {filename}...")
        
        # Gọi edge-tts để tạo âm thanh với giọng en-GB-SoniaNeural
        communicate = edge_tts.Communicate(word_text, voice=VOICE, rate="+0%")
        await communicate.save(dest_path)

        file_size = os.path.getsize(dest_path)
        print(f"       => [OK] {file_size} bytes")

        # Lưu ánh xạ theo ID và theo từ vựng
        manifest_entries[str(word_id)] = rel_path
        manifest_entries[word_text.lower().strip()] = rel_path
        clean_key = sanitize_filename(word_text)
        if clean_key != word_text.lower().strip():
            manifest_entries[clean_key] = rel_path

    print(f"[3/4] Cập nhật Audio Manifest: {MANIFEST_PATH}...")
    update_manifest(manifest_entries)

    print(f"[4/4] HOÀN TẤT! Đã tạo thành công {len(samples)} file MP3 chất lượng cao bằng giọng {VOICE}.")

def update_manifest(new_entries):
    # Tạo nội dung audioManifest.js hoàn chỉnh
    entries_code = "export const audioManifest = {\n"
    for key, path in sorted(new_entries.items()):
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

    full_code = f"// src/data/audioManifest.js\n// Tự động tạo bởi scripts/generate_samples_edge.py\n// Sử dụng giọng nữ Anh-Anh chất lượng cao ({VOICE})\n\n{entries_code}{helper_code}"
    
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write(full_code)

if __name__ == "__main__":
    asyncio.run(generate_audio_samples())


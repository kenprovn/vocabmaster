import json
import os
import re

MANIFEST_PATH = "src/data/audioManifest.js"
AUDIO_DIR = "public/audio/en-gb"

# Read existing manifest
with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

manifest_map = {}
for line in lines:
    line_clean = line.strip()
    m = re.match(r'^"([^"]+)":\s*"([^"]+)",?', line_clean)
    if m:
        manifest_map[m.group(1)] = m.group(2)

print(f"Existing entries in manifest: {len(manifest_map)}")

# Special heteronym files mapping for specific IDs
SPECIAL_ID_MAP = {
    3054: "audio/en-gb/advocate_v.mp3",
    3141: "audio/en-gb/attribute_v.mp3",
    3212: "audio/en-gb/bow_v.mp3",
    3393: "audio/en-gb/content_adj.mp3",
    3407: "audio/en-gb/convict_v.mp3",
    3412: "audio/en-gb/coordinate_v.mp3",
    3723: "audio/en-gb/extract_v.mp3",
    3976: "audio/en-gb/insult_v.mp3",
    4165: "audio/en-gb/minute_adj.mp3",
}

# 1. Add heteronym keys
heteronyms = {
    "content_adj": "audio/en-gb/content_adj.mp3",
    "content_adj.": "audio/en-gb/content_adj.mp3",
    "3393": "audio/en-gb/content_adj.mp3", # Unit 34
    "minute_adj": "audio/en-gb/minute_adj.mp3",
    "minute_adj.": "audio/en-gb/minute_adj.mp3",
    "4165": "audio/en-gb/minute_adj.mp3", # Unit 42
    "advocate_n": "audio/en-gb/advocate_n.mp3",
    "advocate_n.": "audio/en-gb/advocate_n.mp3",
    "advocate_v": "audio/en-gb/advocate_v.mp3",
    "advocate_v.": "audio/en-gb/advocate_v.mp3",
    "3054": "audio/en-gb/advocate_v.mp3", # Unit 31
    "attribute_n": "audio/en-gb/attribute_n.mp3",
    "attribute_n.": "audio/en-gb/attribute_n.mp3",
    "attribute_v": "audio/en-gb/attribute_v.mp3",
    "attribute_v.": "audio/en-gb/attribute_v.mp3",
    "3141": "audio/en-gb/attribute_v.mp3", # Unit 32
    "coordinate_n": "audio/en-gb/coordinate_n.mp3",
    "coordinate_n.": "audio/en-gb/coordinate_n.mp3",
    "coordinate_v": "audio/en-gb/coordinate_v.mp3",
    "coordinate_v.": "audio/en-gb/coordinate_v.mp3",
    "3412": "audio/en-gb/coordinate_v.mp3", # Unit 35
    "convict_v": "audio/en-gb/convict_v.mp3",
    "convict_v.": "audio/en-gb/convict_v.mp3",
    "3407": "audio/en-gb/convict_v.mp3", # Unit 35
    "extract_v": "audio/en-gb/extract_v.mp3",
    "extract_v.": "audio/en-gb/extract_v.mp3",
    "3723": "audio/en-gb/extract_v.mp3", # Unit 38
    "insult_v": "audio/en-gb/insult_v.mp3",
    "insult_v.": "audio/en-gb/insult_v.mp3",
    "3976": "audio/en-gb/insult_v.mp3", # Unit 40
    "bow_v": "audio/en-gb/bow_v.mp3",
    "bow_v.": "audio/en-gb/bow_v.mp3",
    "3212": "audio/en-gb/bow_v.mp3", # Unit 33
}

for k, v in heteronyms.items():
    manifest_map[k] = v

# 2. Add all 1,996 words and IDs from Oxford 5000 Units 31-50
added_words = 0
added_ids = 0

for u in range(31, 51):
    fpath = f"unit/oxford_5000_unit_{u}.json"
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
        for it in data:
            item_id = str(it["id"])
            word = it["word"]
            clean_word = word.lower().strip()
            sanitized = re.sub(r'[\s/\\:]+', '_', clean_word)
            sanitized = re.sub(r'[^a-z0-9_-]', '', sanitized)

            if it["id"] in SPECIAL_ID_MAP:
                rel = SPECIAL_ID_MAP[it["id"]]
            else:
                rel = f"audio/en-gb/{sanitized}.mp3"

            # Always add ID mapping
            manifest_map[item_id] = rel
            added_ids += 1

            # Add word mapping if not homograph conflict
            if clean_word not in manifest_map:
                manifest_map[clean_word] = rel
                added_words += 1
            if sanitized not in manifest_map:
                manifest_map[sanitized] = rel
                added_words += 1

print(f"Added {added_ids} ID entries and {added_words} word entries.")
print(f"Total entries in manifest now: {len(manifest_map)}")

# Generate new audioManifest.js
header = """// src/data/audioManifest.js
// Tự động cập nhật cho Oxford 3000 + TOEIC 1650 + Oxford 5000 Extra (Unit 31 - Unit 50)
// Tổng số entries: """ + str(len(manifest_map)) + """

export const audioManifest = {
"""

sorted_keys = sorted(manifest_map.keys())

body_lines = []
for k in sorted_keys:
    safe_k = k.replace('"', '\\"')
    v = manifest_map[k]
    body_lines.append(f'  "{safe_k}": "{v}",\n')

footer = """};

/**
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
    const rawType = type.trim().toLowerCase();
    const cleanType = rawType.replace(/\\.$/, '');
    const keyWithType = `${cleanWord}_${rawType}`;
    const keyWithCleanType = `${cleanWord}_${cleanType}`;
    if (audioManifest[keyWithType]) {
      return `${cleanBase}${audioManifest[keyWithType]}`;
    }
    if (audioManifest[keyWithCleanType]) {
      return `${cleanBase}${audioManifest[keyWithCleanType]}`;
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
"""

with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
    f.write(header)
    f.writelines(body_lines)
    f.write(footer)

print("Successfully updated src/data/audioManifest.js with all Oxford 5000 Extra IDs and words!")

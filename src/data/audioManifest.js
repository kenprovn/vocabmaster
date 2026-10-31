// src/data/audioManifest.js
// Manifest ánh xạ từ vựng / ID sang đường dẫn file audio MP3 tĩnh trong public/
// Hỗ trợ ánh xạ theo:
// 1. ID từ vựng (ví dụ "vong1_1")
// 2. Từ vựng + từ loại (ví dụ "read_verb", "read_noun")
// 3. Từ vựng thông thường (ví dụ "about")

export const audioManifest = {
  // 3 từ vựng mẫu đầu tiên trong Oxford 3000 Vòng 1
  "a": "audio/en-gb/a.mp3",
  "about": "audio/en-gb/about.mp3",
  "above": "audio/en-gb/above.mp3",

  // Ánh xạ theo định danh ID (tương ứng file Oxford_3000_Vong_1_516_tu.json)
  "vong1_1": "audio/en-gb/a.mp3",
  "vong1_2": "audio/en-gb/about.mp3",
  "vong1_3": "audio/en-gb/above.mp3"
};

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
    const keyWithType = `${cleanWord}_${type.trim().toLowerCase()}`;
    if (audioManifest[keyWithType]) {
      return `${cleanBase}${audioManifest[keyWithType]}`;
    }
  }

  // 3. Kiểm tra theo từ vựng thông thường
  if (cleanWord && audioManifest[cleanWord]) {
    return `${cleanBase}${audioManifest[cleanWord]}`;
  }

  return null;
};


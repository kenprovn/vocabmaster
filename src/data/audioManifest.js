// src/data/audioManifest.js
// Tự động tạo bởi scripts/generate_samples_edge.py
// Sử dụng giọng nữ Anh-Anh chất lượng cao (en-GB-SoniaNeural)

export const audioManifest = {
  "a": "audio/en-gb/a.mp3",
  "about": "audio/en-gb/about.mp3",
  "above": "audio/en-gb/above.mp3",
  "add": "audio/en-gb/add.mp3",
  "after": "audio/en-gb/after.mp3",
  "afternoon": "audio/en-gb/afternoon.mp3",
  "again": "audio/en-gb/again.mp3",
  "age": "audio/en-gb/age.mp3",
  "ago": "audio/en-gb/ago.mp3",
  "air": "audio/en-gb/air.mp3",
  "all": "audio/en-gb/all.mp3",
  "all right": "audio/en-gb/all_right.mp3",
  "all_right": "audio/en-gb/all_right.mp3",
  "also": "audio/en-gb/also.mp3",
  "always": "audio/en-gb/always.mp3",
  "and": "audio/en-gb/and.mp3",
  "animal": "audio/en-gb/animal.mp3",
  "answer": "audio/en-gb/answer.mp3",
  "any": "audio/en-gb/any.mp3",
  "anybody": "audio/en-gb/anybody.mp3",
  "anyone": "audio/en-gb/anyone.mp3",
  "vong1_1": "audio/en-gb/a.mp3",
  "vong1_10": "audio/en-gb/air.mp3",
  "vong1_11": "audio/en-gb/all.mp3",
  "vong1_12": "audio/en-gb/all_right.mp3",
  "vong1_13": "audio/en-gb/also.mp3",
  "vong1_14": "audio/en-gb/always.mp3",
  "vong1_15": "audio/en-gb/and.mp3",
  "vong1_16": "audio/en-gb/animal.mp3",
  "vong1_17": "audio/en-gb/answer.mp3",
  "vong1_18": "audio/en-gb/any.mp3",
  "vong1_19": "audio/en-gb/anybody.mp3",
  "vong1_2": "audio/en-gb/about.mp3",
  "vong1_20": "audio/en-gb/anyone.mp3",
  "vong1_3": "audio/en-gb/above.mp3",
  "vong1_4": "audio/en-gb/add.mp3",
  "vong1_5": "audio/en-gb/after.mp3",
  "vong1_6": "audio/en-gb/afternoon.mp3",
  "vong1_7": "audio/en-gb/again.mp3",
  "vong1_8": "audio/en-gb/age.mp3",
  "vong1_9": "audio/en-gb/ago.mp3",
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

  // 4. Kiểm tra theo từ đã chuẩn hóa (thay khoảng trắng bằng dấu gạch dưới)
  const normalizedWord = cleanWord.replace(/\s+/g, '_');
  if (normalizedWord && audioManifest[normalizedWord]) {
    return `${cleanBase}${audioManifest[normalizedWord]}`;
  }

  return null;
};

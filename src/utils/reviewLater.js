// src/utils/reviewLater.js
// Quản lý danh sách "Từ đã lưu" (Review Later) dùng chung giữa Oxford 3000 và TOEIC 1650
// Khóa localStorage: vocabmaster_review_later_v1

const STORAGE_KEY = 'vocabmaster_review_later_v1';
const EVENT_NAME = 'vocab_review_later_changed';

/**
 * Chuẩn hóa từ tiếng Anh để so sánh chống trùng lặp (không phân biệt hoa thường, bỏ khoảng trắng thừa)
 */
export const normalizeWordKey = (word) => {
  return (word || '').trim().toLowerCase();
};

/**
 * Tự động nhận diện nguồn từ (Oxford hoặc TOEIC) dựa vào thông tin của item
 */
export const detectSource = (item, currentSelectedUnit = '') => {
  if (!item) return 'oxford';
  if (
    item.unit === 'TOEIC Cơ Bản' ||
    item.unit === 'TOEIC Cơ Bản – MR. HIEP' ||
    (item.id && String(item.id).startsWith('toeic_')) ||
    Boolean(item.image && String(item.image).includes('/toeic/')) ||
    currentSelectedUnit === 'TOEIC Cơ Bản'
  ) {
    return 'toeic';
  }
  return 'oxford';
};

/**
 * Đọc danh sách từ đã lưu từ localStorage một cách an toàn
 */
export const getSavedWords = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[ReviewLater] Lỗi khi đọc dữ liệu review later:', err);
  }
  return [];
};

/**
 * Kiểm tra xem từ đã được lưu hay chưa
 */
export const isWordSaved = (word) => {
  if (!word) return false;
  const key = normalizeWordKey(word);
  const list = getSavedWords();
  return list.some(item => normalizeWordKey(item.word) === key);
};

/**
 * Lưu từ vào danh sách Review Later (nếu đã có thì gộp nguồn, không tạo bản ghi trùng)
 */
export const saveWord = (item, sourceHint = '') => {
  if (!item || !item.word) return false;
  const list = getSavedWords();
  const key = normalizeWordKey(item.word);
  const detectedSource = sourceHint || detectSource(item);

  const existingIndex = list.findIndex(it => normalizeWordKey(it.word) === key);

  if (existingIndex >= 0) {
    // Đã tồn tại: Hợp nhất sources nếu chưa có
    const existing = list[existingIndex];
    const sources = Array.isArray(existing.sources) ? [...existing.sources] : [existing.source || 'oxford'];
    if (!sources.includes(detectedSource)) {
      sources.push(detectedSource);
    }

    list[existingIndex] = {
      ...existing,
      sources,
      meaning: existing.meaning || item.meaning || '',
      type: existing.type || item.type || '',
      image: existing.image || item.image || '',
      updatedAt: Date.now()
    };
  } else {
    // Thêm mới vào đầu danh sách
    list.unshift({
      id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: item.word.trim(),
      sources: [detectedSource],
      meaning: item.meaning || '',
      type: item.type || '',
      image: item.image || '',
      unit: item.unit || '',
      createdAt: Date.now()
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: 'save', word: item.word } }));
    return true;
  } catch (err) {
    console.error('[ReviewLater] Không thể lưu vào localStorage:', err);
    return false;
  }
};

/**
 * Bỏ lưu một từ khỏi danh sách
 */
export const removeSavedWord = (word) => {
  if (!word) return false;
  const key = normalizeWordKey(word);
  const list = getSavedWords();
  const filtered = list.filter(it => normalizeWordKey(it.word) !== key);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: 'remove', word } }));
    return true;
  } catch (err) {
    console.error('[ReviewLater] Không thể cập nhật localStorage:', err);
    return false;
  }
};

/**
 * Toggle trạng thái lưu / bỏ lưu cho một từ
 */
export const toggleSavedWord = (item, sourceHint = '') => {
  if (!item || !item.word) {
    return { saved: false, message: 'Lỗi từ vựng' };
  }
  const key = normalizeWordKey(item.word);
  if (isWordSaved(key)) {
    removeSavedWord(key);
    return { saved: false, message: 'Đã bỏ lưu khỏi danh sách ôn lại' };
  } else {
    saveWord(item, sourceHint);
    return { saved: true, message: 'Đã thêm vào danh sách ôn lại' };
  }
};

/**
 * Đăng ký lắng nghe thay đổi danh sách để đồng bộ tức thì trên toàn giao diện
 */
export const subscribeReviewLater = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    callback(getSavedWords());
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
};

/**
 * Định dạng danh sách từ tiếng Anh thành chuỗi văn bản thuần túy cho TXT và Copy Tất Cả:
 * - Mỗi từ/cụm từ 1 dòng
 * - Không stt, không nghĩa tiếng Việt, không header
 * - Không trùng lặp
 */
export const formatWordsAsTxt = (wordsList) => {
  if (!Array.isArray(wordsList)) return '';
  const seen = new Set();
  const lines = [];

  for (const it of wordsList) {
    const rawWord = typeof it === 'string' ? it : (it?.word || '');
    const clean = rawWord.trim();
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      lines.push(clean);
    }
  }

  return lines.join('\r\n');
};

/**
 * Tải file TXT với mã hóa UTF-8 (kèm BOM \uFEFF cho Windows Notepad)
 */
export const downloadReviewLaterTxt = (content, filename = 'vocabmaster-review-later.txt') => {
  try {
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[ReviewLater] Không thể tải file TXT:', err);
    return false;
  }
};


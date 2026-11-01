// src/utils/sessionStats.js
// Quản lý thống kê phiên luyện tập cho Quiz và Typing theo từng Bộ từ / Vòng học

const STORAGE_PREFIX = 'vocabmaster_session_stats_';

/**
 * Tạo khóa lưu trữ duy nhất theo chế độ và bộ từ
 * @param {'quiz' | 'typing'} mode
 * @param {string} unit
 */
export const getSessionStatsKey = (mode, unit) => {
  const safeMode = mode || 'quiz';
  const safeUnit = unit || 'Tất cả';
  return `${STORAGE_PREFIX}${safeMode}_${safeUnit}`;
};

/**
 * Đọc dữ liệu thống kê phiên hiện tại từ sessionStorage
 * @param {'quiz' | 'typing'} mode
 * @param {string} unit
 * @returns {{ correct: number, wrong: number }}
 */
export const getSessionStats = (mode, unit) => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return { correct: 0, wrong: 0 };
  }

  try {
    const key = getSessionStatsKey(mode, unit);
    const raw = sessionStorage.getItem(key);
    if (!raw) return { correct: 0, wrong: 0 };
    const parsed = JSON.parse(raw);
    return {
      correct: typeof parsed.correct === 'number' && parsed.correct >= 0 ? parsed.correct : 0,
      wrong: typeof parsed.wrong === 'number' && parsed.wrong >= 0 ? parsed.wrong : 0
    };
  } catch (err) {
    console.warn('[SessionStats] Lỗi khi đọc sessionStorage:', err);
    return { correct: 0, wrong: 0 };
  }
};

/**
 * Lưu dữ liệu thống kê phiên vào sessionStorage
 * @param {'quiz' | 'typing'} mode
 * @param {string} unit
 * @param {{ correct: number, wrong: number }} stats
 */
export const saveSessionStats = (mode, unit, stats) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const key = getSessionStatsKey(mode, unit);
    sessionStorage.setItem(key, JSON.stringify({
      correct: Math.max(0, stats.correct || 0),
      wrong: Math.max(0, stats.wrong || 0),
      updatedAt: Date.now()
    }));
  } catch (err) {
    console.warn('[SessionStats] Lỗi khi lưu sessionStorage:', err);
  }
};

/**
 * Xóa dữ liệu thống kê phiên của một chế độ và bộ từ cụ thể
 * @param {'quiz' | 'typing'} mode
 * @param {string} unit
 */
export const clearSessionStats = (mode, unit) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const key = getSessionStatsKey(mode, unit);
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn('[SessionStats] Lỗi khi xóa sessionStorage:', err);
  }
};


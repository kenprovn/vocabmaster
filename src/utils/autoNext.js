// src/utils/autoNext.js
// Quản lý cấu hình Auto Next (Tự động chuyển câu) dùng chung cho Quiz và Typing

const STORAGE_KEY = 'vocabmaster_autonext_v1';
const SETTINGS_EVENT = 'vocab_autonext_settings_changed';
export const CANCEL_EVENT = 'vocab_cancel_autonext';

export const TIME_PRESETS = [0.3, 0.5, 0.7, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0];

export const DEFAULT_AUTONEXT_SETTINGS = {
  enabled: true,
  mode: 'correct_only', // 'correct_only' | 'always'
  lastActiveMode: 'correct_only',
  delay: 1.2 // seconds
};

/**
 * Kiểm tra và làm tròn thời gian hợp lệ (từ 0.2s đến 30s)
 */
export const validateDelay = (val) => {
  const num = parseFloat(val);
  if (isNaN(num) || !isFinite(num)) return 1.2;
  if (num < 0.2) return 0.2;
  if (num > 30.0) return 30.0;
  return Math.round(num * 10) / 10;
};

/**
 * Đọc cấu hình Auto Next từ localStorage
 */
export const getAutoNextSettings = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_AUTONEXT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUTONEXT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUTONEXT_SETTINGS.enabled,
      mode: ['correct_only', 'always'].includes(parsed.mode) ? parsed.mode : DEFAULT_AUTONEXT_SETTINGS.mode,
      lastActiveMode: ['correct_only', 'always'].includes(parsed.lastActiveMode) ? parsed.lastActiveMode : DEFAULT_AUTONEXT_SETTINGS.lastActiveMode,
      delay: validateDelay(parsed.delay)
    };
  } catch (err) {
    console.warn('[AutoNext] Lỗi đọc cấu hình từ localStorage:', err);
    return { ...DEFAULT_AUTONEXT_SETTINGS };
  }
};

/**
 * Lưu cấu hình Auto Next vào localStorage và đồng bộ sự kiện
 */
export const saveAutoNextSettings = (newSettings) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getAutoNextSettings();
    const updated = {
      ...current,
      ...newSettings,
      delay: validateDelay(newSettings.delay !== undefined ? newSettings.delay : current.delay)
    };

    // Nếu người dùng bật mode thì cập nhật luôn lastActiveMode
    if (updated.enabled && updated.mode) {
      updated.lastActiveMode = updated.mode;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: updated }));
  } catch (err) {
    console.error('[AutoNext] Lỗi lưu cấu hình:', err);
  }
};

/**
 * Đăng ký theo dõi thay đổi cấu hình Auto Next
 */
export const subscribeAutoNext = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    callback(e.detail || getAutoNextSettings());
  };
  const storageHandler = () => {
    callback(getAutoNextSettings());
  };
  window.addEventListener(SETTINGS_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
};

/**
 * Gửi tín hiệu hủy lần tự chuyển câu hiện tại (khi nhấn Copy, Bookmark, Loa hoặc thao tác giữ)
 */
export const cancelCurrentAutoNext = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CANCEL_EVENT));
};


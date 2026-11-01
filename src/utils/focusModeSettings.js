// src/utils/focusModeSettings.js
// Quản lý cấu hình Focus Mode 2.0: Presets, Thành phần hiển thị và Vị trí Flashcard

const FOCUS_SETTINGS_STORAGE_KEY = 'vocab_focus_mode_settings_v2';

export const FOCUS_PRESETS = {
  STANDARD: 'standard',
  MINIMAL: 'minimal',
  ZEN: 'zen',
  CUSTOM: 'custom'
};

// Cấu hình thành phần theo từng Preset
export const PRESET_CONFIGS = {
  [FOCUS_PRESETS.STANDARD]: {
    showWordCounter: true,
    showSeekBar: true,
    showNavPrevNext: true,
    showNavShuffle: true,
    showNavFlip: true,
    showEvaluation: true,
    showProgressPanel: true,
    showShortcutBtn: true,
    showCardHint: true
  },
  [FOCUS_PRESETS.MINIMAL]: {
    showWordCounter: true,
    showSeekBar: false,
    showNavPrevNext: true,
    showNavShuffle: false,
    showNavFlip: false,
    showEvaluation: true,
    showProgressPanel: false,
    showShortcutBtn: false,
    showCardHint: false
  },
  [FOCUS_PRESETS.ZEN]: {
    showWordCounter: false,
    showSeekBar: false,
    showNavPrevNext: false,
    showNavShuffle: false,
    showNavFlip: false,
    showEvaluation: false,
    showProgressPanel: false,
    showShortcutBtn: false,
    showCardHint: false
  }
};

export const DEFAULT_FOCUS_SETTINGS = {
  preset: FOCUS_PRESETS.STANDARD,
  elements: { ...PRESET_CONFIGS[FOCUS_PRESETS.STANDARD] },
  positionMode: 'auto', // 'auto' | 'custom'
  offsetY: 0            // -120px đến +120px
};

/**
 * Đọc cài đặt Focus Mode từ localStorage với fallback an toàn
 */
export function getFocusModeSettings() {
  if (typeof window === 'undefined') return DEFAULT_FOCUS_SETTINGS;

  try {
    const raw = localStorage.getItem(FOCUS_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_FOCUS_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_FOCUS_SETTINGS;

    // Validate preset
    const validPresets = Object.values(FOCUS_PRESETS);
    const preset = validPresets.includes(parsed.preset) ? parsed.preset : FOCUS_PRESETS.STANDARD;

    // Validate elements:
    // Nếu preset là Standard, Minimal hoặc Zen -> LUÔN LUÔN đồng bộ 100% với config chuẩn của preset đó
    // Chỉ khi preset là Custom thì mới đọc từng cờ tuỳ chỉnh đã lưu
    const elements = (preset !== FOCUS_PRESETS.CUSTOM && PRESET_CONFIGS[preset])
      ? { ...PRESET_CONFIGS[preset] }
      : {
          showWordCounter: typeof parsed.elements?.showWordCounter === 'boolean' ? parsed.elements.showWordCounter : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showWordCounter,
          showSeekBar: typeof parsed.elements?.showSeekBar === 'boolean' ? parsed.elements.showSeekBar : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showSeekBar,
          showNavPrevNext: typeof parsed.elements?.showNavPrevNext === 'boolean' ? parsed.elements.showNavPrevNext : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showNavPrevNext,
          showNavShuffle: typeof parsed.elements?.showNavShuffle === 'boolean' ? parsed.elements.showNavShuffle : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showNavShuffle,
          showNavFlip: typeof parsed.elements?.showNavFlip === 'boolean' ? parsed.elements.showNavFlip : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showNavFlip,
          showEvaluation: typeof parsed.elements?.showEvaluation === 'boolean' ? parsed.elements.showEvaluation : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showEvaluation,
          showProgressPanel: typeof parsed.elements?.showProgressPanel === 'boolean' ? parsed.elements.showProgressPanel : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showProgressPanel,
          showShortcutBtn: typeof parsed.elements?.showShortcutBtn === 'boolean' ? parsed.elements.showShortcutBtn : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showShortcutBtn,
          showCardHint: typeof parsed.elements?.showCardHint === 'boolean' ? parsed.elements.showCardHint : PRESET_CONFIGS[FOCUS_PRESETS.STANDARD].showCardHint
        };

    // Validate positionMode & offsetY
    const positionMode = (parsed.positionMode === 'custom' || parsed.positionMode === 'auto') ? parsed.positionMode : 'auto';
    const rawOffsetY = Number(parsed.offsetY);
    const offsetY = (!isNaN(rawOffsetY) && rawOffsetY >= -120 && rawOffsetY <= 120) ? rawOffsetY : 0;

    return {
      preset,
      elements,
      positionMode,
      offsetY
    };
  } catch (e) {
    console.warn('Lỗi đọc Focus Mode Settings từ localStorage, dùng mặc định:', e);
    return DEFAULT_FOCUS_SETTINGS;
  }
}

/**
 * Lưu cài đặt Focus Mode vào localStorage
 */
export function saveFocusModeSettings(settings) {
  if (typeof window === 'undefined' || !settings) return;
  try {
    localStorage.setItem(FOCUS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Lỗi lưu Focus Mode Settings vào localStorage:', e);
  }
}

/**
 * Đặt lại cài đặt Focus Mode về mặc định (Standard)
 */
export function resetFocusModeSettings() {
  saveFocusModeSettings(DEFAULT_FOCUS_SETTINGS);
  return DEFAULT_FOCUS_SETTINGS;
}

const FOCUS_SPACE_ACTIVE_KEY = 'vocab_focus_space_is_active';

/**
 * Đọc trạng thái Focus Space có đang bật hay không từ localStorage
 */
export function getFocusSpaceActive() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(FOCUS_SPACE_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Lưu trạng thái Focus Space bật/tắt vào localStorage để duy trì sau khi F5
 */
export function saveFocusSpaceActive(isActive) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOCUS_SPACE_ACTIVE_KEY, String(Boolean(isActive)));
  } catch (e) {
    console.warn('Lỗi lưu trạng thái Focus Space vào localStorage:', e);
  }
}


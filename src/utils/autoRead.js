// src/utils/autoRead.js
// Quản lý cấu hình & điều phối phát âm tự động (Auto Read) cho 3 chế độ học: Flashcard, Quiz, Typing

import { audioManager } from './audioManager';

const STORAGE_KEY = 'vocab_auto_read_settings_v1';
const SETTINGS_EVENT = 'vocab_autoread_settings_changed';
export const CANCEL_AUTOREAD_EVENT = 'vocab_cancel_autoread';

export const PLAYBACK_RATES = [0.75, 0.9, 1.0, 1.1, 1.25];
export const REPEAT_COUNTS = [1, 2, 3];
export const INITIAL_DELAYS = [0, 0.3, 0.5, 1.0, 2.0];

export const TRIGGER_OPTIONS_FLASHCARD = [
  { value: 'new', label: 'Khi chuyển sang từ mới', desc: 'Tự phát âm ngay khi bạn đổi sang từ tiếp theo hoặc từ trước đó.' },
  { value: 'flip', label: 'Khi lật Flashcard', desc: 'Tự phát âm khi lật từ mặt tiếng Anh sang mặt nghĩa tiếng Việt.' },
  { value: 'both', label: 'Cả hai thời điểm', desc: 'Phát âm cả khi đổi từ và khi lật xem nghĩa (ưu tiên sự kiện mới nhất).' },
  { value: 'off', label: 'Không tự đọc', desc: 'Chỉ phát âm khi bạn bấm trực tiếp vào biểu tượng Loa.' }
];

export const TRIGGER_OPTIONS_QUIZ = [
  { value: 'answer', label: 'Sau khi chọn đáp án', desc: 'Phát âm từ tiếng Anh chuẩn xác ngay sau khi chọn đáp án (Đúng & Sai).' },
  { value: 'question', label: 'Khi xuất hiện câu hỏi mới', desc: 'Phát âm từ tiếng Anh của câu hỏi (chỉ áp dụng khi không tiết lộ đáp án).' },
  { value: 'both', label: 'Cả hai thời điểm', desc: 'Phát âm khi câu hỏi xuất hiện (nếu an toàn) và sau khi chọn đáp án.' },
  { value: 'off', label: 'Không tự đọc', desc: 'Chỉ phát âm khi bạn nhấn nút Loa thủ công.' }
];

export const TRIGGER_OPTIONS_TYPING = [
  { value: 'answer', label: 'Sau khi kiểm tra đáp án', desc: 'Phát âm từ tiếng Anh chuẩn xác sau khi nộp hoặc kiểm tra câu trả lời.' },
  { value: 'question', label: 'Khi xuất hiện câu mới', desc: 'Phát âm từ tiếng Anh trước khi gõ (rất tốt cho luyện nghe chính tả).' },
  { value: 'both', label: 'Cả hai thời điểm', desc: 'Phát âm khi câu mới xuất hiện và sau khi kiểm tra đáp án.' },
  { value: 'off', label: 'Không tự đọc', desc: 'Chỉ phát âm khi bạn bấm nút Loa thủ công.' }
];

export const DEFAULT_AUTOREAD_SETTINGS = {
  enabled: false,
  flashcardTrigger: 'new', // 'new' | 'flip' | 'both' | 'off'
  quizTrigger: 'answer',   // 'answer' | 'question' | 'both' | 'off'
  typingTrigger: 'answer', // 'answer' | 'question' | 'both' | 'off'
  playbackRate: 1.0,       // 0.75 | 0.9 | 1.0 | 1.1 | 1.25
  repeatCount: 1,          // 1 | 2 | 3
  initialDelay: 0.3,       // 0 | 0.3 | 0.5 | 1.0 | 2.0
  waitForAudioBeforeAutoNext: true
};

/**
 * Kiểm tra và làm sạch cấu hình Auto Read từ localStorage
 */
export const validateAutoReadSettings = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AUTOREAD_SETTINGS };

  const validFlashcardTriggers = ['new', 'flip', 'both', 'off'];
  const validQuizTriggers = ['answer', 'question', 'both', 'off'];
  const validTypingTriggers = ['answer', 'question', 'both', 'off'];

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_AUTOREAD_SETTINGS.enabled,
    flashcardTrigger: validFlashcardTriggers.includes(raw.flashcardTrigger) ? raw.flashcardTrigger : DEFAULT_AUTOREAD_SETTINGS.flashcardTrigger,
    quizTrigger: validQuizTriggers.includes(raw.quizTrigger) ? raw.quizTrigger : DEFAULT_AUTOREAD_SETTINGS.quizTrigger,
    typingTrigger: validTypingTriggers.includes(raw.typingTrigger) ? raw.typingTrigger : DEFAULT_AUTOREAD_SETTINGS.typingTrigger,
    playbackRate: PLAYBACK_RATES.includes(Number(raw.playbackRate)) ? Number(raw.playbackRate) : DEFAULT_AUTOREAD_SETTINGS.playbackRate,
    repeatCount: REPEAT_COUNTS.includes(Number(raw.repeatCount)) ? Number(raw.repeatCount) : DEFAULT_AUTOREAD_SETTINGS.repeatCount,
    initialDelay: INITIAL_DELAYS.includes(Number(raw.initialDelay)) ? Number(raw.initialDelay) : DEFAULT_AUTOREAD_SETTINGS.initialDelay,
    waitForAudioBeforeAutoNext: typeof raw.waitForAudioBeforeAutoNext === 'boolean' ? raw.waitForAudioBeforeAutoNext : DEFAULT_AUTOREAD_SETTINGS.waitForAudioBeforeAutoNext
  };
};

/**
 * Đọc cấu hình Auto Read từ localStorage
 */
export const getAutoReadSettings = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_AUTOREAD_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUTOREAD_SETTINGS };
    return validateAutoReadSettings(JSON.parse(raw));
  } catch (err) {
    console.warn('[AutoRead] Lỗi đọc cấu hình từ localStorage:', err);
    return { ...DEFAULT_AUTOREAD_SETTINGS };
  }
};

/**
 * Lưu cấu hình Auto Read vào localStorage và phát sự kiện đồng bộ
 */
export const saveAutoReadSettings = (newSettings) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getAutoReadSettings();
    const updated = validateAutoReadSettings({
      ...current,
      ...newSettings
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: updated }));
  } catch (err) {
    console.error('[AutoRead] Lỗi lưu cấu hình:', err);
  }
};

/**
 * Đặt lại toàn bộ cấu hình Auto Read về mặc định
 */
export const resetAutoReadSettings = () => {
  saveAutoReadSettings(DEFAULT_AUTOREAD_SETTINGS);
  return { ...DEFAULT_AUTOREAD_SETTINGS };
};

/**
 * Đăng ký theo dõi thay đổi cấu hình Auto Read
 */
export const subscribeAutoRead = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    callback(e.detail || getAutoReadSettings());
  };
  const storageHandler = () => {
    callback(getAutoReadSettings());
  };
  window.addEventListener(SETTINGS_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
};

// =========================================================================
// BỘ ĐIỀU PHỐI PHÁT ÂM TỰ ĐỘNG TRUNG TÂM (AUTO READ SEQUENCE COORDINATOR)
// =========================================================================

class AutoReadCoordinator {
  constructor() {
    this.currentSessionId = 0;
    this.initialDelayTimer = null;
    this.repeatIntervalTimer = null;
    this.isPlaying = false;

    // Lắng nghe tín hiệu hủy chung
    if (typeof window !== 'undefined') {
      window.addEventListener(CANCEL_AUTOREAD_EVENT, () => this.cancel());
    }
  }

  // Hủy ngay lập tức lượt phát âm và các timer đang chờ
  cancel() {
    this.currentSessionId++;
    if (this.initialDelayTimer) {
      clearTimeout(this.initialDelayTimer);
      this.initialDelayTimer = null;
    }
    if (this.repeatIntervalTimer) {
      clearTimeout(this.repeatIntervalTimer);
      this.repeatIntervalTimer = null;
    }
    this.isPlaying = false;
    audioManager.stop();
  }

  // Mở khóa âm thanh trên di động (khi người dùng chạm Bật Auto Read hoặc mở Settings)
  unlockAudio() {
    audioManager.unlockAutoplay();
  }

  /**
   * Kích hoạt chuỗi Auto Read theo cấu hình người dùng
   * @param {Object} params
   * @param {'flashcard' | 'quiz' | 'typing'} params.mode - Chế độ học hiện tại
   * @param {'new' | 'flip' | 'question' | 'answer'} params.triggerType - Thời điểm kích hoạt
   * @param {string} params.word - Từ tiếng Anh cần phát âm
   * @param {Object} [params.wordItem] - Đối tượng từ vựng (chứa id, type, imageUrl...)
   * @param {boolean} [params.isImagePrompt] - Trắc nghiệm hình ảnh (TOEIC) để tránh lộ đáp án
   * @param {Function} [params.onComplete] - Callback khi chuỗi hoàn thành (báo cho Auto Next)
   */
  trigger({ mode, triggerType, word, wordItem, isImagePrompt = false, onComplete }) {
    const settings = getAutoReadSettings();

    // 1. Kiểm tra Auto Read tổng có bật không
    if (!settings.enabled || !word || typeof word !== 'string' || !word.trim()) {
      if (onComplete) onComplete({ skipped: true });
      return;
    }

    // 2. Kiểm tra điều kiện kích hoạt theo từng chế độ
    let isEligible = false;

    if (mode === 'flashcard') {
      if (settings.flashcardTrigger === 'both') {
        isEligible = triggerType === 'new' || triggerType === 'flip';
      } else {
        isEligible = settings.flashcardTrigger === triggerType;
      }
    } else if (mode === 'quiz') {
      // ĐẶC BIỆT: Nếu là dạng câu hỏi hình ảnh TOEIC mà triggerType là 'question' -> BỎ QUA để không lộ đáp án!
      if (isImagePrompt && triggerType === 'question') {
        isEligible = false;
      } else if (settings.quizTrigger === 'both') {
        isEligible = triggerType === 'question' || triggerType === 'answer';
      } else {
        isEligible = settings.quizTrigger === triggerType;
      }
    } else if (mode === 'typing') {
      if (settings.typingTrigger === 'both') {
        isEligible = triggerType === 'question' || triggerType === 'answer';
      } else {
        isEligible = settings.typingTrigger === triggerType;
      }
    }

    if (!isEligible) {
      if (onComplete) onComplete({ skipped: true });
      return;
    }

    // 3. Khởi tạo phiên phát âm mới (Hủy toàn bộ phiên cũ trước đó)
    this.cancel();
    const sessionId = this.currentSessionId;
    const cleanWord = word.trim();
    const delayMs = Math.max(0, (settings.initialDelay || 0) * 1000);
    const repeatCount = Math.max(1, settings.repeatCount || 1);
    const playbackRate = settings.playbackRate || 1.0;

    let timesPlayed = 0;

    const playNext = () => {
      if (this.currentSessionId !== sessionId) return;

      this.isPlaying = true;

      audioManager.playWord(cleanWord, {
        id: wordItem?.id,
        type: wordItem?.type,
        playbackRate,
        onEnded: () => {
          if (this.currentSessionId !== sessionId) return;
          timesPlayed++;

          if (timesPlayed < repeatCount) {
            // Nghỉ 0.5 giây giữa các lần lặp theo đúng đặc tả
            this.repeatIntervalTimer = setTimeout(() => {
              if (this.currentSessionId === sessionId) {
                playNext();
              }
            }, 500);
          } else {
            // Hoàn tất toàn bộ số lần đọc
            this.isPlaying = false;
            if (onComplete) {
              onComplete({ success: true, timesPlayed });
            }
          }
        },
        onError: (err) => {
          if (this.currentSessionId !== sessionId) return;
          console.warn('[AutoRead] Audio lỗi trong quá trình phát:', err);
          this.isPlaying = false;
          // Ngay cả khi lỗi audio, vẫn kích hoạt hoàn thành để Auto Next không bị treo!
          if (onComplete) {
            onComplete({ error: true, err });
          }
        }
      });
    };

    // 4. Áp dụng độ trễ khởi đầu (initialDelay)
    if (delayMs > 0) {
      this.initialDelayTimer = setTimeout(() => {
        if (this.currentSessionId === sessionId) {
          playNext();
        }
      }, delayMs);
    } else {
      playNext();
    }
  }
}

export const autoReadCoordinator = new AutoReadCoordinator();

/**
 * Gửi tín hiệu hủy Auto Read lập tức từ bất kỳ nơi nào
 */
export const cancelCurrentAutoRead = () => {
  autoReadCoordinator.cancel();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CANCEL_AUTOREAD_EVENT));
  }
};


// src/utils/audioManager.js
// Quản lý phát âm tập trung: MP3 tĩnh (Ưu tiên 1) + Web Speech API (Fallback an toàn)
import { getAudioUrlFromManifest } from '../data/audioManifest';

class AudioManager {
  constructor() {
    this.activeAudio = null;
    this.activeUtterance = null;
    this.currentPlaybackId = 0;
    this.status = 'idle'; // 'idle' | 'loading' | 'playing' | 'error'
    this.cachedVoices = [];
    this.toastListeners = new Set();
    this.stateListeners = new Set();

    this.initVoices();
    this.exposeDebugInterface();
  }

  // Khởi tạo và theo dõi danh sách giọng đọc Web Speech API
  initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
        console.log(`[AudioManager] Đã nạp ${this.cachedVoices.length} giọng đọc Web Speech API`);
      } catch (err) {
        console.warn('[AudioManager] Không thể nạp danh sách voices:', err);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  // Đăng ký nhận thông báo lỗi/trạng thái hiển thị trên UI
  subscribeToast(callback) {
    this.toastListeners.add(callback);
    return () => this.toastListeners.delete(callback);
  }

  // Đăng ký theo dõi trạng thái phát âm
  subscribeState(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  notifyToast(message, type = 'info') {
    this.toastListeners.forEach(cb => {
      try { cb({ message, type, id: Date.now() }); } catch (_) {}
    });
  }

  setStatus(status, meta = {}) {
    this.status = status;
    this.stateListeners.forEach(cb => {
      try { cb({ status, ...meta }); } catch (_) {}
    });
  }

  // Cổng thông tin Debug để hỗ trợ kiểm tra qua Chrome Remote Debugging (chrome://inspect)
  exposeDebugInterface() {
    if (typeof window === 'undefined') return;
    window.__AUDIO_DEBUG__ = {
      getStatus: () => this.status,
      getActiveAudio: () => this.activeAudio,
      getCachedVoices: () => this.cachedVoices,
      testPlayback: (word) => this.playWord(word),
      stop: () => this.stop()
    };
  }

  // Dừng mọi âm thanh đang phát để đảm bảo không bị đọc chồng lên nhau
  stop() {
    this.currentPlaybackId++;

    // 1. Dừng HTML5 Audio hiện tại
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio.onplay = null;
        this.activeAudio.onplaying = null;
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
        this.activeAudio.src = '';
      } catch (e) {
        console.warn('[AudioManager] Lỗi khi dừng HTML5 Audio:', e);
      }
      this.activeAudio = null;
    }

    // 2. Dừng Web Speech API hiện tại
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('[AudioManager] Lỗi khi cancel speechSynthesis:', e);
      }
      this.activeUtterance = null;
      window._currentUtterance = null;
    }

    this.setStatus('idle');
  }

  // Tìm giọng đọc tiếng Anh tốt nhất (Ưu tiên en-GB, en-US)
  getBestEnglishVoice() {
    if (!this.cachedVoices || this.cachedVoices.length === 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      }
    }
    if (!this.cachedVoices || this.cachedVoices.length === 0) return null;

    // 1. Ưu tiên British English (en-GB)
    const enGb = this.cachedVoices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');
    if (enGb) return enGb;

    // 2. Ưu tiên American English (en-US)
    const enUs = this.cachedVoices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
    if (enUs) return enUs;

    // 3. Bất kỳ voice tiếng Anh nào
    const anyEn = this.cachedVoices.find(v => v.lang && v.lang.toLowerCase().includes('en'));
    if (anyEn) return anyEn;

    return null;
  }

  // Mở khóa âm thanh (User gesture unlock) cho Chrome Android / iOS
  unlockAutoplay() {
    if (typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudio.volume = 0;
      const p = silentAudio.play();
      if (p && p.then) {
        p.then(() => {
          silentAudio.pause();
        }).catch(() => {});
      }
    } catch (_) {}
  }

  /**
   * Phát âm từ vựng:
   * - Bước 1: Kiểm tra Manifest và phát MP3 tĩnh nội bộ
   * - Bước 2: Nếu MP3 thiếu/lỗi, chuyển sang Web Speech API 1 lần duy nhất
   * - Bước 3: Nếu cả 2 đều thất bại, thông báo giao diện ngắn gọn
   */
  playWord(word, options = {}) {
    if (!word || typeof word !== 'string' || !word.trim()) {
      if (options.onEnded) options.onEnded();
      return;
    }

    const cleanWord = word.trim();
    this.stop(); // Hủy âm thanh trước đó
    const playbackId = this.currentPlaybackId;

    // 1. Kiểm tra file MP3 trong Manifest
    const mp3Url = getAudioUrlFromManifest(cleanWord, options.id, options.type);

    if (mp3Url) {
      console.log(`[AudioManager] [ID #${playbackId}] Tìm thấy file MP3 cho "${cleanWord}": ${mp3Url}`);
      this.playHtml5Audio(cleanWord, mp3Url, playbackId, options);
    } else {
      console.log(`[AudioManager] [ID #${playbackId}] Không có file MP3 cho "${cleanWord}". Chuyển sang Web Speech API fallback.`);
      this.fallbackToWebSpeech(cleanWord, playbackId, 'No local MP3 in manifest', options);
    }
  }

  // Phát file MP3 nội bộ thông qua HTML5 Audio
  playHtml5Audio(word, url, playbackId, options = {}) {
    try {
      const audio = new Audio();
      this.activeAudio = audio;
      this.setStatus('loading', { word, source: 'mp3', url });

      // Áp dụng tốc độ phát âm (playbackRate)
      const rate = typeof options.playbackRate === 'number' && options.playbackRate > 0 
        ? options.playbackRate 
        : 1.0;
      audio.playbackRate = rate;

      // Ghi log chi tiết trạng thái Audio để debug trên Android Chrome
      audio.addEventListener('loadstart', () => {
        if (this.currentPlaybackId !== playbackId) return;
        console.log(`[AudioManager] [MP3 loadstart] url: ${url}, networkState: ${audio.networkState}`);
      });

      audio.addEventListener('canplay', () => {
        if (this.currentPlaybackId !== playbackId) return;
        console.log(`[AudioManager] [MP3 canplay] readyState: ${audio.readyState}, duration: ${audio.duration}s`);
      });

      audio.addEventListener('playing', () => {
        if (this.currentPlaybackId !== playbackId) return;
        console.log(`[AudioManager] [MP3 playing] Đang phát âm thanh: "${word}" (Tốc độ: ${rate}x)`);
        this.setStatus('playing', { word, source: 'mp3', url });
        if (options.onStart) {
          try { options.onStart(); } catch (_) {}
        }
      });

      audio.addEventListener('ended', () => {
        if (this.currentPlaybackId !== playbackId) return;
        console.log(`[AudioManager] [MP3 ended] Hoàn tất phát âm: "${word}"`);
        this.setStatus('idle');
        if (options.onEnded) {
          try { options.onEnded(); } catch (_) {}
        }
      });

      audio.addEventListener('error', () => {
        if (this.currentPlaybackId !== playbackId) return;
        const errCode = audio.error ? audio.error.code : 'UNKNOWN';
        const errMsg = audio.error ? audio.error.message : 'Lỗi tải audio';
        console.warn(`[AudioManager] [MP3 error] Mã lỗi: ${errCode} (${errMsg}) trên url: ${url}`);

        // Fallback sang Web Speech API nếu tải MP3 thất bại
        this.fallbackToWebSpeech(word, playbackId, `MP3 error code ${errCode}`, options);
      });

      // Gán src và gọi play() TRỰC TIẾP đồng bộ trong user gesture (không await)
      audio.src = url;
      audio.load();

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (this.currentPlaybackId === playbackId) {
              console.log(`[AudioManager] [MP3 play() resolved] Thành công cho "${word}"`);
            }
          })
          .catch((err) => {
            if (this.currentPlaybackId !== playbackId) return;
            console.warn(`[AudioManager] [MP3 play() rejected] ${err.name}: ${err.message}`);

            if (err.name === 'NotAllowedError') {
              this.notifyToast('Trình duyệt chặn autoplay. Vui lòng bấm trực tiếp vào nút loa.', 'warning');
              this.setStatus('error');
              if (options.onError) {
                try { options.onError(err); } catch (_) {}
              }
            } else {
              // Thử fallback sang Web Speech
              this.fallbackToWebSpeech(word, playbackId, `play() rejected: ${err.name}`, options);
            }
          });
      }
    } catch (err) {
      console.error('[AudioManager] Lỗi khởi tạo HTMLAudioElement:', err);
      this.fallbackToWebSpeech(word, playbackId, 'Exception in new Audio()', options);
    }
  }

  // Fallback an toàn sang Web Speech API (chỉ chạy 1 lần)
  fallbackToWebSpeech(word, playbackId, reason, options = {}) {
    if (this.currentPlaybackId !== playbackId) return;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn(`[AudioManager] Trình duyệt không hỗ trợ Web Speech API. Lý do fallback: ${reason}`);
      this.notifyToast(`Không thể phát âm từ "${word}". Thiết bị chưa hỗ trợ Web Speech và chưa có file MP3.`, 'warning');
      this.setStatus('error');
      if (options.onError) {
        try { options.onError(new Error('WebSpeech not supported')); } catch (_) {}
      }
      return;
    }

    try {
      console.log(`[AudioManager] [Fallback WebSpeech] Đang thử phát âm cho "${word}" (Lý do: ${reason})`);
      window.speechSynthesis.cancel();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const rate = typeof options.playbackRate === 'number' && options.playbackRate > 0 
        ? options.playbackRate 
        : 1.0;

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-GB';
      utterance.rate = Math.max(0.5, Math.min(2.0, rate * 0.9));
      utterance.pitch = 1.0;

      const bestVoice = this.getBestEnglishVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || 'en-GB';
        console.log(`[AudioManager] [Fallback WebSpeech] Sử dụng voice: ${bestVoice.name} (${bestVoice.lang})`);
      } else {
        console.log('[AudioManager] [Fallback WebSpeech] Không có voice cụ thể trong danh sách, sử dụng giọng mặc định hệ thống.');
      }

      // Giữ tham chiếu chống garbage collection trên Chrome Android / Safari
      this.activeUtterance = utterance;
      window._currentUtterance = utterance;
      this.setStatus('loading', { word, source: 'webspeech' });

      utterance.onstart = () => {
        if (this.currentPlaybackId !== playbackId) return;
        console.log(`[AudioManager] [WebSpeech onstart] Bắt đầu đọc: "${word}"`);
        this.setStatus('playing', { word, source: 'webspeech' });
        if (options.onStart) {
          try { options.onStart(); } catch (_) {}
        }
      };

      utterance.onend = () => {
        if (this.currentPlaybackId !== playbackId) return;
        console.log(`[AudioManager] [WebSpeech onend] Đã đọc xong: "${word}"`);
        this.activeUtterance = null;
        window._currentUtterance = null;
        this.setStatus('idle');
        if (options.onEnded) {
          try { options.onEnded(); } catch (_) {}
        }
      };

      utterance.onerror = (e) => {
        if (this.currentPlaybackId !== playbackId) return;
        this.activeUtterance = null;
        window._currentUtterance = null;

        if (e.error === 'interrupted' || e.error === 'canceled') {
          console.log(`[AudioManager] [WebSpeech canceled] Đã hủy theo yêu cầu.`);
          this.setStatus('idle');
          if (options.onEnded) {
            try { options.onEnded(); } catch (_) {}
          }
          return;
        }

        console.warn(`[AudioManager] [WebSpeech onerror] Lỗi: ${e.error}`);

        if (e.error === 'not-allowed') {
          this.notifyToast('Trình duyệt chưa cho phép phát âm. Vui lòng nhấn trực tiếp vào nút loa.', 'warning');
        } else {
          this.notifyToast(`Không thể phát âm từ "${word}" (${e.error || 'Lỗi engine TTS'}). Hãy kiểm tra cài đặt âm lượng hoặc giọng nói tiếng Anh trên máy.`, 'warning');
        }
        this.setStatus('error');
        if (options.onError) {
          try { options.onError(e); } catch (_) {}
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[AudioManager] Lỗi khi gọi window.speechSynthesis.speak:', err);
      this.notifyToast(`Lỗi phát âm: ${err.message || 'Không thể khởi động bộ đọc'}`, 'error');
      this.setStatus('error');
      if (options.onError) {
        try { options.onError(err); } catch (_) {}
      }
    }
  }
}

// Xuất singleton instance
export const audioManager = new AudioManager();


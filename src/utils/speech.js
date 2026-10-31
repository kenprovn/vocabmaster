// Bộ quản lý phát âm Web Speech API tối ưu cho cả Desktop và Mobile (Chrome, Safari, iOS/Android)

let voices = [];
let currentUtterance = null;
let isAudioUnlocked = false;

// Hàm tải danh sách voices từ trình duyệt
const loadVoices = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    voices = window.speechSynthesis.getVoices() || [];
  } catch (err) {
    console.warn('Không thể nạp danh sách giọng đọc:', err);
  }
};

// Khởi tạo và lắng nghe sự kiện khi voices sẵn sàng
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// Tìm giọng đọc tiếng Anh phù hợp (Ưu tiên en-US, en-GB, hoặc bất kỳ voice tiếng Anh nào)
const getEnglishVoice = () => {
  if (!voices || voices.length === 0) {
    loadVoices();
  }
  if (!voices || voices.length === 0) return null;

  // 1. Ưu tiên en-US
  const enUsVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
  if (enUsVoice) return enUsVoice;

  // 2. Ưu tiên en-GB
  const enGbVoice = voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');
  if (enGbVoice) return enGbVoice;

  // 3. Giọng tiếng Anh bất kỳ
  const anyEnVoice = voices.find(v => v.lang && v.lang.toLowerCase().includes('en'));
  if (anyEnVoice) return anyEnVoice;

  return null;
};

// 1. CƠ CHẾ ĐÁNH THỨC ÂM THANH (AUDIO UNLOCKER):
// Phát một chuỗi rỗng trong một sự kiện tương tác người dùng đầu tiên để mở khóa Web Speech API trên Mobile
export const unlockAudio = () => {
  if (isAudioUnlocked) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    const silent = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(silent);
    isAudioUnlocked = true;
  } catch (err) {
    console.warn('Không thể mở khóa audio trên thiết bị:', err);
  }
};

export const speakWord = (text) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!text || typeof text !== 'string' || !text.trim()) return;

  try {
    // 1. FIX HÀNG ĐỢI (QUEUE): Luôn luôn hủy sạch các âm thanh đang bị kẹt trong hàng đợi
    window.speechSynthesis.cancel();

    // Đánh thức nếu trình duyệt di động đang ở trạng thái ngủ đông / paused
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // 2. Tạo đối tượng SpeechSynthesisUtterance
    const utterance = new SpeechSynthesisUtterance(text.trim());

    // 3. XỬ LÝ VOICE TIẾNG ANH & FALLBACK:
    utterance.lang = 'en-US';
    const englishVoice = getEnglishVoice();
    // Nếu danh sách voices bị rỗng (do Mobile load chậm), TUYỆT ĐỐI ĐỪNG set utterance.voice
    // Trình duyệt sẽ tự động lấy giọng tiếng Anh mặc định của hệ thống
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    // 4. DỰ PHÒNG TỐC ĐỘ VÀ CAO ĐỘ (Tự nhiên, rõ ràng trên loa ngoài điện thoại)
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // 5. FIX GARBAGE COLLECTION TRÊN MOBILE:
    // Gán đối tượng utterance vào biến toàn cục và window._currentUtterance để tránh bị Mobile GC xóa mất trước khi đọc xong
    currentUtterance = utterance;
    window._currentUtterance = utterance;

    utterance.onend = () => {
      currentUtterance = null;
      window._currentUtterance = null;
    };

    utterance.onerror = (e) => {
      // Bỏ qua lỗi canceled/interrupted do gọi speechSynthesis.cancel()
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Speech error:', e.error);
      }
      currentUtterance = null;
      window._currentUtterance = null;
    };

    // Thực hiện phát âm trực tiếp
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Lỗi khi phát âm từ vựng:', err);
  }
};

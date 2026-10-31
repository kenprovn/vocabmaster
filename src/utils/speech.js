// Bộ quản lý phát âm Web Speech API tối ưu cho cả Desktop và Mobile (Chrome, Safari, iOS/Android)

let voices = [];
let currentUtterance = null;

// Hàm tải danh sách voices từ trình duyệt
const loadVoices = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    voices = window.speechSynthesis.getVoices();
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

export const speakWord = (text) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!text || typeof text !== 'string' || !text.trim()) return;

  try {
    // 1. FIX HÀNG ĐỢI (QUEUE): Hủy sạch các âm thanh đang bị kẹt trong hàng đợi
    window.speechSynthesis.cancel();

    // 2. Tạo đối tượng SpeechSynthesisUtterance
    const utterance = new SpeechSynthesisUtterance(text.trim());

    // 3. XỬ LÝ VOICE TIẾNG ANH
    utterance.lang = 'en-US';
    const englishVoice = getEnglishVoice();
    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang || 'en-US';
    }

    // 4. DỰ PHÒNG TỐC ĐỘ VÀ CAO ĐỘ (Tự nhiên, rõ ràng trên loa ngoài điện thoại)
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // 5. FIX GARBAGE COLLECTION TRÊN MOBILE:
    // Giữ tham chiếu ở biến ngoài hàm và window._currentUtterance để tránh bị mobile browser xóa trước khi đọc xong
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

    // Đánh thức nếu trình duyệt di động đang ở trạng thái paused
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Thực hiện phát âm
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Lỗi khi phát âm từ vựng:', err);
  }
};

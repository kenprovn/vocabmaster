// Phát âm từ vựng tiếng Anh sử dụng HTML5 Audio kết hợp Google Translate TTS API
let currentAudio = null;

export const speakWord = (word) => {
  if (!word || typeof word !== 'string' || !word.trim()) return;

  try {
    // Nếu đang phát âm thanh trước đó thì dừng lại
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const cleanWord = word.trim();
    // Sử dụng API phát âm thanh chuẩn của Google Translate
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodeURIComponent(cleanWord)}`;
    const audio = new Audio(url);
    currentAudio = audio;

    audio.play().catch((err) => {
      console.warn("Lỗi phát âm thanh:", err);
    });
  } catch (err) {
    console.error("Lỗi khởi tạo Audio:", err);
  }
};

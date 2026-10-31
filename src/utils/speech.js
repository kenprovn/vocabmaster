// src/utils/speech.js
// Cổng giao tiếp phát âm chuẩn hóa cho toàn ứng dụng
// Chuyển toàn bộ yêu cầu sang AudioManager (Ưu tiên MP3 nội bộ + Fallback Web Speech an toàn)

import { audioManager } from './audioManager';

export const speakWord = (word, options) => {
  audioManager.playWord(word, options);
};

export const stopSpeech = () => {
  audioManager.stop();
};

export { audioManager };

// src/utils/clipboard.js
// Tiện ích sao chép văn bản an toàn vào Clipboard cho cả Desktop và Mobile

export const copyToClipboard = async (text) => {
  if (!text) return false;
  const cleanText = text.trim();

  // 1. Ưu tiên Clipboard API hiện đại
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(cleanText);
      return true;
    } catch {}
  }

  // 2. Fallback cho thiết bị di động / môi trường cũ
  try {
    const textArea = document.createElement('textarea');
    textArea.value = cleanText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[Clipboard] Không thể sao chép vào bộ nhớ tạm:', err);
    return false;
  }
};

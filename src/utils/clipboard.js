// src/utils/clipboard.js
// Tiện ích sao chép văn bản an toàn vào Clipboard cho cả Desktop và Mobile
// Kèm hàm chuẩn hóa từ vựng tiếng Anh (chuyển chữ thường cho từ vựng thông thường)

/**
 * Danh sách các từ viết tắt / tên viết hoa cố định đáng tin cậy
 */
const ACRONYM_EXCEPTIONS = new Set([
  'TV', 'OK', 'CD', 'DVD', 'CEO', 'CFO', 'CTO', 'COO', 'CIO',
  'VIP', 'ATM', 'PIN', 'SIM', 'RAM', 'ROM', 'USB', 'GPS', 'FAQ',
  'HR', 'PR', 'IT', 'AI', 'IQ', 'EQ', 'DIY', 'SOS', 'FBI', 'CIA',
  'NASA', 'NATO', 'WHO', 'UNESCO', 'UNICEF', 'AIDS', 'HIV',
  'COVID', 'PC', 'DJ', 'ID'
]);

/**
 * Chuẩn hóa từ/cụm từ tiếng Anh trước khi sao chép:
 * - Xóa khoảng trắng thừa ở đầu và cuối bằng trim()
 * - Từ vựng thông thường chuyển thành chữ thường (ví dụ: CART -> cart, UNLOCK -> unlock,
 *   COMMUTE -> commute, FORKLIFT TRUCK -> forklift truck, UP-TO-DATE -> up-to-date)
 * - Giữ nguyên khoảng trắng giữa các từ, dấu gạch nối (-) và dấu nháy (')
 * - Bảo tồn chữ IN HOA với từ viết tắt đặc biệt đã được xác định
 */
export const normalizeWordForCopy = (raw) => {
  const text = typeof raw === 'string' ? raw : (raw?.word || '');
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Kiểm tra nếu là từ viết tắt ngoại lệ đã định nghĩa
  if (ACRONYM_EXCEPTIONS.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }

  // Chuyển toàn bộ từ vựng thông thường về chữ thường
  return trimmed.toLowerCase();
};

/**
 * Sao chép văn bản thuần túy vào Clipboard
 */
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

/**
 * Sao chép một từ tiếng Anh đã qua chuẩn hóa chữ thường
 */
export const copyWordToClipboard = async (rawWord) => {
  const normalized = normalizeWordForCopy(rawWord);
  if (!normalized) return false;
  return await copyToClipboard(normalized);
};

// src/utils/toast.js
// Quản lý hiển thị Toast thông báo nhanh (sao chép, lưu từ, trạng thái hệ thống)

import { audioManager } from './audioManager';

/**
 * Hiển thị Toast thông báo nhanh
 * @param {string} message - Nội dung thông báo
 * @param {'info' | 'success' | 'warning' | 'error'} type - Phân loại hiển thị
 */
export const showToast = (message, type = 'info') => {
  audioManager.notifyToast(message, type);
};


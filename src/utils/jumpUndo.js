// src/utils/jumpUndo.js
// Quản lý cơ chế Hoàn tác (Undo) khi nhảy câu bằng Seek Bar hoặc nhập số trực tiếp

import { cancelCurrentAutoNext } from './autoNext';

const JUMP_UNDO_EVENT = 'vocab_jump_undo_event';
const CLEAR_UNDO_EVENT = 'vocab_clear_undo_event';

let currentUndoState = null;
let currentUndoCallback = null;

/**
 * Kích hoạt thông báo Hoàn tác khi nhảy đến câu mới
 * @param {Object} param0
 * @param {number} param0.fromIndex - Chỉ số câu trước khi nhảy (0-based)
 * @param {number} param0.toIndex - Chỉ số câu sau khi nhảy (0-based)
 * @param {number} param0.total - Tổng số câu
 * @param {Function} param0.onUndo - Hàm thực thi hoàn tác
 */
export const triggerJumpUndo = ({ fromIndex, toIndex, total, onUndo }) => {
  if (typeof window === 'undefined') return;
  if (fromIndex === toIndex || typeof toIndex !== 'number' || typeof fromIndex !== 'number') {
    return;
  }

  currentUndoCallback = onUndo;
  currentUndoState = {
    fromIndex,
    toIndex,
    total,
    id: Date.now()
  };

  window.dispatchEvent(
    new CustomEvent(JUMP_UNDO_EVENT, { detail: currentUndoState })
  );
};

/**
 * Xóa trạng thái Hoàn tác hiện tại (khi chuyển bộ từ, đổi mode, xáo trộn hoặc hết hạn)
 */
export const clearJumpUndo = () => {
  if (typeof window === 'undefined') return;
  currentUndoState = null;
  currentUndoCallback = null;
  window.dispatchEvent(new CustomEvent(CLEAR_UNDO_EVENT));
};

/**
 * Thực thi hành động Hoàn tác
 */
export const executeJumpUndo = () => {
  if (!currentUndoCallback || !currentUndoState) return;

  // Hủy Auto Next nếu đang đếm ngược
  cancelCurrentAutoNext();

  const cb = currentUndoCallback;
  const fromIdx = currentUndoState.fromIndex;

  clearJumpUndo();

  if (typeof cb === 'function') {
    cb(fromIdx);
  }
};

/**
 * Lắng nghe sự kiện cập nhật và xóa Hoàn tác
 */
export const subscribeJumpUndo = (onUpdate, onClear) => {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = (e) => {
    if (onUpdate && e.detail) {
      onUpdate(e.detail);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  window.addEventListener(JUMP_UNDO_EVENT, handleUpdate);
  window.addEventListener(CLEAR_UNDO_EVENT, handleClear);

  return () => {
    window.removeEventListener(JUMP_UNDO_EVENT, handleUpdate);
    window.removeEventListener(CLEAR_UNDO_EVENT, handleClear);
  };
};


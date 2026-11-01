// src/components/JumpUndoToast.jsx
// Toast thông báo khi nhảy câu bằng Seek Bar hoặc nhập số, kèm nút Hoàn tác

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X, Compass } from 'lucide-react';
import { subscribeJumpUndo, executeJumpUndo, clearJumpUndo } from '../utils/jumpUndo';

export default function JumpUndoToast() {
  const [undoData, setUndoData] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeJumpUndo(
      (data) => {
        // Cập nhật thông tin nhảy mới nhất
        setUndoData(data);

        // Hủy timer cũ nếu có và bắt đầu đếm 5 giây mới
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          setUndoData(null);
          clearJumpUndo();
        }, 5000);
      },
      () => {
        // Sự kiện clear
        setUndoData(null);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      }
    );

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!undoData || typeof document === 'undefined') return null;

  const handleUndoClick = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    executeJumpUndo();
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setUndoData(null);
    clearJumpUndo();
  };

  return createPortal(
    <div 
      className="jump-undo-toast-container animate-fade-in" 
      role="status" 
      aria-live="polite"
    >
      <div className="jump-undo-toast-box">
        <div className="jump-undo-toast-icon">
          <Compass size={17} color="#38bdf8" />
        </div>

        <div className="jump-undo-toast-text">
          Đã chuyển đến câu <strong className="jump-undo-highlight">{undoData.toIndex + 1}</strong> / {undoData.total}
        </div>

        <button
          type="button"
          className="jump-undo-btn"
          onClick={handleUndoClick}
          title="Quay lại câu trước khi nhảy"
        >
          <RotateCcw size={14} className="undo-icon-spin" />
          <span>Hoàn tác</span>
        </button>

        <button
          type="button"
          className="jump-undo-close-btn"
          onClick={handleCloseClick}
          title="Đóng thông báo"
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}


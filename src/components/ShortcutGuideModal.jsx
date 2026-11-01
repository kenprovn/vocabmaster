// src/components/ShortcutGuideModal.jsx
// Nút bấm và Popover hướng dẫn phím tắt thu gọn cho Flashcard, Quiz và Typing

import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

export default function ShortcutGuideModal({ mode = 'flashcard', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Đóng khi click bên ngoài popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Danh sách phím tắt thực tế theo từng chế độ
  const renderShortcuts = () => {
    if (mode === 'flashcard') {
      return (
        <div className="shortcut-items-list">
          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">A</span> <span className="key-sep">/</span> <span className="shortcut-kbd">←</span>
            </div>
            <div className="shortcut-item-desc">Từ trước</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">D</span> <span className="key-sep">/</span> <span className="shortcut-kbd">→</span> <span className="key-sep">/</span> <span className="shortcut-kbd">Enter ↵</span>
            </div>
            <div className="shortcut-item-desc">Từ tiếp theo</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">W</span> <span className="key-sep">/</span> <span className="shortcut-kbd">S</span> <span className="key-sep">/</span> <span className="shortcut-kbd">Space</span> <span className="key-sep">/</span> <span className="shortcut-kbd">↑</span> <span className="key-sep">/</span> <span className="shortcut-kbd">↓</span>
            </div>
            <div className="shortcut-item-desc">Lật thẻ xem nghĩa</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">R</span>
            </div>
            <div className="shortcut-item-desc">Phát âm (Đọc)</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">X</span>
            </div>
            <div className="shortcut-item-desc">Xáo trộn ngẫu nhiên</div>
          </div>
        </div>
      );
    }

    if (mode === 'quiz') {
      return (
        <div className="shortcut-items-list">
          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">1</span> <span className="key-sep">–</span> <span className="shortcut-kbd">4</span>
            </div>
            <div className="shortcut-item-desc">Chọn đáp án A, B, C, D</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">A</span> <span className="key-sep">/</span> <span className="shortcut-kbd">←</span>
            </div>
            <div className="shortcut-item-desc">Câu trước</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">D</span> <span className="key-sep">/</span> <span className="shortcut-kbd">Enter ↵</span> <span className="key-sep">/</span> <span className="shortcut-kbd">→</span>
            </div>
            <div className="shortcut-item-desc">Câu tiếp / Bỏ qua</div>
          </div>

          <div className="shortcut-item-row">
            <div className="shortcut-item-keys">
              <span className="shortcut-kbd">R</span>
            </div>
            <div className="shortcut-item-desc">Phát âm câu hỏi</div>
          </div>
        </div>
      );
    }

    // mode === 'typing'
    return (
      <div className="shortcut-items-list">
        <div className="shortcut-item-row">
          <div className="shortcut-item-keys">
            <span className="shortcut-kbd">Enter ↵</span>
          </div>
          <div className="shortcut-item-desc">Kiểm tra đáp án / Chuyển tiếp</div>
        </div>

        <div className="shortcut-item-row">
          <div className="shortcut-item-keys">
            <span className="shortcut-kbd">↑</span> <span className="key-sep">/</span> <span className="shortcut-kbd">↓</span>
          </div>
          <div className="shortcut-item-desc">Mở thêm gợi ý (Hint)</div>
        </div>

        <div className="shortcut-item-row">
          <div className="shortcut-item-keys">
            <span className="shortcut-kbd">Ctrl</span> <span className="key-sep">+</span> <span className="shortcut-kbd">←</span> <span className="key-sep">/</span> <span className="shortcut-kbd">Ctrl</span> <span className="key-sep">+</span> <span className="shortcut-kbd">→</span>
          </div>
          <div className="shortcut-item-desc">Chuyển sang câu trước / tiếp</div>
        </div>
      </div>
    );
  };

  return (
    <div className={`shortcut-guide-container ${className}`} ref={popoverRef}>
      <button
        type="button"
        className={`btn-shortcut-toggle ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        title="Xem bảng phím tắt nhanh (Bấm để mở / đóng)"
        aria-label="Phím tắt hỗ trợ"
      >
        <Keyboard size={15} />
        <span>Phím tắt</span>
      </button>

      {isOpen && (
        <div className="shortcut-popover glass-panel animate-fade-in" role="dialog" aria-modal="true">
          <div className="shortcut-popover-header">
            <div className="shortcut-popover-title">
              <Keyboard size={16} className="text-accent" />
              <span>Phím tắt hỗ trợ</span>
            </div>
            <button
              type="button"
              className="shortcut-close-btn"
              onClick={() => setIsOpen(false)}
              title="Đóng bảng phím tắt (Esc)"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>

          <div className="shortcut-popover-body">
            {renderShortcuts()}
          </div>

          <div className="shortcut-popover-footer">
            <span className="shortcut-footer-hint">Nhấn <kbd className="mini-kbd">Esc</kbd> hoặc bấm ra ngoài để đóng</span>
          </div>
        </div>
      )}
    </div>
  );
}


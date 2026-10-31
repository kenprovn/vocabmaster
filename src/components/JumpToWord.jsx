import React, { useState, useEffect, useRef } from 'react';

export default function JumpToWord({ currentIndex, total, onJump }) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Khi bắt đầu chỉnh sửa, đặt giá trị là từ hiện tại và focus/select
  const handleStartEdit = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    isSubmittingRef.current = false;
    setInputValue(String(currentIndex + 1));
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const targetNum = parseInt(inputValue, 10);
    // Kiểm tra hợp lệ từ 1 đến tổng số từ
    if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= total) {
      onJump(targetNum - 1);
    }
    // Nếu sai hoặc rỗng, giữ nguyên index cũ (không gọi onJump)
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    // Ngăn chặn nổi bọt sự kiện để không xung đột với phím tắt toàn cục
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isSubmittingRef.current = true;
      setIsEditing(false);
    }
  };

  return (
    <span className="progress-text jump-word-container">
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          min="1"
          max={total}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="jump-input"
          title={`Nhập từ 1 đến ${total} rồi nhấn Enter`}
        />
      ) : (
        <span
          className="jump-trigger"
          onClick={handleStartEdit}
          title={`Nhấp để nhảy nhanh đến từ (1 - ${total})`}
        >
          {currentIndex + 1}
        </span>
      )}
      <span className="jump-separator"> / </span>
      <span className="jump-total">{total}</span>
    </span>
  );
}


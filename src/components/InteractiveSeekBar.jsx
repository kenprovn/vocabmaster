// src/components/InteractiveSeekBar.jsx
// Thanh kéo tiến độ tương tác (Seek Bar) cho Flashcard, Quiz và Typing
// Hỗ trợ Click, Kéo chuột (Desktop) và Vuốt chạm (Mobile Touch) với Tooltip xem trước

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cancelCurrentAutoNext } from '../utils/autoNext';

export default function InteractiveSeekBar({
  currentIndex, // 0-based
  total,        // Tổng số từ
  onJump,       // Callback (newIndex: number) => void
  disabled = false
}) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(currentIndex);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef(null);
  const isScrubbingRef = useRef(false);
  const scrubIndexRef = useRef(currentIndex);
  const activePointerIdRef = useRef(null);

  // Lắng nghe phím Escape trên desktop khi đang kéo để hủy thao tác và giữ nguyên vị trí cũ
  useEffect(() => {
    if (!isScrubbing) return;
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        setScrubIndex(currentIndex);
        scrubIndexRef.current = currentIndex;
        if (activePointerIdRef.current !== null && trackRef.current) {
          try {
            trackRef.current.releasePointerCapture(activePointerIdRef.current);
          } catch (_) {}
          activePointerIdRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isScrubbing, currentIndex]);

  // Đồng bộ index khi prop bên ngoài thay đổi (khi không kéo)
  useEffect(() => {
    if (!isScrubbingRef.current) {
      setScrubIndex(currentIndex);
      scrubIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  // Tính toán chỉ số từ tương ứng theo tọa độ con trỏ X
  const calculateIndex = useCallback((clientX) => {
    if (!trackRef.current || total <= 1) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = offsetX / rect.width;
    const targetIdx = Math.round(ratio * (total - 1));
    return Math.max(0, Math.min(total - 1, targetIdx));
  }, [total]);

  // Bắt đầu kéo hoặc click (Hỗ trợ cả Mouse và Touch qua Pointer Events)
  const handlePointerDown = (e) => {
    if (disabled || total <= 1) return;
    if (e.button !== undefined && e.button !== 0) return; // Chỉ nhận chuột trái hoặc cảm ứng

    e.preventDefault();
    e.stopPropagation();

    const newIdx = calculateIndex(e.clientX);
    setIsScrubbing(true);
    isScrubbingRef.current = true;
    setScrubIndex(newIdx);
    scrubIndexRef.current = newIdx;
    activePointerIdRef.current = e.pointerId;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Di chuyển con trỏ trong lúc kéo
  const handlePointerMove = (e) => {
    if (!isScrubbingRef.current || disabled || total <= 1) return;
    e.preventDefault();
    e.stopPropagation();

    const newIdx = calculateIndex(e.clientX);
    if (newIdx !== scrubIndexRef.current) {
      scrubIndexRef.current = newIdx;
      setScrubIndex(newIdx);
    }
  };

  // Thả con trỏ / kết thúc kéo -> Thực thi nhảy đến từ mới
  const handlePointerUp = (e) => {
    if (!isScrubbingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const finalIdx = scrubIndexRef.current;
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    activePointerIdRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Hủy timer Auto Next nếu đang chạy để tránh nhảy 2 câu liên tiếp
    cancelCurrentAutoNext();

    // Chỉ chuyển từ khi người dùng thả tay / thả chuột
    if (onJump && finalIdx >= 0 && finalIdx < total) {
      onJump(finalIdx);
    }
  };

  const handlePointerCancel = (e) => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    setScrubIndex(currentIndex);
    scrubIndexRef.current = currentIndex;
    activePointerIdRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Hỗ trợ phím tắt điều hướng accessibility
  const handleKeyDown = (e) => {
    if (disabled || total <= 1) return;
    let target = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      target = Math.min(total - 1, currentIndex + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      target = Math.max(0, currentIndex - 1);
    } else if (e.key === 'PageUp') {
      target = Math.min(total - 1, currentIndex + 10);
    } else if (e.key === 'PageDown') {
      target = Math.max(0, currentIndex - 10);
    } else if (e.key === 'Home') {
      target = 0;
    } else if (e.key === 'End') {
      target = total - 1;
    }

    if (target !== null && target !== currentIndex) {
      e.preventDefault();
      e.stopPropagation();
      cancelCurrentAutoNext();
      onJump(target);
    }
  };

  // Tính toán phần trăm hiển thị:
  // - Khi đang kéo: dùng scrubIndex
  // - Khi bình thường: dùng currentIndex
  const displayIndex = isScrubbing ? scrubIndex : currentIndex;
  const currentRatio = total > 1 ? displayIndex / (total - 1) : (total === 1 ? 1 : 0);
  const fillPercent = Math.max(0, Math.min(100, currentRatio * 100));

  const isDisabled = disabled || total <= 1;

  return (
    <div
      ref={trackRef}
      className={`interactive-seek-bar ${isScrubbing ? 'is-scrubbing' : ''} ${isDisabled ? 'is-disabled' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={isDisabled ? -1 : 0}
      role="slider"
      aria-label="Thanh kéo nhảy nhanh từ vựng"
      aria-valuemin={1}
      aria-valuemax={total || 1}
      aria-valuenow={displayIndex + 1}
      aria-valuetext={`${displayIndex + 1} trên ${total}`}
      onKeyDown={handleKeyDown}
      title={isDisabled ? 'Chỉ có 1 từ vựng' : 'Kéo hoặc nhấp để nhảy nhanh đến từ vựng (1 - ' + total + ')'}
    >
      {/* Vùng thanh ray nhìn thấy (Track) */}
      <div className="seek-track">
        <div 
          className="seek-fill" 
          style={{ width: `${fillPercent}%` }} 
        />
        {!isDisabled && (
          <div 
            className="seek-thumb"
            style={{ left: `${fillPercent}%` }}
          />
        )}
      </div>

      {/* Tooltip xem trước vị trí khi đang kéo hoặc hover */}
      {(isScrubbing || (isHovered && !isDisabled)) && (
        <div 
          className="seek-preview-tooltip"
          style={{ left: `${fillPercent}%` }}
        >
          <span className="tooltip-current">{displayIndex + 1}</span>
          <span className="tooltip-sep">/</span>
          <span className="tooltip-total">{total}</span>
        </div>
      )}
    </div>
  );
}


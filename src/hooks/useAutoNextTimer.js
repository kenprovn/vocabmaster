// src/hooks/useAutoNextTimer.js
// Hook quản lý đếm ngược và tự động chuyển câu hỏi an toàn, hỗ trợ hủy tức thì

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAutoNextSettings, subscribeAutoNext, CANCEL_EVENT } from '../utils/autoNext';

export function useAutoNextTimer({
  isTriggered,
  isCorrect,
  currentIndex,
  totalCount,
  onNext
}) {
  const [settings, setSettings] = useState(() => getAutoNextSettings());
  const [isCounting, setIsCounting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);

  const timerRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const cancelledRef = useRef(false);

  // Đồng bộ cấu hình Auto Next từ localStorage
  useEffect(() => {
    const unsubscribe = subscribeAutoNext((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  // Hàm hủy đếm ngược hiện tại
  const cancelCountdown = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCounting(false);
    setProgressPercent(100);
  }, []);

  // Lắng nghe sự kiện CANCEL_EVENT từ các nút Loa, Copy, Bookmark hoặc thao tác người dùng
  useEffect(() => {
    const handleCancelEvent = () => {
      cancelCountdown();
    };
    window.addEventListener(CANCEL_EVENT, handleCancelEvent);
    return () => window.removeEventListener(CANCEL_EVENT, handleCancelEvent);
  }, [cancelCountdown]);

  // Kích hoạt đếm ngược khi câu hỏi được trả lời
  useEffect(() => {
    if (!isTriggered) {
      return;
    }

    // 1. Kiểm tra tính năng Auto Next có đang bật không
    if (!settings.enabled) return;

    // 2. Kiểm tra chế độ: Nếu 'correct_only' mà trả lời sai thì KHÔNG tự chuyển
    if (settings.mode === 'correct_only' && !isCorrect) return;

    // 3. Nếu đang ở câu cuối cùng (currentIndex === totalCount - 1), không tự động nhảy vòng lại
    if (totalCount > 0 && currentIndex >= totalCount - 1) return;

    // 4. Bắt đầu đếm ngược
    cancelledRef.current = false;
    setIsCounting(true);
    setProgressPercent(100);

    const durationMs = Math.max(settings.delay * 1000, 200);
    startTimeRef.current = performance.now();

    // Animation frame để cập nhật thanh tiến trình mượt mà
    const updateProgress = () => {
      if (cancelledRef.current) return;
      const elapsed = performance.now() - startTimeRef.current;
      const remainingRatio = Math.max(0, 1 - (elapsed / durationMs));
      setProgressPercent(remainingRatio * 100);

      if (elapsed < durationMs) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);

    // Timer thực thi chuyển câu
    timerRef.current = setTimeout(() => {
      if (!cancelledRef.current) {
        setIsCounting(false);
        setProgressPercent(0);
        if (onNext) {
          onNext();
        }
      }
    }, durationMs);

    return () => {
      cancelCountdown();
    };
  }, [isTriggered, isCorrect, currentIndex, totalCount, settings, onNext, cancelCountdown]);

  return {
    settings,
    isCounting,
    progressPercent,
    cancelCountdown
  };
}

export default useAutoNextTimer;

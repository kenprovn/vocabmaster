import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { RotateCw, ArrowRight, ArrowLeft, Shuffle, Maximize2, Minimize2, Settings, ImageOff, HelpCircle, CheckCircle2 } from 'lucide-react';
import { speakWord } from '../utils/speech';
import { isImageLoaded, isImageError, updatePreloadQueue } from '../utils/imagePreloader';
import JumpToWord from './JumpToWord';
import WordActionButtons from './WordActionButtons';
import InteractiveSeekBar from './InteractiveSeekBar';
import { triggerJumpUndo, clearJumpUndo } from '../utils/jumpUndo';
import FlashcardProgressPanel from './FlashcardProgressPanel';
import ShortcutGuideModal from './ShortcutGuideModal';
import FocusSettingsModal from './FocusSettingsModal';
import AutoReadControl from './AutoReadControl';
import { getFocusModeSettings, saveFocusModeSettings, resetFocusModeSettings } from '../utils/focusModeSettings';
import { autoReadCoordinator, cancelCurrentAutoRead } from '../utils/autoRead';

export default function FlashcardMode({ 
  words, 
  onToggleFocus, 
  isFocusMode, 
  selectedUnit, 
  onUpdateWordStatus 
}) {
  const [wordList, setWordList] = useState(words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasFlippedCurrentCard, setHasFlippedCurrentCard] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  // Cài đặt Focus Mode 2.0 (Presets, Thành phần hiển thị, Vị trí thẻ)
  const [focusSettings, setFocusSettings] = useState(() => getFocusModeSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleUpdateSettings = useCallback((newSettings) => {
    setFocusSettings(newSettings);
    saveFocusModeSettings(newSettings);
  }, []);

  const handleResetSettings = useCallback(() => {
    const defaults = resetFocusModeSettings();
    setFocusSettings(defaults);
  }, []);

  // Lưu trữ danh sách gốc ban đầu để toggle qua lại giữa Xáo trộn và Thứ tự gốc
  const originalWordsRef = useRef(words);

  // Ref theo dõi tọa độ cảm ứng để nhận diện thao tác vuốt (Swipe)
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const hasSwipedRef = useRef(false);

  // Lưu trữ đơn vị bài học hoặc fingerprint của danh sách từ để chỉ reset khi thực sự đổi bộ từ / vòng
  const prevUnitRef = useRef(selectedUnit);
  const prevWordsLengthRef = useRef(words?.length || 0);
  const prevFirstIdRef = useRef(words?.[0]?.id);

  useEffect(() => {
    const isUnitChanged = prevUnitRef.current !== selectedUnit;
    const isListChanged = prevWordsLengthRef.current !== (words?.length || 0) || prevFirstIdRef.current !== words?.[0]?.id;

    if (isUnitChanged || isListChanged) {
      prevUnitRef.current = selectedUnit;
      prevWordsLengthRef.current = words?.length || 0;
      prevFirstIdRef.current = words?.[0]?.id;
      originalWordsRef.current = words;
      setWordList(words);
      setIsShuffled(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasFlippedCurrentCard(false);
      clearJumpUndo();
    } else {
      // Chỉ cập nhật thuộc tính từ (như status) vào wordList mà không làm thay đổi currentIndex hay xáo trộn
      const statusMap = new Map(words.map(w => [w.id, w.status]));
      if (originalWordsRef.current) {
        originalWordsRef.current = originalWordsRef.current.map(w => {
          const newStatus = statusMap.get(w.id);
          return (newStatus !== undefined && newStatus !== w.status) ? { ...w, status: newStatus } : w;
        });
      }
      setWordList(prev => {
        return prev.map(w => {
          const newStatus = statusMap.get(w.id);
          if (newStatus !== undefined && newStatus !== w.status) {
            return { ...w, status: newStatus };
          }
          return w;
        });
      });
    }
  }, [words, selectedUnit]);

  // Khi chuyển sang từ khác, reset trạng thái lật thẻ của từ mới
  useEffect(() => {
    setHasFlippedCurrentCard(false);
  }, [currentIndex]);

  // Reset image loading khi chuyển từ (tận dụng cache nếu đã nạp trước thành công)
  const currentWord = wordList[currentIndex] || wordList[0];
  const cardImage = currentWord ? (currentWord.image || currentWord.imageUrl) : null;

  useEffect(() => {
    if (cardImage) {
      if (isImageLoaded(cardImage)) {
        setImageLoading(false);
        setImageError(false);
      } else if (isImageError(cardImage)) {
        setImageLoading(false);
        setImageError(true);
      } else {
        setImageLoading(true);
        setImageError(false);
      }
    }
  }, [currentWord?.id, cardImage]);

  // Preload thông minh: cố định 20 ảnh tiếp theo và 5 ảnh trước đó qua hàng đợi tối đa 4 concurrent
  useEffect(() => {
    if (!wordList || wordList.length === 0) return;

    // Lấy 20 ảnh tiếp theo theo thứ tự hiển thị thực tế
    const upcomingUrls = [];
    const count = Math.min(20, wordList.length - 1);
    for (let i = 1; i <= count; i++) {
      const idx = (currentIndex + i) % wordList.length;
      const w = wordList[idx];
      const url = w?.image || w?.imageUrl;
      if (url) upcomingUrls.push(url);
    }

    // Lấy 5 ảnh trước đó để lướt quay lại không phải tải lại
    const previousUrls = [];
    const prevCount = Math.min(5, wordList.length - 1);
    for (let i = 1; i <= prevCount; i++) {
      const idx = (currentIndex - i + wordList.length) % wordList.length;
      const w = wordList[idx];
      const url = w?.image || w?.imageUrl;
      if (url) previousUrls.push(url);
    }

    updatePreloadQueue(cardImage, upcomingUrls, previousUrls);
  }, [currentIndex, wordList, cardImage]);

  // Theo dõi chuyển từ mới và kích hoạt Auto Read theo đúng cấu hình
  const previousWordIdRef = useRef(null);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Bỏ qua lượt đầu tiên lúc F5/mở trang để tránh autoplay bị chặn ngoài ý muốn
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousWordIdRef.current = currentWord?.id;
      return;
    }

    if (currentWord && currentWord.id !== previousWordIdRef.current) {
      previousWordIdRef.current = currentWord.id;
      cancelCurrentAutoRead();
      autoReadCoordinator.trigger({
        mode: 'flashcard',
        triggerType: 'new',
        word: currentWord.word,
        wordItem: currentWord
      });
    }
  }, [currentWord?.id]);

  // Hủy Auto Read khi đổi chế độ hoặc unmount Flashcard
  useEffect(() => {
    return () => {
      cancelCurrentAutoRead();
    };
  }, []);

  const handleFlip = useCallback(() => {
    setHasFlippedCurrentCard(true);
    setIsFlipped(prev => {
      const nextFlipped = !prev;
      // Chỉ tự đọc khi lật từ Tiếng Anh (false) sang Nghĩa tiếng Việt (true)
      if (nextFlipped && currentWord && currentWord.word) {
        autoReadCoordinator.trigger({
          mode: 'flashcard',
          triggerType: 'flip',
          word: currentWord.word,
          wordItem: currentWord
        });
      }
      return nextFlipped;
    });
  }, [currentWord]);

  const handleJump = useCallback((newIndex) => {
    if (newIndex === currentIndex) return;
    const prevIdx = currentIndex;
    triggerJumpUndo({
      fromIndex: prevIdx,
      toIndex: newIndex,
      total: wordList.length,
      onUndo: (targetIdx) => {
        setIsFlipped(false);
        setCurrentIndex(targetIdx);
      }
    });
    setIsFlipped(false);
    setCurrentIndex(newIndex);
  }, [currentIndex, wordList.length]);

  const handleNext = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % wordList.length);
    }, 150);
  }, [wordList.length]);

  const handlePrev = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + wordList.length) % wordList.length);
    }, 150);
  }, [wordList.length]);

  // Logic tự đánh giá từ vựng: Chưa nhớ (learning) / Đã nhớ (known) / Chưa học (new)
  // Quy tắc mở khóa (canEvaluate):
  // - Nếu từ đã có trạng thái learning hoặc known: mở khóa ngay để sửa hoặc hủy mà không bắt buộc lật lại
  // - Nếu từ là new (chưa đánh giá): phải lật xem nghĩa ít nhất 1 lần trong lượt xem hiện tại (isFlipped || hasFlippedCurrentCard)
  const hasExistingEvaluation = currentWord?.status === 'learning' || currentWord?.status === 'known' || currentWord?.status === 'mastered';
  const canEvaluate = isFlipped || hasFlippedCurrentCard || hasExistingEvaluation;
  const isRemembered = currentWord?.status === 'known' || currentWord?.status === 'mastered';
  const isNotRemembered = currentWord?.status === 'learning';

  // Toggle Chưa nhớ:
  // - new / known -> bấm Chưa nhớ -> learning
  // - learning -> bấm Chưa nhớ lần nữa -> new
  const handleRateNotRemembered = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!canEvaluate || !currentWord) return;

    const isCurrentlyLearning = currentWord.status === 'learning';
    const newStatus = isCurrentlyLearning ? 'new' : 'learning';

    setWordList(prev => prev.map((w, idx) => idx === currentIndex ? { ...w, status: newStatus } : w));
    if (originalWordsRef.current) {
      originalWordsRef.current = originalWordsRef.current.map(w => w.id === currentWord.id ? { ...w, status: newStatus } : w);
    }
    if (onUpdateWordStatus) {
      onUpdateWordStatus(currentWord.id, newStatus);
    }
  }, [canEvaluate, currentWord, currentIndex, onUpdateWordStatus]);

  // Toggle Đã nhớ:
  // - new / learning -> bấm Đã nhớ -> known
  // - known / mastered -> bấm Đã nhớ lần nữa -> new
  const handleRateRemembered = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!canEvaluate || !currentWord) return;

    const isCurrentlyKnown = currentWord.status === 'known' || currentWord.status === 'mastered';
    const newStatus = isCurrentlyKnown ? 'new' : 'known';

    setWordList(prev => prev.map((w, idx) => idx === currentIndex ? { ...w, status: newStatus } : w));
    if (originalWordsRef.current) {
      originalWordsRef.current = originalWordsRef.current.map(w => w.id === currentWord.id ? { ...w, status: newStatus } : w);
    }
    if (onUpdateWordStatus) {
      onUpdateWordStatus(currentWord.id, newStatus);
    }
  }, [canEvaluate, currentWord, currentIndex, onUpdateWordStatus]);

  // Touch Gesture Handlers cho Mobile:
  // - Vuốt Trái/Phải: Chuyển sang từ tiếp theo / Lùi lại từ trước
  // - Vuốt Lên/Xuống: Lật thẻ xem nghĩa
  // - Chạm (Tap): Lật thẻ
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    hasSwipedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    // Đánh dấu đã vuốt nếu di chuyển ngang > 35px hoặc dọc > 30px
    if (Math.abs(deltaX) > 35 || Math.abs(deltaY) > 30) {
      hasSwipedRef.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || !e.changedTouches || e.changedTouches.length === 0) {
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // 1. Phân loại vuốt ngang Trái / Phải (deltaX > deltaY và deltaX > 50px)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      hasSwipedRef.current = true;
      if (deltaX < 0) {
        // Vuốt sang TRÁI (Swipe Left): Chuyển sang từ tiếp theo
        handleNext();
      } else {
        // Vuốt sang PHẢI (Swipe Right): Quay về từ trước đó
        handlePrev();
      }
    }
    // 2. Phân loại vuốt dọc Lên / Xuống (deltaY > deltaX và deltaY > 40px): Lật thẻ
    else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 40) {
      hasSwipedRef.current = true;
      handleFlip();
    }
  };

  // Click vào thẻ: Chỉ lật thẻ khi KHÔNG phải là thao tác vuốt và KHÔNG click vào action buttons
  const handleCardClick = (e) => {
    if (hasSwipedRef.current) {
      hasSwipedRef.current = false;
      return;
    }
    // Ngăn lật thẻ khi người dùng click vào các nút hành động (Loa, Copy, Bookmark)
    if (e.target.closest('.card-top-actions') || e.target.closest('button')) {
      return;
    }
    handleFlip();
  };

  // Cơ chế Toggle Xáo trộn (Shuffle Toggle):
  // - Khi BẬT: tạo hoán vị Fisher-Yates mới, giữ nguyên từ đang hiển thị (currentWord) và cập nhật currentIndex tương ứng.
  // - Khi TẮT: khôi phục danh sách gốc (originalWordsRef), giữ nguyên từ đang hiển thị và cập nhật currentIndex tương ứng.
  const handleToggleShuffle = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    clearJumpUndo();

    const activeWord = wordList[currentIndex] || originalWordsRef.current[0];
    if (!activeWord) return;

    if (isShuffled) {
      // Đang BẬT -> TẮT: quay về danh sách gốc
      const currentStatusMap = new Map(wordList.map(w => [w.id, w.status]));
      const restored = (originalWordsRef.current || []).map(w => {
        const s = currentStatusMap.get(w.id);
        return s !== undefined ? { ...w, status: s } : w;
      });

      const newIdx = restored.findIndex(w => w.id === activeWord.id);
      setWordList(restored);
      setCurrentIndex(newIdx !== -1 ? newIdx : 0);
      setIsShuffled(false);
    } else {
      // Đang TẮT -> BẬT: xáo trộn Fisher-Yates mới
      const currentStatusMap = new Map(wordList.map(w => [w.id, w.status]));
      if (originalWordsRef.current) {
        originalWordsRef.current = originalWordsRef.current.map(w => {
          const s = currentStatusMap.get(w.id);
          return s !== undefined ? { ...w, status: s } : w;
        });
      }

      const shuffled = [...wordList];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const newIdx = shuffled.findIndex(w => w.id === activeWord.id);
      setWordList(shuffled);
      setCurrentIndex(newIdx !== -1 ? newIdx : 0);
      setIsShuffled(true);
    }
  }, [isShuffled, wordList, currentIndex]);

  // Phát âm từ vựng (gọi trực tiếp speakWord trong user gesture, ưu tiên hủy Auto Read đang chạy)
  const handleSpeak = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    cancelCurrentAutoRead();
    if (currentWord && currentWord.word) {
      speakWord(currentWord.word, { id: currentWord.id, type: currentWord.type });
    }
  }, [currentWord]);

  // Phím tắt bàn phím: A, D, S, Space, R, X, Enter + Arrow keys (ArrowLeft, ArrowRight, ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua nếu đang nhập liệu trong input, textarea, select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();

      // Tiếp theo: Enter, D, ArrowRight
      if (key === 'enter' || key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      // Quay lại: A, ArrowLeft
      else if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
      // Lật thẻ: S, W, Space, ArrowUp, ArrowDown
      else if (key === 's' || key === 'w' || e.code === 'Space' || key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); // Tránh cuộn trang trình duyệt khi nhấn Space / Arrow keys
        handleFlip();
      }
      // Phát âm: R
      else if (key === 'r') {
        e.preventDefault();
        handleSpeak();
      }
      // Toggle Xáo trộn / Thứ tự gốc: X
      else if (key === 'x') {
        e.preventDefault();
        handleToggleShuffle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFlip, handleToggleShuffle, handleSpeak]);

  if (!wordList || wordList.length === 0) {
    return <div className="text-center py-8">Không có từ vựng nào!</div>;
  }

  // Các cờ hiển thị thành phần (Focus Mode 2.0):
  // Khi không ở Focus Mode, hiển thị 100% tất cả thành phần như ban đầu
  const showWordCounter = !isFocusMode || focusSettings.elements.showWordCounter;
  const showSeekBar = !isFocusMode || focusSettings.elements.showSeekBar;
  const showNavPrevNext = !isFocusMode || focusSettings.elements.showNavPrevNext;
  const showNavShuffle = !isFocusMode || focusSettings.elements.showNavShuffle;
  const showNavFlip = !isFocusMode || focusSettings.elements.showNavFlip;
  const showEvaluation = !isFocusMode || focusSettings.elements.showEvaluation;
  const showProgressPanel = !isFocusMode || focusSettings.elements.showProgressPanel;
  const showShortcutBtn = !isFocusMode || focusSettings.elements.showShortcutBtn;
  const showCardHint = !isFocusMode || focusSettings.elements.showCardHint;
  const isZenMode = isFocusMode && focusSettings.preset === 'zen';
  const hasAnyNav = showNavPrevNext || showNavShuffle || showNavFlip;
  const hasAnyTools = hasAnyNav || showEvaluation || showProgressPanel || showShortcutBtn;

  // Quản lý vị trí dịch chuyển Flashcard an toàn (Safe Clamping theo thời gian thực)
  const headerRef = useRef(null);
  const cardWrapperRef = useRef(null);
  const toolsRef = useRef(null);
  const [safeBounds, setSafeBounds] = useState({ min: -120, max: 120 });
  const appliedOffsetYRef = useRef(0);

  const updateSafeBounds = useCallback(() => {
    if (!isFocusMode) return;
    const headerEl = headerRef.current;
    const cardEl = cardWrapperRef.current;
    const toolsEl = toolsRef.current;

    const MIN_SAFE_GAP = 14; // Khoảng cách an toàn tối thiểu 14px giữa thẻ và Header/Tools

    let maxMoveUp = 120;
    let maxMoveDown = 120;

    if (headerEl && cardEl) {
      const hRect = headerEl.getBoundingClientRect();
      const cRect = cardEl.getBoundingClientRect();
      // Hoàn tác transform hiện tại để lấy vị trí đỉnh gốc chưa dịch
      const unshiftedCardTop = cRect.top - appliedOffsetYRef.current;
      const spaceAbove = unshiftedCardTop - hRect.bottom;
      maxMoveUp = Math.max(0, Math.floor(spaceAbove - MIN_SAFE_GAP));
    }

    if (toolsEl && cardEl) {
      const cRect = cardEl.getBoundingClientRect();
      const tRect = toolsEl.getBoundingClientRect();
      // Hoàn tác transform hiện tại để lấy vị trí đáy gốc chưa dịch
      const unshiftedCardBottom = cRect.bottom - appliedOffsetYRef.current;
      const spaceBelow = tRect.top - unshiftedCardBottom;
      maxMoveDown = Math.max(0, Math.floor(spaceBelow - MIN_SAFE_GAP));
    }

    setSafeBounds({
      min: -Math.min(120, maxMoveUp),
      max: Math.min(120, maxMoveDown)
    });
  }, [isFocusMode]);

  // Dùng useLayoutEffect để tính toán an toàn ngay trước khi trình duyệt paint
  useLayoutEffect(() => {
    if (!isFocusMode) return;
    updateSafeBounds();
  }, [isFocusMode, updateSafeBounds, focusSettings.preset, focusSettings.elements, currentIndex, cardImage, imageLoading]);

  // Dùng ResizeObserver theo dõi mọi thay đổi kích thước DOM theo thời gian thực (ảnh tải xong, font chữ, layout shift)
  useEffect(() => {
    if (!isFocusMode) return;
    updateSafeBounds();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateSafeBounds();
      });
      if (headerRef.current) observer.observe(headerRef.current);
      if (cardWrapperRef.current) observer.observe(cardWrapperRef.current);
      if (toolsRef.current) observer.observe(toolsRef.current);
    }

    window.addEventListener('resize', updateSafeBounds);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateSafeBounds);
    };
  }, [isFocusMode, updateSafeBounds]);

  // Tinh chỉnh vị trí Flashcard Zen Mode và quản lý Clamping an toàn
  // - Zen Mode mặc định nâng nhẹ Flashcard lên 24px để tạo độ cân đối thị giác tối ưu (optical center).
  // - Nếu màn hình nhỏ, safeBounds tự động giảm độ dịch chuyển để bảo đảm khoảng cách Header >= 14px.
  // - Khi chọn 'Tùy chỉnh dịch chuyển' (custom), slider điều chỉnh từ tâm chuẩn (0px) và không cộng gộp offset 2 lần.
  const ZEN_DEFAULT_OFFSET = -24;
  const isCustomPosition = isFocusMode && focusSettings.positionMode === 'custom';
  
  let targetOffsetY = 0;
  if (isZenMode && !isCustomPosition) {
    targetOffsetY = ZEN_DEFAULT_OFFSET;
  } else if (isCustomPosition) {
    targetOffsetY = focusSettings.offsetY || 0;
  }

  const clampedOffsetY = Math.max(safeBounds.min, Math.min(safeBounds.max, targetOffsetY));
  appliedOffsetYRef.current = clampedOffsetY;

  const positionWrapperStyle = clampedOffsetY !== 0 
    ? { transform: `translateY(${clampedOffsetY}px)`, transition: 'transform 0.15s ease-out' }
    : undefined;

  return (
    <div className={`animate-fade-in ${isFocusMode ? 'focus-space-mode' : ''} ${isZenMode ? 'is-zen-space' : ''}`}>
      {/* VÙNG A — HEADER FOCUS SPACE HOẶC HEADER THƯỜNG */}
      {!isFocusMode ? (
        <div className="mode-header">
          <div className="mode-title-group">
            <h2>
              <span>🗂️</span> Thẻ Ghi Nhớ (Flashcard)
            </h2>
            <p className="mode-description">
              Nhấp vào thẻ hoặc nhấn <strong>Space / W / S / ↑ / ↓</strong> để lật nghĩa. Dùng phím <strong>A / ←</strong> và <strong>D / →</strong> để lướt từ!
            </p>
          </div>

          <div className="progress-info flashcard-progress-info">
            <div className="flashcard-top-controls">
              {onToggleFocus && (
                <button 
                  type="button" 
                  className="btn-focus" 
                  onClick={onToggleFocus}
                  title="Kích hoạt Focus Space (Không gian tập trung - Esc để thoát)"
                >
                  <Maximize2 size={14} /> Tập trung
                </button>
              )}

              <AutoReadControl defaultTab="flashcard" />

              <JumpToWord
                currentIndex={currentIndex}
                total={wordList.length}
                onJump={handleJump}
              />
            </div>

            <div className="flashcard-seekbar-row">
              <InteractiveSeekBar
                currentIndex={currentIndex}
                total={wordList.length}
                onJump={handleJump}
              />
            </div>
          </div>
        </div>
      ) : (
        <header className="focus-space-header" ref={headerRef}>
          <div className="focus-header-main-row">
            <div className="focus-header-left">
              {showWordCounter ? (
                <JumpToWord
                  currentIndex={currentIndex}
                  total={wordList.length}
                  onJump={handleJump}
                />
              ) : (
                <div className="focus-space-branding">
                  <span className="focus-space-badge">Focus Space</span>
                </div>
              )}
            </div>

            <div className="focus-header-actions">
              <button 
                type="button"
                className="btn-focus-settings" 
                onClick={() => setIsSettingsOpen(true)}
                title="Cài đặt Focus Space"
                aria-label="Cài đặt Focus Space"
              >
                <Settings size={16} />
                <span className="btn-label-desktop">Cài đặt</span>
              </button>

              {onToggleFocus && (
                <button 
                  type="button"
                  className="btn-focus-exit" 
                  onClick={onToggleFocus}
                  title="Thoát Focus Space (Esc)"
                  aria-label="Thoát Focus Space"
                >
                  <Minimize2 size={16} />
                  <span className="btn-label-desktop">Thoát (Esc)</span>
                  <span className="btn-label-mobile">Thoát</span>
                </button>
              )}
            </div>
          </div>

          {showSeekBar && (
            <div className="focus-header-seekbar-row">
              <InteractiveSeekBar
                currentIndex={currentIndex}
                total={wordList.length}
                onJump={handleJump}
              />
            </div>
          )}
        </header>
      )}

      {/* VÙNG B — FLASHCARD KHU VỰC CHÍNH (Được bảo vệ bằng Clamping an toàn) */}
      <div className="focus-space-main">
        <div 
          className={`flashcard-position-wrapper ${isFocusMode ? 'in-focus-mode' : ''} ${isZenMode ? 'is-zen-position' : ''}`}
          style={positionWrapperStyle}
          ref={cardWrapperRef}
        >
        <div 
          key={currentWord.id} 
          className={`flashcard-wrapper card-animate-swap ${cardImage ? 'has-card-image' : ''}`}
        >
        <div 
          className={`flashcard-scene ${cardImage ? 'has-card-image' : ''}`}
          onClick={handleCardClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="Nhấp vào thẻ hoặc vuốt Lên/Xuống để lật • Vuốt Trái/Phải để đổi từ"
        >
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
            {/* Mặt trước: Tiếng Anh */}
            <div className="flashcard-face flashcard-front">
              <div className="card-top">
                <span className={`badge badge-${currentWord.type || 'verb'}`}>
                  {currentWord.type || 'Từ vựng'}
                </span>

                <WordActionButtons 
                  wordItem={currentWord}
                  onSpeak={handleSpeak}
                  source={cardImage ? 'toeic' : 'oxford'}
                />
              </div>

              <div className="card-center">
                <div className="card-word">{currentWord.word}</div>
                <span className="badge badge-status">
                  Trạng thái: {currentWord.status}
                </span>
              </div>

              <div className="card-bottom">
                <RotateCw size={14} />
                <span>Chạm hoặc nhấp để lật xem nghĩa (Space / W / S / ↑ / ↓)</span>
              </div>
            </div>

            {/* Mặt sau: Nghĩa tiếng Việt, Ảnh minh họa (TOEIC) hoặc Từ loại */}
            <div className={`flashcard-face flashcard-back ${cardImage ? 'has-image-content' : ''}`}>
              <div className={`card-top ${cardImage ? 'card-top-toeic' : ''}`}>
                <span className={`badge badge-${currentWord.type || 'verb'} ${cardImage ? 'badge-toeic-tag' : ''}`}>
                  {currentWord.type || (cardImage ? 'TOEIC' : 'vocab')}
                </span>

                {/* Từ tiếng Anh được di chuyển lên hàng trên cùng (chính giữa) khi là thẻ TOEIC */}
                {cardImage && (
                  <div className="card-top-word" title={currentWord.word}>
                    {currentWord.word}
                  </div>
                )}

                <WordActionButtons 
                  wordItem={currentWord}
                  onSpeak={handleSpeak}
                  source={cardImage ? 'toeic' : 'oxford'}
                />
              </div>

              <div className={`card-center ${cardImage ? 'card-center-image' : ''}`}>
                {/* Chỉ hiển thị word ở giữa nếu không có ảnh (Oxford 3000) */}
                {!cardImage && (
                  <div className="card-original-word">{currentWord.word}</div>
                )}
                
                {/* Hiển thị ảnh minh họa nếu có (TOEIC) */}
                {cardImage ? (
                  <div className="flashcard-image-wrapper">
                    {imageLoading && !imageError && (
                      <div className="flashcard-image-skeleton">
                        <span className="skeleton-pulse">Đang tải hình ảnh...</span>
                      </div>
                    )}
                    {imageError ? (
                      <div className="flashcard-image-error">
                        <ImageOff size={28} />
                        <span>Không thể tải ảnh minh họa</span>
                      </div>
                    ) : (
                      <img 
                        src={cardImage} 
                        alt={currentWord.word} 
                        className={`flashcard-image ${imageLoading ? 'image-hidden' : 'image-loaded'}`}
                        onLoad={() => {
                          setImageLoading(false);
                          setImageError(false);
                          requestAnimationFrame(updateSafeBounds);
                        }}
                        onError={() => {
                          setImageLoading(false);
                          setImageError(true);
                          requestAnimationFrame(updateSafeBounds);
                        }}
                        loading="eager"
                        fetchPriority="high"
                      />
                    )}
                  </div>
                ) : null}

                {/* Hiển thị nghĩa text nếu có (Oxford 3000) */}
                {currentWord.meaning ? (
                  <div className="card-meaning">{currentWord.meaning}</div>
                ) : null}

                {currentWord.type && !cardImage && (
                  <span className={`badge badge-${currentWord.type}`}>
                    Từ loại: {currentWord.type}
                  </span>
                )}
              </div>

                {showCardHint && (
                  <div className={`card-bottom ${cardImage ? 'card-bottom-toeic' : ''}`}>
                    <RotateCw size={14} />
                    <span>Nhấp để quay lại từ tiếng Anh</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* VÙNG C — CÔNG CỤ HỌC (Điều hướng, Đánh giá, Tiến độ, Phím tắt) */}
      {hasAnyTools && (
        <div className="focus-space-tools" ref={toolsRef}>
          {/* Cụm nút điều hướng Flashcard (Trước, Xáo trộn, Lật nghĩa, Tiếp theo) */}
          {hasAnyNav && (
        <div className={`flashcard-controls ${!showNavShuffle && !showNavFlip ? 'is-minimal-nav' : ''}`}>
          {showNavPrevNext && (
            <button 
              type="button"
              className="btn btn-secondary btn-flashcard-prev" 
              onClick={handlePrev}
              title="Từ trước (Phím A hoặc ←)"
            >
              <ArrowLeft size={18} />
              <span className="btn-label-desktop">Trước (A / ←)</span>
              <span className="btn-label-mobile">Trước</span>
            </button>
          )}

          {showNavShuffle && (
            <button 
              type="button"
              className={`btn btn-secondary btn-flashcard-shuffle ${isShuffled ? 'is-active' : ''}`} 
              onClick={handleToggleShuffle}
              aria-pressed={isShuffled}
              title={isShuffled ? "Quay lại thứ tự ban đầu (Phím X)" : "Trộn ngẫu nhiên danh sách (Phím X)"}
            >
              <Shuffle size={18} />
              <span className="btn-label-desktop">{isShuffled ? 'Thứ tự gốc (X)' : 'Xáo trộn (X)'}</span>
              <span className="btn-label-mobile">{isShuffled ? 'Thứ tự gốc' : 'Xáo trộn'}</span>
            </button>
          )}

          {showNavFlip && (
            <button 
              type="button"
              className="btn btn-secondary btn-flashcard-flip" 
              onClick={handleFlip}
              title="Lật thẻ (Phím W, S, Space, ↑, ↓)"
            >
              <RotateCw size={18} />
              <span>{isFlipped ? 'Tiếng Anh' : 'Lật nghĩa'}</span>
            </button>
          )}

          {showNavPrevNext && (
            <button 
              type="button"
              className="btn btn-primary btn-flashcard-next" 
              onClick={handleNext}
              title="Từ tiếp theo (Phím D, Enter, →)"
            >
              <span className="btn-label-desktop">Tiếp theo (D / →)</span>
              <span className="btn-label-mobile">Tiếp theo</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* Nhóm hai nút tự đánh giá: Chưa nhớ / Đã nhớ (Căn giữa, đồng nhất độ rộng 580px với thẻ Flashcard) */}
      {showEvaluation && (
        <div className="flashcard-evaluation-section">
          <div className="flashcard-evaluation-group">
            <button
              type="button"
              className={`btn-eval btn-eval-learning ${isNotRemembered ? 'is-selected' : ''} ${!canEvaluate ? 'is-disabled' : ''}`}
              onClick={handleRateNotRemembered}
              disabled={!canEvaluate}
              title={canEvaluate ? 'Đánh dấu Chưa nhớ (Cần ôn lại)' : 'Vui lòng lật thẻ xem nghĩa trước khi tự đánh giá'}
              aria-label="Đánh dấu Chưa nhớ"
            >
              <HelpCircle size={18} />
              <span>Chưa nhớ</span>
            </button>

            <button
              type="button"
              className={`btn-eval btn-eval-mastered ${isRemembered ? 'is-selected' : ''} ${!canEvaluate ? 'is-disabled' : ''}`}
              onClick={handleRateRemembered}
              disabled={!canEvaluate}
              title={canEvaluate ? 'Đánh dấu Đã nhớ (Đã thuộc)' : 'Vui lòng lật thẻ xem nghĩa trước khi tự đánh giá'}
              aria-label="Đánh dấu Đã nhớ"
            >
              <CheckCircle2 size={18} />
              <span>Đã nhớ</span>
            </button>
          </div>

          {!canEvaluate && (
            <div className="eval-hint-guide animate-fade-in">
              <span>💡 Lật thẻ xem nghĩa để mở khóa tự đánh giá</span>
            </div>
          )}
        </div>
      )}

      {/* Panel tiến độ tự đánh giá Flashcard (Độ rộng chuẩn 580px, chữ rõ nét dễ đọc) */}
      {showProgressPanel && (
        <FlashcardProgressPanel words={wordList} />
      )}

      {/* Nút Phím tắt thu gọn ở cuối */}
      {showShortcutBtn && (
        <div className="flashcard-shortcuts-wrapper">
          <ShortcutGuideModal mode="flashcard" />
        </div>
      )}
        </div>
      )}

      {/* Modal Cài đặt Focus Space */}
      <FocusSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={focusSettings}
        onChangeSettings={handleUpdateSettings}
        onReset={handleResetSettings}
        safeBounds={safeBounds}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCw, ArrowRight, ArrowLeft, Shuffle, Maximize2, ImageOff, HelpCircle, CheckCircle2 } from 'lucide-react';
import { speakWord } from '../utils/speech';
import { isImageLoaded, isImageError, updatePreloadQueue } from '../utils/imagePreloader';
import JumpToWord from './JumpToWord';
import WordActionButtons from './WordActionButtons';
import InteractiveSeekBar from './InteractiveSeekBar';
import { triggerJumpUndo, clearJumpUndo } from '../utils/jumpUndo';
import FlashcardProgressPanel from './FlashcardProgressPanel';
import ShortcutGuideModal from './ShortcutGuideModal';

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
      setWordList(words);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasFlippedCurrentCard(false);
      clearJumpUndo();
    } else {
      // Chỉ cập nhật thuộc tính từ (như status) vào wordList mà không làm thay đổi currentIndex hay xáo trộn
      setWordList(prev => {
        const statusMap = new Map(words.map(w => [w.id, w.status]));
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

  const handleFlip = useCallback(() => {
    setHasFlippedCurrentCard(true);
    setIsFlipped(prev => !prev);
  }, []);

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

  // Logic tự đánh giá từ vựng: Chưa nhớ (Cần ôn) / Đã nhớ (Đã thuộc)
  // Chỉ mở khóa thao tác sau khi người học đã lật thẻ xem nghĩa ít nhất 1 lần cho từ hiện tại
  const canEvaluate = isFlipped || hasFlippedCurrentCard;
  const isRemembered = currentWord?.status === 'known' || currentWord?.status === 'mastered';
  const isNotRemembered = currentWord?.status === 'learning';

  const handleRateNotRemembered = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!canEvaluate || !currentWord) return;
    const newStatus = 'learning';
    setWordList(prev => prev.map((w, idx) => idx === currentIndex ? { ...w, status: newStatus } : w));
    if (onUpdateWordStatus) {
      onUpdateWordStatus(currentWord.id, newStatus);
    }
  }, [canEvaluate, currentWord, currentIndex, onUpdateWordStatus]);

  const handleRateRemembered = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!canEvaluate || !currentWord) return;
    const newStatus = 'known';
    setWordList(prev => prev.map((w, idx) => idx === currentIndex ? { ...w, status: newStatus } : w));
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

  const handleShuffle = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsFlipped(false);
    clearJumpUndo();
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    setWordList(shuffled);
    setCurrentIndex(0);
  }, [wordList]);

  // Phát âm từ vựng (gọi trực tiếp speakWord trong user gesture)
  const handleSpeak = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
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
      // Xáo trộn: X
      else if (key === 'x') {
        e.preventDefault();
        handleShuffle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFlip, handleShuffle, handleSpeak]);

  if (!wordList || wordList.length === 0) {
    return <div className="text-center py-8">Không có từ vựng nào!</div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Mode Header (Khôi phục 100% bố cục chuẩn: Tiêu đề bên trái, Công cụ & Tập trung bên phải) */}
      <div className="mode-header">
        <div className="mode-title-group">
          <h2>
            <span>🗂️</span> Thẻ Ghi Nhớ (Flashcard)
          </h2>
          <p className="mode-description">
            Nhấp vào thẻ hoặc nhấn <strong>Space / W / S / ↑ / ↓</strong> để lật nghĩa. Dùng phím <strong>A / ←</strong> và <strong>D / →</strong> để lướt từ!
          </p>
        </div>

        <div className="progress-info">
          {onToggleFocus && !isFocusMode && (
            <button 
              className="btn-focus" 
              onClick={onToggleFocus}
              title="Kích hoạt chế độ tập trung (Esc để thoát)"
            >
              <Maximize2 size={14} /> Tập trung
            </button>
          )}

          <JumpToWord
            currentIndex={currentIndex}
            total={wordList.length}
            onJump={handleJump}
          />
          <InteractiveSeekBar
            currentIndex={currentIndex}
            total={wordList.length}
            onJump={handleJump}
          />
        </div>
      </div>

      {/* 3D Flashcard Container: Khôi phục toàn bộ perspective, transition 3D và animation trượt khi chuyển thẻ */}
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
                        }}
                        onError={() => {
                          setImageLoading(false);
                          setImageError(true);
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

              <div className={`card-bottom ${cardImage ? 'card-bottom-toeic' : ''}`}>
                <RotateCw size={14} />
                <span>Nhấp để quay lại từ tiếng Anh</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cụm nút điều hướng Flashcard (Trước, Xáo trộn, Lật nghĩa, Tiếp theo) */}
      <div className="flashcard-controls">
        <button 
          type="button"
          className="btn btn-secondary" 
          onClick={handlePrev}
          title="Từ trước (Phím A hoặc ←)"
        >
          <ArrowLeft size={18} /> Trước (A / ←)
        </button>

        <button 
          type="button"
          className="btn btn-secondary" 
          onClick={handleShuffle}
          title="Trộn ngẫu nhiên danh sách (Phím X)"
        >
          <Shuffle size={18} /> Xáo trộn (X)
        </button>

        <button 
          type="button"
          className="btn btn-secondary" 
          onClick={handleFlip}
          title="Lật thẻ (Phím W, S, Space, ↑, ↓)"
        >
          <RotateCw size={18} /> {isFlipped ? 'Tiếng Anh' : 'Lật nghĩa'}
        </button>

        <button 
          type="button"
          className="btn btn-primary" 
          onClick={handleNext}
          title="Từ tiếp theo (Phím D, Enter, →)"
        >
          Tiếp theo <ArrowRight size={18} />
        </button>
      </div>

      {/* Nhóm hai nút tự đánh giá: Chưa nhớ / Đã nhớ (Căn giữa, đồng nhất độ rộng 580px với thẻ Flashcard) */}
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

      {/* Panel tiến độ tự đánh giá Flashcard (Độ rộng chuẩn 580px, chữ rõ nét dễ đọc) */}
      <FlashcardProgressPanel words={wordList} />

      {/* Nút Phím tắt thu gọn ở cuối */}
      <div className="flashcard-shortcuts-wrapper">
        <ShortcutGuideModal mode="flashcard" />
      </div>
    </div>
  );
}

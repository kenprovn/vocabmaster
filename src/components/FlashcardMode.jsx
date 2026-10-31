import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, RotateCw, ArrowRight, ArrowLeft, Shuffle, Maximize2 } from 'lucide-react';
import { speakWord } from '../utils/speech';
import JumpToWord from './JumpToWord';

export default function FlashcardMode({ words, onToggleFocus, isFocusMode }) {
  const [wordList, setWordList] = useState(words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Ref theo dõi tọa độ cảm ứng để nhận diện thao tác vuốt (Swipe)
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const hasSwipedRef = useRef(false);

  // Sync if words prop updates (e.g. Unit switched)
  useEffect(() => {
    setWordList(words);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [words]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleJump = useCallback((newIndex) => {
    setIsFlipped(false);
    setCurrentIndex(newIndex);
  }, []);

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

  // Click vào thẻ: Chỉ lật thẻ khi KHÔNG phải là thao tác vuốt
  const handleCardClick = (e) => {
    if (hasSwipedRef.current) {
      hasSwipedRef.current = false;
      return;
    }
    handleFlip();
  };

  const handleShuffle = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsFlipped(false);
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    setWordList(shuffled);
    setCurrentIndex(0);
  }, [wordList]);

  if (!wordList || wordList.length === 0) {
    return <div className="text-center py-8">Không có từ vựng nào!</div>;
  }

  const currentWord = wordList[currentIndex] || wordList[0];

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

  const progressPercent = Math.round(((currentIndex + 1) / wordList.length) * 100);

  return (
    <div className="animate-fade-in">
      {/* Mode Header */}
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
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3D Flashcard Container (Hỗ trợ cảm ứng vuốt Trái/Phải để đổi từ, vuốt Lên/Xuống để lật thẻ) */}
      <div 
        key={currentWord.id}
        className="flashcard-scene card-animate-swap"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="Nhấp vào thẻ hoặc vuốt Lên/Xuống để lật • Vuốt Trái/Phải để đổi từ"
      >
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
          {/* Front Face: English */}
          <div className="flashcard-face flashcard-front">
            <div className="card-top">
              <span className={`badge badge-${currentWord.type || 'verb'}`}>
                {currentWord.type}
              </span>
              <button 
                className="sound-btn" 
                onClick={handleSpeak}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                title="Nghe phát âm (Phím R)"
              >
                <Volume2 size={18} />
              </button>
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

          {/* Back Face: Vietnamese Meaning */}
          <div className="flashcard-face flashcard-back">
            <div className="card-top">
              <span className={`badge badge-${currentWord.type || 'verb'}`}>
                {currentWord.type}
              </span>
              <button 
                className="sound-btn" 
                onClick={handleSpeak}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                title="Nghe phát âm (Phím R)"
              >
                <Volume2 size={18} />
              </button>
            </div>

            <div className="card-center">
              <div className="card-original-word">{currentWord.word}</div>
              <div className="card-meaning">{currentWord.meaning}</div>
              <span className={`badge badge-${currentWord.type || 'verb'}`}>
                Từ loại: {currentWord.type}
              </span>
            </div>

            <div className="card-bottom">
              <RotateCw size={14} />
              <span>Nhấp để quay lại từ tiếng Anh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flashcard Action Buttons */}
      <div className="flashcard-controls">
        <button 
          className="btn btn-secondary" 
          onClick={handlePrev}
          title="Từ trước (Phím A hoặc ←)"
        >
          <ArrowLeft size={18} /> Trước (A / ←)
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={handleShuffle}
          title="Trộn ngẫu nhiên danh sách (Phím X)"
        >
          <Shuffle size={18} /> Xáo trộn (X)
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={handleFlip}
          title="Lật thẻ (Phím W, S, Space, ↑, ↓)"
        >
          <RotateCw size={18} /> {isFlipped ? 'Tiếng Anh' : 'Lật nghĩa'}
        </button>

        <button 
          className="btn btn-primary" 
          onClick={handleNext}
          title="Từ tiếp theo (Phím D, Enter, →)"
        >
          Tiếp theo <ArrowRight size={18} />
        </button>
      </div>

      {/* Mẹo phím tắt phong cách gamer & arrow keys */}
      <div className="shortcut-helper" style={{ marginTop: '22px', flexWrap: 'wrap', gap: '8px' }}>
        <span>Mẹo phím tắt:</span>
        <span className="shortcut-kbd">A</span> / <span className="shortcut-kbd">←</span><span>Trước</span>
        <span>•</span>
        <span className="shortcut-kbd">D</span> / <span className="shortcut-kbd">→</span> / <span className="shortcut-kbd">Enter ↵</span><span>Tiếp</span>
        <span>•</span>
        <span className="shortcut-kbd">W</span> / <span className="shortcut-kbd">S</span> / <span className="shortcut-kbd">Space</span> / <span className="shortcut-kbd">↑</span> / <span className="shortcut-kbd">↓</span><span>Lật</span>
        <span>•</span>
        <span className="shortcut-kbd">R</span><span>Đọc</span>
        <span>•</span>
        <span className="shortcut-kbd">X</span><span>Xáo trộn</span>
      </div>
    </div>
  );
}

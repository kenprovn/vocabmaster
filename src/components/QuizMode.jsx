import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Award, Flame, CornerDownLeft, Maximize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../utils/speech';
import JumpToWord from './JumpToWord';

export default function QuizMode({ words, onToggleFocus, isFocusMode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [options, setOptions] = useState([]);

  // Ref theo dõi thao tác vuốt (Swipe) trên Mobile
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // Generate 4 options (1 correct, 3 distractors) for current word
  const generateOptions = useCallback((currentWord, allWords) => {
    if (!currentWord || !allWords || allWords.length === 0) return [];

    const isImageMode = !currentWord.meaning && (currentWord.image || currentWord.imageUrl);
    const correctAnswer = isImageMode ? currentWord.word : currentWord.meaning;
    
    // Filter distractors that have different text
    const otherWords = allWords.filter(w => {
      const val = isImageMode ? w.word : w.meaning;
      return w.id !== currentWord.id && val !== correctAnswer;
    });
    
    // Shuffle distractors and pick 3
    const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5);
    const chosenDistractors = shuffledOthers.slice(0, 3).map(w => isImageMode ? w.word : w.meaning);

    // Combine and shuffle
    const combined = [
      { text: correctAnswer, isCorrect: true },
      ...chosenDistractors.map(text => ({ text, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    // Map labels A, B, C, D and key 1, 2, 3, 4
    const keyLabels = ['1', '2', '3', '4'];
    const letterLabels = ['A', 'B', 'C', 'D'];

    return combined.map((item, idx) => ({
      ...item,
      key: keyLabels[idx],
      letter: letterLabels[idx]
    }));
  }, []);

  // Reset currentIndex when words array changes (e.g. Unit switched)
  useEffect(() => {
    setCurrentIndex(0);
  }, [words]);

  // Update options whenever currentIndex or words changes
  useEffect(() => {
    if (words && words.length > 0) {
      const currentWord = words[currentIndex] || words[0];
      setOptions(generateOptions(currentWord, words));
      setSelectedOptionIndex(null);
      setIsAnswered(false);
    }
  }, [currentIndex, words, generateOptions]);

  // Handle selecting an option
  const handleSelectOption = useCallback((optionIndex) => {
    if (isAnswered || !options[optionIndex]) return;

    const chosen = options[optionIndex];
    setSelectedOptionIndex(optionIndex);
    setIsAnswered(true);

    if (chosen.isCorrect) {
      setScore(s => s + 10);
      setStreak(st => {
        const newStreak = st + 1;
        if (newStreak % 3 === 0) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        }
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  }, [isAnswered, options]);

  // Go to next word
  const handleNextWord = useCallback(() => {
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setCurrentIndex(prev => (prev + 1) % words.length);
  }, [words.length]);

  // Go to previous word
  const handlePrevWord = useCallback(() => {
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setCurrentIndex(prev => (prev - 1 + words.length) % words.length);
  }, [words.length]);

  // Jump to specific word index
  const handleJump = useCallback((newIndex) => {
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setCurrentIndex(newIndex);
  }, []);

  // Touch Gesture Handlers cho Mobile (Swipe Left: Câu tiếp, Swipe Right: Câu trước)
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
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

    // Ngưỡng 50px và góc ngang vượt trội hơn góc dọc
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Vuốt sang TRÁI (Swipe Left): Câu tiếp theo
        handleNextWord();
      } else {
        // Vuốt sang PHẢI (Swipe Right): Câu trước đó
        handlePrevWord();
      }
    }
  };

  const currentWord = (words && words.length > 0) ? (words[currentIndex] || words[0]) : null;
  const isImageMode = Boolean(currentWord && !currentWord.meaning && (currentWord.image || currentWord.imageUrl));

  const handleSpeak = useCallback(() => {
    if (currentWord && currentWord.word) {
      speakWord(currentWord.word, { id: currentWord.id, type: currentWord.type });
    }
  }, [currentWord]);

  // Keyboard shortcut listener:
  // - 1, 2, 3, 4: chọn đáp án (khi chưa trả lời)
  // - A, ArrowLeft: quay lại câu trước đó
  // - D, Enter, ArrowRight: chuyển sang câu tiếp theo (hoặc bỏ qua)
  // - R: phát âm từ vựng
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua nếu đang gõ trong input, textarea, select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();

      // Phím 1, 2, 3, 4 chọn đáp án khi chưa trả lời
      if (!isAnswered) {
        let optionIdx = -1;
        if (key === '1' || e.code === 'Numpad1') optionIdx = 0;
        else if (key === '2' || e.code === 'Numpad2') optionIdx = 1;
        else if (key === '3' || e.code === 'Numpad3') optionIdx = 2;
        else if (key === '4' || e.code === 'Numpad4') optionIdx = 3;

        if (optionIdx >= 0) {
          e.preventDefault();
          handleSelectOption(optionIdx);
          return;
        }
      }

      // Phím A hoặc ArrowLeft: câu trước
      if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevWord();
      }
      // Phím D, Enter hoặc ArrowRight: câu tiếp theo
      else if (key === 'd' || key === 'enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextWord();
      }
      // Phím R: phát âm
      else if (key === 'r') {
        e.preventDefault();
        handleSpeak();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, handleSelectOption, handleNextWord, handlePrevWord, handleSpeak]);

  if (!words || words.length === 0 || !currentWord) {
    return <div>Không có từ vựng nào!</div>;
  }

  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="animate-fade-in">
      {/* Mode Header */}
      <div className="mode-header">
        <div className="mode-title-group">
          <h2>
            <span>🎯</span> Trắc Nghiệm Nhanh (Quiz)
          </h2>
          <p className="mode-description">
            Nhấn phím <strong>1, 2, 3, 4</strong> để chọn. Dùng phím <strong>A / ←</strong> và <strong>D / Enter / →</strong> để điều hướng!
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

          <div className="stats-badge" title="Chuỗi trả lời đúng">
            <Flame size={16} color="#f59e0b" />
            <span>Chuỗi: {streak}</span>
          </div>

          <div className="stats-badge" title="Tổng điểm">
            <Award size={16} color="#818cf8" />
            <span>{score} điểm</span>
          </div>

          <JumpToWord
            currentIndex={currentIndex}
            total={words.length}
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

      {/* Main Quiz Box (Hỗ trợ cảm ứng vuốt trái/phải trên Mobile) */}
      <div 
        key={currentWord.id} 
        className="glass-panel quiz-card card-animate-swap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Word Prompt */}
        <div className="quiz-prompt">
          <div className={`quiz-badge-row ${isImageMode ? 'has-sound' : ''}`}>
            <span className={`badge badge-${currentWord.type || 'verb'}`}>
              {currentWord.type || (isImageMode ? 'TOEIC' : 'verb')}
            </span>

            {/* Nút loa phát âm cho TOEIC (đọc từ tiếng Anh của ảnh mà không lộ text đáp án) */}
            {isImageMode && (
              <button 
                type="button"
                className="sound-btn" 
                onClick={(e) => {
                  if (e && e.stopPropagation) e.stopPropagation();
                  handleSpeak();
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                title="Nghe phát âm (Phím R)"
                aria-label="Nghe phát âm tiếng Anh"
              >
                <Volume2 size={18} />
              </button>
            )}
          </div>

          {isImageMode ? (
            <div className="quiz-image-prompt">
              <img 
                src={currentWord.image || currentWord.imageUrl} 
                alt="TOEIC prompt" 
                className="quiz-prompt-img"
              />
            </div>
          ) : (
            <div className="quiz-word">
              {currentWord.word}
              <button 
                type="button"
                className="sound-btn" 
                onClick={(e) => {
                  if (e && e.stopPropagation) e.stopPropagation();
                  handleSpeak();
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                title="Nghe phát âm (Phím R)"
                aria-label="Nghe phát âm tiếng Anh"
              >
                <Volume2 size={20} />
              </button>
            </div>
          )}

          <p className="quiz-hint-text">
            {isImageMode 
              ? 'Từ tiếng Anh nào tương ứng với hình ảnh minh họa trên?' 
              : 'Nghĩa tiếng Việt của từ này là gì?'}
          </p>
        </div>

        {/* 4 Choices Grid */}
        <div className="quiz-options-grid">
          {options.map((option, idx) => {
            const isSelected = selectedOptionIndex === idx;
            let statusClass = '';

            if (isAnswered) {
              if (option.isCorrect) {
                // Luôn highlight đáp án đúng màu xanh
                statusClass = 'correct';
              } else if (isSelected && !option.isCorrect) {
                // Highlight đáp án đã chọn sai màu đỏ
                statusClass = 'wrong';
              }
            }

            return (
              <button
                key={idx}
                className={`quiz-option-btn ${statusClass}`}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswered}
                id={`quiz-option-${idx + 1}`}
              >
                <div className="quiz-key-indicator">
                  {option.key}
                </div>
                <div className="quiz-option-text">
                  {option.text}
                </div>
                {isAnswered && option.isCorrect && (
                  <CheckCircle2 size={20} color="#10b981" />
                )}
                {isAnswered && isSelected && !option.isCorrect && (
                  <XCircle size={20} color="#f43f5e" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Bar when answered */}
        {isAnswered && (
          <div 
            className={`quiz-feedback-bar ${
              options[selectedOptionIndex]?.isCorrect ? 'feedback-correct' : 'feedback-wrong'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {options[selectedOptionIndex]?.isCorrect ? (
                <>
                  <CheckCircle2 size={20} />
                  <strong>Chính xác! Rất tuyệt vời! 🎉</strong>
                </>
              ) : (
                <>
                  <XCircle size={20} />
                  <span>
                    Chưa đúng rồi! Đáp án đúng: <strong>{currentWord.meaning}</strong>
                  </span>
                </>
              )}
            </div>

            <button 
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              onClick={handleNextWord}
              title="Nhấn D, Enter hoặc → để sang câu kế tiếp"
            >
              Tiếp theo (D/Enter/→) <CornerDownLeft size={15} />
            </button>
          </div>
        )}

        {/* Navigation Controls Row (Trước đó & Tiếp theo) */}
        <div className="quiz-controls-row">
          <button
            className="btn btn-secondary"
            onClick={handlePrevWord}
            title="Quay lại câu trước (Phím A hoặc ←)"
          >
            <ArrowLeft size={16} /> Câu trước (A / ←)
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleNextWord}
            title="Câu tiếp theo hoặc bỏ qua (Phím D, Enter hoặc →)"
          >
            {isAnswered ? 'Câu kế tiếp (D/Enter/→)' : 'Bỏ qua (D/→)'} <ArrowRight size={16} />
          </button>
        </div>

        {/* Keyboard shortcut guide */}
        <div className="shortcut-helper" style={{ marginTop: '22px', flexWrap: 'wrap', gap: '8px' }}>
          <span>Mẹo phím tắt:</span>
          <span className="shortcut-kbd">1</span>-<span className="shortcut-kbd">4</span><span>Chọn</span>
          <span>•</span>
          <span className="shortcut-kbd">A</span> / <span className="shortcut-kbd">←</span><span>Trước</span>
          <span>•</span>
          <span className="shortcut-kbd">D</span> / <span className="shortcut-kbd">Enter ↵</span> / <span className="shortcut-kbd">→</span><span>Tiếp</span>
          <span>•</span>
          <span className="shortcut-kbd">R</span><span>Đọc</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Lightbulb, CheckCircle2, XCircle, ArrowRight, ArrowLeft, CornerDownLeft, Maximize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../utils/speech';
import JumpToWord from './JumpToWord';

export default function TypingMode({ words, onToggleFocus, isFocusMode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [hintCount, setHintCount] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'correct' | 'wrong'
  const [streak, setStreak] = useState(0);
  const inputRef = useRef(null);

  if (!words || words.length === 0) {
    return <div>Không có từ vựng nào!</div>;
  }

  const currentWord = words[currentIndex] || words[0];
  const targetMeaning = currentWord ? currentWord.meaning : '';

  // Reset index when words changes (e.g. Unit switched)
  useEffect(() => {
    setCurrentIndex(0);
  }, [words]);

  // Reset state when word changes and focus input
  useEffect(() => {
    setInputValue('');
    setHintCount(0);
    setStatus('idle');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex]);

  // Handle Hint: reveals 1 character at a time directly into input
  const handleHint = useCallback(() => {
    if (hintCount < targetMeaning.length) {
      const nextCount = hintCount + 1;
      setHintCount(nextCount);
      const revealed = targetMeaning.slice(0, nextCount);
      setInputValue(revealed);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [hintCount, targetMeaning]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % words.length);
  }, [words.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + words.length) % words.length);
  }, [words.length]);

  const handleJump = useCallback((newIndex) => {
    setCurrentIndex(newIndex);
  }, []);

  // Phím tắt bàn phím:
  // - ArrowUp / ArrowDown: Gọi chức năng Gợi ý / Hint (hoạt động ngay cả khi đang trong ô input)
  // - Ctrl + ArrowLeft: Quay lại câu trước
  // - Ctrl + ArrowRight: Chuyển sang câu tiếp theo
  // - Khi ô input KHÔNG focus: ArrowLeft / ArrowRight trơn cũng chuyển câu
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua nếu đang gõ trong input khác ngoài typing input (ví dụ JumpToWord)
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && e.target !== inputRef.current) {
        return;
      }

      const isInputFocused = e.target === inputRef.current || document.activeElement === inputRef.current;

      // Phím mũi tên lên / xuống: Gợi ý (Hint)
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleHint();
        return;
      }

      // Chuyển câu: Ctrl + ArrowLeft hoặc ArrowLeft khi không focus input
      if ((e.ctrlKey && e.key === 'ArrowLeft') || (!isInputFocused && e.key === 'ArrowLeft')) {
        e.preventDefault();
        handlePrev();
        return;
      }

      // Chuyển câu: Ctrl + ArrowRight hoặc ArrowRight khi không focus input
      if ((e.ctrlKey && e.key === 'ArrowRight') || (!isInputFocused && e.key === 'ArrowRight')) {
        e.preventDefault();
        handleNext();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHint, handlePrev, handleNext]);

  // Check answer correctness
  const checkAnswer = () => {
    if (!inputValue.trim()) return;

    const normalizedInput = inputValue.trim().toLowerCase();
    const fullMeaning = targetMeaning.trim().toLowerCase();
    
    // Check exact match or match any comma-separated synonym (e.g. "từ bỏ, bỏ rơi")
    const synonyms = fullMeaning.split(',').map(s => s.trim().toLowerCase());
    const isMatch = (normalizedInput === fullMeaning) || synonyms.includes(normalizedInput);

    if (isMatch) {
      setStatus('correct');
      setStreak(s => {
        const next = s + 1;
        if (next % 3 === 0) {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 }
          });
        }
        return next;
      });
    } else {
      setStatus('wrong');
      setStreak(0);
    }
  };

  // Form submission (Enter key)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (status === 'correct') {
      handleNext();
    } else {
      checkAnswer();
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mode-header">
        <div className="mode-title-group">
          <h2>
            <span>⌨️</span> Gõ Đáp Án (Typing & Hint)
          </h2>
          <p className="mode-description">
            Gõ nghĩa tiếng Việt. Bấm <strong>"Gợi ý" (hoặc phím ↑ / ↓)</strong> để hé lộ ký tự!
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

      {/* Main Typing Card */}
      <div key={currentWord.id} className="glass-panel typing-card card-animate-swap">
        {/* Word Prompt */}
        <div className="typing-prompt">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className={`badge badge-${currentWord.type || 'verb'}`}>
              {currentWord.type}
            </span>
            <span className="badge badge-status">
              {currentWord.status}
            </span>
          </div>

          <div className="typing-word">
            {currentWord.word}
            <button 
              className="sound-btn" 
              onClick={(e) => {
                if (e && e.stopPropagation) e.stopPropagation();
                if (currentWord) speakWord(currentWord.word, { id: currentWord.id, type: currentWord.type });
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              title="Nghe phát âm"
            >
              <Volume2 size={20} />
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
            Gõ nghĩa tiếng Việt tương ứng:
          </p>
        </div>

        {/* Visual Hint Box showing masked / revealed letters */}
        {hintCount > 0 && (
          <div className="hint-box">
            <Lightbulb size={18} />
            <span>Gợi ý: </span>
            <span className="hint-letters">
              {targetMeaning.split('').map((char, index) => {
                if (index < hintCount) return char;
                return char === ' ' ? '  ' : '_ ';
              }).join('')}
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              ({hintCount}/{targetMeaning.length} ký tự)
            </span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="typing-form">
          <div className="typing-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className={`typing-input ${
                status === 'correct' ? 'is-correct' : status === 'wrong' ? 'is-wrong' : ''
              }`}
              placeholder="Nhập nghĩa tiếng Việt rồi nhấn Enter..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (status === 'wrong') setStatus('idle');
              }}
              autoFocus
            />
          </div>

          {/* Action Row */}
          <div className="typing-action-row">
            <button
              type="button"
              className="btn btn-hint"
              onClick={handleHint}
              disabled={hintCount >= targetMeaning.length || status === 'correct'}
              title="Hé lộ từng ký tự tiếp theo (Phím ↑ hoặc ↓)"
            >
              <Lightbulb size={18} />
              Gợi ý (↑ / ↓)
              {hintCount > 0 && ` (${hintCount})`}
            </button>

            <div className="btn-group">
              {status === 'correct' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                >
                  Từ tiếp theo <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!inputValue.trim()}
                >
                  Kiểm tra <CornerDownLeft size={16} />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Result Feedback Banner */}
        {status === 'correct' && (
          <div className="quiz-feedback-bar feedback-correct" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} />
              <span>
                <strong>Chính xác!</strong> Nghĩa: <em>{targetMeaning}</em>
              </span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              onClick={handleNext}
            >
              Tiếp tục (Enter) ↵
            </button>
          </div>
        )}

        {status === 'wrong' && (
          <div className="quiz-feedback-bar feedback-wrong" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={20} />
              <span>Chưa chính xác! Thử lại hoặc bấm <strong>"Gợi ý" (↑ / ↓)</strong> nhé.</span>
            </div>
          </div>
        )}

        {/* Bổ sung nút điều hướng UI cho chế độ Gõ đáp án */}
        <div 
          className="quiz-controls-row" 
          style={{ 
            marginTop: '24px', 
            paddingTop: '18px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)' 
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrev}
            title="Quay lại câu trước đó (Ctrl + ←)"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleNext}
            title="Chuyển sang câu tiếp theo (Ctrl + →)"
          >
            Tiếp theo <ArrowRight size={16} />
          </button>
        </div>

        {/* Mẹo phím tắt */}
        <div className="shortcut-helper" style={{ marginTop: '18px', flexWrap: 'wrap', gap: '8px' }}>
          <span>Mẹo phím tắt:</span>
          <span className="shortcut-kbd">Enter ↵</span><span>Kiểm tra / Tiếp</span>
          <span>•</span>
          <span className="shortcut-kbd">↑</span> / <span className="shortcut-kbd">↓</span><span>Gợi ý (Hint)</span>
          <span>•</span>
          <span className="shortcut-kbd">Ctrl + ←</span> / <span className="shortcut-kbd">Ctrl + →</span><span>Chuyển câu</span>
        </div>
      </div>
    </div>
  );
}

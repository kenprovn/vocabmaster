import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lightbulb, CheckCircle2, XCircle, ArrowRight, ArrowLeft, CornerDownLeft, Maximize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../utils/speech';
import JumpToWord from './JumpToWord';
import WordActionButtons from './WordActionButtons';
import AutoNextControl from './AutoNextControl';
import AutoNextCountdownBar from './AutoNextCountdownBar';
import InteractiveSeekBar from './InteractiveSeekBar';
import { useAutoNextTimer } from '../hooks/useAutoNextTimer';
import { triggerJumpUndo, clearJumpUndo } from '../utils/jumpUndo';
import SessionStatsPanel from './SessionStatsPanel';
import { getSessionStats, saveSessionStats, clearSessionStats } from '../utils/sessionStats';
import ShortcutGuideModal from './ShortcutGuideModal';

export default function TypingMode({ words, onToggleFocus, isFocusMode, selectedUnit = 'Tất cả' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [hintCount, setHintCount] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'correct' | 'wrong'
  const [streak, setStreak] = useState(0);
  const inputRef = useRef(null);

  // Thống kê phiên luyện tập Typing
  const [sessionStats, setSessionStats] = useState(() => getSessionStats('typing', selectedUnit));
  const hasGradedThisSubmissionRef = useRef(false);
  const lastGradedInputRef = useRef('');

  // Đồng bộ lại thống kê phiên khi đổi bộ từ / vòng học
  useEffect(() => {
    setSessionStats(getSessionStats('typing', selectedUnit));
    hasGradedThisSubmissionRef.current = false;
    lastGradedInputRef.current = '';
  }, [selectedUnit]);

  const currentWord = (words && words.length > 0) ? (words[currentIndex] || words[0]) : null;
  const isImageTyping = !currentWord?.meaning && !!(currentWord?.image || currentWord?.imageUrl);
  const targetMeaning = isImageTyping ? (currentWord?.word || '') : (currentWord ? currentWord.meaning : '');

  const handleSpeak = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (currentWord && currentWord.word) {
      speakWord(currentWord.word, { id: currentWord.id, type: currentWord.type });
    }
  }, [currentWord]);

  // Reset index when words changes (e.g. Unit switched)
  useEffect(() => {
    setCurrentIndex(0);
    clearJumpUndo();
  }, [words]);

  // Reset state when word changes and focus input
  useEffect(() => {
    setInputValue('');
    setHintCount(0);
    setStatus('idle');
    hasGradedThisSubmissionRef.current = false;
    lastGradedInputRef.current = '';
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % words.length);
  }, [words.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + words.length) % words.length);
  }, [words.length]);

  const handleJump = useCallback((newIndex) => {
    if (newIndex === currentIndex) return;
    const prevIdx = currentIndex;
    triggerJumpUndo({
      fromIndex: prevIdx,
      toIndex: newIndex,
      total: words.length,
      onUndo: (targetIdx) => {
        setCurrentIndex(targetIdx);
      }
    });
    setCurrentIndex(newIndex);
  }, [currentIndex, words.length]);

  const isTypingFinished = status === 'correct' || status === 'wrong';
  const isTypingCorrect = status === 'correct';

  const {
    isCounting,
    progressPercent: autoNextProgress,
    cancelCountdown,
    settings: autoNextSettings,
  } = useAutoNextTimer({
    isTriggered: isTypingFinished,
    isCorrect: isTypingCorrect,
    currentIndex,
    totalCount: words.length,
    onNext: handleNext,
  });

  // Handle Hint: reveals 1 character at a time directly into input
  const handleHint = useCallback(() => {
    cancelCountdown();
    if (hintCount < targetMeaning.length) {
      const nextCount = hintCount + 1;
      setHintCount(nextCount);
      const revealed = targetMeaning.slice(0, nextCount);
      setInputValue(revealed);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [cancelCountdown, hintCount, targetMeaning]);

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

      // Phím R: phát âm khi không focus trong ô nhập liệu (tránh xung đột khi người dùng gõ chữ r)
      if (!isInputFocused && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleSpeak();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHint, handlePrev, handleNext, handleSpeak]);

  // Check answer correctness
  const checkAnswer = () => {
    if (!inputValue.trim()) return;

    const normalizedInput = inputValue.trim().toLowerCase();
    const fullMeaning = targetMeaning.trim().toLowerCase();
    
    // Check exact match or match any comma-separated synonym (e.g. "từ bỏ, bỏ rơi")
    const synonyms = fullMeaning.split(',').map(s => s.trim().toLowerCase());
    const isMatch = (normalizedInput === fullMeaning) || synonyms.includes(normalizedInput);

    // Chống cộng trùng: Chỉ tính lượt chấm nếu là câu mới hoặc nội dung đã sửa đổi khác lần chấm trước
    const isNewAttempt = !hasGradedThisSubmissionRef.current || normalizedInput !== lastGradedInputRef.current;

    if (isMatch) {
      setStatus('correct');
      if (isNewAttempt) {
        hasGradedThisSubmissionRef.current = true;
        lastGradedInputRef.current = normalizedInput;
        setSessionStats(prev => {
          const next = { ...prev, correct: prev.correct + 1 };
          saveSessionStats('typing', selectedUnit, next);
          return next;
        });
      }
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
      if (isNewAttempt) {
        hasGradedThisSubmissionRef.current = true;
        lastGradedInputRef.current = normalizedInput;
        setSessionStats(prev => {
          const next = { ...prev, wrong: prev.wrong + 1 };
          saveSessionStats('typing', selectedUnit, next);
          return next;
        });
      }
      setStreak(0);
    }
  };

  const handleResetSessionStats = useCallback(() => {
    clearSessionStats('typing', selectedUnit);
    setSessionStats({ correct: 0, wrong: 0 });
    hasGradedThisSubmissionRef.current = false;
    lastGradedInputRef.current = '';
  }, [selectedUnit]);

  // Form submission (Enter key)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (status === 'correct') {
      handleNext();
    } else {
      checkAnswer();
    }
  };

  if (!words || words.length === 0 || !currentWord) {
    return <div>Không có từ vựng nào!</div>;
  }

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
          {/* Hàng 1: Nút tập trung (nếu có) */}
          <div className="progress-stats-group">
            {onToggleFocus && !isFocusMode && (
              <button 
                className="btn-focus" 
                onClick={onToggleFocus}
                title="Kích hoạt chế độ tập trung (Esc để thoát)"
              >
                <Maximize2 size={14} /> Tập trung
              </button>
            )}
          </div>

          {/* Hàng 2: Điều khiển chuyển câu & tiến độ */}
          <div className="progress-controls-group">
            <AutoNextControl />

            <div className="progress-nav-tools">
              <JumpToWord
                currentIndex={currentIndex}
                total={words.length}
                onJump={handleJump}
              />
              <InteractiveSeekBar
                currentIndex={currentIndex}
                total={words.length}
                onJump={handleJump}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Typing Card */}
      <div key={currentWord.id} className="glass-panel typing-card card-animate-swap">
        {/* Word Prompt */}
        <div className="typing-prompt">
          <div className={`typing-badge-row ${isImageTyping ? 'has-sound' : ''}`}>
            <div className="typing-badge-group">
              <span className={`badge badge-${currentWord.type || 'verb'}`}>
                {currentWord.type || (isImageTyping ? 'TOEIC' : 'verb')}
              </span>
              <span className="badge badge-status">
                {currentWord.status}
              </span>
            </div>

            {/* Nút thao tác âm thanh / copy / bookmark (chỉ hiện copy & bookmark sau khi đã trả lời hoặc mở hết gợi ý) */}
            {isImageTyping && (
              <WordActionButtons
                wordItem={currentWord}
                onSpeak={handleSpeak}
                source="toeic"
                showSpeaker={true}
                showCopy={status === 'correct' || (hintCount > 0 && hintCount >= targetMeaning.length)}
                showBookmark={status === 'correct' || (hintCount > 0 && hintCount >= targetMeaning.length)}
                size={18}
              />
            )}
          </div>

          {isImageTyping ? (
            <div className="typing-image-prompt">
              <img 
                src={currentWord.image || currentWord.imageUrl} 
                alt="Typing prompt" 
                className="typing-prompt-img"
              />
            </div>
          ) : (
            <div className="typing-word">
              <span>{currentWord.word}</span>
              <WordActionButtons
                wordItem={currentWord}
                onSpeak={handleSpeak}
                source="oxford"
                showSpeaker={true}
                showCopy={status === 'correct' || (hintCount > 0 && hintCount >= targetMeaning.length)}
                showBookmark={status === 'correct' || (hintCount > 0 && hintCount >= targetMeaning.length)}
                size={18}
              />
            </div>
          )}

          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {isImageTyping ? 'Nhìn hình ảnh và gõ từ tiếng Anh tương ứng:' : 'Gõ nghĩa tiếng Việt tương ứng:'}
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
                cancelCountdown();
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

        {/* Auto Next Countdown Bar */}
        <AutoNextCountdownBar
          isCounting={isCounting}
          progressPercent={autoNextProgress}
          duration={autoNextSettings.delay}
          isCorrect={isTypingCorrect}
          onCancel={cancelCountdown}
        />

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

        {/* Nút Phím tắt thu gọn */}
        <div className="mode-shortcuts-wrapper">
          <ShortcutGuideModal mode="typing" />
        </div>
      </div>

      {/* Bảng thống kê phiên luyện tập */}
      <SessionStatsPanel
        correct={sessionStats.correct}
        wrong={sessionStats.wrong}
        onReset={handleResetSessionStats}
        modeName="Gõ đáp án"
        unitName={selectedUnit}
        maxWidth="620px"
      />
    </div>
  );
}

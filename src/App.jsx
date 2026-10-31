import React, { useState, useEffect, useMemo } from 'react';
import vong1Data from '../unit/Oxford_3000_Vong_1_516_tu.json';
import vong2Data from '../unit/Oxford_3000_Vong_2_754_tu.json';
import vong3Data from '../unit/Oxford_3000_Vong_3_748_tu.json';
import vong4Data from '../unit/Oxford_3000_Vong_4_282_tu.json';
import vong5Data from '../unit/Oxford_3000_Vong_5_678_tu.json';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import TypingMode from './components/TypingMode';
import WordListMode from './components/WordListMode';
import AudioToast from './components/AudioToast';
import { Layers, HelpCircle, Keyboard, BookOpen, GraduationCap, Clock, Award, Minimize2, RotateCcw } from 'lucide-react';
import './App.css';

const STORAGE_KEY = 'myVocabData';

// Gộp toàn bộ 5 Vòng thành mảng 2978 từ mặc định
const defaultWordsData = [
  ...vong1Data,
  ...vong2Data,
  ...vong3Data,
  ...vong4Data,
  ...vong5Data
];

export const UNIT_OPTIONS = [
  'Tất cả',
  'Vòng 1',
  'Vòng 2',
  'Vòng 3',
  'Vòng 4',
  'Vòng 5'
];

export default function App() {
  const [activeMode, setActiveMode] = useState('flashcard'); // 'flashcard' | 'quiz' | 'typing' | 'wordlist'
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('Tất cả');

  // Nạp dữ liệu từ localStorage, nếu chưa có thì dùng trọn bộ 5 vòng mặc định (~2978 từ)
  const [words, setWords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Nếu dữ liệu cũ đã có trường unit, sử dụng dữ liệu đã lưu
          if (parsed.some(w => w.unit)) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc dữ liệu từ localStorage:', err);
    }
    return defaultWordsData;
  });

  // Tự động kiểm tra: Nếu kho từ vựng trong localStorage đang trống rỗng (null hoặc mảng rỗng),
  // tự động lưu mảng gộp 2978 từ vào localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWordsData));
      } else {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.some(w => w.unit)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWordsData));
          setWords(defaultWordsData);
        }
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra/tự động lưu kho từ mặc định vào localStorage:', err);
    }
  }, []);

  // Tự động đồng bộ vào localStorage mỗi khi danh sách từ thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu vào localStorage:', err);
    }
  }, [words]);

  // Đếm số lượng từ cho từng Unit
  const unitCounts = useMemo(() => {
    const counts = { 'Tất cả': words.length };
    UNIT_OPTIONS.filter(u => u !== 'Tất cả').forEach(u => {
      counts[u] = words.filter(w => w.unit === u).length;
    });
    return counts;
  }, [words]);

  // Lọc danh sách từ theo Unit đang chọn (toàn bộ các chế độ học và kho từ chỉ nhận mảng này)
  const activeWords = useMemo(() => {
    if (selectedUnit === 'Tất cả') {
      return words;
    }
    return words.filter(w => w.unit === selectedUnit);
  }, [words, selectedUnit]);

  // Thoát Focus Mode khi bấm phím Escape (Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFocusMode) {
        e.preventDefault();
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  const toggleFocusMode = () => {
    setIsFocusMode(prev => !prev);
  };

  // Thêm từ mới
  const handleAddWord = (newWord) => {
    const wordWithId = {
      id: `custom_${Date.now()}`,
      status: 'new',
      unit: newWord.unit || (selectedUnit !== 'Tất cả' ? selectedUnit : 'Vòng 1'),
      ...newWord
    };
    setWords(prev => [wordWithId, ...prev]);
  };

  // Cập nhật thông tin từ
  const handleUpdateWord = (updatedWord) => {
    setWords(prev => prev.map(w => w.id === updatedWord.id ? { ...w, ...updatedWord } : w));
  };

  // Xóa từ
  const handleDeleteWord = (id) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  // Đánh dấu đã biết / chưa biết
  const handleToggleKnown = (id) => {
    setWords(prev => prev.map(w => {
      if (w.id === id) {
        const isKnown = w.status === 'known' || w.status === 'mastered';
        return {
          ...w,
          status: isKnown ? 'learning' : 'known'
        };
      }
      return w;
    }));
  };

  // Nhập dữ liệu đè từ file backup
  const handleImportWords = (importedWords) => {
    setWords(importedWords);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedWords));
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu import vào localStorage:', err);
    }
  };

  // Khôi phục về bộ 2978 từ gốc (5 Vòng)
  const handleResetDefault = () => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn khôi phục trọn bộ 2978 từ vựng gốc (5 Vòng)? Mọi chỉnh sửa cá nhân sẽ được đặt lại theo dữ liệu gốc.'
    );
    if (confirmed) {
      setWords(defaultWordsData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWordsData));
      } catch (err) {
        console.error('Lỗi khi khôi phục dữ liệu gốc:', err);
      }
    }
  };

  // Tính toán số liệu thống kê Dashboard theo Unit đang chọn
  const stats = useMemo(() => {
    const now = new Date();
    const total = activeWords.length;

    // Số từ cần ôn hôm nay trong Unit đang chọn
    const needReview = activeWords.filter(w => {
      if (w.nextReviewDate) {
        return new Date(w.nextReviewDate) <= now;
      }
      return w.status !== 'known' && w.status !== 'mastered';
    }).length;

    // Số từ đã thuộc (Mastered) trong Unit đang chọn
    const mastered = activeWords.filter(w => 
      w.status === 'known' || 
      w.status === 'mastered' || 
      (w.easeFactor && w.easeFactor >= 2.5)
    ).length;

    return { total, needReview, mastered };
  }, [activeWords]);

  return (
    <div className={`app-container ${isFocusMode ? 'focus-mode-active' : ''}`}>
      {/* Toast thông báo âm thanh / lỗi */}
      <AudioToast />

      {/* Nút nổi để thoát Focus Mode */}
      {isFocusMode && (
        <button 
          className="focus-exit-btn" 
          onClick={() => setIsFocusMode(false)}
          title="Thoát chế độ tập trung (Nhấn phím Esc)"
        >
          <Minimize2 size={15} /> Thoát tập trung (Esc)
        </button>
      )}

      {/* Top Navigation Bar */}
      <header className="header">
        <div className="header-inner">
          {/* Logo / Brand */}
          <div className="brand">
            <div className="brand-icon">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="brand-title">VocabMaster</div>
              <div className="brand-subtitle">Ứng dụng ôn từ vựng cá nhân</div>
            </div>
          </div>

          {/* Unit Selector Dropdown in Header */}
          <div className="header-unit-control">
            <div className="unit-selector-wrapper">
              <span className="unit-selector-label">
                <Layers size={15} /> Unit:
              </span>
              <select
                className="unit-select"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                title="Chọn Unit / Vòng từ vựng để học"
                id="header-unit-select"
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit} value={unit}>
                    {unit} {unitCounts[unit] !== undefined ? `(${unitCounts[unit]} từ)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <nav className="mode-nav">
            <button
              className={`nav-tab ${activeMode === 'flashcard' ? 'active' : ''}`}
              onClick={() => setActiveMode('flashcard')}
              id="mode-flashcard-btn"
            >
              <Layers size={17} />
              <span>Flashcard</span>
            </button>

            <button
              className={`nav-tab ${activeMode === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveMode('quiz')}
              id="mode-quiz-btn"
            >
              <HelpCircle size={17} />
              <span>Trắc nghiệm</span>
            </button>

            <button
              className={`nav-tab ${activeMode === 'typing' ? 'active' : ''}`}
              onClick={() => setActiveMode('typing')}
              id="mode-typing-btn"
            >
              <Keyboard size={17} />
              <span>Gõ đáp án</span>
            </button>

            <button
              className={`nav-tab ${activeMode === 'wordlist' ? 'active' : ''}`}
              onClick={() => setActiveMode('wordlist')}
              id="mode-wordlist-btn"
            >
              <BookOpen size={17} />
              <span>Kho từ ({activeWords.length})</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Bảng thống kê Dashboard (3 Card) */}
      {!isFocusMode && (
        <section className="dashboard-container">
          <div className="dashboard-header-row">
            <div className="dashboard-unit-badge">
              <span className="dash-unit-title">📊 Tiến độ học:</span>
              <span className="dash-unit-active">{selectedUnit}</span>
              <span className="dash-unit-count">({activeWords.length} từ)</span>
            </div>

            <div className="dashboard-unit-control">
              <span className="dash-select-label">
                <Layers size={14} /> Chuyển Vòng:
              </span>
              <select
                className="unit-select dashboard-unit-select"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                title="Chọn Unit để học"
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit} value={unit}>
                    {unit} {unitCounts[unit] !== undefined ? `(${unitCounts[unit]} từ)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Card 1: Tổng số từ trong Unit */}
            <div className="dashboard-card">
              <div className="dash-icon-box dash-icon-total">
                <BookOpen size={24} />
              </div>
              <div className="dash-info">
                <span className="dash-value">{stats.total}</span>
                <span className="dash-label">
                  {selectedUnit === 'Tất cả' ? 'Tổng từ trong kho' : `Từ trong ${selectedUnit}`}
                </span>
              </div>
            </div>

            {/* Card 2: Cần ôn hôm nay */}
            <div className="dashboard-card">
              <div className="dash-icon-box dash-icon-review">
                <Clock size={24} />
              </div>
              <div className="dash-info">
                <span className="dash-value">{stats.needReview}</span>
                <span className="dash-label">Từ cần ôn hôm nay</span>
              </div>
            </div>

            {/* Card 3: Đã thuộc */}
            <div className="dashboard-card">
              <div className="dash-icon-box dash-icon-mastered">
                <Award size={24} />
              </div>
              <div className="dash-info">
                <span className="dash-value">{stats.mastered}</span>
                <span className="dash-label">Từ đã ghi nhớ vững</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {activeMode === 'flashcard' && (
          <FlashcardMode 
            words={activeWords} 
            isFocusMode={isFocusMode}
            onToggleFocus={toggleFocusMode}
          />
        )}
        {activeMode === 'quiz' && (
          <QuizMode 
            words={activeWords} 
            isFocusMode={isFocusMode}
            onToggleFocus={toggleFocusMode}
          />
        )}
        {activeMode === 'typing' && (
          <TypingMode 
            words={activeWords} 
            isFocusMode={isFocusMode}
            onToggleFocus={toggleFocusMode}
          />
        )}
        {activeMode === 'wordlist' && (
          <WordListMode 
            words={activeWords} 
            totalAllWords={words.length}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            unitCounts={unitCounts}
            onResetDefault={handleResetDefault}
            onAddWord={handleAddWord}
            onUpdateWord={handleUpdateWord}
            onDeleteWord={handleDeleteWord}
            onToggleKnown={handleToggleKnown}
            onImportWords={handleImportWords}
          />
        )}
      </main>
    </div>
  );
}

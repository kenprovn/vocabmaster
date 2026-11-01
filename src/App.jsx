import React, { useState, useEffect, useMemo } from 'react';
import vong1Data from '../unit/Oxford_3000_Vong_1_516_tu.json';
import vong2Data from '../unit/Oxford_3000_Vong_2_754_tu.json';
import vong3Data from '../unit/Oxford_3000_Vong_3_748_tu.json';
import vong4Data from '../unit/Oxford_3000_Vong_4_282_tu.json';
import vong5Data from '../unit/Oxford_3000_Vong_5_678_tu.json';
import toeic1650Data from './data/toeic_1650.json';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import TypingMode from './components/TypingMode';
import WordListMode from './components/WordListMode';
import AudioToast from './components/AudioToast';
import JumpUndoToast from './components/JumpUndoToast';
import CustomUnitSelector from './components/CustomUnitSelector';
import { Layers, HelpCircle, Keyboard, BookOpen, GraduationCap, Clock, Award, Minimize2, Bookmark, X } from 'lucide-react';
import { normalizeWordKey } from './utils/reviewLater';
import { showToast } from './utils/toast';
import { clearJumpUndo } from './utils/jumpUndo';
import './App.css';

import { cancelCurrentAutoNext } from './utils/autoNext';

// Key lưu trữ riêng biệt cho từng bộ từ trong localStorage (bảo toàn 100% dữ liệu gốc)
const OXFORD_STORAGE_KEY = 'myVocabData';
const TOEIC_STORAGE_KEY = 'toeicVocabData';
const SELECTED_UNIT_KEY = 'vocabSelectedUnit';

// Gộp toàn bộ 5 Vòng thành mảng 2978 từ mặc định của Oxford 3000
const defaultOxfordWordsData = [
  ...vong1Data,
  ...vong2Data,
  ...vong3Data,
  ...vong4Data,
  ...vong5Data
];

export const TOEIC_UNIT_NAME = 'TOEIC Cơ Bản';
export const LEGACY_TOEIC_UNIT_NAME = 'TOEIC Cơ Bản – MR. HIEP';

export const OXFORD_UNITS = [
  'Tất cả',
  'Vòng 1',
  'Vòng 2',
  'Vòng 3',
  'Vòng 4',
  'Vòng 5'
];

export const TOEIC_ROUNDS = [
  'TOEIC - Vòng 1',
  'TOEIC - Vòng 2',
  'TOEIC - Vòng 3',
  'TOEIC - Vòng 4',
  'TOEIC - Vòng 5'
];

export const TOEIC_UNITS = [
  TOEIC_UNIT_NAME,
  ...TOEIC_ROUNDS
];

export const ALL_UNIT_OPTIONS = [
  ...OXFORD_UNITS,
  ...TOEIC_UNITS
];

// Helper cắt đúng 330 từ cho từng vòng TOEIC (giữ nguyên thứ tự 1-1650 gốc, không sắp xếp lại)
export const getToeicRoundWords = (words, roundName) => {
  if (!words || words.length === 0) return [];
  switch (roundName) {
    case 'TOEIC - Vòng 1':
      return words.slice(0, 330);
    case 'TOEIC - Vòng 2':
      return words.slice(330, 660);
    case 'TOEIC - Vòng 3':
      return words.slice(660, 990);
    case 'TOEIC - Vòng 4':
      return words.slice(990, 1320);
    case 'TOEIC - Vòng 5':
      return words.slice(1320, 1650);
    default:
      return words;
  }
};

export default function App() {
  const [activeMode, setActiveMode] = useState('flashcard'); // 'flashcard' | 'quiz' | 'typing' | 'wordlist'
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Đọc Unit đã chọn từ localStorage (hoặc mặc định 'Tất cả')
  const [selectedUnit, setSelectedUnit] = useState(() => {
    try {
      const saved = localStorage.getItem(SELECTED_UNIT_KEY);
      if (saved === LEGACY_TOEIC_UNIT_NAME || saved === TOEIC_UNIT_NAME) {
        return TOEIC_UNIT_NAME;
      }
      if (saved && ALL_UNIT_OPTIONS.includes(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'Tất cả';
  });

  // 1. Quản lý kho từ Oxford 3000 (key: myVocabData)
  const [oxfordWords, setOxfordWords] = useState(() => {
    try {
      const saved = localStorage.getItem(OXFORD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(w => w.unit && w.unit.startsWith('Vòng'))) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc dữ liệu Oxford từ localStorage:', err);
    }
    return defaultOxfordWordsData;
  });

  // 2. Quản lý kho từ TOEIC 1650 (key: toeicVocabData)
  const [toeicWords, setToeicWords] = useState(() => {
    try {
      const saved = localStorage.getItem(TOEIC_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Tự động chuyển URL ảnh ngoài thành ảnh nội bộ WebP nếu còn lưu URL cũ,
          // bảo toàn 100% tiến độ học tập (status, nextReviewDate, repetition, v.v.)
          return parsed.map((item, idx) => {
            const localImg = `/images/toeic/toeic_${idx + 1}.webp`;
            const isExternal = item.image && item.image.startsWith('http');
            return {
              ...item,
              unit: TOEIC_UNIT_NAME,
              image: isExternal ? localImg : (item.image || localImg)
            };
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc dữ liệu TOEIC từ localStorage:', err);
    }
    return toeic1650Data;
  });

  // Tự động kiểm tra và khởi tạo localStorage nếu chưa có
  useEffect(() => {
    try {
      const savedOxford = localStorage.getItem(OXFORD_STORAGE_KEY);
      if (!savedOxford) {
        localStorage.setItem(OXFORD_STORAGE_KEY, JSON.stringify(defaultOxfordWordsData));
      }
      const savedToeic = localStorage.getItem(TOEIC_STORAGE_KEY);
      if (!savedToeic) {
        localStorage.setItem(TOEIC_STORAGE_KEY, JSON.stringify(toeic1650Data));
      }
    } catch (err) {
      console.error('Lỗi khi khởi tạo localStorage:', err);
    }
  }, []);

  // Tự động đồng bộ Oxford vào localStorage khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(OXFORD_STORAGE_KEY, JSON.stringify(oxfordWords));
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu Oxford vào localStorage:', err);
    }
  }, [oxfordWords]);

  // Tự động đồng bộ TOEIC vào localStorage khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(TOEIC_STORAGE_KEY, JSON.stringify(toeicWords));
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu TOEIC vào localStorage:', err);
    }
  }, [toeicWords]);

  // Lưu Unit đang chọn vào localStorage và hủy timer Auto Next + Undo Toast
  const handleSelectUnit = (unit) => {
    cancelCurrentAutoNext();
    clearJumpUndo();
    setCustomReviewWords(null);
    setSelectedUnit(unit);
    try {
      localStorage.setItem(SELECTED_UNIT_KEY, unit);
    } catch (_) {}
  };

  const isToeic = selectedUnit === TOEIC_UNIT_NAME || (typeof selectedUnit === 'string' && selectedUnit.startsWith('TOEIC - Vòng'));

  // Trạng thái ôn tập danh sách từ tùy chỉnh (ví dụ: Từ đã lưu / Review Later)
  const [customReviewWords, setCustomReviewWords] = useState(null);

  const handleStartReviewSaved = (savedList) => {
    if (!savedList || savedList.length === 0) {
      showToast('Danh sách từ đã lưu đang trống!', 'warning');
      return;
    }

    const enrichedList = savedList.map(item => {
      const key = normalizeWordKey(item.word);
      const inToeic = toeicWords.find(w => normalizeWordKey(w.word) === key);
      const inOxford = oxfordWords.find(w => normalizeWordKey(w.word) === key);
      return inToeic || inOxford || item;
    });

    cancelCurrentAutoNext();
    clearJumpUndo();
    setCustomReviewWords(enrichedList);
    setActiveMode('flashcard');
    showToast(`Bắt đầu ôn tập ${enrichedList.length} từ đã lưu trên Flashcard!`, 'success');
  };

  const handleExitCustomReview = () => {
    cancelCurrentAutoNext();
    clearJumpUndo();
    setCustomReviewWords(null);
    showToast(`Đã trở về bộ từ ${selectedUnit}`, 'info');
  };

  // Đếm số lượng từ cho từng Unit của Oxford 3000
  const oxfordCounts = useMemo(() => {
    const counts = { 'Tất cả': oxfordWords.length };
    OXFORD_UNITS.filter(u => u !== 'Tất cả').forEach(u => {
      counts[u] = oxfordWords.filter(w => w.unit === u).length;
    });
    return counts;
  }, [oxfordWords]);

  // Đếm số lượng từ cho từng vòng TOEIC Cơ Bản (mỗi vòng đúng 330 từ, tổng 1650 từ)
  const toeicCounts = useMemo(() => {
    const total = toeicWords.length;
    return {
      [TOEIC_UNIT_NAME]: total,
      'TOEIC - Vòng 1': Math.min(330, total),
      'TOEIC - Vòng 2': Math.max(0, Math.min(330, total - 330)),
      'TOEIC - Vòng 3': Math.max(0, Math.min(330, total - 660)),
      'TOEIC - Vòng 4': Math.max(0, Math.min(330, total - 990)),
      'TOEIC - Vòng 5': Math.max(0, Math.min(330, total - 1320))
    };
  }, [toeicWords.length]);

  const allUnitCounts = useMemo(() => {
    return {
      ...oxfordCounts,
      ...toeicCounts
    };
  }, [oxfordCounts, toeicCounts]);

  // Lọc danh sách từ theo Unit đang chọn hoặc danh sách tùy chỉnh (Từ đã lưu)
  const activeWords = useMemo(() => {
    if (customReviewWords && customReviewWords.length > 0) {
      return customReviewWords;
    }
    if (isToeic) {
      if (selectedUnit === TOEIC_UNIT_NAME) {
        return toeicWords;
      }
      return getToeicRoundWords(toeicWords, selectedUnit);
    }
    if (selectedUnit === 'Tất cả') {
      return oxfordWords;
    }
    return oxfordWords.filter(w => w.unit === selectedUnit);
  }, [customReviewWords, isToeic, selectedUnit, toeicWords, oxfordWords]);

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

  // Thêm từ mới vào đúng bộ từ đang học
  const handleAddWord = (newWord) => {
    const wordWithId = {
      id: isToeic ? `toeic_custom_${Date.now()}` : `custom_${Date.now()}`,
      status: 'new',
      unit: isToeic ? TOEIC_UNIT_NAME : (newWord.unit || (selectedUnit !== 'Tất cả' ? selectedUnit : 'Vòng 1')),
      ...newWord
    };

    if (isToeic) {
      setToeicWords(prev => [wordWithId, ...prev]);
    } else {
      setOxfordWords(prev => [wordWithId, ...prev]);
    }
  };

  // Cập nhật thông tin từ
  const handleUpdateWord = (updatedWord) => {
    if (isToeic) {
      setToeicWords(prev => prev.map(w => w.id === updatedWord.id ? { ...w, ...updatedWord } : w));
    } else {
      setOxfordWords(prev => prev.map(w => w.id === updatedWord.id ? { ...w, ...updatedWord } : w));
    }
  };

  // Xóa từ
  const handleDeleteWord = (id) => {
    if (isToeic) {
      setToeicWords(prev => prev.filter(w => w.id !== id));
    } else {
      setOxfordWords(prev => prev.filter(w => w.id !== id));
    }
  };

  // Cập nhật trạng thái học tập của một từ (dùng cho Flashcard và Kho từ)
  const handleUpdateWordStatus = (id, newStatus) => {
    const updater = prev => prev.map(w => {
      if (w.id === id) {
        return {
          ...w,
          status: newStatus
        };
      }
      return w;
    });

    if (isToeic) {
      setToeicWords(updater);
    } else {
      setOxfordWords(updater);
    }

    if (customReviewWords) {
      setCustomReviewWords(updater);
    }
  };

  // Đánh dấu đã biết / chưa biết (Kho từ)
  const handleToggleKnown = (id) => {
    const updater = prev => prev.map(w => {
      if (w.id === id) {
        const isKnown = w.status === 'known' || w.status === 'mastered';
        return {
          ...w,
          status: isKnown ? 'learning' : 'known'
        };
      }
      return w;
    });

    if (isToeic) {
      setToeicWords(updater);
    } else {
      setOxfordWords(updater);
    }

    if (customReviewWords) {
      setCustomReviewWords(updater);
    }
  };

  // Nhập dữ liệu đè từ file backup vào đúng bộ từ hiện tại
  const handleImportWords = (importedWords) => {
    if (isToeic) {
      setToeicWords(importedWords);
      try {
        localStorage.setItem(TOEIC_STORAGE_KEY, JSON.stringify(importedWords));
      } catch (err) {
        console.error('Lỗi khi lưu dữ liệu import TOEIC vào localStorage:', err);
      }
    } else {
      setOxfordWords(importedWords);
      try {
        localStorage.setItem(OXFORD_STORAGE_KEY, JSON.stringify(importedWords));
      } catch (err) {
        console.error('Lỗi khi lưu dữ liệu import Oxford vào localStorage:', err);
      }
    }
  };

  // Khôi phục về bộ dữ liệu gốc của khóa học đang chọn
  const handleResetDefault = () => {
    if (isToeic) {
      const confirmed = window.confirm(
        'Bạn có chắc chắn muốn khôi phục bộ từ "TOEIC Cơ Bản (1650 từ)" về trạng thái gốc? Mọi chỉnh sửa cá nhân trong bộ này sẽ được đặt lại.'
      );
      if (confirmed) {
        setToeicWords(toeic1650Data);
        try {
          localStorage.setItem(TOEIC_STORAGE_KEY, JSON.stringify(toeic1650Data));
        } catch (err) {
          console.error('Lỗi khi khôi phục dữ liệu gốc TOEIC:', err);
        }
      }
    } else {
      const confirmed = window.confirm(
        'Bạn có chắc chắn muốn khôi phục trọn bộ 2978 từ vựng gốc Oxford 3000 (5 Vòng)? Mọi chỉnh sửa cá nhân sẽ được đặt lại theo dữ liệu gốc.'
      );
      if (confirmed) {
        setOxfordWords(defaultOxfordWordsData);
        try {
          localStorage.setItem(OXFORD_STORAGE_KEY, JSON.stringify(defaultOxfordWordsData));
        } catch (err) {
          console.error('Lỗi khi khôi phục dữ liệu gốc Oxford 3000:', err);
        }
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


  const handleSwitchMode = (mode) => {
    if (mode !== activeMode) {
      clearJumpUndo();
      setActiveMode(mode);
    }
  };

  return (
    <div className={`app-container ${isFocusMode ? 'focus-mode-active' : ''}`}>
      {/* Toast thông báo âm thanh / lỗi */}
      <AudioToast />
      {/* Toast hoàn tác khi nhảy từ vựng nhầm */}
      <JumpUndoToast />

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
            <CustomUnitSelector
              selectedUnit={selectedUnit}
              onSelectUnit={handleSelectUnit}
              oxfordCounts={oxfordCounts}
              toeicCount={toeicWords.length}
              toeicCounts={toeicCounts}
              toeicUnitName={TOEIC_UNIT_NAME}
              align="right"
            />
          </div>

          {/* Mode Switcher Buttons */}
          <nav className="mode-nav">
            <button
              className={`nav-tab ${activeMode === 'flashcard' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('flashcard')}
              id="mode-flashcard-btn"
            >
              <Layers size={17} />
              <span>Flashcard</span>
            </button>

            <button
              className={`nav-tab ${activeMode === 'quiz' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('quiz')}
              id="mode-quiz-btn"
            >
              <HelpCircle size={17} />
              <span>Trắc nghiệm</span>
            </button>

            <button
              className={`nav-tab ${activeMode === 'typing' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('typing')}
              id="mode-typing-btn"
            >
              <Keyboard size={17} />
              <span>Gõ đáp án</span>
            </button>

            <button
              className={`nav-tab ${activeMode === 'wordlist' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('wordlist')}
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
              <span className="dash-unit-icon">📊</span>
              <span className="dash-unit-title">Bộ từ đang học:</span>
              <span className={`dash-unit-active ${isToeic ? 'theme-toeic' : 'theme-oxford'}`}>
                {selectedUnit === 'Tất cả'
                  ? 'Tất cả Oxford'
                  : selectedUnit === TOEIC_UNIT_NAME
                    ? 'Tất cả TOEIC'
                    : selectedUnit.startsWith('TOEIC - ')
                      ? `TOEIC ${selectedUnit.replace('TOEIC - ', '')}`
                      : `Oxford ${selectedUnit}`}
              </span>
              <span className="dash-unit-count-chip">
                {activeWords.length} từ
              </span>
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
                  {selectedUnit === 'Tất cả'
                    ? 'Tổng từ trong kho Oxford'
                    : selectedUnit === TOEIC_UNIT_NAME
                      ? 'Tổng từ trong kho TOEIC'
                      : `Từ trong ${selectedUnit.startsWith('TOEIC - ') ? `TOEIC ${selectedUnit.replace('TOEIC - ', '')}` : `Oxford ${selectedUnit}`}`}
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

      {/* Banner thông báo chế độ ôn tập từ đã lưu */}
      {customReviewWords && (
        <section className="custom-review-banner-wrapper">
          <div className="custom-review-banner animate-fade-in">
            <div className="custom-review-info">
              <Bookmark size={20} color="#fbbf24" fill="#fbbf24" />
              <div>
                <span className="custom-review-badge">Đang trong chế độ ôn tập:</span>
                <span className="custom-review-title"> Danh sách từ đã lưu (Review Later) — {customReviewWords.length} từ</span>
              </div>
            </div>
            <button 
              type="button"
              className="btn-exit-custom-review"
              onClick={handleExitCustomReview}
              title={`Trở về bài học ${selectedUnit}`}
            >
              <X size={15} /> Trở về {selectedUnit}
            </button>
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
            selectedUnit={selectedUnit}
            onUpdateWordStatus={handleUpdateWordStatus}
          />
        )}
        {activeMode === 'quiz' && (
          <QuizMode 
            words={activeWords} 
            isFocusMode={isFocusMode}
            onToggleFocus={toggleFocusMode}
            selectedUnit={selectedUnit}
          />
        )}
        {activeMode === 'typing' && (
          <TypingMode 
            words={activeWords} 
            isFocusMode={isFocusMode}
            onToggleFocus={toggleFocusMode}
            selectedUnit={selectedUnit}
          />
        )}
        {activeMode === 'wordlist' && (
          <WordListMode 
            words={activeWords} 
            totalAllWords={isToeic ? toeicWords.length : oxfordWords.length}
            selectedUnit={selectedUnit}
            onSelectUnit={handleSelectUnit}
            unitCounts={allUnitCounts}
            onResetDefault={handleResetDefault}
            resetButtonLabel={isToeic ? '1650 từ gốc (TOEIC)' : '3000 từ gốc (Oxford)'}
            onAddWord={handleAddWord}
            onUpdateWord={handleUpdateWord}
            onDeleteWord={handleDeleteWord}
            onToggleKnown={handleToggleKnown}
            onImportWords={handleImportWords}
            onStartReviewSaved={handleStartReviewSaved}
          />
        )}
      </main>
    </div>
  );
}

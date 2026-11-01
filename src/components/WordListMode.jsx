import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Volume2, Search, Plus, Edit2, Trash2, X, Check, Download, Upload, Filter,
  ChevronLeft, ChevronRight, Layers, RotateCcw, Bookmark, FileText, RotateCw, Copy, BookOpen
} from 'lucide-react';
import { speakWord } from '../utils/speech';
import { getSavedWords, removeSavedWord, subscribeReviewLater, formatWordsAsTxt } from '../utils/reviewLater';
import { copyToClipboard, normalizeWordForCopy } from '../utils/clipboard';
import { showToast } from '../utils/toast';
import TxtPreviewModal from './TxtPreviewModal';
import FilterDropdown from './FilterDropdown';
import {
  OXFORD_3000_UNIT_NAMES,
  OXFORD_5000_EXTRA_UNIT_NAMES,
  OXFORD_5000_EXTRA_NAME,
  OXFORD_5000_ALL_NAME
} from '../data/oxford5000Data';

export default function WordListMode({
  words,
  totalAllWords,
  selectedUnit = 'Tất cả',
  onSelectUnit,
  unitCounts,
  onResetDefault,
  resetButtonLabel = '3000 từ gốc',
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onToggleKnown,
  onImportWords,
  onStartReviewSaved
}) {
  const [activeTab, setActiveTab] = useState('main'); // 'main' | 'saved'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'new' | 'learning' | 'mastered'
  const [currentPage, setCurrentPage] = useState(1);
  const wordsPerPage = 50;

  // Review Later state
  const [savedWords, setSavedWords] = useState(() => getSavedWords());
  const [savedSourceFilter, setSavedSourceFilter] = useState('all'); // 'all' | 'oxford' | 'toeic'
  const [savedSearchTerm, setSavedSearchTerm] = useState('');
  const [isTxtModalOpen, setIsTxtModalOpen] = useState(false);

  // Theo dõi cập nhật danh sách Review Later
  useEffect(() => {
    const unsubscribe = subscribeReviewLater((updated) => {
      setSavedWords(updated);
    });
    return () => unsubscribe();
  }, []);

  const oxfordSavedCount = useMemo(() => {
    return savedWords.filter(item => {
      const sources = item.sources || [item.source || 'oxford'];
      return sources.includes('oxford');
    }).length;
  }, [savedWords]);

  const toeicSavedCount = useMemo(() => {
    return savedWords.filter(item => {
      const sources = item.sources || [item.source || 'oxford'];
      return sources.includes('toeic');
    }).length;
  }, [savedWords]);

  const filteredSavedWords = useMemo(() => {
    const s = savedSearchTerm.trim().toLowerCase();
    return savedWords.filter(item => {
      // 1. Lọc theo nguồn
      if (savedSourceFilter === 'oxford') {
        const sources = item.sources || [item.source || 'oxford'];
        if (!sources.includes('oxford')) return false;
      } else if (savedSourceFilter === 'toeic') {
        const sources = item.sources || [item.source || 'oxford'];
        if (!sources.includes('toeic')) return false;
      }

      // 2. Lọc theo từ khóa tìm kiếm
      if (s) {
        const wordMatch = item.word.toLowerCase().includes(s);
        const meaningMatch = item.meaning && item.meaning.toLowerCase().includes(s);
        if (!wordMatch && !meaningMatch) return false;
      }

      return true;
    });
  }, [savedWords, savedSourceFilter, savedSearchTerm]);

  const handleCopyAllSaved = async () => {
    if (filteredSavedWords.length === 0) {
      showToast('Danh sách từ đang trống!', 'warning');
      return;
    }
    const txt = formatWordsAsTxt(filteredSavedWords);
    const ok = await copyToClipboard(txt);
    if (ok) {
      showToast('Đã sao chép!', 'success');
    } else {
      showToast('Không thể sao chép văn bản!', 'error');
    }
  };

  const handleReviewSaved = () => {
    if (filteredSavedWords.length === 0) {
      showToast('Không có từ nào trong danh sách để ôn tập!', 'warning');
      return;
    }
    if (onStartReviewSaved) {
      onStartReviewSaved(filteredSavedWords);
    }
  };

  const handleCopySingleWord = async (word, e) => {
    if (e) e.stopPropagation();
    const clean = normalizeWordForCopy(word);
    if (!clean) return;
    const ok = await copyToClipboard(clean);
    if (ok) {
      showToast('Đã sao chép!', 'success');
    }
  };

  const handleRemoveSingleWord = (word, e) => {
    if (e) e.stopPropagation();
    removeSavedWord(word);
    showToast('Đã bỏ lưu từ', 'info');
  };

  const handleSpeakWord = (item, e) => {
    if (e) e.stopPropagation();
    speakWord(item.word, { id: item.id, type: item.type });
  };

  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [editingWord, setEditingWord] = useState(null);
  const fileInputRef = useRef(null);

  // Form states
  const [formWord, setFormWord] = useState('');
  const [formType, setFormType] = useState('noun');
  const [formMeaning, setFormMeaning] = useState('');
  const [formUnit, setFormUnit] = useState('Vòng 1');
  const [formError, setFormError] = useState('');

  // Handle Search & Filter change (Reset về trang 1)
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Filter words by search and status
  const filteredWords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const now = new Date();

    return words.filter(w => {
      // Tìm kiếm theo từ tiếng Anh hoặc nghĩa tiếng Việt
      const matchesSearch =
        !search ||
        w.word.toLowerCase().includes(search) ||
        w.meaning.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // Lọc theo trạng thái
      if (statusFilter === 'all') return true;
      if (statusFilter === 'new') {
        return w.status === 'new';
      }
      if (statusFilter === 'learning') {
        return w.status === 'learning' || (w.nextReviewDate && new Date(w.nextReviewDate) <= now);
      }
      if (statusFilter === 'mastered') {
        return w.status === 'known' || w.status === 'mastered';
      }
      return true;
    });
  }, [words, searchTerm, statusFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * wordsPerPage;
  const paginatedWords = filteredWords.slice(startIndex, startIndex + wordsPerPage);

  const knownCount = words.filter(w => w.status === 'known' || w.status === 'mastered').length;

  // Nhóm Bộ từ cho FilterDropdown
  const unitFilterGroups = useMemo(() => [
    {
      label: '📚 Oxford 3000 (~2.978 từ)',
      badgeClass: 'badge-oxford',
      items: [
        { value: 'Tất cả', label: 'Tất cả Oxford 3000', count: unitCounts?.['Tất cả'] || 2978 },
        { value: 'Vòng 1', label: 'Vòng 1', count: unitCounts?.['Vòng 1'] || 0 },
        { value: 'Vòng 2', label: 'Vòng 2', count: unitCounts?.['Vòng 2'] || 0 },
        { value: 'Vòng 3', label: 'Vòng 3', count: unitCounts?.['Vòng 3'] || 0 },
        { value: 'Vòng 4', label: 'Vòng 4', count: unitCounts?.['Vòng 4'] || 0 },
        { value: 'Vòng 5', label: 'Vòng 5', count: unitCounts?.['Vòng 5'] || 0 },
        ...OXFORD_3000_UNIT_NAMES.map(u => ({
          value: u,
          label: `${u} (100 từ)`,
          count: unitCounts?.[u] !== undefined ? unitCounts[u] : (u === 'Unit 30' ? 78 : 100)
        }))
      ]
    },
    {
      label: '✨ Oxford 5000 Extra (1.996 từ B2–C1)',
      badgeClass: 'badge-oxford5000',
      items: [
        {
          value: OXFORD_5000_EXTRA_NAME,
          label: 'Tất cả Oxford 5000 Extra',
          count: unitCounts?.[OXFORD_5000_EXTRA_NAME] || 1996
        },
        {
          value: OXFORD_5000_ALL_NAME,
          label: 'Trọn bộ Oxford 5000 (Unit 1–50)',
          count: unitCounts?.[OXFORD_5000_ALL_NAME] || 4974
        },
        ...OXFORD_5000_EXTRA_UNIT_NAMES.map(u => ({
          value: u,
          label: `${u} (${unitCounts?.[u] !== undefined ? unitCounts[u] : (u === 'Unit 50' ? 96 : 100)} từ)`,
          count: unitCounts?.[u] !== undefined ? unitCounts[u] : (u === 'Unit 50' ? 96 : 100)
        }))
      ]
    },
    {
      label: '🎯 TOEIC Cơ Bản (1.650 từ)',
      badgeClass: 'badge-toeic',
      items: [
        {
          value: 'TOEIC Cơ Bản',
          label: 'Tất cả TOEIC',
          count: unitCounts?.['TOEIC Cơ Bản'] || 1650,
          isToeic: true
        },
        {
          value: 'TOEIC - Vòng 1',
          label: 'Vòng 1 (1–330)',
          count: unitCounts?.['TOEIC - Vòng 1'] !== undefined ? unitCounts['TOEIC - Vòng 1'] : 330,
          isToeic: true
        },
        {
          value: 'TOEIC - Vòng 2',
          label: 'Vòng 2 (331–660)',
          count: unitCounts?.['TOEIC - Vòng 2'] !== undefined ? unitCounts['TOEIC - Vòng 2'] : 330,
          isToeic: true
        },
        {
          value: 'TOEIC - Vòng 3',
          label: 'Vòng 3 (661–990)',
          count: unitCounts?.['TOEIC - Vòng 3'] !== undefined ? unitCounts['TOEIC - Vòng 3'] : 330,
          isToeic: true
        },
        {
          value: 'TOEIC - Vòng 4',
          label: 'Vòng 4 (991–1320)',
          count: unitCounts?.['TOEIC - Vòng 4'] !== undefined ? unitCounts['TOEIC - Vòng 4'] : 330,
          isToeic: true
        },
        {
          value: 'TOEIC - Vòng 5',
          label: 'Vòng 5 (1321–1650)',
          count: unitCounts?.['TOEIC - Vòng 5'] !== undefined ? unitCounts['TOEIC - Vòng 5'] : 330,
          isToeic: true
        }
      ]
    }
  ], [unitCounts]);

  // Thống kê số lượng theo từng trạng thái trong Unit đang chọn
  const statusCounts = useMemo(() => {
    const now = new Date();
    const newCount = words.filter(w => w.status === 'new').length;
    const learningCount = words.filter(w => w.status === 'learning' || (w.nextReviewDate && new Date(w.nextReviewDate) <= now)).length;
    return {
      all: words.length,
      new: newCount,
      learning: learningCount,
      mastered: knownCount
    };
  }, [words, knownCount]);

  const statusFilterItems = useMemo(() => [
    { value: 'all', label: 'Tất cả trạng thái', count: statusCounts.all },
    { value: 'new', label: 'Chưa học', count: statusCounts.new },
    { value: 'learning', label: 'Cần ôn', count: statusCounts.learning },
    { value: 'mastered', label: 'Đã thuộc', count: statusCounts.mastered }
  ], [statusCounts]);

  const isOxford5000Unit = typeof selectedUnit === 'string' && selectedUnit.startsWith('Unit ') && parseInt(selectedUnit.replace('Unit ', ''), 10) >= 31 && parseInt(selectedUnit.replace('Unit ', ''), 10) <= 50;

  const currentUnitLabel = selectedUnit === 'Tất cả'
    ? 'Tất cả Oxford 3000'
    : selectedUnit === OXFORD_5000_EXTRA_NAME || selectedUnit === 'Tất cả Oxford 5000 Extra'
      ? 'Oxford 5000 Extra'
      : selectedUnit === OXFORD_5000_ALL_NAME || selectedUnit === 'Tất cả Oxford 5000'
        ? 'Trọn bộ Oxford 5000 (Unit 1–50)'
        : selectedUnit === 'TOEIC Cơ Bản'
          ? 'Tất cả TOEIC'
          : selectedUnit.startsWith('TOEIC - ')
            ? `TOEIC ${selectedUnit.replace('TOEIC - ', '')}`
            : selectedUnit.startsWith('Unit ')
              ? isOxford5000Unit
                ? `Oxford 5000 ${selectedUnit}`
                : `Oxford 3000 ${selectedUnit}`
              : `Oxford ${selectedUnit}`;
  const currentUnitCount = selectedUnit === 'Tất cả'
    ? (unitCounts?.['Tất cả'] || words.length)
    : (unitCounts?.[selectedUnit] !== undefined ? unitCounts[selectedUnit] : words.length);

  const statusLabels = {
    all: 'Tất cả trạng thái',
    new: 'Chưa học',
    learning: 'Cần ôn',
    mastered: 'Đã thuộc'
  };
  const currentStatusLabel = statusLabels[statusFilter] || 'Tất cả trạng thái';
  const currentStatusCount = statusCounts[statusFilter];

  const savedSourceItems = useMemo(() => [
    { value: 'all', label: 'Tất cả nguồn', count: savedWords.length },
    { value: 'oxford', label: 'Oxford 3000', count: oxfordSavedCount },
    { value: 'toeic', label: 'TOEIC 1650', count: toeicSavedCount, isToeic: true }
  ], [savedWords.length, oxfordSavedCount, toeicSavedCount]);

  const savedSourceLabels = {
    all: 'Tất cả nguồn',
    oxford: 'Oxford 3000',
    toeic: 'TOEIC 1650'
  };
  const currentSavedSourceLabel = savedSourceLabels[savedSourceFilter] || 'Tất cả nguồn';
  const currentSavedSourceCount = savedSourceFilter === 'all'
    ? savedWords.length
    : (savedSourceFilter === 'oxford' ? oxfordSavedCount : toeicSavedCount);

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingWord(null);
    setFormWord('');
    setFormType('noun');
    setFormMeaning('');
    setFormUnit(selectedUnit !== 'Tất cả' ? selectedUnit : 'Vòng 1');
    setFormError('');
    setModalMode('add');
  };

  // Open modal for editing
  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditingWord(item);
    setFormWord(item.word);
    setFormType(item.type || 'noun');
    setFormMeaning(item.meaning);
    setFormUnit(item.unit || 'Vòng 1');
    setFormError('');
    setModalMode('edit');
  };

  // Close modal
  const handleCloseModal = () => {
    setModalMode(null);
    setEditingWord(null);
    setFormError('');
  };

  // Submit modal form
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formWord.trim() || !formMeaning.trim()) {
      setFormError('Vui lòng điền đầy đủ từ tiếng Anh và nghĩa tiếng Việt!');
      return;
    }

    if (modalMode === 'add') {
      onAddWord({
        word: formWord.trim(),
        type: formType,
        meaning: formMeaning.trim(),
        unit: formUnit
      });
    } else if (modalMode === 'edit' && editingWord) {
      onUpdateWord({
        ...editingWord,
        word: formWord.trim(),
        type: formType,
        meaning: formMeaning.trim(),
        unit: formUnit
      });
    }

    handleCloseModal();
  };

  // Delete word with confirmation
  const handleDelete = (item, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa từ "${item.word}" khỏi danh sách?`);
    if (confirmed) {
      onDeleteWord(item.id);
    }
  };

  // Toggle known status
  const handleToggle = (item, e) => {
    if (e) e.stopPropagation();
    onToggleKnown(item.id);
  };

  // Xuất dữ liệu ra file JSON
  const handleExport = () => {
    try {
      const dataToExport = localStorage.getItem('myVocabData') || JSON.stringify(words, null, 2);
      const blob = new Blob([dataToExport], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vocab-backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất file:', err);
      alert('Đã có lỗi xảy ra khi xuất dữ liệu!');
    }
  };

  // Nhập dữ liệu từ file JSON
  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          alert('File JSON không hợp lệ hoặc danh sách từ vựng trống!');
          return;
        }

        const confirmed = window.confirm(
          `Tìm thấy ${parsed.length} từ vựng trong file backup. Bạn có chắc chắn muốn ghi đè toàn bộ kho từ hiện tại không?`
        );

        if (confirmed) {
          if (onImportWords) {
            onImportWords(parsed);
          }
          setCurrentPage(1);
          alert(`Đã nhập thành công ${parsed.length} từ vựng!`);
        }
      } catch (err) {
        console.error('Lỗi đọc file JSON:', err);
        alert('Không thể đọc file. Vui lòng đảm bảo file có định dạng JSON hợp lệ!');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="wordlist-container animate-fade-in">
      {/* Tab Switcher: Kho từ chính vs Từ đã lưu (Review Later) */}
      <div className="wordlist-tabs-nav">
        <button
          type="button"
          className={`wordlist-tab-pill ${activeTab === 'main' ? 'active' : ''}`}
          onClick={() => setActiveTab('main')}
        >
          <BookOpen size={16} />
          <span className="tab-label-full">Kho từ chính ({words.length})</span>
          <span className="tab-label-short">Kho từ ({words.length})</span>
        </button>

        <button
          type="button"
          className={`wordlist-tab-pill ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <Bookmark size={16} className={savedWords.length > 0 ? 'bookmark-pill-active' : ''} />
          <span className="tab-label-full">Từ đã lưu / Review Later</span>
          <span className="tab-label-short">Ôn sau</span>
          <span className="saved-counter-pill">{savedWords.length}</span>
        </button>
      </div>

      {/* Tab 1: Kho từ chính */}
      {activeTab === 'main' && (
        <div className="wordlist-main-view animate-fade-in">
          {/* Header */}
          <div className="mode-header">
            <div className="mode-title-group">
              <h2>
                <span>📚</span> Kho Từ Vựng Cá Nhân
              </h2>
              <p className="mode-description">
                Đang xem: <strong>{selectedUnit}</strong> ({words.length} từ) | Đã thuộc: <strong>{knownCount}</strong> | Chưa thuộc: <strong>{words.length - knownCount}</strong>
              </p>
            </div>

            {/* Action Buttons: Export, Import, Reset Default, Add */}
            <div className="wordlist-header-actions">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />

          <button
            className="btn-backup"
            onClick={handleExport}
            title="Tải về file vocab-backup.json"
          >
            <Download size={15} /> Xuất dữ liệu
          </button>

          <button
            className="btn-backup"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Nhập dữ liệu từ file JSON"
          >
            <Upload size={15} /> Nhập dữ liệu
          </button>

          {onResetDefault && (
            <button
              className="btn-backup btn-reset"
              onClick={onResetDefault}
              title="Khôi phục lại dữ liệu từ vựng gốc"
            >
              <RotateCcw size={15} /> {resetButtonLabel}
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleOpenAdd}
            id="btn-add-new-word"
          >
            <Plus size={16} /> Thêm từ mới
          </button>
        </div>
      </div>

      {/* Toolbar: Tìm kiếm và Lọc theo Unit & Trạng thái */}
      <div className="wordlist-toolbar">
        <div className="wordlist-search-wrapper">
          <Search size={18} className="wordlist-search-icon" />
          <input
            type="text"
            className="wordlist-search-input"
            placeholder="Tìm từ vựng hoặc nghĩa tiếng Việt..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="wordlist-filters-group">
          {/* Lọc theo Bộ từ / Unit */}
          {onSelectUnit && (
            <FilterDropdown
              icon={<Layers size={15} color="var(--accent-cyan)" />}
              label={currentUnitLabel}
              countBadge={currentUnitCount}
              badgeType={
                selectedUnit === 'TOEIC Cơ Bản' || selectedUnit.startsWith('TOEIC')
                  ? 'toeic'
                  : selectedUnit === OXFORD_5000_EXTRA_NAME || selectedUnit === OXFORD_5000_ALL_NAME || isOxford5000Unit
                    ? 'oxford5000'
                    : 'oxford'
              }
              groups={unitFilterGroups}
              selectedValue={selectedUnit}
              onSelect={(val) => {
                onSelectUnit(val);
                setCurrentPage(1);
              }}
              align="left"
              title="Lọc từ vựng theo Bộ từ / Unit"
            />
          )}

          {/* Lọc theo Trạng thái */}
          <FilterDropdown
            icon={<Filter size={15} color="var(--text-muted)" />}
            label={currentStatusLabel}
            countBadge={currentStatusCount}
            badgeType="default"
            items={statusFilterItems}
            selectedValue={statusFilter}
            onSelect={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
            align="right"
            title="Lọc từ vựng theo trạng thái học"
          />
        </div>
      </div>

      {/* Word Cards Grid */}
      <div className="wordlist-grid">
        {paginatedWords.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            Không tìm thấy từ vựng nào phù hợp với bộ lọc hiện tại!
          </div>
        ) : (
          paginatedWords.map((item) => {
            const isKnown = item.status === 'known' || item.status === 'mastered';
            return (
              <div
                key={item.id}
                className={`wordlist-item ${isKnown ? 'is-known' : ''}`}
                onClick={(e) => handleOpenEdit(item, e)}
                title="Nhấp vào thẻ để chỉnh sửa từ"
              >
                {/* Top: Word type badge, Unit badge & action buttons */}
                <div className="word-card-top">
                  <div className="word-badges-wrapper">
                    <span className={`badge badge-${item.type || 'verb'}`}>
                      {item.type}
                    </span>
                    {item.level && (
                      <span className="badge badge-level" style={{ margin: 0 }}>
                        {item.level}
                      </span>
                    )}
                    {item.unit && (
                      <span className="badge badge-unit">
                        {item.unit}
                      </span>
                    )}
                  </div>

                  <div className="word-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(item.word, { id: item.id, type: item.type });
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      title="Phát âm"
                    >
                      <Volume2 size={15} />
                    </button>

                    <button
                      className="icon-btn btn-edit"
                      onClick={(e) => handleOpenEdit(item, e)}
                      title="Sửa từ"
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      className="icon-btn btn-delete"
                      onClick={(e) => handleDelete(item, e)}
                      title="Xóa từ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Center: Word and Meaning */}
                <div className="wordlist-word">
                  <span className="wordlist-text">{item.word}</span>
                  {item.phonetic && (
                    <span className="wordlist-phonetic">
                      {item.phonetic}
                    </span>
                  )}
                </div>

                <div className="wordlist-meaning">
                  {(item.image || item.imageUrl) ? (
                    <div className="wordlist-img-box">
                      <img
                        src={item.image || item.imageUrl}
                        alt={item.word}
                        className="wordlist-thumb"
                        loading="lazy"
                      />
                      {item.meaning ? <span>{item.meaning}</span> : <span className="wordlist-img-note">Ảnh minh họa nghĩa</span>}
                    </div>
                  ) : (
                    item.meaning
                  )}
                </div>

                {/* Footer: Checkbox Đánh dấu đã biết */}
                <div className="word-card-footer">
                  <label
                    className="known-checkbox-label"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isKnown}
                      onChange={(e) => handleToggle(item, e)}
                    />
                    <span>{isKnown ? '✓ Đã thuộc (làm mờ)' : 'Chưa thuộc'}</span>
                  </label>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                    #{item.id}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cụm nút phân trang */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={validPage <= 1}
            title="Về trang trước"
          >
            <ChevronLeft size={16} /> Trang trước
          </button>

          <div className="pagination-info">
            <span>Trang</span>
            <strong>{validPage}</strong>
            <span>/</span>
            <strong>{totalPages}</strong>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({filteredWords.length} từ)</span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={validPage >= totalPages}
            title="Sang trang sau"
          >
            Trang sau <ChevronRight size={16} />
          </button>
        </div>
      )}
        </div>
      )}

      {/* Tab 2: Từ đã lưu / Review Later */}
      {activeTab === 'saved' && (
        <div className="saved-review-view animate-fade-in">
          {/* Header */}
          <div className="mode-header saved-header">
            <div className="mode-title-group">
              <h2>
                <span>📑</span> Danh Sách Từ Cần Ôn Lại (Review Later)
              </h2>
              <p className="mode-description">
                Tổng cộng: <strong>{savedWords.length} từ</strong> (Oxford: <strong>{oxfordSavedCount}</strong> • TOEIC: <strong>{toeicSavedCount}</strong>) • Lưu cục bộ trên trình duyệt
              </p>
            </div>

            {/* Actions for Saved Words */}
            <div className="wordlist-header-actions saved-header-actions">
              <button
                type="button"
                className="btn-backup"
                onClick={handleCopyAllSaved}
                disabled={filteredSavedWords.length === 0}
                title="Sao chép toàn bộ từ tiếng Anh trong danh sách này vào bộ nhớ tạm"
              >
                <Copy size={15} /> Sao chép tất cả
              </button>

              <button
                type="button"
                className="btn-backup"
                onClick={() => setIsTxtModalOpen(true)}
                disabled={filteredSavedWords.length === 0}
                title="Xem trước và tải về file TXT"
              >
                <FileText size={15} /> Xuất TXT
              </button>

              {onStartReviewSaved && (
                <button
                  type="button"
                  className="btn btn-primary btn-review-saved"
                  onClick={handleReviewSaved}
                  disabled={filteredSavedWords.length === 0}
                  title="Ôn tập các từ đã lưu trên Flashcard"
                >
                  <RotateCw size={15} /> Ôn tập Flashcard ({filteredSavedWords.length})
                </button>
              )}
            </div>
          </div>

          {/* Toolbar: Search and Filter */}
          <div className="wordlist-toolbar">
            <div className="wordlist-search-wrapper">
              <Search size={18} className="wordlist-search-icon" />
              <input
                type="text"
                className="wordlist-search-input"
                placeholder="Tìm từ vựng hoặc nghĩa đã lưu..."
                value={savedSearchTerm}
                onChange={(e) => setSavedSearchTerm(e.target.value)}
              />
            </div>

            <div className="wordlist-filters-group">
              <FilterDropdown
                icon={<Filter size={15} color="var(--accent-cyan)" />}
                label={currentSavedSourceLabel}
                countBadge={currentSavedSourceCount}
                badgeType={savedSourceFilter === 'toeic' ? 'toeic' : (savedSourceFilter === 'oxford' ? 'oxford' : 'default')}
                items={savedSourceItems}
                selectedValue={savedSourceFilter}
                onSelect={(val) => setSavedSourceFilter(val)}
                align="left"
                title="Lọc danh sách theo nguồn từ"
              />
            </div>
          </div>

          {/* Grid Cards of Saved Words */}
          <div className="wordlist-grid saved-words-grid">
            {filteredSavedWords.length === 0 ? (
              <div className="saved-empty-state">
                {savedWords.length === 0 ? (
                  <>
                    <div className="saved-empty-icon">
                      <Bookmark size={42} color="#fbbf24" fill="#fbbf24" />
                    </div>
                    <h3 className="saved-empty-title">Chưa có từ nào trong danh sách ôn lại!</h3>
                    <p className="saved-empty-desc">
                      Khi học ở chế độ <strong>Flashcard</strong>, <strong>Trắc nghiệm</strong> hoặc <strong>Gõ đáp án</strong>, hãy nhấp vào biểu tượng <strong>Bookmark (Đánh dấu)</strong> ở góc trên bên phải để lưu lại từ vựng bạn muốn ôn kỹ hơn.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="saved-empty-title">Không tìm thấy từ nào khớp với bộ lọc!</h3>
                    <p className="saved-empty-desc">Hãy thử tìm với từ khóa khác hoặc chuyển bộ lọc sang "Tất cả nguồn".</p>
                  </>
                )}
              </div>
            ) : (
              filteredSavedWords.map((item) => {
                const sources = item.sources || [item.source || 'oxford'];
                const hasToeic = sources.includes('toeic');
                const hasOxford = sources.includes('oxford');

                return (
                  <div key={item.word} className="wordlist-item saved-card-item">
                    {/* Top: Badges & Action Buttons */}
                    <div className="word-card-top">
                      <div className="word-badges-wrapper">
                        {item.type && (
                          <span className={`badge badge-${item.type}`}>
                            {item.type}
                          </span>
                        )}
                        {hasOxford && (
                          <span className="badge badge-oxford-tag">Oxford</span>
                        )}
                        {hasToeic && (
                          <span className="badge badge-toeic-tag">TOEIC</span>
                        )}
                      </div>

                      <div className="word-actions">
                        <button
                          type="button"
                          className="icon-btn sound-icon-btn"
                          onClick={(e) => handleSpeakWord(item, e)}
                          title="Nghe phát âm (Sonia)"
                          aria-label="Nghe phát âm"
                        >
                          <Volume2 size={15} />
                        </button>

                        <button
                          type="button"
                          className="icon-btn copy-icon-btn"
                          onClick={(e) => handleCopySingleWord(item.word, e)}
                          title="Sao chép từ tiếng Anh"
                          aria-label="Sao chép từ"
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          type="button"
                          className="icon-btn delete-icon-btn"
                          onClick={(e) => handleRemoveSingleWord(item.word, e)}
                          title="Bỏ lưu khỏi danh sách ôn lại"
                          aria-label="Bỏ lưu"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Content: English word & Vietnamese Meaning & Thumbnail */}
                    <div className="saved-card-content">
                      {item.image && (
                        <div className="saved-thumb-wrapper">
                          <img
                            src={item.image}
                            alt={item.word}
                            className="saved-thumb-img"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="saved-word-info">
                        <div className="word-english">{item.word}</div>
                        {item.meaning && (
                          <div className="word-vietnamese">{item.meaning}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal xem trước và xuất file TXT */}
      <TxtPreviewModal
        isOpen={isTxtModalOpen}
        onClose={() => setIsTxtModalOpen(false)}
        wordsList={filteredSavedWords}
        title={`Xem trước file TXT (${filteredSavedWords.length} từ)`}
      />

      {/* Modal Add / Edit Word */}
      {modalMode && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? '➕ Thêm từ vựng mới' : '✏️ Chỉnh sửa từ vựng'}</h3>
              <button className="icon-btn" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '0.88rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Từ tiếng Anh</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: persistent"
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Từ loại</label>
                <select
                  className="form-select"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  <option value="noun">Danh từ (noun)</option>
                  <option value="verb">Động từ (verb)</option>
                  <option value="adjective">Tính từ (adjective)</option>
                  <option value="adverb">Trạng từ (adverb)</option>
                  <option value="preposition">Giới từ (preposition)</option>
                  <option value="phrase">Cụm từ (phrase)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nghĩa tiếng Việt</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: kiên trì, bền bỉ"
                  value={formMeaning}
                  onChange={(e) => setFormMeaning(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thuộc Vòng / Unit</label>
                <select
                  className="form-select"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                >
                  <option value="Vòng 1">Vòng 1</option>
                  <option value="Vòng 2">Vòng 2</option>
                  <option value="Vòng 3">Vòng 3</option>
                  <option value="Vòng 4">Vòng 4</option>
                  <option value="Vòng 5">Vòng 5</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Check size={16} /> Lưu từ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

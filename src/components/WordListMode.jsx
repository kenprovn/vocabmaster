import React, { useState, useRef, useMemo } from 'react';
import { Volume2, Search, Plus, Edit2, Trash2, X, Check, Download, Upload, Filter, ChevronLeft, ChevronRight, Layers, RotateCcw } from 'lucide-react';
import { speakWord } from '../utils/speech';

export default function WordListMode({ 
  words, 
  totalAllWords,
  selectedUnit = 'Tất cả',
  onSelectUnit,
  unitCounts,
  onResetDefault,
  onAddWord, 
  onUpdateWord, 
  onDeleteWord, 
  onToggleKnown,
  onImportWords 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'new' | 'learning' | 'mastered'
  const [currentPage, setCurrentPage] = useState(1);
  const wordsPerPage = 50;

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

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
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
              title="Khôi phục lại trọn bộ 2978 từ vựng gốc (5 Vòng)"
            >
              <RotateCcw size={15} /> 3000 từ gốc
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
            placeholder="Tìm kiếm theo từ tiếng Anh hoặc nghĩa tiếng Việt..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="wordlist-filters-group">
          {/* Lọc theo Unit */}
          {onSelectUnit && (
            <div className="wordlist-filter-item">
              <Layers size={16} color="var(--accent-cyan)" />
              <select 
                className="wordlist-filter-select unit-dropdown"
                value={selectedUnit}
                onChange={(e) => {
                  onSelectUnit(e.target.value);
                  setCurrentPage(1);
                }}
                title="Lọc từ vựng theo Unit / Vòng"
              >
                {['Tất cả', 'Vòng 1', 'Vòng 2', 'Vòng 3', 'Vòng 4', 'Vòng 5'].map(u => (
                  <option key={u} value={u}>
                    {u} {unitCounts && unitCounts[u] !== undefined ? `(${unitCounts[u]})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lọc theo Trạng thái */}
          <div className="wordlist-filter-item">
            <Filter size={16} color="var(--text-muted)" />
            <select 
              className="wordlist-filter-select"
              value={statusFilter}
              onChange={handleFilterChange}
              title="Lọc từ vựng theo trạng thái học"
            >
              <option value="all">Tất cả trạng thái ({words.length})</option>
              <option value="new">Chưa học</option>
              <option value="learning">Cần ôn</option>
              <option value="mastered">Đã thuộc ({knownCount})</option>
            </select>
          </div>
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
                  {item.word}
                </div>

                <div className="wordlist-meaning">
                  {item.meaning}
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
                    <span>{isKnown ? '✓ Đã biết (làm mờ)' : 'Chưa biết'}</span>
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

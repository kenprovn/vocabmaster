import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, BookOpen, Target, Sparkles, GraduationCap } from 'lucide-react';
import { OXFORD_3000_UNIT_NAMES, OXFORD_5000_EXTRA_UNIT_NAMES, OXFORD_5000_EXTRA_NAME, OXFORD_5000_ALL_NAME } from '../data/oxford5000Data';

export default function CustomUnitSelector({
  selectedUnit,
  onSelectUnit,
  oxfordCounts = {},
  toeicCount = 1650,
  toeicCounts = {},
  toeicUnitName = 'TOEIC Cơ Bản',
  align = 'right', // 'right' | 'left'
  oxford5000Count = 1996,
  oxford5000Counts = {},
  oxford3000UnitCounts = {},
  total5000Count = 4974
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Xác định tab ban đầu dựa trên selectedUnit
  const getInitialTab = () => {
    if (selectedUnit === toeicUnitName || (typeof selectedUnit === 'string' && selectedUnit.startsWith('TOEIC'))) {
      return 'toeic';
    }
    if (
      selectedUnit === OXFORD_5000_EXTRA_NAME ||
      selectedUnit === OXFORD_5000_ALL_NAME ||
      selectedUnit === 'Tất cả Oxford 5000' ||
      selectedUnit === 'Tất cả Oxford 5000 Extra' ||
      (typeof selectedUnit === 'string' && selectedUnit.startsWith('Unit ') && parseInt(selectedUnit.replace('Unit ', ''), 10) >= 31)
    ) {
      return 'oxford5000';
    }
    return 'oxford3000';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Tự động đồng bộ activeTab khi selectedUnit thay đổi từ ngoài
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [selectedUnit]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (unit) => {
    onSelectUnit(unit);
    setIsOpen(false);
  };

  const isToeicSelected = selectedUnit === toeicUnitName || (typeof selectedUnit === 'string' && selectedUnit.startsWith('TOEIC - Vòng'));

  const isOxford5000Selected = (
    selectedUnit === OXFORD_5000_EXTRA_NAME ||
    selectedUnit === OXFORD_5000_ALL_NAME ||
    selectedUnit === 'Tất cả Oxford 5000' ||
    selectedUnit === 'Tất cả Oxford 5000 Extra' ||
    (typeof selectedUnit === 'string' && selectedUnit.startsWith('Unit ') && parseInt(selectedUnit.replace('Unit ', ''), 10) >= 31)
  );

  // Thông tin hiển thị trên trigger button
  const getSelectedInfo = () => {
    if (selectedUnit === toeicUnitName) {
      return { name: 'Tất cả TOEIC', count: toeicCount, theme: 'theme-toeic', icon: <Target size={16} /> };
    }
    if (selectedUnit && selectedUnit.startsWith('TOEIC - Vòng')) {
      const count = toeicCounts[selectedUnit] !== undefined ? toeicCounts[selectedUnit] : 330;
      return { name: selectedUnit, count, theme: 'theme-toeic', icon: <Target size={16} /> };
    }
    if (selectedUnit === OXFORD_5000_EXTRA_NAME || selectedUnit === 'Tất cả Oxford 5000 Extra') {
      return { name: 'Oxford 5000 Extra', count: oxford5000Count, theme: 'theme-oxford5000', icon: <Sparkles size={16} /> };
    }
    if (selectedUnit === OXFORD_5000_ALL_NAME || selectedUnit === 'Tất cả Oxford 5000') {
      return { name: 'Trọn bộ Oxford 5000', count: total5000Count, theme: 'theme-oxford5000', icon: <GraduationCap size={16} /> };
    }
    if (typeof selectedUnit === 'string' && selectedUnit.startsWith('Unit ')) {
      const num = parseInt(selectedUnit.replace('Unit ', ''), 10);
      if (num >= 31) {
        const count = oxford5000Counts[selectedUnit] !== undefined ? oxford5000Counts[selectedUnit] : (num === 50 ? 96 : 100);
        return { name: `Oxford ${selectedUnit}`, count, theme: 'theme-oxford5000', icon: <Sparkles size={16} /> };
      } else {
        const count = oxford3000UnitCounts[selectedUnit] !== undefined ? oxford3000UnitCounts[selectedUnit] : (num === 30 ? 78 : 100);
        return { name: `Oxford ${selectedUnit}`, count, theme: 'theme-oxford', icon: <BookOpen size={16} /> };
      }
    }
    if (selectedUnit === 'Tất cả') {
      return { name: 'Tất cả Oxford 3000', count: oxfordCounts['Tất cả'] || 2978, theme: 'theme-oxford', icon: <BookOpen size={16} /> };
    }
    return { name: `Oxford ${selectedUnit}`, count: oxfordCounts[selectedUnit] || 0, theme: 'theme-oxford', icon: <BookOpen size={16} /> };
  };

  const selectedInfo = getSelectedInfo();

  return (
    <div className={`custom-unit-selector ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`unit-selector-btn ${isOpen ? 'active' : ''} ${selectedInfo.theme}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Chọn bộ từ / unit để học"
      >
        <span className="selector-icon">
          {selectedInfo.icon}
        </span>
        <span className="selector-label-text">
          <span className="selector-sub">Bộ từ:</span>
          <span className="selector-current-row">
            <strong className="selector-current">{selectedInfo.name}</strong>
            <span className={`selector-count-badge ${
              selectedInfo.theme === 'theme-toeic'
                ? 'badge-toeic-chip'
                : selectedInfo.theme === 'theme-oxford5000'
                  ? 'badge-oxford5000-chip'
                  : 'badge-oxford-chip'
            }`}>
              {selectedInfo.count}
            </span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`selector-arrow ${isOpen ? 'rotated' : ''}`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`unit-dropdown-menu align-${align}`}
          role="listbox"
          tabIndex={-1}
        >
          {/* Tabs chuyển đổi các Bộ từ */}
          <div className="selector-tabs-bar">
            <button
              type="button"
              className={`selector-tab-btn ${activeTab === 'oxford3000' ? 'active' : ''}`}
              onClick={() => setActiveTab('oxford3000')}
            >
              <BookOpen size={13} />
              <span>Oxford 3000</span>
            </button>
            <button
              type="button"
              className={`selector-tab-btn ${activeTab === 'oxford5000' ? 'active tab-oxford5000' : ''}`}
              onClick={() => setActiveTab('oxford5000')}
            >
              <Sparkles size={13} />
              <span>Oxford 5000</span>
            </button>
            <button
              type="button"
              className={`selector-tab-btn ${activeTab === 'toeic' ? 'active tab-toeic' : ''}`}
              onClick={() => setActiveTab('toeic')}
            >
              <Target size={13} />
              <span>TOEIC</span>
            </button>
          </div>

          {/* TAB 1: Oxford 3000 */}
          {activeTab === 'oxford3000' && (
            <div className="dropdown-group animate-fade-in">
              <div className="dropdown-group-header">
                <span className="group-badge badge-oxford">
                  <BookOpen size={13} />
                  <span>Oxford 3000 (2.978 từ căn bản)</span>
                </span>
              </div>

              <div className="dropdown-group-items">
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedUnit === 'Tất cả'}
                  className={`dropdown-item ${selectedUnit === 'Tất cả' ? 'selected' : ''}`}
                  onClick={() => handleSelect('Tất cả')}
                >
                  <span className="item-name">Tất cả Oxford 3000</span>
                  <div className="item-meta">
                    <span className="item-badge-count">({oxfordCounts['Tất cả'] || 2978} từ)</span>
                    {selectedUnit === 'Tất cả' && <Check size={16} className="item-check" />}
                  </div>
                </button>

                <div className="selector-sub-title">5 Vòng học truyền thống:</div>
                <div className="selector-rounds-grid">
                  {['Vòng 1', 'Vòng 2', 'Vòng 3', 'Vòng 4', 'Vòng 5'].map((vong) => {
                    const count = oxfordCounts[vong] || 0;
                    const isSelected = selectedUnit === vong;
                    return (
                      <button
                        key={vong}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`round-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(vong)}
                        title={`${vong} (${count} từ)`}
                      >
                        <span>{vong}</span>
                        <small>({count})</small>
                      </button>
                    );
                  })}
                </div>

                <div className="selector-sub-title">30 Unit theo lộ trình (100 từ/Unit):</div>
                <div className="selector-units-grid">
                  {OXFORD_3000_UNIT_NAMES.map((unitName) => {
                    const isSelected = selectedUnit === unitName;
                    const num = parseInt(unitName.replace('Unit ', ''), 10);
                    const count = oxford3000UnitCounts[unitName] !== undefined ? oxford3000UnitCounts[unitName] : (num === 30 ? 78 : 100);
                    return (
                      <button
                        key={unitName}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`unit-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(unitName)}
                        title={`${unitName} (${count} từ)`}
                      >
                        <span className="unit-chip-title">{unitName}</span>
                        <span className="unit-chip-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Oxford 5000 Extra & Trọn bộ */}
          {activeTab === 'oxford5000' && (
            <div className="dropdown-group animate-fade-in">
              <div className="dropdown-group-header">
                <span className="group-badge badge-oxford5000">
                  <Sparkles size={13} />
                  <span>Oxford 5000 Extra (1.996 từ B2–C1)</span>
                </span>
              </div>

              <div className="dropdown-group-items">
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedUnit === OXFORD_5000_EXTRA_NAME}
                  className={`dropdown-item item-oxford5000 ${selectedUnit === OXFORD_5000_EXTRA_NAME ? 'selected' : ''}`}
                  onClick={() => handleSelect(OXFORD_5000_EXTRA_NAME)}
                >
                  <span className="item-name">Tất cả Oxford 5000 Extra</span>
                  <div className="item-meta">
                    <span className="item-badge-count item-count-oxford5000">({oxford5000Count} từ)</span>
                    {selectedUnit === OXFORD_5000_EXTRA_NAME && <Check size={16} className="item-check" />}
                  </div>
                </button>

                <button
                  type="button"
                  role="option"
                  aria-selected={selectedUnit === OXFORD_5000_ALL_NAME}
                  className={`dropdown-item item-oxford5000 ${selectedUnit === OXFORD_5000_ALL_NAME ? 'selected' : ''}`}
                  onClick={() => handleSelect(OXFORD_5000_ALL_NAME)}
                >
                  <span className="item-name">Trọn bộ Oxford 5000 (Unit 1–50)</span>
                  <div className="item-meta">
                    <span className="item-badge-count item-count-oxford5000">({total5000Count} từ)</span>
                    {selectedUnit === OXFORD_5000_ALL_NAME && <Check size={16} className="item-check" />}
                  </div>
                </button>

                <div className="selector-sub-title">20 Unit bổ sung (Unit 31 – Unit 50):</div>
                <div className="selector-units-grid grid-oxford5000">
                  {OXFORD_5000_EXTRA_UNIT_NAMES.map((unitName) => {
                    const isSelected = selectedUnit === unitName;
                    const num = parseInt(unitName.replace('Unit ', ''), 10);
                    const count = oxford5000Counts[unitName] !== undefined ? oxford5000Counts[unitName] : (num === 50 ? 96 : 100);
                    return (
                      <button
                        key={unitName}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`unit-chip-btn chip-oxford5000 ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(unitName)}
                        title={`${unitName} (${count} từ B2-C1)`}
                      >
                        <span className="unit-chip-title">{unitName}</span>
                        <span className="unit-chip-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TOEIC Cơ Bản */}
          {activeTab === 'toeic' && (
            <div className="dropdown-group animate-fade-in">
              <div className="dropdown-group-header">
                <span className="group-badge badge-toeic">
                  <Target size={13} />
                  <span>TOEIC Cơ Bản (1.650 từ)</span>
                </span>
              </div>

              <div className="dropdown-group-items">
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedUnit === toeicUnitName}
                  className={`dropdown-item item-toeic ${selectedUnit === toeicUnitName ? 'selected' : ''}`}
                  onClick={() => handleSelect(toeicUnitName)}
                >
                  <span className="item-name">Tất cả TOEIC</span>
                  <div className="item-meta">
                    <span className="item-badge-count item-count-toeic">({toeicCount} từ)</span>
                    {selectedUnit === toeicUnitName && <Check size={16} className="item-check" />}
                  </div>
                </button>

                <div className="selector-sub-title">5 Vòng học TOEIC (330 từ/vòng):</div>
                {[
                  { id: 'TOEIC - Vòng 1', name: 'Vòng 1', range: '1–330' },
                  { id: 'TOEIC - Vòng 2', name: 'Vòng 2', range: '331–660' },
                  { id: 'TOEIC - Vòng 3', name: 'Vòng 3', range: '661–990' },
                  { id: 'TOEIC - Vòng 4', name: 'Vòng 4', range: '991–1320' },
                  { id: 'TOEIC - Vòng 5', name: 'Vòng 5', range: '1321–1650' }
                ].map((round) => {
                  const count = toeicCounts[round.id] !== undefined ? toeicCounts[round.id] : 330;
                  const isSelected = selectedUnit === round.id;
                  return (
                    <button
                      key={round.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`dropdown-item item-toeic ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(round.id)}
                    >
                      <span className="item-name">
                        {round.name} <small style={{ opacity: 0.75, fontWeight: 'normal', fontSize: '0.8rem' }}>({round.range})</small>
                      </span>
                      <div className="item-meta">
                        <span className="item-badge-count item-count-toeic">({count} từ)</span>
                        {isSelected && <Check size={16} className="item-check" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

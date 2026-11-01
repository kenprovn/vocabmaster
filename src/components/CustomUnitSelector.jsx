import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, BookOpen, Target } from 'lucide-react';

export default function CustomUnitSelector({
  selectedUnit,
  onSelectUnit,
  oxfordCounts = {},
  toeicCount = 1650,
  toeicCounts = {},
  toeicUnitName = 'TOEIC Cơ Bản',
  align = 'right' // 'right' | 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
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

  // Label and count for current active unit
  const getSelectedInfo = () => {
    if (selectedUnit === toeicUnitName) {
      return { name: 'Tất cả TOEIC', count: toeicCount, isToeic: true };
    }
    if (selectedUnit && selectedUnit.startsWith('TOEIC - Vòng')) {
      const count = toeicCounts[selectedUnit] !== undefined ? toeicCounts[selectedUnit] : 330;
      return { name: selectedUnit, count, isToeic: true };
    }
    if (selectedUnit === 'Tất cả') {
      return { name: 'Tất cả Oxford', count: oxfordCounts['Tất cả'] || 2978, isToeic: false };
    }
    return { name: `Oxford ${selectedUnit}`, count: oxfordCounts[selectedUnit] || 0, isToeic: false };
  };

  const selectedInfo = getSelectedInfo();

  return (
    <div className={`custom-unit-selector ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`unit-selector-btn ${isOpen ? 'active' : ''} ${isToeicSelected ? 'theme-toeic' : 'theme-oxford'}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Chọn bộ từ / unit để học"
      >
        <span className="selector-icon">
          {isToeicSelected ? <Target size={16} /> : <BookOpen size={16} />}
        </span>
        <span className="selector-label-text">
          <span className="selector-sub">Bộ từ:</span>
          <span className="selector-current-row">
            <strong className="selector-current">{selectedInfo.name}</strong>
            <span className={`selector-count-badge ${isToeicSelected ? 'badge-toeic-chip' : 'badge-oxford-chip'}`}>
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
          {/* Group 1: Oxford 3000 */}
          <div className="dropdown-group">
            <div className="dropdown-group-header">
              <span className="group-badge badge-oxford">
                <BookOpen size={13} />
                <span>Oxford 3000 (~2.978 từ)</span>
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
                <div className="item-text-group">
                  <span className="item-name">Tất cả Oxford</span>
                  <span className="item-count">({oxfordCounts['Tất cả'] || 2978} từ)</span>
                </div>
                {selectedUnit === 'Tất cả' && <Check size={16} className="item-check" />}
              </button>

              {['Vòng 1', 'Vòng 2', 'Vòng 3', 'Vòng 4', 'Vòng 5'].map((vong) => {
                const count = oxfordCounts[vong] || 0;
                const isSelected = selectedUnit === vong;
                return (
                  <button
                    key={vong}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(vong)}
                  >
                    <div className="item-text-group">
                      <span className="item-name">{vong}</span>
                      <span className="item-count">({count} từ)</span>
                    </div>
                    {isSelected && <Check size={16} className="item-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Group 2: TOEIC Cơ Bản */}
          <div className="dropdown-group">
            <div className="dropdown-group-header">
              <span className="group-badge badge-toeic">
                <Target size={13} />
                <span>TOEIC Cơ Bản (~1.650 từ)</span>
              </span>
            </div>

            <div className="dropdown-group-items">
              {/* Mục 1: Tất cả TOEIC (1.650 từ) */}
              <button
                type="button"
                role="option"
                aria-selected={selectedUnit === toeicUnitName}
                className={`dropdown-item item-toeic ${selectedUnit === toeicUnitName ? 'selected' : ''}`}
                onClick={() => handleSelect(toeicUnitName)}
              >
                <div className="item-text-group">
                  <span className="item-name">Tất cả TOEIC</span>
                  <span className="item-count item-count-toeic">({toeicCount} từ)</span>
                </div>
                {selectedUnit === toeicUnitName && <Check size={16} className="item-check" />}
              </button>

              {/* 5 Vòng học TOEIC (mỗi vòng đúng 330 từ theo thứ tự gốc) */}
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
                    <div className="item-text-group">
                      <span className="item-name">
                        {round.name} <small style={{ opacity: 0.75, fontWeight: 'normal', fontSize: '0.8rem' }}>({round.range})</small>
                      </span>
                      <span className="item-count item-count-toeic">({count} từ)</span>
                    </div>
                    {isSelected && <Check size={16} className="item-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

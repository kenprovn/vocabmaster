import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, BookOpen, Target } from 'lucide-react';

export default function CustomUnitSelector({
  selectedUnit,
  onSelectUnit,
  oxfordCounts = {},
  toeicCount = 1650,
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

  // Label text for current active unit
  const getSelectedDisplay = () => {
    if (selectedUnit === toeicUnitName) {
      return `TOEIC Cơ Bản (${toeicCount} từ)`;
    }
    if (selectedUnit === 'Tất cả') {
      return `Tất cả Oxford (${oxfordCounts['Tất cả'] || 2978} từ)`;
    }
    return `${selectedUnit} (${oxfordCounts[selectedUnit] || 0} từ)`;
  };

  const isToeicSelected = selectedUnit === toeicUnitName;

  return (
    <div className="custom-unit-selector" ref={containerRef}>
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
          <strong className="selector-current">{getSelectedDisplay()}</strong>
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
                <span>TOEIC Cơ Bản (1.650 từ)</span>
              </span>
            </div>

            <div className="dropdown-group-items">
              <button
                type="button"
                role="option"
                aria-selected={isToeicSelected}
                className={`dropdown-item item-toeic ${isToeicSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(toeicUnitName)}
              >
                <div className="item-text-group">
                  <span className="item-name">TOEIC Cơ Bản</span>
                  <span className="item-count item-count-toeic">({toeicCount} từ)</span>
                </div>
                {isToeicSelected && <Check size={16} className="item-check" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

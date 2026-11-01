// src/components/FilterDropdown.jsx
// Dropdown lọc danh sách phong cách Pill / Glassmorphism hiện đại cho Kho từ

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function FilterDropdown({
  icon: Icon,
  label,
  countBadge,
  badgeType = 'default', // 'default' | 'toeic' | 'oxford' | 'success'
  groups, // Mảng nhóm items: [{ label, badgeClass, items: [{ value, label, count, isToeic }] }]
  items,  // Hoặc mảng phẳng items: [{ value, label, count, isToeic }]
  selectedValue,
  onSelect,
  align = 'left', // 'left' | 'right'
  title = 'Bộ lọc'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Đóng dropdown khi click bên ngoài hoặc nhấn Esc
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

  const handleItemClick = (val) => {
    onSelect(val);
    setIsOpen(false);
  };

  const renderItem = (item) => {
    const isSelected = selectedValue === item.value;
    return (
      <button
        key={item.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        className={`filter-dropdown-item ${isSelected ? 'is-selected' : ''} ${item.isToeic ? 'item-toeic' : ''}`}
        onClick={() => handleItemClick(item.value)}
      >
        <div className="filter-item-left">
          <span className="filter-item-label">{item.label}</span>
          {item.count !== undefined && item.count !== null && (
            <span className={`filter-item-count ${item.isToeic ? 'count-toeic' : ''}`}>
              {item.count}
            </span>
          )}
        </div>
        {isSelected && <Check size={15} className="filter-item-check" />}
      </button>
    );
  };

  return (
    <div 
      className={`filter-dropdown-container ${isOpen ? 'is-open' : ''}`} 
      ref={containerRef}
    >
      {/* Nút Trigger dạng Pill */}
      <button
        type="button"
        className={`filter-pill-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={title}
      >
        {Icon && (
          <span className="filter-pill-icon">
            {typeof Icon === 'function' ? <Icon size={15} /> : Icon}
          </span>
        )}

        <span className="filter-pill-label">{label}</span>

        {countBadge !== undefined && countBadge !== null && (
          <span className={`filter-pill-badge badge-${badgeType}`}>
            {countBadge}
          </span>
        )}

        <ChevronDown 
          size={14} 
          className={`filter-pill-arrow ${isOpen ? 'rotated' : ''}`} 
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div 
          className={`filter-dropdown-menu align-${align}`}
          role="listbox"
        >
          {groups ? (
            groups.map((group, gIdx) => (
              <div key={gIdx} className="filter-dropdown-group">
                {group.label && (
                  <div className="filter-group-header">
                    <span className={`filter-group-badge ${group.badgeClass || ''}`}>
                      {group.label}
                    </span>
                  </div>
                )}
                <div className="filter-group-items">
                  {group.items.map(renderItem)}
                </div>
                {gIdx < groups.length - 1 && <div className="filter-dropdown-divider" />}
              </div>
            ))
          ) : (
            <div className="filter-group-items">
              {items && items.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


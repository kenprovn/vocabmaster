// src/components/SessionStatsPanel.jsx
// Panel Thống kê phiên luyện tập (Session Statistics) cho Quiz và Typing

import React, { useState } from 'react';
import { BarChart3, RotateCcw, ChevronDown, ChevronUp, CheckCircle, XCircle, Award, Target } from 'lucide-react';

export default function SessionStatsPanel({
  correct = 0,
  wrong = 0,
  onReset,
  modeName = 'Luyện tập',
  unitName = '',
  maxWidth = '680px'
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const done = Math.max(0, correct + wrong);
  const accuracy = done > 0 ? Math.round((correct / done) * 100) : 0;

  const handleResetClick = (e) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đặt lại thống kê phiên luyện tập (${modeName}${unitName ? ` - ${unitName}` : ''}) về 0 không?\n\n(Tiến độ từ vựng, điểm số tích lũy và Bookmark sẽ được giữ nguyên).`
    );
    if (confirmed && onReset) {
      onReset();
    }
  };

  return (
    <div 
      className={`session-stats-panel glass-panel ${isCollapsed ? 'is-collapsed' : ''}`}
      style={{ maxWidth }}
      aria-label="Thống kê phiên luyện tập"
    >
      {/* Panel Header */}
      <div className="stats-panel-header" onClick={() => setIsCollapsed(prev => !prev)}>
        <div className="stats-panel-title-group">
          <div className="stats-panel-icon-badge">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="stats-panel-heading">Thống kê phiên luyện tập</h3>
            {(modeName || unitName) && (
              <span className="stats-panel-subtag">
                {modeName} {unitName && `• ${unitName}`}
              </span>
            )}
          </div>
        </div>

        <div className="stats-panel-actions">
          {/* Nút đặt lại thống kê */}
          <button
            type="button"
            className="btn-stats-reset"
            onClick={handleResetClick}
            title="Đặt lại thống kê phiên này về 0"
            aria-label="Đặt lại thống kê phiên"
          >
            <RotateCcw size={13} />
            <span className="reset-label">Đặt lại</span>
          </button>

          {/* Nút thu gọn / mở rộng */}
          <button
            type="button"
            className="btn-stats-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(prev => !prev);
            }}
            title={isCollapsed ? 'Mở rộng bảng thống kê' : 'Thu gọn bảng thống kê'}
            aria-expanded={!isCollapsed}
            aria-label="Thu gọn hoặc mở rộng"
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Mini summary row khi thu gọn (collapsed) */}
      {isCollapsed && (
        <div className="stats-collapsed-summary" onClick={() => setIsCollapsed(false)}>
          <span className="collapsed-item item-done">Đã làm: <strong>{done}</strong></span>
          <span className="collapsed-sep">•</span>
          <span className="collapsed-item item-correct">Đúng: <strong>{correct}</strong></span>
          <span className="collapsed-sep">•</span>
          <span className="collapsed-item item-wrong">Sai: <strong>{wrong}</strong></span>
          <span className="collapsed-sep">•</span>
          <span className="collapsed-item item-acc">Chính xác: <strong>{accuracy}%</strong></span>
        </div>
      )}

      {/* Main Expanded View */}
      {!isCollapsed && (
        <div className="stats-expanded-content">
          {/* 4 chỉ số chính */}
          <div className="stats-metrics-grid">
            {/* 1. Đã làm */}
            <div className="stat-metric-card metric-done">
              <div className="metric-header">
                <Target size={14} className="metric-icon" />
                <span className="metric-label">Đã làm</span>
              </div>
              <div className="metric-value">{done}</div>
              <span className="metric-hint">lượt chấm</span>
            </div>

            {/* 2. Đúng */}
            <div className="stat-metric-card metric-correct">
              <div className="metric-header">
                <CheckCircle size={14} className="metric-icon" />
                <span className="metric-label">Đúng</span>
              </div>
              <div className="metric-value">{correct}</div>
              <span className="metric-hint">câu đúng</span>
            </div>

            {/* 3. Sai */}
            <div className="stat-metric-card metric-wrong">
              <div className="metric-header">
                <XCircle size={14} className="metric-icon" />
                <span className="metric-label">Sai</span>
              </div>
              <div className="metric-value">{wrong}</div>
              <span className="metric-hint">cần chú ý</span>
            </div>

            {/* 4. Chính xác */}
            <div className="stat-metric-card metric-accuracy">
              <div className="metric-header">
                <Award size={14} className="metric-icon" />
                <span className="metric-label">Chính xác</span>
              </div>
              <div className="metric-value">
                {accuracy}<span className="metric-percent">%</span>
              </div>
              <span className="metric-hint">{done > 0 ? `${correct}/${done} câu` : 'chưa có'}</span>
            </div>
          </div>

          {/* Thanh tiến trình tỷ lệ chính xác */}
          <div className="stats-progress-wrapper" title={`Tỷ lệ chính xác: ${accuracy}%`}>
            <div className="stats-progress-track">
              <div 
                className="stats-progress-fill" 
                style={{ 
                  width: `${accuracy}%`,
                  background: accuracy >= 80 
                    ? 'linear-gradient(90deg, #8b5cf6 0%, #10b981 100%)' 
                    : accuracy >= 50 
                      ? 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)' 
                      : 'linear-gradient(90deg, #f43f5e 0%, #8b5cf6 100%)'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


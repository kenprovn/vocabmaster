// src/components/AutoNextCountdownBar.jsx
// Thanh tiến trình đếm ngược Auto Next mảnh, tinh tế kèm nút hủy giữ lại câu hỏi

import React from 'react';
import { X, Play } from 'lucide-react';

export default function AutoNextCountdownBar({
  isCounting,
  progressPercent,
  duration,
  isCorrect,
  onCancel
}) {
  if (!isCounting) return null;

  const barColor = isCorrect ? '#10b981' : '#a855f7';

  return (
    <div className="autonext-countdown-wrapper animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="autonext-countdown-header">
        <div className="autonext-countdown-label">
          <Play size={12} fill={barColor} color={barColor} className="pulse-icon" />
          <span>Tự chuyển câu sau <strong>{duration}s</strong>...</span>
        </div>
        <button
          type="button"
          className="autonext-cancel-btn"
          onClick={onCancel}
          title="Dừng tự chuyển để xem lại câu hỏi này"
        >
          <X size={12} /> Dừng chuyển
        </button>
      </div>

      <div className="autonext-progress-track">
        <div
          className="autonext-progress-fill"
          style={{
            width: `${Math.max(0, Math.min(100, progressPercent))}%`,
            backgroundColor: barColor
          }}
        />
      </div>
    </div>
  );
}


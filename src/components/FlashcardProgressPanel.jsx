// src/components/FlashcardProgressPanel.jsx
// Thanh tiến độ tự đánh giá thiết kế rõ ràng, dễ đọc, đồng bộ giao diện Dark Mode

import React, { useMemo } from 'react';
import { CheckCircle2, HelpCircle, Layers, BookOpen } from 'lucide-react';

export default function FlashcardProgressPanel({ words = [], className = '' }) {
  const stats = useMemo(() => {
    const total = words.length;
    let masteredCount = 0;
    let learningCount = 0;

    for (let i = 0; i < total; i++) {
      const st = words[i]?.status;
      if (st === 'known' || st === 'mastered') {
        masteredCount++;
      } else if (st === 'learning') {
        learningCount++;
      }
    }

    const evaluatedCount = masteredCount + learningCount;
    const newCount = Math.max(0, total - evaluatedCount);
    const percentEvaluated = total > 0 ? Math.round((evaluatedCount / total) * 100) : 0;
    const masteredRatio = total > 0 ? (masteredCount / total) * 100 : 0;
    const learningRatio = total > 0 ? (learningCount / total) * 100 : 0;

    return {
      total,
      masteredCount,
      learningCount,
      evaluatedCount,
      newCount,
      percentEvaluated,
      masteredRatio,
      learningRatio
    };
  }, [words]);

  return (
    <div className={`flashcard-eval-progress-card ${className}`}>
      {/* Hàng 1: Tiêu đề tiến độ tự đánh giá & số lượng chưa học */}
      <div className="eval-progress-header">
        <div className="eval-progress-title">
          <Layers size={17} className="eval-icon-pulse text-accent" />
          <span className="eval-label">Tiến độ tự đánh giá:</span>
          <strong className="eval-highlight-text">
            {stats.evaluatedCount} / {stats.total} từ
          </strong>
          <span className="eval-percent-badge">{stats.percentEvaluated}%</span>
        </div>

        <div className="eval-new-counter" title="Số từ chưa được đánh giá trong vòng này">
          <BookOpen size={14} className="eval-new-icon" />
          <span>Chưa học:</span>
          <strong>{stats.newCount}</strong>
        </div>
      </div>

      {/* Hàng 2: Thanh tiến độ 2 màu phân đoạn (xanh ngọc Đã nhớ + đỏ hồng Chưa nhớ) */}
      <div 
        className="eval-progress-bar-track" 
        title={`Đã nhớ: ${stats.masteredCount} | Chưa nhớ: ${stats.learningCount} | Chưa học: ${stats.newCount}`}
      >
        <div 
          className="eval-bar-fill-mastered" 
          style={{ width: `${stats.masteredRatio}%` }} 
        />
        <div 
          className="eval-bar-fill-learning" 
          style={{ width: `${stats.learningRatio}%` }} 
        />
      </div>

      {/* Hàng 3: Chỉ số chi tiết to rõ, dễ đọc */}
      <div className="eval-progress-stats-row">
        <div className="eval-stat-chip chip-mastered">
          <CheckCircle2 size={16} />
          <span>Đã nhớ:</span>
          <strong>{stats.masteredCount}</strong>
        </div>

        <div className="eval-stat-chip chip-learning">
          <HelpCircle size={16} />
          <span>Chưa nhớ:</span>
          <strong>{stats.learningCount}</strong>
        </div>
      </div>
    </div>
  );
}

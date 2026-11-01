// src/components/WordActionButtons.jsx
// Bộ 3 nút thao tác: Nghe phát âm (Loa) • Sao chép (Copy) • Lưu ôn lại (Bookmark)
// Dùng chung cho Flashcard, Quiz, Typing và Kho từ

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Copy, Bookmark, Check } from 'lucide-react';
import { copyToClipboard, normalizeWordForCopy } from '../utils/clipboard';
import { isWordSaved, toggleSavedWord, subscribeReviewLater, detectSource } from '../utils/reviewLater';
import { showToast } from '../utils/toast';
import { cancelCurrentAutoNext } from '../utils/autoNext';

export default function WordActionButtons({
  wordItem,
  onSpeak,
  source,
  showSpeaker = true,
  showCopy = true,
  showBookmark = true,
  className = '',
  size = 18,
  compact = false
}) {
  const wordText = typeof wordItem === 'string' ? wordItem : (wordItem?.word || '');
  const [isSaved, setIsSaved] = useState(() => isWordSaved(wordText));
  const [justCopied, setJustCopied] = useState(false);

  // Theo dõi cập nhật trạng thái đã lưu từ bất kỳ đâu trong app
  useEffect(() => {
    const unsubscribe = subscribeReviewLater(() => {
      setIsSaved(isWordSaved(wordText));
    });
    return () => unsubscribe();
  }, [wordText]);

  // Xử lý sao chép chỉ từ/cụm từ tiếng Anh (chuẩn hóa chữ thường cho từ vựng thông thường)
  const handleCopy = useCallback(async (e) => {
    cancelCurrentAutoNext();
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    const clean = normalizeWordForCopy(wordText);
    if (!clean) return;

    const ok = await copyToClipboard(clean);
    if (ok) {
      setJustCopied(true);
      showToast('Đã sao chép!', 'success');
      setTimeout(() => setJustCopied(false), 1500);
    } else {
      showToast('Không thể sao chép văn bản!', 'error');
    }
  }, [wordText]);

  // Xử lý lưu / bỏ lưu từ vào danh sách ôn lại
  const handleToggleBookmark = useCallback((e) => {
    cancelCurrentAutoNext();
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    const clean = wordText.trim();
    if (!clean) return;

    const item = typeof wordItem === 'string' ? { word: clean } : wordItem;
    const finalSource = source || detectSource(item);
    const result = toggleSavedWord(item, finalSource);

    setIsSaved(result.saved);
    showToast(result.message, result.saved ? 'success' : 'info');
  }, [wordItem, wordText, source]);

  if (!wordText) return null;

  return (
    <div 
      className={`card-top-actions ${compact ? 'actions-compact' : ''} ${className}`}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* 1. Nút Loa (Phát âm) */}
      {showSpeaker && onSpeak && (
        <button
          type="button"
          className="action-btn sound-btn"
          onClick={(e) => {
            cancelCurrentAutoNext();
            if (e && e.stopPropagation) e.stopPropagation();
            onSpeak(e);
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          title="Nghe phát âm (Phím R)"
          aria-label="Nghe phát âm tiếng Anh"
        >
          <Volume2 size={size} />
        </button>
      )}

      {/* 2. Nút Copy (Chỉ copy từ tiếng Anh) */}
      {showCopy && (
        <button
          type="button"
          className={`action-btn copy-btn ${justCopied ? 'is-copied' : ''}`}
          onClick={handleCopy}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          title={`Sao chép "${wordText}" vào bộ nhớ tạm`}
          aria-label={`Sao chép từ tiếng Anh ${wordText}`}
        >
          {justCopied ? <Check size={size - 1} color="#10b981" /> : <Copy size={size - 1} />}
        </button>
      )}

      {/* 3. Nút Bookmark (Lưu / Bỏ lưu Review Later) */}
      {showBookmark && (
        <button
          type="button"
          className={`action-btn bookmark-btn ${isSaved ? 'is-saved' : ''}`}
          onClick={handleToggleBookmark}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          title={isSaved ? `Đã lưu "${wordText}" (Nhấp để bỏ lưu)` : `Lưu "${wordText}" để ôn lại sau`}
          aria-label={isSaved ? `Bỏ lưu từ ${wordText}` : `Lưu từ ${wordText} để ôn lại sau`}
        >
          <Bookmark 
            size={size - 1} 
            className={isSaved ? 'bookmark-icon-filled' : ''} 
          />
        </button>
      )}
    </div>
  );
}

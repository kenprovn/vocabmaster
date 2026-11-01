// src/components/TxtPreviewModal.jsx
// Modal xem trước và tải file vocabmaster-review-later.txt

import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { downloadReviewLaterTxt } from '../utils/reviewLater';
import { showToast } from '../utils/toast';

export default function TxtPreviewModal({ isOpen, onClose, wordsList, title = 'Xem trước file TXT' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Lọc duy nhất và chuẩn hóa từ tiếng Anh
  const seen = new Set();
  const cleanWords = [];
  (wordsList || []).forEach((item) => {
    const raw = typeof item === 'string' ? item : item?.word;
    const clean = (raw || '').trim();
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      cleanWords.push(clean);
    }
  });

  const txtContent = cleanWords.join('\r\n');

  const handleCopyAll = async () => {
    if (cleanWords.length === 0) {
      showToast('Danh sách từ đang trống!', 'warning');
      return;
    }
    const success = await copyToClipboard(txtContent);
    if (success) {
      setCopied(true);
      showToast(`Đã sao chép toàn bộ ${cleanWords.length} từ vào bộ nhớ tạm!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Không thể sao chép văn bản!', 'error');
    }
  };

  const handleDownload = () => {
    if (cleanWords.length === 0) {
      showToast('Danh sách từ đang trống, không có gì để tải!', 'warning');
      return;
    }
    const success = downloadReviewLaterTxt(txtContent, 'vocabmaster-review-later.txt');
    if (success) {
      showToast(`Đã tải về vocabmaster-review-later.txt (${cleanWords.length} từ)`, 'success');
    } else {
      showToast('Lỗi khi tải file TXT!', 'error');
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div 
        className="glass-panel modal-card txt-preview-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="txt-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <FileText size={20} color="var(--primary-glow)" />
            </div>
            <div>
              <h3 id="txt-modal-title" className="modal-title">
                {title}
              </h3>
              <p className="modal-subtitle">
                Định dạng: Chuẩn UTF-8 • Mỗi từ 1 dòng • {cleanWords.length} từ
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            title="Đóng cửa sổ (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Preview Box */}
        <div className="modal-body">
          <div className="txt-preview-container">
            <div className="txt-preview-toolbar">
              <span className="txt-file-name">vocabmaster-review-later.txt</span>
              <span className="txt-line-count">{cleanWords.length} dòng</span>
            </div>
            <textarea
              className="txt-preview-textarea"
              readOnly
              value={txtContent}
              placeholder="Chưa có từ vựng nào trong danh sách..."
              rows={Math.min(Math.max(cleanWords.length, 6), 14)}
            />
          </div>

          <p className="txt-preview-note">
            💡 File tải về có mã hóa <strong>UTF-8 (kèm BOM)</strong>, tương thích 100% với Windows Notepad, macOS TextEdit, Google Docs và Anki.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer txt-modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleCopyAll}
            disabled={cleanWords.length === 0}
            title="Sao chép toàn bộ danh sách này để dán vào ứng dụng khác"
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            {copied ? 'Đã sao chép!' : 'Sao chép tất cả'}
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={cleanWords.length === 0}
            title="Tải file vocabmaster-review-later.txt về máy"
          >
            <Download size={16} /> Tải file TXT
          </button>
        </div>
      </div>
    </div>
  );
}


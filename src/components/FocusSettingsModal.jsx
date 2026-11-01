// src/components/FocusSettingsModal.jsx
// Modal cấu hình Focus Mode 2.0: Presets, Thành phần hiển thị và Vị trí Flashcard

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sliders, 
  Sparkles, 
  Layers, 
  RotateCcw, 
  Check, 
  Navigation, 
  CheckCircle2, 
  HelpCircle, 
  Compass, 
  ArrowUpDown,
  Volume2,
  Copy,
  Bookmark,
  Eye
} from 'lucide-react';
import { FOCUS_PRESETS, PRESET_CONFIGS, DEFAULT_FOCUS_SETTINGS } from '../utils/focusModeSettings';

export default function FocusSettingsModal({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  onReset,
  safeBounds = { min: -120, max: 120 }
}) {
  const modalRef = useRef(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) {
      setIsPreviewMode(false);
      return;
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isPreviewMode) {
          setIsPreviewMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, isPreviewMode]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentPreset = settings.preset;
  const elements = settings.elements;
  const positionMode = settings.positionMode;
  const offsetY = settings.offsetY;

  // Chọn một Preset có sẵn
  const handleSelectPreset = (presetKey) => {
    if (presetKey === FOCUS_PRESETS.CUSTOM) {
      onChangeSettings({ ...settings, preset: FOCUS_PRESETS.CUSTOM });
    } else {
      const presetElements = PRESET_CONFIGS[presetKey];
      onChangeSettings({
        ...settings,
        preset: presetKey,
        elements: { ...presetElements }
      });
    }
  };

  // Toggle một thành phần riêng lẻ (tự động chuyển sang custom)
  const handleToggleElement = (elementKey) => {
    const updatedElements = {
      ...elements,
      [elementKey]: !elements[elementKey]
    };
    onChangeSettings({
      ...settings,
      preset: FOCUS_PRESETS.CUSTOM,
      elements: updatedElements
    });
  };

  // Thay đổi chế độ vị trí
  const handleChangePositionMode = (mode) => {
    onChangeSettings({
      ...settings,
      positionMode: mode,
      offsetY: mode === 'auto' ? 0 : settings.offsetY
    });
  };

  // Thay đổi offset vị trí
  const handleChangeOffsetY = (newY) => {
    onChangeSettings({
      ...settings,
      positionMode: 'custom',
      offsetY: Math.max(-120, Math.min(120, Number(newY)))
    });
  };

  // Reset vị trí về 0
  const handleResetPosition = () => {
    onChangeSettings({
      ...settings,
      offsetY: 0
    });
  };

  const getOffsetLabel = () => {
    if (offsetY === 0) return '0px (Chính giữa)';
    if (offsetY < 0) return `Lên trên ${Math.abs(offsetY)}px`;
    return `Xuống dưới ${offsetY}px`;
  };

  const modalContent = (
    <div 
      className="focus-settings-overlay"
      onClick={onClose}
    >
      <div 
        className="focus-settings-backdrop"
        aria-hidden="true"
      />

      <div 
        className="focus-settings-modal glass-panel"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-settings-title"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="focus-settings-header">
          <div className="focus-settings-title-group" id="focus-settings-title">
            <Sliders size={18} className="text-accent" />
            <div className="title-text-box">
              <h3>Focus Space</h3>
              <p className="subtitle-text">Không gian học theo cách của bạn.</p>
            </div>
          </div>
          <button
            type="button"
            className="focus-settings-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Đóng bảng cài đặt Focus Space (Esc)"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thân Modal (Cuộn mượt) */}
        <div className="focus-settings-body">
          {/* PHẦN 1: CHỌN CHẾ ĐỘ (PRESETS) */}
          <section className="settings-section">
            <div className="settings-section-title">
              <Sparkles size={16} />
              <span>Chế độ học</span>
            </div>

            <div className="focus-presets-grid">
              <button
                type="button"
                className={`preset-btn ${currentPreset === FOCUS_PRESETS.STANDARD ? 'is-active' : ''}`}
                onClick={() => handleSelectPreset(FOCUS_PRESETS.STANDARD)}
              >
                <div className="preset-name">Đầy đủ</div>
                <div className="preset-desc">Tất cả công cụ và tiến độ</div>
              </button>

              <button
                type="button"
                className={`preset-btn ${currentPreset === FOCUS_PRESETS.MINIMAL ? 'is-active' : ''}`}
                onClick={() => handleSelectPreset(FOCUS_PRESETS.MINIMAL)}
              >
                <div className="preset-name">Tối giản</div>
                <div className="preset-desc">Chỉ giữ công cụ thiết yếu</div>
              </button>

              <button
                type="button"
                className={`preset-btn ${currentPreset === FOCUS_PRESETS.ZEN ? 'is-active' : ''}`}
                onClick={() => handleSelectPreset(FOCUS_PRESETS.ZEN)}
              >
                <div className="preset-name">Zen</div>
                <div className="preset-desc">Chỉ Flashcard, không phân tâm</div>
              </button>

              <button
                type="button"
                className={`preset-btn ${currentPreset === FOCUS_PRESETS.CUSTOM ? 'is-active' : ''}`}
                onClick={() => handleSelectPreset(FOCUS_PRESETS.CUSTOM)}
              >
                <div className="preset-name">Tùy chỉnh</div>
                <div className="preset-desc">Hiển thị theo sở thích</div>
              </button>
            </div>
          </section>

          {/* LƯU Ý BẢO TOÀN BA NÚT CỐT LÕI */}
          <div className="core-buttons-notice">
            <div className="notice-icons">
              <Volume2 size={14} />
              <Copy size={14} />
              <Bookmark size={14} />
            </div>
            <span>3 nút <strong>Loa, Copy, Bookmark</strong> bên trong thẻ luôn luôn hiển thị ở mọi chế độ.</span>
          </div>

          {/* PHẦN 2: THÀNH PHẦN HIỂN THỊ */}
          <section className="settings-section">
            <div className="settings-section-title">
              <Layers size={16} />
              <span>Thành phần hiển thị</span>
            </div>

            {/* Nhóm Điều hướng */}
            <div className="toggle-group-card">
              <div className="group-card-header">
                <Navigation size={15} />
                <span>Điều hướng & Thao tác</span>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Số thứ tự từ & Quick Jump</span>
                  <span className="toggle-item-hint">Nhấp số để nhảy nhanh đến từ bất kỳ</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showWordCounter}
                  className={`switch-toggle ${elements.showWordCounter ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showWordCounter')}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Thanh kéo tiến độ (Seek Bar)</span>
                  <span className="toggle-item-hint">Kéo trượt để lướt nhanh toàn bộ bài học</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showSeekBar}
                  className={`switch-toggle ${elements.showSeekBar ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showSeekBar')}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Nút chuyển từ Trước / Tiếp theo</span>
                  <span className="toggle-item-hint">Hai nút điều hướng cơ bản</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showNavPrevNext}
                  className={`switch-toggle ${elements.showNavPrevNext ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showNavPrevNext')}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Nút Xáo trộn từ vựng (Shuffle)</span>
                  <span className="toggle-item-hint">Trộn Fisher-Yates hoặc về thứ tự gốc</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showNavShuffle}
                  className={`switch-toggle ${elements.showNavShuffle ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showNavShuffle')}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Nút Lật nghĩa / Tiếng Anh</span>
                  <span className="toggle-item-hint">Nút hỗ trợ lật thẻ xem nghĩa</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showNavFlip}
                  className={`switch-toggle ${elements.showNavFlip ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showNavFlip')}
                >
                  <span className="switch-slider" />
                </button>
              </div>
            </div>

            {/* Nhóm Đánh giá */}
            <div className="toggle-group-card">
              <div className="group-card-header">
                <CheckCircle2 size={15} />
                <span>Tự đánh giá & Tiến độ</span>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Hai nút Chưa nhớ / Đã nhớ</span>
                  <span className="toggle-item-hint">Cơ chế đánh dấu phân loại và tự toggle hủy</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showEvaluation}
                  className={`switch-toggle ${elements.showEvaluation ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showEvaluation')}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Bảng tiến độ tự đánh giá</span>
                  <span className="toggle-item-hint">Thống kê tỷ lệ và số lượng đã thuộc</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showProgressPanel}
                  className={`switch-toggle ${elements.showProgressPanel ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showProgressPanel')}
                >
                  <span className="switch-slider" />
                </button>
              </div>
            </div>

            {/* Nhóm Hỗ trợ */}
            <div className="toggle-group-card">
              <div className="group-card-header">
                <HelpCircle size={15} />
                <span>Hỗ trợ & Hướng dẫn</span>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Nút Bảng phím tắt nhanh</span>
                  <span className="toggle-item-hint">Hướng dẫn phím tắt hỗ trợ thao tác</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showShortcutBtn}
                  className={`switch-toggle ${elements.showShortcutBtn ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showShortcutBtn')}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              <div className="toggle-item-row">
                <div className="toggle-item-info">
                  <span className="toggle-item-name">Dòng hướng dẫn lật thẻ</span>
                  <span className="toggle-item-hint">Gợi ý lật thẻ ở mặt trước và mặt sau</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={elements.showCardHint}
                  className={`switch-toggle ${elements.showCardHint ? 'is-on' : ''}`}
                  onClick={() => handleToggleElement('showCardHint')}
                >
                  <span className="switch-slider" />
                </button>
              </div>
            </div>
          </section>

          {/* PHẦN 3: VỊ TRÍ FLASHCARD */}
          <section className="settings-section">
            <div className="settings-section-title">
              <Compass size={16} />
              <span>Vị trí Flashcard</span>
            </div>

            <div className="position-mode-selector">
              <button
                type="button"
                className={`position-mode-btn ${positionMode === 'auto' ? 'is-active' : ''}`}
                onClick={() => handleChangePositionMode('auto')}
              >
                <span>📐 Tự động căn giữa</span>
              </button>

              <button
                type="button"
                className={`position-mode-btn ${positionMode === 'custom' ? 'is-active' : ''}`}
                onClick={() => handleChangePositionMode('custom')}
              >
                <span>↕️ Tùy chỉnh dịch chuyển</span>
              </button>
            </div>

            {positionMode === 'custom' && (
              <div className="position-slider-box">
                <div className="position-slider-header">
                  <div className="slider-label">
                    <ArrowUpDown size={14} />
                    <span>Dịch chuyển thẻ:</span>
                  </div>
                  <strong className="slider-val-badge">{getOffsetLabel()}</strong>
                </div>

                <div className="slider-track-container">
                  <span className="slider-bound-hint">Lên -120px</span>
                  <input
                    type="range"
                    min="-120"
                    max="120"
                    step="2"
                    value={offsetY}
                    onInput={(e) => handleChangeOffsetY(e.target.value)}
                    onChange={(e) => handleChangeOffsetY(e.target.value)}
                    className="position-range-input"
                    aria-label="Dịch chuyển thẻ theo chiều dọc thời gian thực"
                  />
                  <span className="slider-bound-hint">Xuống +120px</span>
                </div>

                {offsetY < safeBounds.min && (
                  <div className="safe-bound-notice">
                    🛡️ Giới hạn an toàn thực tế: <strong>{safeBounds.min}px</strong> (tránh che Header).
                  </div>
                )}
                {offsetY > safeBounds.max && (
                  <div className="safe-bound-notice">
                    🛡️ Giới hạn an toàn thực tế: <strong>{safeBounds.max}px</strong> (tránh che công cụ học).
                  </div>
                )}

                <div className="slider-actions-row">
                  <button
                    type="button"
                    className="btn-start-preview"
                    onClick={() => setIsPreviewMode(true)}
                    title="Thu gọn bảng cài đặt để nhìn rõ Flashcard và kéo dịch chuyển trực quan"
                  >
                    <Eye size={14} />
                    <span>Xem trước vị trí trực tiếp</span>
                  </button>

                  {offsetY !== 0 && (
                    <button
                      type="button"
                      className="btn-reset-offset"
                      onClick={handleResetPosition}
                    >
                      <RotateCcw size={13} />
                      <span>Đặt lại (0px)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer Modal */}
        <div className="focus-settings-footer">
          <button
            type="button"
            className="btn-reset-focus-mode"
            onClick={onReset}
            title="Khôi phục toàn bộ cài đặt Focus Space về mặc định"
          >
            <RotateCcw size={14} />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            className="btn-close-focus-modal"
            onClick={onClose}
            title="Lưu và đóng cài đặt Focus Space"
          >
            <Check size={16} />
            <span>Hoàn tất</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isPreviewMode) {
    const previewContent = (
      <div 
        className="focus-preview-bottom-bar animate-fade-in"
        role="dialog"
        aria-label="Thanh xem trước vị trí Flashcard"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* HÀNG 1: Vị trí thẻ & Nút Đặt lại */}
        <div className="preview-bar-row-header">
          <div className="preview-bar-label">
            <Eye size={15} className="text-accent" />
            <span className="preview-label-text">Vị trí:</span>
            <strong className="slider-val-badge">{getOffsetLabel()}</strong>
          </div>

          <div className="preview-bar-header-actions">
            {offsetY !== 0 && (
              <button
                type="button"
                className="btn-preview-reset"
                onClick={handleResetPosition}
                title="Đặt lại vị trí giữa (0px)"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>
            )}

            <button
              type="button"
              className="btn-preview-done btn-preview-done-desktop"
              onClick={() => setIsPreviewMode(false)}
              title="Hoàn tất xem trước và quay lại bảng cài đặt"
            >
              <Check size={14} />
              <span>Hoàn tất</span>
            </button>
          </div>
        </div>

        {/* HÀNG 2: [ Lên ] ───── SLIDER ───── [ Xuống ] */}
        <div className="preview-slider-container">
          <span className="slider-bound-hint">Lên</span>
          <input
            type="range"
            min="-120"
            max="120"
            step="2"
            value={offsetY}
            onInput={(e) => handleChangeOffsetY(e.target.value)}
            onChange={(e) => handleChangeOffsetY(e.target.value)}
            className="position-range-input preview-slider-input"
            aria-label="Dịch chuyển thẻ theo chiều dọc thời gian thực"
          />
          <span className="slider-bound-hint">Xuống</span>
        </div>

        {/* Cảnh báo an toàn nếu chạm ngưỡng giới hạn */}
        {offsetY < safeBounds.min && (
          <div className="safe-bound-notice preview-safe-bound-notice">
            🛡️ Giới hạn an toàn: <strong>{safeBounds.min}px</strong> (tránh che Header).
          </div>
        )}
        {offsetY > safeBounds.max && (
          <div className="safe-bound-notice preview-safe-bound-notice">
            🛡️ Giới hạn an toàn: <strong>{safeBounds.max}px</strong> (tránh che công cụ học).
          </div>
        )}

        {/* HÀNG 3: Nút Hoàn tất to rõ trên Mobile */}
        <div className="preview-bar-row-footer-mobile">
          <button
            type="button"
            className="btn-preview-done btn-preview-done-mobile"
            onClick={() => setIsPreviewMode(false)}
            title="Hoàn tất xem trước và quay lại bảng cài đặt"
          >
            <Check size={16} />
            <span>Hoàn tất</span>
          </button>
        </div>
      </div>
    );

    return createPortal(previewContent, document.body);
  }

  return createPortal(modalContent, document.body);
}


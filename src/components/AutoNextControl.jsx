// src/components/AutoNextControl.jsx
// Widget điều khiển Auto Next (Bật/Tắt & Cài đặt 3 chế độ + thời gian)

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Check, X, Clock, SlidersHorizontal } from 'lucide-react';
import { 
  getAutoNextSettings, 
  saveAutoNextSettings, 
  subscribeAutoNext, 
  TIME_PRESETS 
} from '../utils/autoNext';
import { showToast } from '../utils/toast';

export default function AutoNextControl({ compact = false }) {
  const [settings, setSettings] = useState(() => getAutoNextSettings());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState(() => String(settings.delay));
  const [inputError, setInputError] = useState('');

  // Theo dõi cập nhật cấu hình đồng bộ giữa Quiz và Typing
  useEffect(() => {
    const unsubscribe = subscribeAutoNext((newSettings) => {
      setSettings(newSettings);
      setCustomInputVal(String(newSettings.delay));
    });
    return () => unsubscribe();
  }, []);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Khóa cuộn trang nền khi mở modal và khôi phục khi đóng
  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);

  // Bật / Tắt nhanh Auto Next
  const handleToggle = () => {
    const nextEnabled = !settings.enabled;
    const targetMode = nextEnabled ? (settings.lastActiveMode || 'correct_only') : settings.mode;
    
    saveAutoNextSettings({
      enabled: nextEnabled,
      mode: targetMode
    });

    if (nextEnabled) {
      showToast('Đã bật Auto Next', 'success');
    } else {
      showToast('Đã tắt Auto Next', 'info');
    }
  };

  // Chọn chế độ từ Modal
  const handleSelectMode = (modeKey) => {
    if (modeKey === 'off') {
      saveAutoNextSettings({ enabled: false });
    } else {
      saveAutoNextSettings({
        enabled: true,
        mode: modeKey,
        lastActiveMode: modeKey
      });
    }
  };

  // Chọn thời gian từ các nút có sẵn
  const handleSelectPreset = (sec) => {
    setCustomInputVal(String(sec));
    setInputError('');
    saveAutoNextSettings({ delay: sec });
    showToast(`Đã đặt thời gian: ${sec}s`, 'info');
  };

  // Nhập thời gian tùy chỉnh
  const handleCustomInputChange = (e) => {
    const val = e.target.value;
    setCustomInputVal(val);

    if (val === '') {
      setInputError('Vui lòng nhập số giây (0.2 - 30s)');
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num)) {
      setInputError('Giá trị không hợp lệ!');
      return;
    }

    if (num < 0.2 || num > 30.0) {
      setInputError('Thời gian hợp lệ từ 0.2s đến 30s');
      return;
    }

    setInputError('');
    saveAutoNextSettings({ delay: num });
  };

  const currentActiveMode = !settings.enabled ? 'off' : settings.mode;

  return (
    <>
      {/* Nút điều khiển nhanh trên thanh công cụ */}
      <div className={`autonext-widget ${compact ? 'widget-compact' : ''}`}>
        <button
          type="button"
          className={`autonext-toggle-btn ${settings.enabled ? 'is-enabled' : 'is-disabled'}`}
          onClick={handleToggle}
          title={settings.enabled ? 'Nhấp để tắt Auto Next' : 'Nhấp để bật Auto Next'}
          aria-label={settings.enabled ? `Tắt Auto Next (Đang bật ${settings.delay}s)` : 'Bật Auto Next'}
        >
          <Zap size={14} className={settings.enabled ? 'zap-active' : ''} />
          <span className="autonext-label">
            {settings.enabled ? `Auto Next · ${settings.delay}s` : 'Auto Next: Tắt'}
          </span>
        </button>

        <button
          type="button"
          className="autonext-config-btn"
          onClick={() => setIsModalOpen(true)}
          title="Cài đặt chế độ và thời gian Auto Next"
          aria-label="Cài đặt Auto Next"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Modal Cài đặt Auto Next (Render trực tiếp vào document.body bằng React Portal) */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="autonext-modal-backdrop" 
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div 
            className="modal-card autonext-settings-modal" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="autonext-modal-title"
          >
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-badge">
                  <Zap size={20} color="#fbbf24" fill="#fbbf24" />
                </div>
                <div>
                  <h3 id="autonext-modal-title" className="modal-title">Cài Đặt Auto Next (Tự Chuyển Câu)</h3>
                  <p className="modal-subtitle">Áp dụng chung cho cả Trắc nghiệm & Gõ đáp án</p>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setIsModalOpen(false)}
                title="Đóng cửa sổ (Esc)"
                aria-label="Đóng cửa sổ"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body autonext-modal-body">
              {/* Mục 1: Chọn Chế độ */}
              <div className="autonext-setting-section">
                <label className="section-title">
                  1. Chế độ chuyển câu:
                </label>
                <div className="autonext-mode-options">
                  {/* Mode 1: Chỉ khi đúng */}
                  <div 
                    className={`autonext-mode-card ${currentActiveMode === 'correct_only' ? 'selected' : ''}`}
                    onClick={() => handleSelectMode('correct_only')}
                  >
                    <div className="mode-card-header">
                      <div className="mode-radio">
                        {currentActiveMode === 'correct_only' && <div className="radio-dot" />}
                      </div>
                      <span className="mode-name">Chỉ tự chuyển khi trả lời đúng</span>
                      <span className="badge badge-default-tag">Mặc định</span>
                    </div>
                    <p className="mode-desc">
                      Tự chuyển sang câu kế khi bạn chọn/gõ đúng. Khi làm sai, hệ thống dừng lại để bạn xem đáp án và gợi ý.
                    </p>
                  </div>

                  {/* Mode 2: Mọi câu */}
                  <div 
                    className={`autonext-mode-card ${currentActiveMode === 'always' ? 'selected' : ''}`}
                    onClick={() => handleSelectMode('always')}
                  >
                    <div className="mode-card-header">
                      <div className="mode-radio">
                        {currentActiveMode === 'always' && <div className="radio-dot" />}
                      </div>
                      <span className="mode-name">Tự chuyển sau mọi câu (Đúng & Sai)</span>
                    </div>
                    <p className="mode-desc">
                      Tự động chuyển tiếp sau mỗi câu hỏi bất kể đúng hay sai, phù hợp khi luyện phản xạ nhanh.
                    </p>
                  </div>

                  {/* Mode 3: Tắt */}
                  <div 
                    className={`autonext-mode-card ${currentActiveMode === 'off' ? 'selected' : ''}`}
                    onClick={() => handleSelectMode('off')}
                  >
                    <div className="mode-card-header">
                      <div className="mode-radio">
                        {currentActiveMode === 'off' && <div className="radio-dot" />}
                      </div>
                      <span className="mode-name">Tắt Auto Next (Chuyển thủ công)</span>
                    </div>
                    <p className="mode-desc">
                      Chuyển câu thủ công bằng phím Enter / D / → hoặc nút bấm trên màn hình.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mục 2: Chọn Thời gian chờ */}
              <div className={`autonext-setting-section ${!settings.enabled ? 'section-disabled' : ''}`}>
                <div className="section-title-row">
                  <label className="section-title">
                    2. Thời gian chờ chuyển câu:
                  </label>
                  <span className="current-delay-pill">
                    <Clock size={13} /> {settings.delay} giây
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="autonext-presets-grid">
                  {TIME_PRESETS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`preset-chip ${settings.delay === sec ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(sec)}
                    >
                      {sec}s
                      {sec === 1.2 && <span className="chip-def-star">★</span>}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="autonext-custom-input-box">
                  <label className="custom-input-label">
                    Hoặc nhập thời gian tùy chỉnh (0.2s – 30s):
                  </label>
                  <div className="custom-input-row">
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="30"
                      className={`custom-time-input ${inputError ? 'is-error' : ''}`}
                      value={customInputVal}
                      onChange={handleCustomInputChange}
                      placeholder="Nhập số giây..."
                    />
                    <span className="time-unit">giây</span>
                  </div>
                  {inputError && (
                    <span className="input-error-msg">{inputError}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsModalOpen(false)}
              >
                <Check size={16} /> Hoàn tất
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

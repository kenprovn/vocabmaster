// src/components/AutoReadControl.jsx
// Widget điều khiển & Modal cài đặt tính năng Auto Read (Tự động phát âm)

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Volume2, 
  VolumeX, 
  SlidersHorizontal, 
  X, 
  Check, 
  RotateCcw, 
  Clock, 
  Gauge, 
  Repeat, 
  Zap, 
  Sparkles,
  Layers,
  HelpCircle,
  Keyboard
} from 'lucide-react';
import { 
  getAutoReadSettings, 
  saveAutoReadSettings, 
  resetAutoReadSettings,
  subscribeAutoRead, 
  autoReadCoordinator,
  PLAYBACK_RATES, 
  REPEAT_COUNTS, 
  INITIAL_DELAYS,
  TRIGGER_OPTIONS_FLASHCARD,
  TRIGGER_OPTIONS_QUIZ,
  TRIGGER_OPTIONS_TYPING
} from '../utils/autoRead';
import { showToast } from '../utils/toast';

export default function AutoReadControl({ compact = false, defaultTab = 'flashcard' }) {
  const [settings, setSettings] = useState(() => getAutoReadSettings());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab); // 'flashcard' | 'quiz' | 'typing'

  // Đồng bộ cấu hình thời gian thực
  useEffect(() => {
    const unsubscribe = subscribeAutoRead((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  // Cập nhật tab mặc định khi props thay đổi
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

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

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);

  // Bật/tắt nhanh Auto Read
  const handleToggle = () => {
    const nextEnabled = !settings.enabled;
    if (nextEnabled) {
      autoReadCoordinator.unlockAudio();
    }
    saveAutoReadSettings({ enabled: nextEnabled });
    if (nextEnabled) {
      showToast('Đã bật Auto Read (Tự động phát âm)', 'success');
    } else {
      showToast('Đã tắt Auto Read', 'info');
      autoReadCoordinator.cancel();
    }
  };

  const handleOpenModal = () => {
    autoReadCoordinator.unlockAudio();
    setIsModalOpen(true);
  };

  const handleUpdate = (partial) => {
    saveAutoReadSettings(partial);
  };

  const handleReset = () => {
    resetAutoReadSettings();
    showToast('Đã khôi phục cài đặt Auto Read mặc định', 'info');
  };

  const getTriggerOptions = () => {
    switch (activeTab) {
      case 'quiz':
        return TRIGGER_OPTIONS_QUIZ;
      case 'typing':
        return TRIGGER_OPTIONS_TYPING;
      case 'flashcard':
      default:
        return TRIGGER_OPTIONS_FLASHCARD;
    }
  };

  const getCurrentTriggerValue = () => {
    switch (activeTab) {
      case 'quiz':
        return settings.quizTrigger;
      case 'typing':
        return settings.typingTrigger;
      case 'flashcard':
      default:
        return settings.flashcardTrigger;
    }
  };

  const handleSelectTrigger = (val) => {
    switch (activeTab) {
      case 'quiz':
        handleUpdate({ quizTrigger: val });
        break;
      case 'typing':
        handleUpdate({ typingTrigger: val });
        break;
      case 'flashcard':
      default:
        handleUpdate({ flashcardTrigger: val });
        break;
    }
  };

  return (
    <>
      {/* Widget điều khiển nhanh */}
      <div className={`autoread-widget ${compact ? 'widget-compact' : ''}`}>
        <button
          type="button"
          className={`autoread-toggle-btn ${settings.enabled ? 'is-enabled' : 'is-disabled'}`}
          onClick={handleToggle}
          title={settings.enabled ? 'Nhấp để tắt Auto Read' : 'Nhấp để bật Auto Read (Tự động phát âm)'}
          aria-label={settings.enabled ? 'Tắt Auto Read' : 'Bật Auto Read'}
        >
          {settings.enabled ? (
            <Volume2 size={15} className="autoread-icon-active" />
          ) : (
            <VolumeX size={15} className="autoread-icon-inactive" />
          )}
          <span className="autoread-label">
            {settings.enabled ? 'Auto Read: Bật' : 'Auto Read: Tắt'}
          </span>
        </button>

        <button
          type="button"
          className="autoread-config-btn"
          onClick={handleOpenModal}
          title="Cài đặt Auto Read"
          aria-label="Cài đặt Auto Read"
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* Modal Cài đặt Auto Read (Portal) */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="autoread-modal-backdrop animate-fade-in"
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div 
            className="modal-card autoread-settings-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="autoread-modal-title"
          >
            {/* Header Modal */}
            <div className="modal-header autoread-modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-badge autoread-icon-badge">
                  <Volume2 size={20} color="#a78bfa" />
                </div>
                <div>
                  <h3 id="autoread-modal-title" className="modal-title">Auto Read</h3>
                  <p className="modal-subtitle">Tự động phát âm tiếng Anh theo cách của bạn.</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
                title="Đóng cài đặt (Esc)"
                aria-label="Đóng cài đặt"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body autoread-modal-body">
              {/* Mục A: Công tắc Bật / Tắt Tổng */}
              <div className="autoread-master-switch-card">
                <div className="switch-info">
                  <span className="switch-label">Trạng thái tính năng Auto Read:</span>
                  <span className={`switch-status-pill ${settings.enabled ? 'is-active' : ''}`}>
                    {settings.enabled ? 'Đang BẬT' : 'Đang TẮT'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`btn-toggle-switch ${settings.enabled ? 'checked' : ''}`}
                  onClick={handleToggle}
                  aria-pressed={settings.enabled}
                >
                  <span className="switch-slider" />
                </button>
              </div>

              {/* Mục B: Tabs chọn chế độ học */}
              <div className="autoread-setting-section">
                <label className="section-title">
                  1. Chọn chế độ học để cấu hình thời điểm phát âm:
                </label>
                <div className="autoread-tabs-nav">
                  <button
                    type="button"
                    className={`autoread-tab-btn ${activeTab === 'flashcard' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('flashcard')}
                  >
                    <Layers size={14} />
                    <span>Flashcard</span>
                  </button>
                  <button
                    type="button"
                    className={`autoread-tab-btn ${activeTab === 'quiz' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('quiz')}
                  >
                    <HelpCircle size={14} />
                    <span>Trắc nghiệm</span>
                  </button>
                  <button
                    type="button"
                    className={`autoread-tab-btn ${activeTab === 'typing' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('typing')}
                  >
                    <Keyboard size={14} />
                    <span>Gõ đáp án</span>
                  </button>
                </div>

                {/* Mục C: Danh sách lựa chọn thời điểm theo Tab */}
                <div className="autoread-triggers-list">
                  {getTriggerOptions().map((opt) => {
                    const isSelected = getCurrentTriggerValue() === opt.value;
                    return (
                      <div
                        key={opt.value}
                        className={`autoread-trigger-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectTrigger(opt.value)}
                      >
                        <div className="trigger-card-header">
                          <div className="mode-radio">
                            {isSelected && <div className="radio-dot" />}
                          </div>
                          <strong className="trigger-title">{opt.label}</strong>
                          {opt.value === (activeTab === 'flashcard' ? 'new' : 'answer') && (
                            <span className="badge badge-default-tag">Mặc định</span>
                          )}
                        </div>
                        <p className="trigger-desc">{opt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mục D: Tốc độ đọc */}
              <div className="autoread-setting-section">
                <div className="section-title-row">
                  <label className="section-title">
                    <Gauge size={14} className="text-accent" />
                    2. Tốc độ phát âm:
                  </label>
                  <span className="current-delay-pill">
                    {settings.playbackRate}×
                  </span>
                </div>
                <div className="autoread-chips-row">
                  {PLAYBACK_RATES.map((rate) => {
                    const isSelected = settings.playbackRate === rate;
                    const label = rate === 0.75 ? '0.75× Chậm' : rate === 0.9 ? '0.9× Hơi chậm' : rate === 1.0 ? '1.0× Chuẩn' : rate === 1.1 ? '1.1× Hơi nhanh' : '1.25× Nhanh';
                    return (
                      <button
                        key={rate}
                        type="button"
                        className={`preset-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => handleUpdate({ playbackRate: rate })}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mục E: Số lần phát âm */}
              <div className="autoread-setting-section">
                <div className="section-title-row">
                  <label className="section-title">
                    <Repeat size={14} className="text-accent" />
                    3. Số lần phát âm mỗi lượt:
                  </label>
                  <span className="current-delay-pill">
                    {settings.repeatCount} lần
                  </span>
                </div>
                <div className="autoread-chips-row">
                  {REPEAT_COUNTS.map((count) => {
                    const isSelected = settings.repeatCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        className={`preset-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => handleUpdate({ repeatCount: count })}
                      >
                        {count === 1 ? '1 lần (Mặc định)' : `${count} lần (Nghỉ 0.5s)`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mục F: Độ trễ trước khi đọc */}
              <div className="autoread-setting-section">
                <div className="section-title-row">
                  <label className="section-title">
                    <Clock size={14} className="text-accent" />
                    4. Độ trễ trước khi đọc lượt đầu:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {settings.initialDelay === 0 && (
                      <span className="badge badge-default-tag">Mặc định</span>
                    )}
                    <span className="current-delay-pill">
                      {settings.initialDelay === 0 ? '0s (Đọc ngay)' : `${settings.initialDelay}s`}
                    </span>
                  </div>
                </div>
                <div className="autoread-chips-row">
                  {INITIAL_DELAYS.map((sec) => {
                    const isSelected = settings.initialDelay === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        className={`preset-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => handleUpdate({ initialDelay: sec })}
                      >
                        {sec === 0 ? '0s (Đọc ngay - Mặc định)' : sec === 0.3 ? '0.3s (Chuẩn)' : `${sec}s`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mục G: Phối hợp Auto Next (chỉ hiển thị khi ở tab Trắc nghiệm hoặc Gõ đáp án) */}
              {activeTab !== 'flashcard' && (
                <div className="autoread-setting-section">
                  <label className="section-title">
                    <Zap size={14} className="text-accent" />
                    5. Phối hợp với Auto Next:
                  </label>
                  <div 
                    className={`autoread-trigger-card ${settings.waitForAudioBeforeAutoNext ? 'selected' : ''}`}
                    onClick={() => handleUpdate({ waitForAudioBeforeAutoNext: !settings.waitForAudioBeforeAutoNext })}
                  >
                    <div className="trigger-card-header">
                      <div className="mode-radio">
                        {settings.waitForAudioBeforeAutoNext && <div className="radio-dot" />}
                      </div>
                      <strong className="trigger-title">Chờ phát âm xong trước khi tự chuyển câu</strong>
                    </div>
                    <p className="trigger-desc">
                      Auto Next sẽ chờ phát âm hết toàn bộ số lần đọc rồi mới bắt đầu đếm thời gian chuyển câu, tránh cắt ngang audio khi học.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="modal-footer autoread-modal-footer">
              <button
                type="button"
                className="btn-reset-modal autoread-btn-reset"
                onClick={handleReset}
                title="Khôi phục toàn bộ cài đặt Auto Read về mặc định"
              >
                <RotateCcw size={16} />
                <span>Khôi phục mặc định</span>
              </button>

              <button
                type="button"
                className="btn-primary btn-done-modal autoread-btn-done"
                onClick={() => setIsModalOpen(false)}
                title="Lưu và đóng cài đặt Auto Read"
              >
                <Check size={16} />
                <span>Hoàn tất</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}


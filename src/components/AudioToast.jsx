import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { audioManager } from '../utils/audioManager';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function AudioToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubscribe = audioManager.subscribeToast((newToast) => {
      setToast(newToast);

      const duration = newToast.type === 'success' || newToast.type === 'info' ? 2500 : 4000;
      const timer = setTimeout(() => {
        setToast((curr) => (curr && curr.id === newToast.id ? null : curr));
      }, duration);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (!toast) return null;
  if (typeof document === 'undefined') return null;

  const isWarning = toast.type === 'warning' || toast.type === 'error';
  const isSuccess = toast.type === 'success';

  let boxClass = 'audio-toast-info';
  if (isWarning) boxClass = 'audio-toast-warning';
  if (isSuccess) boxClass = 'audio-toast-success';

  const content = (
    <div 
      className="audio-toast-container"
      onClick={() => setToast(null)}
      role="alert"
      aria-live="polite"
    >
      <div className={`audio-toast-box ${boxClass}`}>
        <div className="audio-toast-icon">
          {isWarning && <AlertCircle size={18} color="#f59e0b" />}
          {isSuccess && <CheckCircle2 size={18} color="#10b981" />}
          {!isWarning && !isSuccess && <Info size={18} color="#38bdf8" />}
        </div>
        <div className="audio-toast-message">
          {toast.message}
        </div>
        <button 
          className="audio-toast-close"
          onClick={(e) => {
            e.stopPropagation();
            setToast(null);
          }}
          title="Đóng thông báo"
          aria-label="Đóng thông báo"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}


import React, { useState, useEffect } from 'react';
import { audioManager } from '../utils/audioManager';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function AudioToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubscribe = audioManager.subscribeToast((newToast) => {
      setToast(newToast);

      const timer = setTimeout(() => {
        setToast((curr) => (curr && curr.id === newToast.id ? null : curr));
      }, 4000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (!toast) return null;

  const isWarning = toast.type === 'warning' || toast.type === 'error';

  return (
    <div 
      className="audio-toast-container animate-fade-in"
      onClick={() => setToast(null)}
      role="alert"
    >
      <div className={`audio-toast-box ${isWarning ? 'audio-toast-warning' : 'audio-toast-info'}`}>
        <div className="audio-toast-icon">
          {isWarning ? <AlertCircle size={18} color="#f59e0b" /> : <Info size={18} color="#06b6d4" />}
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
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}


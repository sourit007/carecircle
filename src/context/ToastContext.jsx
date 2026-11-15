import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 5000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div 
        aria-live="polite" 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-4 rounded-2xl border-2 shadow-2xl flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : isError
                  ? 'bg-rose-50 border-rose-400 text-rose-950'
                  : 'bg-blue-50 border-blue-400 text-blue-950'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />}
              {isInfo && <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />}
              
              <div className="flex-1 text-base font-bold">
                {toast.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss toast"
                className="p-1 hover:bg-black/5 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}


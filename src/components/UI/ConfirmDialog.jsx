import { useState } from 'react';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) {
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;

  const variants = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 disabled:bg-amber-400',
    primary: 'bg-stone-900 hover:bg-stone-800 focus:ring-stone-500 disabled:bg-stone-400',
  };

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Let the parent handle the error, but don't close
      console.error('Confirm action failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-stone-900/50 transition-opacity" 
          onClick={loading ? undefined : onClose}
          aria-hidden="true"
        />
        
        {/* Dialog */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 transform transition-all">
          <h3 id="confirm-title" className="text-lg font-semibold text-stone-900 mb-2">
            {title}
          </h3>
          <p className="text-stone-600 mb-6">{message}</p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'យល់ព្រម (Confirm)',
  cancelText = 'បោះបង់ (Cancel)',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
    >
      <div
        id="confirm-modal-container"
        className="w-full max-w-md rounded-2xl bg-[#161920] p-6 shadow-2xl border border-[#2D333E] animate-in fade-in zoom-in-95 duration-150 text-slate-200"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isDestructive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            id="close-confirm-modal"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-[#1C212B] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            id="btn-confirm-cancel"
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#2D333E] bg-[#1C212B] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[#252C3A] transition-colors"
          >
            {cancelText}
          </button>
          <button
            id="btn-confirm-accept"
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

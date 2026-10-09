import React from 'react';
import { Trash2 } from 'lucide-react';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Exclusão?",
  message = "Tem certeza que deseja excluir este registro?",
  itemName = "",
  confirmText = "Sim, Excluir",
  cancelText = "Cancelar"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <Trash2 className="w-5 h-5" />
        </div>
        
        <h3 className="text-base font-bold text-white text-center">
          {title}
        </h3>
        
        <div className="text-xs text-slate-400 text-center mt-2">
          {message}
          {itemName && (
            <>
              <br />
              <strong className="text-white mt-1 block">"{itemName}"</strong>
            </>
          )}
        </div>

        <div className="flex gap-2.5 mt-5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

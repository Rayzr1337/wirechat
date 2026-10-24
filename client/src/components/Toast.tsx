interface ToastProps {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' };
  onRemove: (id: string) => void;
}

export function Toast({ toast, onRemove }: ToastProps) {
  const accents = {
    success: "#4fb3a9",
    error: "#c97bb0",
    info: "#7c6ff0",
  };

  return (
    <div className="flex items-center gap-3 min-w-[280px] max-w-sm rounded-md bg-surface-2 border border-line px-3.5 py-2.5 shadow-xl"
         style={{ animation: 'slideIn 0.25s ease-out', borderLeftColor: accents[toast.type], borderLeftWidth: 3 }}>
      <span className="text-sm font-medium flex-1" style={{ color: "#e8e8f0" }}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 w-6 h-6 -mr-1.5 rounded flex items-center justify-center hover:bg-surface-3 transition-colors">
        <span className="text-xs" style={{ color: "#8b8b9e" }}>✕</span>
      </button>
    </div>
  );
}

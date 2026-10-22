interface ToastProps {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' };
  onRemove: (id: string) => void;
}

export function Toast({ toast, onRemove }: ToastProps) {
  const typeColors = {
    success: { bg: "#4fb3a9", text: "#0f0f14" },
    error: { bg: "#c97bb0", text: "#0f0f14" },
    info: { bg: "#7c6ff0", text: "#ffffff" },
  };
  const colors = typeColors[toast.type];

  return (
    <div className="flex items-start rounded-md px-4 py-3 shadow-lg"
         style={{ backgroundColor: colors.bg, color: colors.text, animation: 'slideIn 0.3s ease-out' }}>
      <div>
        <div className="text-sm font-medium">{toast.message}</div>
      </div>
      <button onClick={() => onRemove(toast.id)}
              className="ml-auto mt-0.5 text-sm opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

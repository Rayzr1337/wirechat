export default function RoomsPlaceholder() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-0">
      <div className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-medium text-lg text-ink">Rooms</span>
          <div className="w-px h-5 mx-1 bg-line" />
          <span className="text-sm text-ink-muted">Select a room to start chatting</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col items-center justify-center h-full text-ink-muted text-sm">
          Select a room from the sidebar to start messaging.
        </div>
      </div>
    </div>
  );
}

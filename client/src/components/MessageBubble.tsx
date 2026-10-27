import { useState, useRef, useEffect } from 'react';
import { usePresenceStore } from '../stores/presenceStore';
import { Avatar } from './Avatar';
import { DotsIcon, TrashIcon, PencilIcon } from './icons';

interface MessageBubbleProps {
  message: {
    id: string;
    roomId: string;
    senderId: string | null;
    content: string;
    createdAt: string;
    editedAt: string | null;
  };
  isSelf: boolean;
  showTimestamp: boolean;
  grouped: boolean;
  senderName?: string;
  senderAvatarUrl?: string;
  senderDeleted?: boolean;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
}

export function MessageBubble({ message, isSelf, showTimestamp, grouped, senderName, senderAvatarUrl, senderDeleted, onEdit, onDelete }: MessageBubbleProps) {
  const { presences } = usePresenceStore();
  const senderPresence = message.senderId ? presences[message.senderId] : undefined;
  const senderOnline = isSelf ? true : senderPresence?.online;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuUp, setMenuUp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  const displayName = senderName ?? message.senderId ?? 'Deleted User';

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = () => {
    const next = draft.trim();
    if (next && next !== message.content) onEdit?.(next);
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message?')) onDelete?.();
    setMenuOpen(false);
  };

  const canModify = isSelf && (onEdit || onDelete);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const rect = menuAnchorRef.current?.getBoundingClientRect();
    if (rect) setMenuUp(window.innerHeight - rect.bottom < 180);
    setMenuOpen(true);
  };

  return (
    <div className={`flex gap-3 ${grouped ? "mt-0.5" : "mt-3"}`} data-message-id={message.id}>
      <div className="w-9 shrink-0">
        {!grouped && (
          <div className="flex justify-center">
            <Avatar name={displayName} size={36} userId={message.senderId ?? undefined}
                  avatarUrl={senderDeleted ? undefined : senderAvatarUrl}
                  placeholder={senderDeleted} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-medium"
                  style={{ color: isSelf ? "#7c6ff0" : "#e8e8f0" }}>
              {displayName}
              {senderOnline === false && (
                <span className="text-xs ml-1" style={{ color: "#5c5c6e" }}>offline</span>
              )}
            </span>
            {showTimestamp && (
              <span className="text-xs" style={{ color: "#5c5c6e" }}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {message.editedAt && (
              <span className="text-[10px]" style={{ color: "#5c5c6e" }}>(edited)</span>
            )}
          </div>
        )}
        {editing ? (
          <input
            ref={editInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={saveEdit}
            className={`max-w-md px-2.5 py-1.5 rounded-lg bg-surface-3 border border-line outline-none text-sm ${isSelf ? "text-right" : ""}`}
            style={{ color: "#c8c8d8" }}
          />
        ) : (
          <div className={`text-sm leading-relaxed flex items-baseline justify-between gap-2 ${isSelf ? "text-right" : ""}`}>
            <div style={{ color: "#c8c8d8" }}>{message.content}</div>
            {(message.editedAt || canModify) && (
              <div ref={menuAnchorRef} className="relative shrink-0">
                {grouped && message.editedAt && (
                  <span className="text-[10px] mr-2" style={{ color: "#5c5c6e" }}>(edited)</span>
                )}
                {canModify && (
                  <>
                    <div className="w-5 h-5 rounded hover:bg-surface-3 flex items-center justify-center cursor-pointer"
                         onClick={toggleMenu}>
                      <DotsIcon size={14} color={isSelf ? "#7c6ff0" : "#8b8b9e"} />
                    </div>
                    {menuOpen && (
                      <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                    )}
                    {menuOpen && (
                      <div className={`absolute right-0 min-w-[120px] bg-surface-2 rounded-md border border-line shadow-lg z-30 ${menuUp ? "bottom-full mb-0.5" : "top-full mt-0.5"}`}>
                        {onEdit && (
                          <button onClick={startEdit}
                                  className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-ink hover:bg-surface-3">
                            <PencilIcon size={14} />
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={handleDelete} className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[#c97bb0] hover:bg-surface-3">
                            <TrashIcon size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

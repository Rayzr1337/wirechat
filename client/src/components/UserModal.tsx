import { Avatar } from './Avatar';
import { usePresenceStore } from '../stores/presenceStore';
import { useMe } from '../hooks/useMe';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
}

export function UserModal({ open, onClose, userId, username, avatarUrl, createdAt }: UserModalProps) {
  const { presences } = usePresenceStore();
  const { data: me } = useMe();
  const online = userId === me?.id ? true : (presences[userId]?.online ?? false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-surface-1 rounded-lg border border-line p-6 w-96 shadow-xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={username} size={48} userId={userId} avatarUrl={avatarUrl} />
          <div>
            <div className="text-sm font-medium" style={{ color: "#e8e8f0" }}>{username}</div>
            <div className="text-xs" style={{ color: "#8b8b9e" }}>User ID: {userId}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: "#8b8b9e" }}>Joined</span>
            <span style={{ color: "#c8c8d8" }}>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: "#8b8b9e" }}>Status</span>
            <span style={{ color: online ? "#7c6ff0" : "#5c5c6e" }}>●</span>
            <span style={{ color: "#c8c8d8" }}>{online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="mt-6">
          <button onClick={onClose}
                  className="w-full py-2.5 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

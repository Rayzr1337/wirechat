import { usePresenceStore } from '../stores/presenceStore';
import { Avatar } from './Avatar';
import { UserModal } from './UserModal';
import { DotsIcon } from './icons';
import { useState } from 'react';

export interface MemberAction {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface MemberListItemProps {
  member: {
    id: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      id: string;
      username: string;
      avatarUrl: string | null;
      createdAt?: string;
    };
  };
  actions?: MemberAction[];
}

export function MemberListItem({ member, actions }: MemberListItemProps) {
  const { presences } = usePresenceStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const presence = presences[member.userId];
  const online = presence?.online;

  return (
    <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-md cursor-pointer group transition-colors hover:bg-surface-2"
         onClick={() => setModalOpen(true)}>
      <div className="relative">
        <Avatar name={member.user.username} size={28} userId={member.userId} avatarUrl={member.user.avatarUrl ?? undefined} />
      </div>
      <span className="text-sm truncate"
            style={{ color: online ? "#e8e8f0" : "#5c5c6e" }}>{member.user.username}</span>
      {actions && actions.length > 0 && (
        <div className="relative ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="w-5 h-5 rounded hover:bg-surface-3 flex items-center justify-center cursor-pointer"
               onClick={() => setMenuOpen((open) => !open)}>
            <DotsIcon size={14} color="#8b8b9e" />
          </div>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-0.5 min-w-[130px] bg-surface-2 rounded-md border border-line shadow-lg z-30">
                {actions.map((action) => (
                  <button key={action.label}
                          onClick={() => { setMenuOpen(false); action.onClick(); }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-3 ${action.danger ? "text-[#c97bb0]" : "text-ink"}`}>
                    {action.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <UserModal open={modalOpen} onClose={() => setModalOpen(false)}
                 userId={member.userId} username={member.user.username}
                 avatarUrl={member.user.avatarUrl ?? undefined}
                 createdAt={member.user.createdAt ?? new Date().toISOString()} />
    </div>
  );
}

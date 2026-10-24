import { Link } from 'react-router';
import { usePresenceStore } from '../stores/presenceStore';
import { useUnreadStore } from '../stores/unreadStore';
import { Avatar } from './Avatar';
import { GroupIcon } from './GroupIcon';

interface RoomListItemProps {
  room: {
    id: string;
    type: 'GROUP' | 'DIRECT';
    name: string | null;
    myRole?: string;
    version?: number;
  };
  peer?: { userId: string; username: string; avatarUrl: string | null };
  onClick: () => void;
  active: boolean;
  index: number;
}

export function RoomListItem({ room, peer, onClick, active, index }: RoomListItemProps) {
  const { presences } = usePresenceStore();
  const { unreadCounts } = useUnreadStore();
  const unread = unreadCounts[room.id] ?? 0;

  const isDirect = room.type === 'DIRECT';
  const displayName = peer?.username ?? room.name ?? (isDirect ? 'Direct Message' : 'Group');
  const online = peer ? presences[peer.userId]?.online : undefined;

  return (
    <Link
      to={`/rooms/${room.id}`}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${active ? "bg-surface-3" : "hover:bg-surface-2"}`}
    >
      {isDirect ? (
        <div className="relative">
          <Avatar name={displayName} hue="#4fb3a9" size={26} userId={peer?.userId} avatarUrl={peer?.avatarUrl ?? undefined} />
          {online !== undefined && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: online ? "#7c6ff0" : "#5c5c6e", boxShadow: "0 0 0 2px #15151d" }} />
          )}
        </div>
      ) : (
        <GroupIcon size={26} colorIndex={index} />
      )}
      <span className="text-sm truncate"
            style={{ color: active ? "#e8e8f0" : "#8b8b9e" }}>{displayName}</span>
      {unread > 0 && (
        <span className="text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
              style={{ backgroundColor: "#7c6ff0", color: "#0f0f14" }}>{unread}</span>
      )}
    </Link>
  );
}

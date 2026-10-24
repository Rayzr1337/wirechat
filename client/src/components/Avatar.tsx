import { usePresenceStore } from '../stores/presenceStore';
import { UserIcon } from './icons';

const USER_PALETTE = ["#7c6ff0", "#4fb3a9", "#d98a5f", "#5f9dd9", "#c97bb0", "#e0b64f"];

export function hueForUser(userId?: string): string {
  if (!userId) return USER_PALETTE[0];
  let hash = 0;
  for (const ch of userId) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  }
  return USER_PALETTE[hash % USER_PALETTE.length];
}

interface AvatarProps {
  name: string;
  hue?: string;
  size?: number;
  userId?: string;
  online?: boolean;
  avatarUrl?: string;
  placeholder?: boolean;
}

export function Avatar({ name, hue, size = 36, userId, online, avatarUrl, placeholder }: AvatarProps) {
  const { presences } = usePresenceStore();
  const storePresence = userId ? presences[userId] : undefined;
  const isOnline = placeholder ? undefined : (online ?? storePresence?.online);
  const resolvedHue = placeholder ? "#3a3a46" : (hue ?? hueForUser(userId));

  return (
    <div className="relative flex items-center justify-center rounded-md shrink-0"
         style={{ width: size, height: size, backgroundColor: resolvedHue, color: "#0f0f14", fontSize: size * 0.42 }}>
      {placeholder ? (
        <UserIcon size={size * 0.55} color="#8b8b9e" />
      ) : avatarUrl ? (
        <img src={avatarUrl} alt={name} className="absolute inset-0 w-full h-full object-cover rounded-md" />
      ) : (
        name[0].toUpperCase()
      )}
      {isOnline !== undefined && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full z-[1]"
              style={{ backgroundColor: isOnline ? "#7c6ff0" : "#5c5c6e", boxShadow: "0 0 0 2px #15151d" }} />
      )}
    </div>
  );
}

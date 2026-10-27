import { useTypingStore } from '../stores/typingStore';
import { useMe } from '../hooks/useMe';

interface TypingIndicatorProps {
  roomId: string;
  names?: string[];
}

export function TypingIndicator({ roomId, names = [] }: TypingIndicatorProps) {
  const { typing } = useTypingStore();
  const { data: me } = useMe();
  const typers = typing[roomId] ?? new Set<string>();
  const otherTypers = [...typers].filter((id) => id !== me?.id);

  if (otherTypers.length === 0) return null;

  const label = `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} typing`;

  return (
    <div className="flex gap-3 items-center mt-2">
      <div className="w-9 shrink-0 flex justify-center">
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#5c5c6e", animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
      <span className="text-xs" style={{ color: "#5c5c6e" }}>{label}</span>
    </div>
  );
}

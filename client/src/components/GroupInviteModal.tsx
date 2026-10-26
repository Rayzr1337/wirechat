import { useState } from 'react';
import { XIcon, HashIcon } from './icons';

interface GroupInviteModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

export function GroupInviteModal({ open, onClose, groupId }: GroupInviteModalProps) {
  const [copied, setCopied] = useState(false);

  const copyGroupId = async () => {
    await navigator.clipboard.writeText(groupId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-1 rounded-lg border border-line p-5 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-ink">Invite to group</div>
          <button onClick={onClose} className="p-1 hover:bg-surface-2 rounded">
            <XIcon size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={groupId}
            readOnly
            className="flex-1 px-3 py-2 rounded-md bg-surface-2 border border-line text-sm text-ink outline-none"
          />
          <button
            onClick={copyGroupId}
            disabled={copied}
            className="px-3 py-2 rounded-md border border-line text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-ink-dim">
          <HashIcon size={14} color="#7c6ff0" />
          <span className="font-mono">{groupId}</span>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Share this ID with friends so they can join the group.
        </p>
      </div>
    </div>
  );
}

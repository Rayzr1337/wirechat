import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/client';
import { useMe } from '../hooks/useMe';
import { useUpdateProfile } from '../hooks/useAuth';
import { Avatar } from '../components/Avatar';
import { ArrowLeftIcon } from '../components/icons';
import { useUiStore } from '../stores/uiStore';

export function Profile() {
  const { data: me, isPending } = useMe();
  const { mutate: updateProfile } = useUpdateProfile();
  const { addToast } = useUiStore();
  const [username, setUsername] = useState(me?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(me?.avatarUrl ?? '');

  useEffect(() => {
    if (me) {
      setUsername(me.username);
      setAvatarUrl(me.avatarUrl ?? '');
    }
  }, [me]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted text-sm">
        Loading profile...
      </div>
    );
  }

  if (!me) return null;

  const handleSave = () => {
    updateProfile({ username: username.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined }, {
      onSuccess: () => addToast('Profile updated', 'success'),
      onError: (err) => {
        addToast(err instanceof ApiError ? err.message : 'Profile update failed', 'error');
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-surface-1 rounded-lg border border-line p-8">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6">
            <ArrowLeftIcon size={16} />
            Back to Rooms
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={me.username} hue="#7c6ff0" size={64} userId={me.id} />
            <div>
              <h1 className="font-display font-semibold text-lg text-ink">{me.username}</h1>
              <p className="text-sm text-ink-muted">{me.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-ink-dim mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-dim mb-1">Avatar URL</label>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleSave}
                    className="flex-1 py-2.5 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover transition-colors">
              Save Changes
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <p className="text-xs text-ink-dim">Email: {me.email}</p>
            <p className="text-xs text-ink-dim">Email verified: {me.emailVerified ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

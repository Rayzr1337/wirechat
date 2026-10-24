import { useChangePassword, useRequestEmailChange } from '../hooks/useAuth';
import { useUiStore } from '../stores/uiStore';
import { ArrowLeftIcon, ShieldIcon, MailIcon, TrashIcon } from '../components/icons';
import { useMe } from '../hooks/useMe';
import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/client';

export function Settings() {
  const { data: me, isPending } = useMe();
  const { mutate: changePassword } = useChangePassword();
  const { mutate: requestEmailChange } = useRequestEmailChange();
  const { addToast } = useUiStore();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());
  const emailError = newEmail.trim() && !emailValid ? 'Enter a valid email address' : null;

  if (isPending) return null;
  if (!me) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-surface-1 rounded-lg border border-line p-8">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6">
            <ArrowLeftIcon size={16} />
            Back to Rooms
          </Link>
          <h1 className="font-display font-semibold text-lg text-ink mb-6">Settings</h1>

          <div className="space-y-6">
            <div className="border-b border-line pb-4">
              <div className="flex items-center gap-3 mb-3">
                <ShieldIcon size={20} color="#7c6ff0" />
                <h2 className="text-sm font-medium text-ink">Password</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-ink-dim mb-1">Current password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-dim mb-1">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none"
                  />
                </div>
                <button onClick={() => {
                  changePassword({ oldPassword, newPassword }, {
                    onSuccess: () => {
                      addToast('Password changed', 'success');
                      setOldPassword("");
                      setNewPassword("");
                    },
                    onError: (err) => {
                      addToast(err instanceof ApiError ? err.message : 'Password change failed', 'error');
                    },
                  });
                }}
                        className="w-auto py-2 px-4 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover">
                  Change Password
                </button>
              </div>
            </div>

            <div className="border-b border-line pb-4">
              <div className="flex items-center gap-3 mb-3">
                <MailIcon size={20} color="#7c6ff0" />
                <h2 className="text-sm font-medium text-ink">Email</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-ink-dim mb-1">New email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-md bg-surface-2 border text-ink outline-none ${emailError ? 'border-[#c97bb0]' : 'border-line'}`}
                  />
                  {emailError && <div className="text-xs text-[#c97bb0] mt-1">{emailError}</div>}
                </div>
                <button onClick={() => {
                  requestEmailChange({ newEmail }, {
                    onSuccess: () => {
                      addToast('Verification email sent', 'success');
                      setNewEmail("");
                    },
                    onError: (err) => {
                      addToast(err instanceof ApiError ? err.message : 'Email change failed', 'error');
                    },
                  });
                }}
                        disabled={!newEmail.trim() || !!emailError}
                        className="w-auto py-2 px-4 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent">
                  Request Email Change
                </button>
              </div>
            </div>

            <div className="border-b border-line pb-4">
              <div className="flex items-center gap-3 mb-3">
                <TrashIcon size={20} color="#c97bb0" />
                <h2 className="text-sm font-medium text-ink">Danger Zone</h2>
              </div>
              <button onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                  fetch('/api/users/me', { method: 'DELETE', credentials: 'include' })
                    .then(() => { window.location.href = '/'; })
                    .catch(() => addToast('Failed to delete account', 'error'));
                }
              }}
                      className="w-auto py-2 px-4 rounded-md border border-[#c97bb0] text-[#c97bb0] text-sm font-medium hover:bg-[#c97bb0]/10">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';
import { useRooms, useJoinRoom, useCreateRoom, useCreateDirectRoom } from '../hooks/useRooms';
import { useSearchUsers } from '../hooks/useSearchUsers';
import { RoomListItem } from '../components/RoomListItem';
import { PlusIcon, SettingsIcon, WarningIcon } from '../components/icons';
import { useUiStore } from '../stores/uiStore';
import { useSocketStore } from '../stores/socketStore';
import { useLogout, useResendVerification } from '../hooks/useAuth';
import { useMe } from '../hooks/useMe';
import { Avatar } from '../components/Avatar';
import { useWebSocket } from '../ws/useWebSocket';
import { ApiError } from '../api/client';

interface GroupRoom {
  id: string;
  type: 'GROUP';
  name: string | null;
}

interface DirectRoom {
  id: string;
  type: 'DIRECT';
  name: string | null;
}

export function RoomsLayout() {
  useWebSocket();
  const { data: rooms = [] } = useRooms();
  const { joinGroupModalOpen, openJoinGroupModal, closeJoinGroupModal, addToast } = useUiStore();
  const { data: me } = useMe();
  const { addJoinedRoom } = useSocketStore();
  const [joinGroupId, setJoinGroupId] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [createRoomName, setCreateRoomName] = useState("");
  const [createDmOpen, setCreateDmOpen] = useState(false);
  const [dmUsername, setDmUsername] = useState("");
  const { mutate: logout } = useLogout();
  const { mutate: resendVerification, isPending: resendPending } = useResendVerification();
  const { mutate: joinRoom, isPending: joiningRoom } = useJoinRoom();
  const { mutate: createRoom } = useCreateRoom();
  const { mutate: createDirectRoom } = useCreateDirectRoom();
  const searchQuery = dmUsername.trim();
  const { data: searchResults = [] } = useSearchUsers(searchQuery);
  const navigate = useNavigate();
  const { roomId: activeRoomId } = useParams<{ roomId: string }>();

  const groupRooms = rooms.filter((r) => r.type === 'GROUP') as GroupRoom[];
  const directRooms = rooms.filter((r) => r.type === 'DIRECT') as DirectRoom[];

  if (!me) return null;

  const openRoom = (roomId: string) => {
    addJoinedRoom(roomId);
    navigate(`/rooms/${roomId}`);
  };

  const handleJoinGroup = () => {
    if (!joinGroupId.trim()) return;
    joinRoom(joinGroupId.trim(), {
      onSuccess: () => {
        addJoinedRoom(joinGroupId.trim());
        navigate(`/rooms/${joinGroupId.trim()}`);
        closeJoinGroupModal();
        setJoinGroupId("");
        addToast('Joined room', 'success');
      },
      onError: (err) => {
        addToast(err instanceof ApiError ? err.message : 'Failed to join room', 'error');
      },
    });
  };

  const handleCreateRoom = () => {
    if (!createRoomName.trim()) return;
    createRoom(createRoomName.trim(), {
      onSuccess: (room) => {
        openRoom(room.id);
        setCreateRoomOpen(false);
        setCreateRoomName("");
        addToast('Group created', 'success');
      },
      onError: (err) => {
        addToast(err instanceof ApiError ? err.message : 'Failed to create room', 'error');
      },
    });
  };

  const handleCreateDm = (targetUserId: string) => {
    if (!targetUserId) return;
    createDirectRoom(targetUserId, {
      onSuccess: (data) => {
        openRoom(data.id);
        setCreateDmOpen(false);
        setDmUsername("");
        addToast('Direct message created', 'success');
      },
      onError: (err) => {
        addToast(err instanceof ApiError ? err.message : 'Failed to create direct message', 'error');
      },
    });
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-surface-0">
      <div className="w-64 flex flex-col shrink-0 bg-surface-1 border-r border-line">
        <div className="h-14 flex items-center px-4 shrink-0 border-b border-line">
          <span className="font-display font-semibold text-lg tracking-tight text-ink">wirechat</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          <div>
            <div className="px-2 mb-1.5 text-xs text-ink-dim">Direct messages</div>
            <div className="space-y-0.5">
              {directRooms.map((room) => (
                <RoomListItem
                  key={room.id}
                  room={{ ...room, name: room.name ?? 'Direct Message' }}
                  onClick={() => openRoom(room.id)}
                  active={room.id === activeRoomId}
                  index={0}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 mb-1.5 text-xs text-ink-dim">Rooms</div>
            <div className="space-y-0.5">
              {groupRooms.map((room, index) => (
                <RoomListItem
                  key={room.id}
                  room={room}
                  onClick={() => openRoom(room.id)}
                  active={room.id === activeRoomId}
                  index={index}
                />
              ))}
            </div>
          </div>

          <div className="px-2 pt-2 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer bg-surface-2 hover:bg-surface-3"
                 onClick={() => setCreateRoomOpen(true)}>
              <PlusIcon size={17} color="#7c6ff0" />
              <span className="text-sm text-ink">Create group</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer bg-surface-2 hover:bg-surface-3"
                 onClick={() => setCreateDmOpen(true)}>
              <PlusIcon size={17} color="#7c6ff0" />
              <span className="text-sm text-ink">Create direct message</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer bg-surface-2 hover:bg-surface-3"
                 onClick={openJoinGroupModal}>
              <PlusIcon size={17} color="#7c6ff0" />
              <span className="text-sm text-ink">Join group by ID</span>
            </div>
          </div>
        </div>

        <div className="h-16 flex items-center px-3 gap-2.5 shrink-0 border-t border-line">
          <div className="relative">
            <Avatar name={me.username} hue="#7c6ff0" size={32} userId={me.id} online avatarUrl={me.avatarUrl ?? undefined} />
            {userMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-48 bg-surface-2 rounded-md border border-line shadow-lg z-40">
                {!me.emailVerified && (
                  <div className="px-3 py-2 border-b border-line bg-[#e0b64f]/10">
                    <div className="flex items-center gap-2">
                      <WarningIcon size={14} color="#e0b64f" />
                      <span className="text-xs font-medium text-[#e0b64f]">Email not verified</span>
                    </div>
                    <button onClick={() => resendVerification(undefined, {
                      onSuccess: (data) => addToast(data.message, 'success'),
                      onError: (err) => addToast(err instanceof ApiError ? err.message : 'Failed to resend verification email', 'error'),
                    })}
                            disabled={resendPending}
                            className="mt-1 text-xs text-[#e0b64f] underline hover:opacity-80 disabled:opacity-50">
                      {resendPending ? 'Sending...' : 'Resend verification email'}
                    </button>
                  </div>
                )}
                <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                        className={`w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-3 ${!me.emailVerified ? '' : 'rounded-t-md'}`}>
                  Settings
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                        className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-3">
                  Edit Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full px-3 py-2 text-left text-sm text-[#c97bb0] hover:bg-[#c97bb0]/10 rounded-b-md">
                  Log Out
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-ink">{me.username}</div>
            <div className="text-xs text-ink-dim">Online</div>
          </div>
          <SettingsIcon size={17} color="#7c6ff0" onClick={() => setUserMenuOpen((open) => !open)} />
        </div>
      </div>

      <Outlet />

      {createRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
             onClick={() => setCreateRoomOpen(false)}>
          <div className="bg-surface-1 rounded-lg border border-line p-6 w-96 shadow-xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium text-ink mb-2">Create Group</div>
            <input
              value={createRoomName}
              onChange={(e) => setCreateRoomName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRoom(); }}
              placeholder="Group name"
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={handleCreateRoom}
                      className="flex-1 py-2 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover">
                Create
              </button>
              <button onClick={() => setCreateRoomOpen(false)}
                      className="flex-1 py-2 rounded-md border border-line text-ink hover:bg-surface-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {createDmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
             onClick={() => setCreateDmOpen(false)}>
          <div className="bg-surface-1 rounded-lg border border-line p-6 w-96 shadow-xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium text-ink mb-2">Create Direct Message</div>
            <input
              value={dmUsername}
              onChange={(e) => setDmUsername(e.target.value)}
              placeholder="Search by username"
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none"
            />
            <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
              {searchResults.map((user) => (
                <div key={user.id}
                     className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer bg-surface-2 hover:bg-surface-3"
                     onClick={() => handleCreateDm(user.id)}>
                  <Avatar name={user.username} hue="#4fb3a9" size={28} avatarUrl={user.avatarUrl ?? undefined} />
                  <span className="text-sm text-ink">{user.username}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => setCreateDmOpen(false)}
                      className="w-full py-2 rounded-md border border-line text-ink hover:bg-surface-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {joinGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
             onClick={closeJoinGroupModal}>
          <div className="bg-surface-1 rounded-lg border border-line p-6 w-96 shadow-xl"
               onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium text-ink mb-2">Join Group by ID</div>
            <input
              value={joinGroupId}
              onChange={(e) => setJoinGroupId(e.target.value)}
              placeholder="Enter group ID"
              className="w-full px-3 py-2 rounded-md bg-surface-2 border border-line text-ink outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={handleJoinGroup} disabled={joiningRoom}
                      className="flex-1 py-2 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover disabled:opacity-60">
                {joiningRoom ? 'Joining...' : 'Join'}
              </button>
              <button onClick={closeJoinGroupModal}
                      className="flex-1 py-2 rounded-md border border-line text-ink hover:bg-surface-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useRoomChannel } from '../ws/useRoomChannel';
import { useInfiniteMessages } from '../hooks/useMessages';
import { useRoomMembers } from '../hooks/useRoomMembers';
import { useRoomPresences } from '../hooks/useRoomPresences';
import { useRoom } from '../hooks/useRoom';
import { usePromoteMember, useDemoteMember, useKickMember, useTransferOwnership, useLeaveRoom, useDeleteRoom } from '../hooks/useRooms';
import { MessageBubble } from '../components/MessageBubble';
import { GroupInviteModal } from '../components/GroupInviteModal';
import { MessageComposer } from '../components/MessageComposer';
import { TypingIndicator } from '../components/TypingIndicator';
import { MemberListItem, type MemberAction } from '../components/MemberListItem';
import { GroupIcon } from '../components';
import { UsersIcon, XIcon, ArrowLeftIcon } from '../components/icons';
import { useUiStore } from '../stores/uiStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useSocketStore } from '../stores/socketStore';
import { useTypingStore } from '../stores/typingStore';
import { useMe } from '../hooks/useMe';
import { ApiError } from '../api/client';

export function RoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { data: room, isPending: roomPending, isError: roomIsError, error: roomErrorValue } = useRoom(roomId ?? null);
  const {
    data: pages,
    isPending: messagesPending,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteMessages(roomId ?? null);

  const messages = useMemo(
    () => (pages ? [...pages.pages].reverse().flatMap(page => [...page].reverse()) : []),
    [pages]);

  const lastPage = pages?.pages.at(-1);
  const hasMorePages = lastPage ? lastPage.length >= 50 : hasNextPage;
  const { data: members = [] } = useRoomMembers(roomId ?? null);
  const { membersSidebarOpen, toggleMembersSidebar, addToast, forcedExit, setForcedExit } = useUiStore();
  const skipNotFoundRef = useRef<string | null>(null);
  const { setPresence } = usePresenceStore();
  const { connected } = useSocketStore();
  const { data: presences } = useRoomPresences(roomId ?? null);
  const { data: me } = useMe();
  const { typing } = useTypingStore();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);

  const typingUsers = [...(typing[roomId ?? ''] ?? [])].filter((id) => id !== me?.id);

  const { sendMessage, sendTyping, leaveRoom: leaveRoomSocket, editMessage, deleteMessage } = useRoomChannel(roomId ?? null);
  const { mutateAsync: leaveRoomRest } = useLeaveRoom();
  const { mutateAsync: deleteRoomRest } = useDeleteRoom();

  useEffect(() => {
    if (!presences) return;
    for (const entry of presences) {
      setPresence(entry.userId, entry.isOnline, entry.lastSeen);
    }
  }, [presences, setPresence]);

  useEffect(() => {
    if (connected && me) setPresence(me.id, true);
  }, [connected, me, setPresence]);

  useEffect(() => {
    if (!forcedExit || forcedExit.roomId !== roomId) return;
    addToast(`You have been removed from ${forcedExit.roomName}`, 'error');
    navigate('/rooms');
    setForcedExit(null);
  }, [forcedExit, roomId, addToast, navigate, setForcedExit]);

  useEffect(() => {
    if (!roomIsError) return;
    if (!(roomErrorValue instanceof ApiError) || roomErrorValue.statusCode !== 404) return;
    if (skipNotFoundRef.current === roomId) {
      skipNotFoundRef.current = null;
      return;
    }
    addToast('This room is no longer available', 'error');
    navigate('/rooms');
  }, [roomIsError, roomErrorValue, addToast, navigate, roomId]);

  const senderById: Record<string, { username: string; avatarUrl: string | null }> = {};
  for (const member of members) {
    senderById[member.userId] = member.user;
  }

  const resolveSender = (message: (typeof messages)[number]) => {
    const member = message.senderId ? senderById[message.senderId] : undefined;
    const username = member?.username ?? message.sender?.username;
    return {
      username: username ?? 'Deleted User',
      avatarUrl: member?.avatarUrl ?? message.sender?.avatarUrl ?? undefined,
      deleted: !username,
    };
  };

  const myRole = members.find((m) => m.userId === me?.id)?.role ?? 'MEMBER';
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'OWNER' || myRole === 'ADMIN';

  const { mutateAsync: promote } = usePromoteMember();
  const { mutateAsync: demote } = useDemoteMember();
  const { mutateAsync: kick } = useKickMember();
  const { mutateAsync: transfer } = useTransferOwnership();

  const runAction = async (run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : 'Action failed', 'error');
    }
  };

  const withConfirm = (message: string, run: () => Promise<unknown>) => () => {
    if (window.confirm(message)) runAction(run);
  };

  const memberActions = (member: (typeof members)[number]): MemberAction[] | undefined => {
    if (!roomId || !me || member.userId === me.id) return undefined;
    const actions: MemberAction[] = [];
    if (member.role === 'MEMBER') {
      if (isAdmin) {
        actions.push({ label: 'Promote', onClick: () => runAction(() => promote({ roomId, memberId: member.userId })) });
        actions.push({ label: 'Make Owner', danger: true, onClick: withConfirm(`Transfer ownership to ${member.user.username}?`, () => transfer({ roomId, newOwnerId: member.userId })) });
        actions.push({ label: 'Kick', danger: true, onClick: withConfirm(`Kick ${member.user.username}?`, () => kick({ roomId, memberId: member.userId })) });
      }
    } else if (member.role === 'ADMIN' && isOwner) {
      actions.push({ label: 'Demote', onClick: () => runAction(() => demote({ roomId, adminId: member.userId })) });
    }
    return actions.length > 0 ? actions : undefined;
  };

  const handleLeaveRoom = () => {
    if (!roomId || !window.confirm('Leave this room?')) return;
    runAction(async () => {
      await leaveRoomRest(roomId);
      leaveRoomSocket();
      navigate('/rooms');
      addToast('Left room', 'success');
    });
  };

  const handleDeleteGroup = () => {
    if (!roomId || !window.confirm(`Delete this group permanently? All messages will be lost.`)) return;
    runAction(async () => {
      skipNotFoundRef.current = roomId;
      await deleteRoomRest(roomId);
      leaveRoomSocket();
      navigate('/rooms');
      addToast('Group deleted', 'success');
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isInitialRef = useRef(true);
  const prevRoomIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);
  const isFetchingOlderRef = useRef(false);
  const fetchLockRef = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isFetchingNextPage) return;

    const roomChanged = prevRoomIdRef.current !== (roomId ?? null);
    prevRoomIdRef.current = roomId ?? null;

    if (roomChanged || isInitialRef.current) {
      el.scrollTop = el.scrollHeight;
      isInitialRef.current = false;
      prevScrollHeightRef.current = el.scrollHeight;
      const first = el.querySelector('[data-message-id]');
      firstMessageIdRef.current = first?.getAttribute('data-message-id') ?? null;
      return;
    }

    const prevHeight = prevScrollHeightRef.current;
    const newHeight = el.scrollHeight;
    prevScrollHeightRef.current = newHeight;

    const wasAtBottom = el.scrollTop + el.clientHeight >= prevHeight - 50;

    if (isFetchingOlderRef.current) {
      isFetchingOlderRef.current = false;
      if (prevHeight > 0 && newHeight > prevHeight) {
        requestAnimationFrame(() => {
          el.scrollTop += newHeight - prevHeight;
        });
      }
      return;
    }

    if (wasAtBottom) {
      el.scrollTop = newHeight;
    } else if (prevHeight > 0 && newHeight > prevHeight) {
      const first = el.querySelector('[data-message-id]');
      const currentFirstId = first?.getAttribute('data-message-id') ?? null;
      if (currentFirstId !== firstMessageIdRef.current) {
        firstMessageIdRef.current = currentFirstId;
        requestAnimationFrame(() => {
          el.scrollTop += newHeight - prevHeight;
        });
      }
      // New message appended while scrolled up: freeze position
    }
  }, [pages, roomId, isFetchingNextPage]);

  if (!roomId) {
    return null;
  }

  if (roomPending || !room) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-surface-0 items-center justify-center text-ink-muted text-sm">
        Loading room...
      </div>
    );
  }

  const isDirect = room.type === 'DIRECT';
  const dmPeer = isDirect ? members.find((m) => m.userId !== me?.id)?.user : undefined;
  const displayName = room.name ?? dmPeer?.username ?? 'Direct Message';
  const sortedMessages = messages;

  return (
    <div className="flex-1 flex min-w-0 bg-surface-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-surface-0">
        <div className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-line">
          <button className="md:hidden p-1 hover:bg-surface-2 rounded" onClick={() => navigate("/rooms")}>
            <ArrowLeftIcon size={17} />
          </button>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/rooms")}>
            {!isDirect && <GroupIcon size={22} colorIndex={0} />}
            <span className="font-display font-medium text-lg text-ink truncate max-w-xs">{displayName}</span>
          </div>
          <span className="hidden md:block">
            <UsersIcon size={17} color={membersSidebarOpen ? "#7c6ff0" : "#8b8b9e"} onClick={toggleMembersSidebar} />
          </span>
          <button className="md:hidden p-1 hover:bg-surface-2 rounded" onClick={() => setMembersDrawerOpen(true)}>
            <UsersIcon size={17} color="#7c6ff0" />
          </button>
        </div>

        {!connected && (
          <div className="shrink-0 px-5 py-1.5 text-xs text-center bg-[#c97bb0]/15 text-[#c97bb0] border-b border-line">
            Connection lost: reconnecting...
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {!messagesPending && hasMorePages && !isFetchingNextPage && (
            <div className="text-center mb-2">
              <button
                onClick={() => {
                  if (fetchLockRef.current || isFetchingNextPage) return;
                  fetchLockRef.current = true;
                  isFetchingOlderRef.current = true;
                  fetchNextPage().finally(() => {
                    fetchLockRef.current = false;
                  });
                }}
                className="text-xs text-ink hover:text-ink hover:underline"
              >
                Load older messages
              </button>
            </div>
          )}
          {messagesPending && (
            <div className="text-center text-ink-muted text-sm">Loading messages...</div>
          )}
          {!messagesPending && sortedMessages.length === 0 && (
            <div className="text-center text-ink-muted text-sm mt-10">No messages yet. Start the conversation.</div>
          )}
          {sortedMessages.map((message, i) => {
            const prev = sortedMessages[i - 1];
            const grouped = prev && prev.senderId === message.senderId;
            const sender = resolveSender(message);
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isSelf={message.senderId === me?.id}
                showTimestamp={!grouped}
                grouped={grouped}
                senderName={sender.username}
                senderAvatarUrl={sender.avatarUrl}
                senderDeleted={sender.deleted}
                onEdit={message.senderId === me?.id ? (content) => editMessage(message.id, content) : undefined}
                onDelete={message.senderId === me?.id ? () => deleteMessage(message.id) : undefined}
              />
            );
          })}
          <TypingIndicator
            roomId={roomId ?? ''}
            names={(typingUsers).map((id) => senderById[id]?.username ?? 'Someone')}
          />
        </div>

        <div className="px-5 pb-5 pt-1 shrink-0">
          <MessageComposer
            onSend={sendMessage}
            onTyping={sendTyping}
            disabled={!roomId}
          />
        </div>
      </div>

      {membersSidebarOpen && (
        <div className="hidden sm:block w-56 shrink-0 flex flex-col bg-surface-1 border-l border-line py-4">
          <div className="flex-1 overflow-y-auto min-h-0 px-3">
            {[
              { label: 'Owner', list: members.filter((m) => m.role === 'OWNER') },
              { label: 'Admin', list: members.filter((m) => m.role === 'ADMIN') },
              { label: 'Member', list: members.filter((m) => m.role === 'MEMBER') },
            ].map((section) => section.list.length > 0 && (
              <div key={section.label} className="mb-4">
                <div className="px-1.5 mb-1.5 text-xs text-ink-dim">
                  {section.label}{section.list.length > 1 ? 's' : ''} — {section.list.length}
                </div>
                <div className="space-y-0.5">
                  {section.list.map((member) => (
                    <MemberListItem
                      key={member.userId}
                      member={member}
                      actions={!isDirect ? memberActions(member) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!isDirect && (
            <div className="shrink-0 px-3 mt-3 pt-3 space-y-2 border-t border-line">
              <button onClick={() => setInviteModalOpen(true)}
                      className="w-full py-2 mb-2 rounded-md border border-line text-ink text-sm hover:bg-surface-2">
               Invite Members 
              </button>
              <button onClick={handleLeaveRoom}
                      className="w-full py-2 rounded-md border border-line text-ink text-sm hover:bg-surface-2">
                Leave Room
              </button>
              {isOwner && (
                <button onClick={handleDeleteGroup}
                        className="w-full py-2 rounded-md border border-[#c97bb0] text-[#c97bb0] text-sm hover:bg-[#c97bb0]/10">
                  Delete Group
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {membersDrawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMembersDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-56 z-50 bg-surface-1 border-l border-line flex flex-col">
            <div className="h-14 flex items-center justify-between px-3 shrink-0 border-b border-line">
              <span className="font-medium text-ink">Members</span>
              <button onClick={() => setMembersDrawerOpen(false)} className="p-1 hover:bg-surface-2 rounded">
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
              {[
                { label: 'Owner', list: members.filter((m) => m.role === 'OWNER') },
                { label: 'Admin', list: members.filter((m) => m.role === 'ADMIN') },
                { label: 'Member', list: members.filter((m) => m.role === 'MEMBER') },
              ].map((section) => section.list.length > 0 && (
                <div key={section.label} className="mb-4">
                  <div className="px-1.5 mb-1.5 text-xs text-ink-dim">
                    {section.label}{section.list.length > 1 ? 's' : ''} — {section.list.length}
                  </div>
                  <div className="space-y-0.5">
                    {section.list.map((member) => (
                      <MemberListItem
                        key={member.userId}
                        member={member}
                        actions={!isDirect ? memberActions(member) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {!isDirect && (
              <div className="shrink-0 px-3 mt-3 pt-3 space-y-2 border-t border-line">
                <button onClick={handleLeaveRoom}
                        className="w-full py-2 rounded-md border border-line text-ink text-sm hover:bg-surface-2">
                  Leave Room
                </button>
                {isOwner && (
                  <button onClick={handleDeleteGroup}
                          className="w-full py-2 rounded-md border border-[#c97bb0] text-[#c97bb0] text-sm hover:bg-[#c97bb0]/10">
                    Delete Group
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
      <GroupInviteModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} groupId={roomId ?? ''} />
    </div>
  );
}

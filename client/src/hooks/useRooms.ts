import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRooms,
  createRoom,
  createDirectRoom,
  joinRoom,
  leaveRoom,
  deleteRoom as deleteRoomApi,
  transferOwnership,
  promoteMember,
  demoteMember,
  kickMember,
  type Room,
} from '../api/rooms';

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useCreateDirectRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDirectRoom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useJoinRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: joinRoom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useLeaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveRoom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      newOwnerId,
    }: {
      roomId: string;
      newOwnerId: string;
    }) => transferOwnership(roomId, newOwnerId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({
        queryKey: ['rooms', variables.roomId, 'members'],
      });
    },
  });
}

export function usePromoteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      memberId,
    }: {
      roomId: string;
      memberId: string;
    }) => promoteMember(roomId, memberId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['rooms', variables.roomId, 'members'],
      });
    },
  });
}

export function useDemoteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      adminId,
    }: {
      roomId: string;
      adminId: string;
    }) => demoteMember(roomId, adminId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['rooms', variables.roomId, 'members'],
      });
    },
  });
}

export function useKickMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      memberId,
    }: {
      roomId: string;
      memberId: string;
    }) => kickMember(roomId, memberId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({
        queryKey: ['rooms', variables.roomId, 'members'],
      });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRoomApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

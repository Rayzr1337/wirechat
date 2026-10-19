import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface UiStore {
  activeRoomId: string | null
  membersSidebarOpen: boolean
  joinGroupModalOpen: boolean
  toasts: Toast[]
  setActiveRoomId: (roomId: string | null) => void
  toggleMembersSidebar: () => void
  openJoinGroupModal: () => void
  closeJoinGroupModal: () => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiStore>((set) => ({
  activeRoomId: null,
  membersSidebarOpen: true,
  joinGroupModalOpen: false,
  toasts: [],

  setActiveRoomId: (roomId) => {
    set({ activeRoomId: roomId })
  },

  toggleMembersSidebar: () => {
    set((state) => ({
      membersSidebarOpen: !state.membersSidebarOpen,
    }))
  },

  openJoinGroupModal: () => {
    set({ joinGroupModalOpen: true })
  },

  closeJoinGroupModal: () => {
    set({ joinGroupModalOpen: false })
  },

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
}))

import { create } from 'zustand'

const STORAGE_KEY = 'wirechat:unreads'

function loadUnreads(): Record<string, number> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveUnreads(unreadCounts: Record<string, number>) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unreadCounts))
  } catch {
    // Ignore storage errors (e.g., private mode quota exceeded)
  }
}

export interface UnreadStore {
  unreadCounts: Record<string, number>
  lastSeenVersion: Record<string, number>
  incrementUnread: (roomId: string) => void
  clearUnread: (roomId: string) => void
  setLastSeenVersion: (roomId: string, version: number) => void
}

export const useUnreadStore = create<UnreadStore>((set) => ({
  unreadCounts: loadUnreads(),
  lastSeenVersion: {},

  incrementUnread: (roomId) => {
    set((state) => {
      const next = {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] ?? 0) + 1,
      }
      saveUnreads(next)
      return { unreadCounts: next }
    })
  },

  clearUnread: (roomId) => {
    set((state) => {
      const next = { ...state.unreadCounts }
      delete next[roomId]
      saveUnreads(next)
      return { unreadCounts: next }
    })
  },

  setLastSeenVersion: (roomId, version) => {
    set((state) => ({
      lastSeenVersion: {
        ...state.lastSeenVersion,
        [roomId]: version,
      },
    }))
  },
}))

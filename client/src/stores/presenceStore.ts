import { create } from 'zustand'

export interface Presence {
  online: boolean
  lastSeen: string | null
}

export interface PresenceStore {
  presences: Record<string, Presence>
  setPresence: (userId: string, online: boolean, lastSeen?: string | null) => void
  setPresences: (presences: Record<string, Presence>) => void
  removePresence: (userId: string) => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  presences: {},

  setPresence: (userId, online, lastSeen = null) => {
    set((state) => ({
      presences: {
        ...state.presences,
        [userId]: { online, lastSeen },
      },
    }))
  },

  setPresences: (presences) => {
    set((state) => ({
      presences: {
        ...state.presences,
        ...presences,
      },
    }))
  },

  removePresence: (userId) => {
    set((state) => {
      const next = { ...state.presences }
      delete next[userId]
      return { presences: next }
    })
  },
}))

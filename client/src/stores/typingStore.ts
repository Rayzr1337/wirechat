import { create } from 'zustand'

export const TYPING_TIMEOUT_MS = 3000

const timers = new Map<string, ReturnType<typeof setTimeout>>

export interface TypingStore {
  typing: Record<string, Set<string>>
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void
  clearTyping: (roomId: string) => void
}

export const useTypingStore = create<TypingStore>((set) => ({
  typing: {},

  setTyping: (roomId, userId, isTyping) => {
    const timerKey = `${roomId}:${userId}`

    const existing = timers.get(timerKey)
    if (existing) {
      clearTimeout(existing)
      timers.delete(timerKey)
    }

    set((state) => {
      const current = state.typing[roomId]
      const next = current ? new Set(current) : new Set<string>()

      if (isTyping) {
        next.add(userId)

        if (typeof window !== 'undefined') {
          const timer = setTimeout(() => {
            useTypingStore.getState().setTyping(roomId, userId, false)
          }, TYPING_TIMEOUT_MS)
          timers.set(timerKey, timer)
        }
      } else {
        next.delete(userId)
      }

      return {
        typing: {
          ...state.typing,
          [roomId]: next,
        },
      }
    })
  },

  clearTyping: (roomId) => {
    set((state) => {
      const next = { ...state.typing }
      delete next[roomId]
      return { typing: next }
    })
  },
}))

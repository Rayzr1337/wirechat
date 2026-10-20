import { create } from 'zustand'

export interface SocketStore {
  socket: WebSocket | null
  connected: boolean
  joinedRooms: Set<string>
  connect: (url: string, onClose?: () => void) => void
  disconnect: () => void
  send: (type: string, payload: Record<string, unknown>) => void
  addJoinedRoom: (roomId: string) => void
  removeJoinedRoom: (roomId: string) => void
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  connected: false,
  joinedRooms: new Set(),

  connect: (url, onClose) => {
    const socket = new WebSocket(url)
    set({ socket })

    socket.onopen = () => {
      set({ connected: true })
    }

    socket.onclose = () => {
      if (get().socket === socket) {
          set({ connected: false, socket: null })
      }
      onClose?.()
    }

    socket.onerror = () => {
      set({ connected: false, socket: null })
    }
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.close()
    }
    set({ connected: false, socket: null, joinedRooms: new Set() })
  },

  send: (type, payload) => {
    const { socket, connected } = get()
    if (connected && socket) {
      socket.send(JSON.stringify({ type, payload }))
    }
  },

  addJoinedRoom: (roomId) => {
    set((state) => {
      const next = new Set(state.joinedRooms)
      next.add(roomId)
      return { joinedRooms: next }
    })
  },

  removeJoinedRoom: (roomId) => {
    set((state) => {
      const next = new Set(state.joinedRooms)
      next.delete(roomId)
      return { joinedRooms: next }
    })
  },
}))

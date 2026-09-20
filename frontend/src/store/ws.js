import { create } from 'zustand'

let socket = null
const listeners = new Set()

export const useWS = create((set) => ({
  connected: false,

  connect() {
    const token = localStorage.getItem('access')
    if (!token) return
    if (socket && socket.readyState === WebSocket.OPEN) return
    if (socket && socket.readyState === WebSocket.CONNECTING) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${proto}://${location.host}/ws?token=${token}`)

    socket.onopen = () => set({ connected: true })
    socket.onclose = () => {
      set({ connected: false })
      socket = null
    }
    socket.onerror = () => {
      socket = null
    }
    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        listeners.forEach((fn) => fn(data))
      } catch {}
    }
  },

  disconnect() {
    if (socket) {
      try { socket.close() } catch {}
      socket = null
      set({ connected: false })
    }
  },

  on(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  send(obj) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(obj))
    }
  },
}))
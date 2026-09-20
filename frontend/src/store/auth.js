import { create } from 'zustand'
import api from '../api/client'

export const useAuth = create((set) => ({
  user: null,
  ready: false,

  async init() {
    const token = localStorage.getItem('access')
    if (!token) { set({ ready: true }); return }
    try {
      const { data } = await api.get('/me')
      set({ user: data, ready: true })
    } catch {
      localStorage.clear()
      set({ user: null, ready: true })
    }
  },

  async login(payload) {
    const { data } = await api.post('/auth/login', payload)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    if (data.user_id) localStorage.setItem('uid', data.user_id)
    const me = await api.get('/me')
    set({ user: me.data })
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    if (data.user_id) localStorage.setItem('uid', data.user_id)
    const me = await api.get('/me')
    set({ user: me.data })
  },

  logout() {
    localStorage.clear()
    set({ user: null })
  },

  async update(payload) {
    const { data } = await api.patch('/me', payload)
    set({ user: data })
  },
}))
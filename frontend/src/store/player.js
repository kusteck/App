import { create } from 'zustand'

export const usePlayer = create((set, get) => {
  const audio = typeof Audio !== 'undefined' ? new Audio() : null
  if (audio) {
    audio.addEventListener('timeupdate', () => {
      set({ current: audio.currentTime, duration: audio.duration || 0 })
    })
    audio.addEventListener('ended', () => get().next())
    audio.addEventListener('play', () => set({ playing: true }))
    audio.addEventListener('pause', () => set({ playing: false }))
  }

  return {
    queue: [],
    index: -1,
    playing: false,
    current: 0,
    duration: 0,
    volume: 1,

    playQueue(tracks, startIndex = 0) {
      set({ queue: tracks, index: startIndex })
      const t = tracks[startIndex]
      if (!t || !audio) return
      audio.src = t.audio_url
      audio.volume = get().volume
      audio.play()
    },
    play(track, queue = null) {
      if (queue) return get().playQueue(queue, queue.findIndex((x) => x.id === track.id))
      get().playQueue([track], 0)
    },
    toggle() {
      if (!audio) return
      if (audio.paused) audio.play(); else audio.pause()
    },
    next() {
      const { queue, index } = get()
      if (!queue.length) return
      const ni = (index + 1) % queue.length
      get().playQueue(queue, ni)
    },
    prev() {
      const { queue, index } = get()
      if (!queue.length) return
      const ni = (index - 1 + queue.length) % queue.length
      get().playQueue(queue, ni)
    },
    seek(sec) { if (audio) audio.currentTime = sec },
    setVolume(v) { if (audio) { audio.volume = v; set({ volume: v }) } },
    currentTrack() { const { queue, index } = get(); return queue[index] || null },
  }
})
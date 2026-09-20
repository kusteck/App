import { useEffect, useState } from 'react'
import api from '../api/client'
import { usePlayer } from '../store/player'
import { formatDuration } from '../utils/format'

export default function MusicPage() {
  const [tracks, setTracks] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', artist: '', duration: '', audio_url: '', cover_url: '' })
  const [newTitle, setNewTitle] = useState('')
  const [pickingTrack, setPickingTrack] = useState(null)
  const [openedPlaylist, setOpenedPlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const { playQueue, currentTrack } = usePlayer()
  const current = currentTrack()

  const load = async () => {
    const [t, p] = await Promise.all([api.get('/tracks'), api.get('/playlists')])
    setTracks(t.data)
    setPlaylists(p.data)
  }

  useEffect(() => { load() }, [])

  const openPlaylist = async (pl) => {
    setOpenedPlaylist(pl)
    const { data } = await api.get(`/playlists/${pl.id}/tracks`)
    setPlaylistTracks(data)
  }

  const closePlaylist = () => {
    setOpenedPlaylist(null)
    setPlaylistTracks([])
  }

  const addToPlaylist = async (playlistId) => {
    if (!pickingTrack) return
    try {
      await api.post(`/playlists/${playlistId}/tracks`, { track_id: pickingTrack.id })
      setPickingTrack(null)
    } catch (e) {
      alert('Ошибка: ' + (e?.response?.data?.error || e.message))
    }
  }

  const removeFromPlaylist = async (trackId) => {
    if (!openedPlaylist) return
    try {
      await api.delete(`/playlists/${openedPlaylist.id}/tracks/${trackId}`)
      const { data } = await api.get(`/playlists/${openedPlaylist.id}/tracks`)
      setPlaylistTracks(data)
    } catch (e) {
      alert('Ошибка: ' + (e?.response?.data?.error || e.message))
    }
  }

  const addTrack = async (e) => {
    e.preventDefault()
    if (!form.title || !form.artist || !form.audio_url) {
      alert('Заполните название, исполнителя и URL трека')
      return
    }
    try {
      await api.post('/tracks', {
        title: form.title,
        artist: form.artist,
        duration: parseInt(form.duration) || 0,
        audio_url: form.audio_url,
        cover_url: form.cover_url,
      })
      setForm({ title: '', artist: '', duration: '', audio_url: '', cover_url: '' })
      setShowForm(false)
      load()
    } catch (e) {
      alert('Ошибка: ' + (e?.response?.data?.error || e.message))
    }
  }

  const createPlaylist = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await api.post('/playlists', { title: newTitle })
    setNewTitle('')
    load()
  }

  return (
    <div className="p-4 md:p-6 pb-40 animate-slideIn">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Музыка</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">
          Добавить трек
        </button>
      </div>
      <p className="text-sm text-neutral-400 mb-6">Каталог треков и плейлисты. Плеер продолжает играть при переходах между разделами.</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Каталог</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tracks.map((t, i) => (
            <div key={t.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 hover:border-brand/40 transition group relative">
              <div className="aspect-square rounded-lg bg-neutral-800 overflow-hidden mb-3 cursor-pointer" onClick={() => playQueue(tracks, i)}>
                {t.cover_url
                  ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center text-neutral-600">♪</div>}
              </div>
              <div className={`text-sm font-medium truncate ${current?.id === t.id ? 'text-brand-light' : ''}`}>{t.title}</div>
              <div className="text-xs text-neutral-500 truncate">{t.artist}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-neutral-600">{formatDuration(t.duration)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPickingTrack(t) }}
                  className="text-xs text-neutral-500 hover:text-brand-light"
                  title="Добавить в плейлист"
                >
                  + в плейлист
                </button>
              </div>
            </div>
          ))}
          {tracks.length === 0 && <div className="col-span-full text-center text-neutral-500 py-10">Треков пока нет</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Мои плейлисты</h2>
        <form onSubmit={createPlaylist} className="flex gap-2 mb-3 max-w-md">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Название плейлиста"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50"
          />
          <button className="px-4 rounded-lg bg-brand hover:bg-brand-dark text-sm">Создать</button>
        </form>
        <div className="flex flex-wrap gap-3">
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => openPlaylist(p)}
              className="bg-neutral-900 border border-neutral-800 hover:border-brand/40 rounded-xl px-4 py-3 text-sm text-left"
            >
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-neutral-500">{new Date(p.created_at).toLocaleDateString()}</div>
            </button>
          ))}
          {playlists.length === 0 && <div className="text-sm text-neutral-500">Плейлистов пока нет</div>}
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-40" onClick={() => setShowForm(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={addTrack}
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3"
          >
            <h2 className="text-lg font-semibold">Новый трек</h2>
            <input className="w-full input" placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="w-full input" placeholder="Исполнитель" value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
            <input className="w-full input" placeholder="Длительность в секундах" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <input className="w-full input" placeholder="URL аудио (mp3)" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} />
            <input className="w-full input" placeholder="URL обложки (необязательно)" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-neutral-800 text-sm">Отмена</button>
              <button className="flex-1 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">Добавить</button>
            </div>
          </form>
        </div>
      )}

      {pickingTrack && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-40" onClick={() => setPickingTrack(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-base font-semibold mb-1">Добавить в плейлист</h3>
            <p className="text-xs text-neutral-500 mb-4 truncate">{pickingTrack.title} — {pickingTrack.artist}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToPlaylist(p.id)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-neutral-800 hover:bg-brand/30 text-sm"
                >
                  {p.title}
                </button>
              ))}
              {playlists.length === 0 && (
                <div className="text-sm text-neutral-500">Сначала создайте плейлист</div>
              )}
            </div>
          </div>
        </div>
      )}

      {openedPlaylist && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-40" onClick={closePlaylist}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-base font-semibold mb-3">{openedPlaylist.title}</h3>
            {playlistTracks.length === 0 && <div className="text-sm text-neutral-500 py-4">В плейлисте пока нет треков</div>}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {playlistTracks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800/50">
                  <div className="w-10 h-10 rounded bg-neutral-800 overflow-hidden shrink-0">
                    {t.cover_url ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-neutral-600">♪</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-neutral-500 truncate">{t.artist}</div>
                  </div>
                  <button
                    onClick={() => removeFromPlaylist(t.id)}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={closePlaylist} className="px-4 py-2 rounded-lg bg-neutral-800 text-sm">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{background:#171717;border:1px solid #262626;border-radius:8px;padding:.65rem .8rem;font-size:.9rem;color:#fafafa;outline:none}.input:focus{border-color:#7c3aed}`}</style>
    </div>
  )
}
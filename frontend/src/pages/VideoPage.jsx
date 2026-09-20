import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { timeAgo } from '../utils/format'

export default function VideoPage() {
  const [videos, setVideos] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '' })

  const load = async () => {
  console.log('Token before request:', localStorage.getItem('access')?.substring(0, 30))
  try {
    const { data } = await api.get('/videos')
    console.log('Videos loaded:', data)
    setVideos(data)
  } catch (e) {
    console.error('Videos failed:', e.response?.status, e.response?.data || e.message)
  }
}
  useEffect(() => { load() }, [])

  const publish = async (e) => {
    e.preventDefault()
    if (!form.video_url || !form.title) return alert('Заполните название и ссылку на видео')
    await api.post('/videos', form)
    setOpen(false); setForm({ title: '', description: '', video_url: '', thumbnail_url: '' }); load()
  }

  return (
    <div className="p-4 md:p-6 animate-slideIn">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Видео</h1>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">Загрузить видео</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((v) => (
          <Link key={v.id} to={`/video/${v.id}`} className="group">
            <div className="aspect-video rounded-xl bg-neutral-800 overflow-hidden mb-2">
              {v.thumbnail_url
                ? <img src={v.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition" />
                : <div className="w-full h-full grid place-items-center text-neutral-600 text-2xl">🎬</div>}
            </div>
            <div className="text-sm font-medium line-clamp-2">{v.title}</div>
            <div className="text-xs text-neutral-500 mt-1">{v.display_name} · {v.views} просмотров · {timeAgo(v.created_at)}</div>
          </Link>
        ))}
        {videos.length === 0 && <div className="col-span-full text-center text-neutral-500 py-16">Видео пока нет</div>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur grid place-items-center p-4 z-40" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={publish}
                className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Публикация видео</h2>
            <input className="w-full input" placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full input" placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="w-full input" placeholder="URL видеофайла или ссылка" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
            <input className="w-full input" placeholder="URL обложки (опционально)" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-neutral-800 text-sm">Отмена</button>
              <button className="flex-1 py-2 rounded-lg bg-brand hover:bg-brand-dark text-sm">Опубликовать</button>
            </div>
          </form>
        </div>
      )}

      <style>{`.input{background:#171717;border:1px solid #262626;border-radius:8px;padding:.65rem .8rem;font-size:.9rem;color:#fafafa;outline:none}.input:focus{border-color:#7c3aed}`}</style>
    </div>
  )
}
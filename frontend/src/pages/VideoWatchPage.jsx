import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { timeAgo } from '../utils/format'

export default function VideoWatchPage() {
  const { id } = useParams()
  const [v, setV] = useState(null)
  const [comments, setComments] = useState([])
  const [rec, setRec] = useState([])
  const [text, setText] = useState('')

  const load = async () => {
    const { data } = await api.get(`/videos/${id}`)
    setV(data)
    const [c, r] = await Promise.all([api.get(`/videos/${id}/comments`), api.get('/videos')])
    setComments(c.data)
    setRec(r.data.filter((x) => x.id !== id).slice(0, 8))
  }
  useEffect(() => { load() }, [id])

  const like = async () => { await api.post(`/videos/${id}/like`); load() }
  const sendComment = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await api.post(`/videos/${id}/comments`, { text })
    setText(''); load()
  }

  if (!v) return <div className="p-8 text-neutral-500">Загрузка…</div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-4 md:p-6 animate-slideIn">
      <div>
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <video src={v.video_url} controls className="w-full h-full" poster={v.thumbnail_url || undefined} />
        </div>
        <h1 className="text-xl font-bold mt-4">{v.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-neutral-400">
          <span>{v.display_name}</span>
          <span>· {v.views} просмотров</span>
          <span>· {timeAgo(v.created_at)}</span>
          <button onClick={like} className={`ml-auto px-3 py-1.5 rounded-lg ${v.liked ? 'bg-red-500/20 text-red-300' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
            {v.liked ? '❤️' : '🤍'} {v.likes}
          </button>
        </div>
        <p className="mt-3 text-sm text-neutral-300 whitespace-pre-wrap">{v.description}</p>

        <section className="mt-6">
          <h2 className="text-base font-semibold mb-3">Комментарии ({comments.length})</h2>
          <form onSubmit={sendComment} className="flex gap-2 mb-4">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Оставить комментарий"
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50" />
            <button className="px-4 rounded-lg bg-brand hover:bg-brand-dark text-sm">Отправить</button>
          </form>
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/40 grid place-items-center text-xs">{(c.display_name || '?')[0]}</div>
                <div>
                  <div className="text-xs text-neutral-400">{c.display_name} · {timeAgo(c.created_at)}</div>
                  <div className="text-sm">{c.text}</div>
                </div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-sm text-neutral-500">Комментариев пока нет</div>}
          </div>
        </section>
      </div>

      <aside>
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">Рекомендации</h2>
        <div className="space-y-3">
          {rec.map((r) => (
            <Link key={r.id} to={`/video/${r.id}`} className="flex gap-3 group">
              <div className="w-32 aspect-video rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                {r.thumbnail_url && <img src={r.thumbnail_url} className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium line-clamp-2 group-hover:text-brand-light">{r.title}</div>
                <div className="text-xs text-neutral-500">{r.display_name}</div>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  )
}
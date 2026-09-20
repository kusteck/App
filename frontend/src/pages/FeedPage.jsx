import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../store/auth'
import { timeAgo } from '../utils/format'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [showMedia, setShowMedia] = useState(false)
  const [loading, setLoading] = useState(true)
  const me = useAuth((s) => s.user)

  const load = async () => {
    const { data } = await api.get('/posts')
    setPosts(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    if (!text.trim() && !imageUrl && !videoUrl) return
    await api.post('/posts', { text, image_url: imageUrl, video_url: videoUrl })
    setText(''); setImageUrl(''); setVideoUrl(''); setShowMedia(false)
    load()
  }

  const like = async (p) => {
    await api[p.liked ? 'delete' : 'post'](`/posts/${p.id}/like`)
    load()
  }

  const remove = async (id) => {
    if (!confirm('Удалить публикацию?')) return
    await api.delete(`/posts/${id}`)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 animate-slideIn">
      <form onSubmit={create} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Что нового?"
          className="w-full bg-transparent resize-none outline-none text-sm min-h-[70px]"
        />
        {showMedia && (
          <div className="space-y-2 mt-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL изображения"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50"
            />
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="URL видео (mp4)"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
        )}
        <div className="flex justify-between items-center mt-2">
          <button type="button" onClick={() => setShowMedia(!showMedia)} className="text-xs text-neutral-400 hover:text-brand-light">
            {showMedia ? '− Медиа' : '+ Медиа'}
          </button>
          <button className="px-4 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-sm">Опубликовать</button>
        </div>
      </form>

      {loading && <Skeleton />}
      {!loading && posts.length === 0 && (
        <div className="text-center text-neutral-500 py-16">Пока нет публикаций</div>
      )}

      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            meId={me?.id}
            onLike={() => like(p)}
            onRemove={() => remove(p.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PostCard({ post, meId, onLike, onRemove }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const loadComments = async () => {
    setLoading(true)
    const { data } = await api.get(`/posts/${post.id}/comments`)
    setComments(data)
    setLoading(false)
  }

  const toggleComments = () => {
    const next = !showComments
    setShowComments(next)
    if (next) loadComments()
  }

  const addComment = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await api.post(`/posts/${post.id}/comments`, { text })
    setText('')
    loadComments()
  }

  return (
    <article className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <header className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-brand/40 grid place-items-center text-sm overflow-hidden">
          {post.avatar_url
            ? <img src={post.avatar_url} alt="" className="w-full h-full object-cover" />
            : (post.display_name || '?')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{post.display_name}</div>
          <div className="text-xs text-neutral-500">@{post.username} · {timeAgo(post.created_at)}</div>
        </div>
        {post.user_id === meId && (
          <button onClick={onRemove} className="text-neutral-500 hover:text-red-400 text-sm">Удалить</button>
        )}
      </header>

      {post.text && <p className="text-sm whitespace-pre-wrap mb-3">{post.text}</p>}
      {post.image_url && <img src={post.image_url} className="rounded-lg mb-3 w-full" />}
      {post.video_url && <video src={post.video_url} controls className="rounded-lg mb-3 w-full" />}
      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noreferrer" className="text-brand-light text-sm underline">
          {post.link_url}
        </a>
      )}

      <div className="flex items-center gap-4 mt-3 text-sm text-neutral-400">
        <button onClick={onLike} className={post.liked ? 'text-red-400' : 'hover:text-red-400'}>
          {post.liked ? '❤️' : '🤍'} {post.likes}
        </button>
        <button onClick={toggleComments} className="hover:text-brand-light">
          💬 {post.comments}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 border-t border-neutral-800 pt-3 space-y-3">
          <form onSubmit={addComment} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Комментарий…"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/50"
            />
            <button className="px-3 rounded-lg bg-brand hover:bg-brand-dark text-sm">Отправить</button>
          </form>

          {loading && <div className="text-xs text-neutral-500">Загрузка…</div>}

          {!loading && comments.length === 0 && (
            <div className="text-xs text-neutral-500">Комментариев пока нет</div>
          )}

          {!loading && comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-brand/40 grid place-items-center text-xs overflow-hidden shrink-0">
                {c.avatar_url
                  ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (c.display_name || '?')[0]}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-neutral-400">
                  {c.display_name} · {timeAgo(c.created_at)}
                </div>
                <div className="text-sm">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-neutral-800" />
            <div className="h-3 w-32 bg-neutral-800 rounded" />
          </div>
          <div className="h-3 w-2/3 bg-neutral-800 rounded mb-2" />
          <div className="h-3 w-1/2 bg-neutral-800 rounded" />
        </div>
      ))}
    </div>
  )
}